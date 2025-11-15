import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Loader2, Lock, Shield, ArrowRight, UserCheck } from 'lucide-react';
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
      // Get reCAPTCHA token - use token property or getValue method
      const recaptchaToken = recaptcha.token || recaptcha.getValue();
      
      if (!recaptchaToken || !recaptcha.isVerified) {
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
      // Log full error details for debugging
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      logger.error('Forgot password error', { 
        error: error,
        message: error.message, 
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: error.config
      });
      
      // Handle different error types
      // The API interceptor transforms errors, so check both structures
      const errorData = error.data || error.response?.data;
      const errorMessage = error.message || errorData?.message;
      const errorStatus = error.status || error.response?.status;
      const errorErrors = error.errors || errorData?.errors;
      
      if (errorStatus) {
        // Server responded with error status
        if (errorMessage) {
          setErrors({ submit: errorMessage });
        } else if (errorErrors && Array.isArray(errorErrors)) {
          const apiErrors = {};
          errorErrors.forEach(err => {
            if (err.param === 'email') {
              apiErrors.email = err.msg;
            } else if (err.param === 'recaptchaToken') {
              apiErrors.recaptcha = err.msg;
            }
          });
          setErrors(apiErrors);
        } else if (errorStatus === 429) {
          setErrors({ submit: 'Too many requests. Please wait a moment and try again.' });
        } else if (errorStatus >= 500) {
          setErrors({ submit: 'Server error. Please try again later.' });
        } else {
          setErrors({ submit: errorData?.error || 'An error occurred. Please try again.' });
        }
      } else if (error.isNetworkError || error.request || (!error.response && !error.status)) {
        // Network error or request was made but no response received
        setErrors({ submit: 'Network error. Please check your connection and try again.' });
      } else {
        // Error setting up the request or unknown error
        setErrors({ submit: errorMessage || 'An unexpected error occurred. Please try again later.' });
      }
      
      if (recaptcha.ref?.current) {
        recaptcha.ref.current.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout showHeader={false} showFooter={true}>
      {/* Custom Header - Similar to SurveyPageHeader */}
      {/* Top utility bar */}
      <div className="bg-[#24345A] fixed top-0 left-0 right-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-xs text-white/85 hover:text-white hover:bg-white/10 px-2.5 py-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <ArrowLeft className="w-3.5 h-3.5 opacity-90" />
            <span className="tracking-wide">Back to Website</span>
          </Link>
          <a
            href="mailto:lydo@sanjosebatangas.gov.ph"
            title="Contact LYDO via email"
            className="inline-flex items-center gap-2 text-xs text-white/85 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 px-2.5 py-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Mail className="w-3.5 h-3.5 opacity-90" />
            <span className="tracking-wide">lydo@sanjosebatangas.gov.ph</span>
          </a>
        </div>
      </div>

      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200 fixed top-[40px] left-0 right-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 sm:py-4">
            {/* Desktop: Horizontal Layout */}
            <div className="hidden sm:grid grid-cols-3 items-center">
              {/* Left: Municipality Info */}
              <div className="flex items-center gap-3">
                <img 
                  src={new URL('../../assets/logos/san_jose_logo.webp', import.meta.url).toString()} 
                  alt="Municipality Seal" 
                  className="w-9 h-9 rounded-full border" 
                />
                <div>
                  <div className="text-sm text-gray-600">Municipality of San Jose, Batangas</div>
                  <div className="text-xs text-gray-500">Local Youth Development Office</div>
                </div>
              </div>

              {/* Center: Page Title */}
              <div className="flex justify-center">
                <h1 className="text-xl font-bold text-gray-900">Password Recovery</h1>
              </div>

              {/* Right: Empty for balance */}
              <div></div>
            </div>

            {/* Mobile: Stacked Layout */}
            <div className="block sm:hidden">
              <div className="flex items-center gap-2">
                <img 
                  src={new URL('../../assets/logos/san_jose_logo.webp', import.meta.url).toString()} 
                  alt="Municipality Seal" 
                  className="w-7 h-7 rounded-full border flex-shrink-0" 
                />
                <div className="text-left flex-1">
                  <div className="text-xs text-gray-600 leading-tight">Municipality of San Jose, Batangas</div>
                  <div className="text-xs text-gray-500 leading-tight">Local Youth Development Office</div>
                </div>
              </div>
              <div className="text-center mt-2">
                <h1 className="text-lg font-bold text-gray-900">Password Recovery</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimalist Background with Subtle Patterns */}
      <div className="min-h-screen relative pt-[144px] overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20"></div>
        
        {/* Minimalist Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Subtle Circles */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-100/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50/10 rounded-full blur-3xl"></div>
          
          {/* Subtle Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: 'linear-gradient(to right, #24345A 1px, transparent 1px), linear-gradient(to bottom, #24345A 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          ></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-[calc(100vh-144px)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="w-full max-w-md">
            {success ? (
              /* Success State - Modern Card Design */
              <div className="bg-white/80 backdrop-blur-sm shadow-xl border border-gray-100/50 p-8 sm:p-10 transform transition-all duration-500 ease-out">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Check Your Email</h1>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    If an account exists with that email, a password reset link has been sent.
                  </p>
                  <p className="text-sm text-gray-500 mb-8">
                    Please check your inbox and follow the instructions. The link will expire in 1 hour.
                  </p>
                  
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      className="w-full group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#24345A] text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md hover:bg-[#1a2a4a] hover:shadow-lg hover:scale-[1.02]"
                    >
                      <span>Back to Login</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
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
                      className="w-full inline-flex items-center justify-center px-6 py-3.5 border-2 border-gray-200 text-gray-700 bg-white rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-300"
                    >
                      Request Another Link
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Reset Form - Modern Card Design */
              <div className="bg-white/80 backdrop-blur-sm shadow-xl border border-gray-100/50 p-8 sm:p-10 transform transition-all duration-500 ease-out">
                {/* Header Section */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#24345A]/10 rounded-2xl mb-4">
                    <Lock className="h-8 w-8 text-[#24345A]" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Enter your personal email address and we'll send you a secure link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Personal Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
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
                        className={`block w-full pl-12 pr-4 py-3.5 border-2 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#24345A]/20 focus:border-[#24345A] sm:text-sm transition-all duration-200 ${
                          errors.email ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-gray-200'
                        }`}
                        placeholder="Enter your personal email"
                      />
                    </div>
                    {errors.email && (
                      <div className="mt-2 flex items-center text-sm text-red-600">
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
                      <div className="mt-2 flex items-center justify-center text-sm text-red-600">
                        <span>{errors.recaptcha}</span>
                      </div>
                    )}
                  </div>

                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                      <p className="text-sm text-red-800 font-medium">{errors.submit}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={!recaptcha.isVerified || isSubmitting}
                      className={`w-full group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md ${
                        !recaptcha.isVerified || isSubmitting
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-[#24345A] text-white hover:bg-[#1a2a4a] hover:shadow-lg hover:scale-[1.02]'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin w-5 h-5" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Reset Link</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Back to Login */}
                  <div className="text-center pt-2">
                    <Link
                      to="/login"
                      className="inline-flex items-center text-sm text-[#24345A] hover:text-[#1a2a4a] font-medium transition-colors duration-200"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Back to Login
                    </Link>
                  </div>
                </form>

                {/* Security Info */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Shield className="w-4 h-4" />
                    <span>Your information is secure and encrypted</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ForgotPassword;
