import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import ReCaptchaComponent from '../../components/ui/ReCaptchaComponent';
import { useReCaptcha } from '../../hooks/useReCaptcha';
import api from '../../services/api';
import logger from '../../utils/logger';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null); // null = checking, true = valid, false = invalid
  const [tokenError, setTokenError] = useState('');

  // Initialize reCAPTCHA hook
  const recaptcha = useReCaptcha({
    required: true,
    onSuccess: (token) => {
      if (errors.recaptcha) {
        setErrors(prev => ({ ...prev, recaptcha: '' }));
      }
    },
    onError: () => {
      setErrors(prev => ({ ...prev, recaptcha: 'Please complete the reCAPTCHA verification.' }));
    }
  });

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        setTokenError('No reset token provided. Please request a new password reset link.');
        return;
      }

      if (token.length !== 64) {
        setTokenValid(false);
        setTokenError('Invalid token format. Please request a new password reset link.');
        return;
      }

      try {
        const response = await api.get(`/auth/verify-reset-token/${token}`);
        
        if (response.data.success && response.data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenError(response.data.message || 'Invalid or expired reset token. Please request a new one.');
        }
      } catch (error) {
        logger.error('Token verification error', { error: error.message, stack: error.stack });
        setTokenValid(false);
        setTokenError(error.response?.data?.message || 'Failed to verify token. Please request a new password reset link.');
      }
    };

    verifyToken();
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // reCAPTCHA validation
    if (!recaptcha.isVerified) {
      newErrors.recaptcha = 'Please complete the reCAPTCHA verification';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const recaptchaToken = recaptcha.getToken();
      
      if (!recaptchaToken) {
        setErrors({ recaptcha: 'Please complete the reCAPTCHA verification.' });
        setIsSubmitting(false);
        return;
      }

      const response = await api.post('/auth/reset-password', {
        token: token,
        password: formData.password,
        recaptchaToken
      });

      if (response.data.success) {
        setSuccess(true);
        // Reset reCAPTCHA after successful submission
        if (recaptcha.ref?.current) {
          recaptcha.ref.current.reset();
        }
      } else {
        setErrors({ submit: response.data.message || 'Failed to reset password. Please try again.' });
      }
    } catch (error) {
      logger.error('Reset password error', { error: error.message, stack: error.stack });
      
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else if (error.response?.data?.errors) {
        const apiErrors = {};
        error.response.data.errors.forEach(err => {
          if (err.param === 'password') {
            apiErrors.password = err.msg;
          } else if (err.param === 'token') {
            setTokenValid(false);
            setTokenError(err.msg);
          } else if (err.param === 'recaptchaToken') {
            apiErrors.recaptcha = err.msg;
          }
        });
        setErrors(apiErrors);
      } else {
        setErrors({ submit: 'An unexpected error occurred. Please try again later.' });
      }
      
      // Reset reCAPTCHA on error
      if (recaptcha.ref?.current) {
        recaptcha.ref.current.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state (checking token)
  if (tokenValid === null) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center">
            <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Verifying reset token...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Invalid token state
  if (tokenValid === false) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center animate-fade-in-up">
              <div className="flex justify-center mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Invalid or Expired Token
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {tokenError || 'This password reset link is invalid or has expired.'}
              </p>
              <div className="space-y-3">
                <Link
                  to="/forgot-password"
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-300"
                >
                  Request New Reset Link
                </Link>
                <Link
                  to="/login"
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-md transition-colors duration-300"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Success state
  if (success) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center animate-fade-in-up">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Password Reset Successful
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <Link
                to="/login"
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-300"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Reset form (token is valid)
  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center animate-fade-in-up">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Reset Your Password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your new password below.
            </p>
          </div>

          {/* Reset Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 sm:p-8 space-y-6 animate-fade-in-up">
            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-10 py-2.5 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-300 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter new password (min. 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-10 py-2.5 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-300 ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
            </div>

            {/* reCAPTCHA */}
            <div>
              <div className="flex justify-center w-full">
                <div className="recaptcha-container-mobile sm:recaptcha-container-desktop">
                  <ReCaptchaComponent
                    ref={recaptcha.ref}
                    onVerify={recaptcha.onVerify}
                    onError={recaptcha.onError}
                    onExpire={recaptcha.onExpire}
                    className="w-full"
                  />
                </div>
              </div>
              {errors.recaptcha && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <span>{errors.recaptcha}</span>
                </div>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-sm text-red-800">{errors.submit}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={!recaptcha.isVerified || isSubmitting}
                className={`w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium text-white rounded-md transition-all duration-300 ${
                  !recaptcha.isVerified || isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors duration-300"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ResetPassword;

