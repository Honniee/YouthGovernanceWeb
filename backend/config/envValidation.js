/**
 * Environment Variable Validation
 * Validates required environment variables on startup
 */

// Note: This file intentionally uses console for startup validation messages
// as it runs before logger is initialized. These are critical startup messages.

export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  // Required variables
  const required = {
    JWT_SECRET: {
      validate: (val) => val && val.length >= 32,
      message: 'JWT_SECRET must be at least 32 characters long',
      productionRequired: true
    }
  };

  // Check required variables
  for (const [key, config] of Object.entries(required)) {
    const value = process.env[key];
    
    if (!value) {
      if (config.productionRequired && process.env.NODE_ENV === 'production') {
        errors.push(`Missing required environment variable: ${key}`);
      } else {
        warnings.push(`Missing environment variable: ${key} (using fallback)`);
      }
    } else if (config.validate && !config.validate(value)) {
      if (config.productionRequired && process.env.NODE_ENV === 'production') {
        errors.push(`${key}: ${config.message}`);
      } else {
        warnings.push(`${key}: ${config.message} (may cause issues)`);
      }
    }
  }

  // Check database configuration
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    errors.push('Database configuration missing: Provide either DATABASE_URL or DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
  }

  // Check production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.FRONTEND_URL) {
      warnings.push('FRONTEND_URL not set - CORS may not work correctly in production');
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }

    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production' ||
        process.env.JWT_SECRET === 'fallback-secret' ||
        process.env.JWT_SECRET === 'development-fallback-secret') {
      errors.push('JWT_SECRET must be changed from default value in production');
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  // Display errors and exit if in production
  if (errors.length > 0) {
    console.error('❌ Environment variable errors:');
    errors.forEach(error => console.error(`   - ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      console.error('\n❌ Cannot start in production with missing or invalid required environment variables.');
      process.exit(1);
    } else {
      console.error('\n⚠️  Application will continue in development mode, but may not work correctly.');
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment variables validated successfully');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate specific environment variable
 */
export const validateEnvVar = (key, value, validator) => {
  if (!value) {
    return { valid: false, message: `${key} is required` };
  }
  
  if (validator && !validator(value)) {
    return { valid: false, message: `${key} validation failed` };
  }
  
  return { valid: true };
};


