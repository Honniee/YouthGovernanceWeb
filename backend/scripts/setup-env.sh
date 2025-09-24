#!/bin/bash

# SK Terms Enhanced Features Setup Script
# This script helps set up environment variables and test cron functionality

echo "🚀 SK Terms Enhanced Features Setup"
echo "=================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating one..."
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youth_governance_db
DB_USER=postgres
DB_PASSWORD=your_database_password

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=development

# Cron Job Security
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Optional: Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EOF
    echo "✅ .env file created with generated CRON_SECRET"
else
    echo "✅ .env file already exists"
fi

# Check if CRON_SECRET is set
if grep -q "CRON_SECRET=" .env; then
    echo "✅ CRON_SECRET is configured"
else
    echo "❌ CRON_SECRET not found in .env"
    echo "Adding CRON_SECRET to .env..."
    echo "CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
    echo "✅ CRON_SECRET added to .env"
fi

# Extract CRON_SECRET for testing
CRON_SECRET=$(grep "CRON_SECRET=" .env | cut -d '=' -f2)

echo ""
echo "🔧 Testing Setup"
echo "==============="

# Check if server is running
echo "Checking if server is running..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Server is running"
    
    # Test cron endpoint without secret (should fail)
    echo "Testing cron endpoint without secret (should fail)..."
    RESPONSE=$(curl -s http://localhost:3001/api/cron/update-term-statuses)
    if echo "$RESPONSE" | grep -q "Unauthorized"; then
        echo "✅ Security working: Unauthorized access blocked"
    else
        echo "❌ Warning: Security might not be working properly"
    fi
    
    # Test cron endpoint with secret
    echo "Testing cron endpoint with secret..."
    RESPONSE=$(curl -s -H "X-Cron-Secret: $CRON_SECRET" http://localhost:3001/api/cron/update-term-statuses)
    if echo "$RESPONSE" | grep -q "success.*true"; then
        echo "✅ Cron endpoint working correctly"
    else
        echo "❌ Cron endpoint test failed"
        echo "Response: $RESPONSE"
    fi
    
    # Test manual trigger
    echo "Testing manual trigger..."
    RESPONSE=$(curl -s http://localhost:3001/api/cron/manual-update-term-statuses)
    if echo "$RESPONSE" | grep -q "success.*true"; then
        echo "✅ Manual trigger working correctly"
    else
        echo "❌ Manual trigger test failed"
        echo "Response: $RESPONSE"
    fi
    
else
    echo "❌ Server is not running. Please start your server first:"
    echo "   npm start"
    echo "   or"
    echo "   node server.js"
fi

echo ""
echo "📋 Next Steps"
echo "============="
echo "1. Update your .env file with correct database credentials"
echo "2. Set up the daily cron job:"
echo "   crontab -e"
echo "   Add: 0 0 * * * curl -H \"X-Cron-Secret: $CRON_SECRET\" http://localhost:3001/api/cron/update-term-statuses"
echo "3. Test the cron job manually:"
echo "   curl -H \"X-Cron-Secret: $CRON_SECRET\" http://localhost:3001/api/cron/update-term-statuses"
echo ""
echo "📚 For detailed instructions, see: backend/docs/ENVIRONMENT_SETUP.md"
echo ""
echo "🎉 Setup complete!"
