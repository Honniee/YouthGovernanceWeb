import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import ReCaptchaComponent from '../../components/ui/ReCaptchaComponent';
import { useReCaptcha } from '../../hooks/useReCaptcha';
import api from '../../services/api';
import logger from '../../utils/logger';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize reCAPTCHA hook
  const recaptcha = useReCaptcha({
    required: true,
    onSuccess: (token) => {
      // reCAPTCHA verified successfully
      if (errors.recaptcha) {
        setErrors(prev => ({ ...prev, recaptcha: '' }));
      }
    },
    onError: () => {
      // reCAPTCHA verification failed
      setErrors(prev => ({ ...prev, recaptcha: 'Please complete the reCAPTCHA verification.' }));
    }
  });

  const handleInputChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear email error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
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

      const response = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
        recaptchaToken
      });

      if (response.data.success) {
        setSuccess(true);
        // Reset reCAPTCHA after successful submission
        if (recaptcha.ref?.current) {
          recaptcha.ref.current.reset();
        }
      } else {
        setErrors({ submit: response.data.message || 'Failed to send reset email. Please try again.' });
      }
    } catch (error) {
      logger.error('Forgot password error', { error: error.message, stack: error.stack });
      
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else if (error.response?.data?.errors) {
        const apiErrors = {};
        error.response.data.errors.forEach(err => {
          if (err.param === 'email') {
            apiErrors.email = err.msg;
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

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center animate-fade-in-up">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Forgot Password?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your personal email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            /* Success Message */
            <div className="bg-white rounded-lg shadow-lg p-8 text-center animate-fade-in-up">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Check Your Email
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                If an account exists with that email, a password reset link has been sent.
              </p>
              <p className="text-xs text-gray-500 mb-6">
                Please check your inbox and follow the instructions to reset your password.
                The link will expire in 1 hour.
              </p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-300"
                >
                  Back to Login
                </Link>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                    setErrors({});
                    if (recaptcha.ref?.current) {
                      recaptcha.ref.current.reset();
                    }
                  }}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-md transition-colors duration-300"
                >
                  Request Another Link
                </button>
              </div>
            </div>
          ) : (
            /* Reset Form */
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 sm:p-8 space-y-6 animate-fade-in-up">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-300 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your personal email"
                  />
                </div>
                {errors.email && (
                  <div className="mt-1 flex items-center text-sm text-red-600">
                    <span>{errors.email}</span>
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
                  <p className="text-sm text-red-800">{errors.submit}</p>
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
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>

              {/* Back to Login */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors duration-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default ForgotPassword;

