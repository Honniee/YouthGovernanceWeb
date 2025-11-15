import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Loader2, Lock, Shield, ArrowRight } from 'lucide-react';
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
      if (errors.recaptcha) {
        setErrors(prev => ({ ...prev, recaptcha: '' }));
      }
    },
    onError: () => {
      setErrors(prev => ({ ...prev, recaptcha: 'Please complete the reCAPTCHA verification.' }));
    }
  });

  const handleInputChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
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
      
      if (recaptcha.ref?.current) {
        recaptcha.ref.current.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[900px]">
          {success ? (
            /* Success State - Two Column Layout */
            <div className="bg-white overflow-hidden transform transition-all duration-700 ease-out animate-fade-in-up rounded-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
                
                {/* Left Section - Success Information Panel */}
                <div className="bg-gradient-to-br from-[#24345A] to-[#1e2a47] p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center text-white relative overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 right-10 w-20 h-20 border border-white/20 rounded-full"></div>
                    <div className="absolute top-32 right-20 w-12 h-12 bg-white/10 rounded-lg rotate-45"></div>
                    <div className="absolute bottom-20 left-10 w-16 h-16 border border-white/15 rounded-full"></div>
                    <div className="absolute bottom-32 left-20 w-8 h-8 bg-white/10 rounded-full"></div>
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full"></div>
                    <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/15 rounded-full"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-2.5 h-2.5 bg-white/25 rounded-full"></div>
                    <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-white/20 rounded-full"></div>
                    <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 text-center">
                    <div className="flex justify-center mb-4">
                      <CheckCircle className="h-16 w-16 text-green-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">Check Your Email</h1>
                    <p className="text-blue-200 text-sm sm:text-base mb-4">Password Reset Request</p>
                    <p className="text-sm sm:text-base leading-relaxed px-4">
                      If an account exists with that email, a password reset link has been sent.
                    </p>
                    <p className="text-xs sm:text-sm text-blue-300 mt-4 px-4">
                      Please check your inbox and follow the instructions. The link will expire in 1 hour.
                    </p>
                  </div>
                </div>

                {/* Right Section - Action Buttons */}
                <div className="bg-white p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center">
                  <div className="space-y-4">
                    <Link
                      to="/login"
                      className="w-full group inline-flex items-center justify-center gap-2 px-4 sm:px-8 py-3 sm:py-4 bg-[#24345A] text-white rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 shadow-lg hover:bg-[#1a2a4a] hover:shadow-xl hover:scale-105"
                    >
                      <span>Back to Login</span>
                      <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4 transition-transform duration-200 group-hover:translate-x-1" />
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
                      className="w-full inline-flex items-center justify-center px-4 sm:px-8 py-3 sm:py-4 border border-gray-300 text-gray-700 bg-white rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 hover:bg-gray-50"
                    >
                      Request Another Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Reset Form - Two Column Layout */
            <div className="bg-white overflow-hidden transform transition-all duration-700 ease-out animate-fade-in-up rounded-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
                
                {/* Left Section - Information Panel */}
                <div className="bg-gradient-to-br from-[#24345A] to-[#1e2a47] p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center text-white relative overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 right-10 w-20 h-20 border border-white/20 rounded-full"></div>
                    <div className="absolute top-32 right-20 w-12 h-12 bg-white/10 rounded-lg rotate-45"></div>
                    <div className="absolute bottom-20 left-10 w-16 h-16 border border-white/15 rounded-full"></div>
                    <div className="absolute bottom-32 left-20 w-8 h-8 bg-white/10 rounded-full"></div>
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full"></div>
                    <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/15 rounded-full"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-2.5 h-2.5 bg-white/25 rounded-full"></div>
                    <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-white/20 rounded-full"></div>
                    <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 text-center">
                    <div className="mb-3 sm:mb-4">
                      <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-full bg-white/20 text-white ring-1 ring-white/30">
                        <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                        Password Recovery
                      </div>
                    </div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Forgot Password?</h1>
                    <p className="text-blue-200 text-sm sm:text-base mb-4">LYDO Youth Governance</p>
                    <div className="relative text-center">
                      <blockquote className="text-sm sm:text-base lg:text-lg font-medium leading-relaxed px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                        Enter your personal email address and we'll send you a secure link to reset your password.
                      </blockquote>
                    </div>
                    <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2 text-xs sm:text-sm text-blue-300">
                      <Shield className="w-4 h-4" />
                      <span>Secure & Private</span>
                    </div>
                  </div>
                </div>

                {/* Right Section - Form */}
                <div className="bg-white p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center">
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                          className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#24345A] focus:border-[#24345A] sm:text-sm transition-colors duration-300 ${
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
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{errors.submit}</p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div>
                      <button
                        type="submit"
                        disabled={!recaptcha.isVerified || isSubmitting}
                        className={`w-full group inline-flex items-center justify-center gap-2 px-4 sm:px-8 py-3 sm:py-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 shadow-lg ${
                          !recaptcha.isVerified || isSubmitting
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-[#24345A] text-white hover:bg-[#1a2a4a] hover:shadow-xl hover:scale-105'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="animate-spin w-4 h-4" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <span>Send Reset Link</span>
                            <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4 transition-transform duration-200 group-hover:translate-x-1" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Back to Login */}
                    <div className="text-center pt-2">
                      <Link
                        to="/login"
                        className="inline-flex items-center text-sm text-[#24345A] hover:text-[#1a2a4a] font-medium transition-colors duration-300"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Login
                      </Link>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default ForgotPassword;
