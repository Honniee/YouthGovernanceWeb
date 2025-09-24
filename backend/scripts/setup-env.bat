@echo off
REM SK Terms Enhanced Features Setup Script for Windows
REM This script helps set up environment variables and test cron functionality

echo 🚀 SK Terms Enhanced Features Setup
echo ==================================

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found. Creating one...
    (
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=youth_governance_db
        echo DB_USER=postgres
        echo DB_PASSWORD=your_database_password
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your-jwt-secret-key-here
        echo JWT_EXPIRES_IN=24h
        echo.
        echo # Server Configuration
        echo PORT=3001
        echo NODE_ENV=development
        echo.
        echo # Cron Job Security
        echo CRON_SECRET=
        echo.
        echo # Optional: Email Configuration (for notifications)
        echo SMTP_HOST=smtp.gmail.com
        echo SMTP_PORT=587
        echo SMTP_USER=your-email@gmail.com
        echo SMTP_PASS=your-app-password
    ) > .env
    echo ✅ .env file created
    echo ⚠️  Please manually add a CRON_SECRET value to the .env file
) else (
    echo ✅ .env file already exists
)

REM Check if CRON_SECRET is set
findstr /C:"CRON_SECRET=" .env >nul
if %errorlevel% equ 0 (
    echo ✅ CRON_SECRET is configured
) else (
    echo ❌ CRON_SECRET not found in .env
    echo Please add CRON_SECRET=your-secret-here to your .env file
)

echo.
echo 🔧 Testing Setup
echo ===============

REM Check if server is running
echo Checking if server is running...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Server is running
    
    REM Test manual trigger
    echo Testing manual trigger...
    curl -s http://localhost:3001/api/cron/manual-update-term-statuses
    if %errorlevel% equ 0 (
        echo ✅ Manual trigger working correctly
    ) else (
        echo ❌ Manual trigger test failed
    )
    
) else (
    echo ❌ Server is not running. Please start your server first:
    echo    npm start
    echo    or
    echo    node server.js
)

echo.
echo 📋 Next Steps
echo =============
echo 1. Update your .env file with correct database credentials
echo 2. Add a CRON_SECRET value to your .env file
echo 3. Set up Windows Task Scheduler for daily cron job:
echo    - Open Task Scheduler (taskschd.msc)
echo    - Create Basic Task named "SK Terms Status Update"
echo    - Set trigger to Daily at 00:00
echo    - Set action to start curl with your cron secret
echo 4. Test the cron job manually using curl
echo.
echo 📚 For detailed instructions, see: backend/docs/ENVIRONMENT_SETUP.md
echo.
echo 🎉 Setup complete!
pause
