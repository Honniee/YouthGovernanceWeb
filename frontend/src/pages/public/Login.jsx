import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Shield } from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import ReCaptchaComponent from '../../components/ui/ReCaptchaComponent';
import { useReCaptcha } from '../../hooks/useReCaptcha';
import ErrorModal from '../../components/ui/ErrorModal';
import SuccessModal from '../../components/ui/SuccessModal';

import sanJoseLogo from '../../assets/logos/san_jose_logo.webp';
import heroVideo from '../../assets/media/hero.mp4';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal states
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  
  // Form ref for better control
  const formRef = useRef(null);

  // Initialize reCAPTCHA hook
  const recaptcha = useReCaptcha({
    required: true,
    onSuccess: (token) => {
      // reCAPTCHA verified successfully
    },
    onError: () => {
      // reCAPTCHA verification failed
    }
  });

  // Role-based redirection helper
  const getRoleBasedRedirect = (user) => {
    if (!user) return '/';
    
    switch (user.userType) {
      case 'lydo_staff':
        // Check if admin or staff
        return user.role === 'admin' ? '/admin' : '/staff';
      case 'sk_official':
        return '/sk';
      case 'youth':
        return '/'; // Youth stays on public site for now
      default:
        return '/';
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = getRoleBasedRedirect(user);
      navigate(redirectPath);
    }
  }, [isAuthenticated, user, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // reCAPTCHA validation
    if (!recaptcha.isVerified) {
      newErrors.recaptcha = 'Please complete the reCAPTCHA verification';
    }
    
    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleSubmit = async (e) => {
    // Prevent form submission and page refresh
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent multiple submissions
    if (isSubmitting) {
      return false;
    }
    
    // Ensure reCAPTCHA is verified
    if (!recaptcha.isVerified) {
      setErrorModal({ isOpen: true, message: 'Please complete the reCAPTCHA verification' });
      return false;
    }
    
    // Clear previous errors
    setErrors({});
    
    // Validate form before proceeding
    const validationResult = validateForm();
    if (!validationResult.isValid) {
      // Get the first error from the validation result
      const errorMessages = Object.values(validationResult.errors);
      const firstError = errorMessages[0];
      
      if (firstError) {
        setTimeout(() => {
          setErrorModal({ isOpen: true, message: firstError });
        }, 0);
      } else {
        setTimeout(() => {
          setErrorModal({ isOpen: true, message: 'Please fix the form errors and try again.' });
        }, 0);
      }
      return false;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await login(formData.email, formData.password, formData.rememberMe, recaptcha.token);
      
      if (result && result.success) {
        setSuccessModal({ isOpen: true, message: 'Login successful! Redirecting...' });
        // Force immediate redirect if user data is available
        const currentUser = authService.getStoredUser();
        if (currentUser) {
          const redirectPath = getRoleBasedRedirect(currentUser);
          navigate(redirectPath);
        }
      } else {
        // Show error message from backend
        const errorMessage = result.message || 'Login failed. Please check your credentials and try again.';
        
        setTimeout(() => {
          setErrorModal({ 
            isOpen: true, 
            message: errorMessage 
          });
        }, 0);
      }
    } catch (error) {
      setTimeout(() => {
        setErrorModal({ 
          isOpen: true, 
          message: 'An unexpected error occurred. Please try again later.' 
        });
      }, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      {/* Video Background */}
      <div className="relative min-h-screen overflow-hidden -mt-16 sm:mt-0">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover scale-105"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          {/* Overlay with gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/40 to-black/50"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center pt-20 pb-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-6xl">
            {/* Main Card with enhanced animations */}
            <div className="bg-white shadow-2xl overflow-hidden transform transition-all duration-700 ease-out hover:shadow-3xl animate-fade-in-up">
              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
                
                {/* Left Section - Information Panel */}
                <div className="bg-gradient-to-br from-[#24345A] to-[#1e2a47] p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center text-white">
                  {/* Logo and Title */}
                  <div className="mb-4 sm:mb-6 animate-fade-in-left">
                    <div className="flex items-center mb-3 sm:mb-4">
                      <div className="relative mr-3 sm:mr-4">
                        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-full"></div>
                        <div className="relative p-2 sm:p-3">
                          <img 
                            src={sanJoseLogo} 
                            alt="San Jose Logo" 
                            className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain"
                          />
                        </div>
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">LYDO Portal</h1>
                        <p className="text-blue-200 text-sm sm:text-base">Youth Governance System</p>
                      </div>
                    </div>
                  </div>

                  {/* Quote Section */}
                  <div className="mb-3 sm:mb-4 animate-fade-in-left delay-200">
                    <div className="relative text-center">
                      <div className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white/30 absolute -top-1 sm:-top-2 -left-1 sm:-left-2">"</div>
                      <blockquote className="text-sm sm:text-base lg:text-lg font-medium leading-relaxed px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                        To ignite youth involvement in public and civic affairs that ought to inculcate patriotism, nationalism, and other desirable values in the youth and empower them to play a vital role in their own development as well as in our community.
                      </blockquote>
                      <div className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white/30 absolute -bottom-2 sm:-bottom-4 -right-1 sm:-right-2">"</div>
                      <div className="text-center mt-4 sm:mt-6 text-white/90 text-xs sm:text-sm font-medium">
                        - LYDO Mission
                      </div>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="mt-4 sm:mt-6 animate-fade-in-left delay-400">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-white font-medium mb-1 text-center">
                        Official portal for LYDO staff and authorized personnel only
                      </p>
                      <p className="text-[10px] sm:text-xs text-white/80 text-center">
                        Protected by advanced security measures
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Section - Login Form */}
                <div className="p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center animate-fade-in-right">
                  {/* Form Header */}
                  <div className="text-center mb-4 sm:mb-6 lg:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                      Sign In
                    </h2>
                    <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-gray-700 font-medium text-center">
                        Welcome back! Please enter your credentials to continue.
                      </p>
                    </div>
                  </div>

                  {/* Login Form */}
                  <form 
                    ref={formRef}
                    onSubmit={handleSubmit} 
                    noValidate
                    className="space-y-3 sm:space-y-4 lg:space-y-6"
                  >
                    {/* Email Field */}
                    <div className="animate-fade-in-up delay-400">
                      <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Email Address *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-colors duration-300 group-focus-within:text-blue-500" />
                        </div>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border border-gray-300 bg-white hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 text-sm sm:text-base"
                          placeholder="Enter your email"
                        />
                      </div>
                      {errors.email && (
                        <div className="mt-1 sm:mt-2 flex items-center text-xs sm:text-sm text-red-600 animate-shake">
                          <span className="mr-1">  </span>
                          {errors.email}
                        </div>
                      )}
                    </div>

                    {/* Password Field */}
                    <div className="animate-fade-in-up delay-500">
                      <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Password *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-colors duration-300 group-focus-within:text-blue-500" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="block w-full pl-10 pr-12 py-2.5 sm:py-3 border border-gray-300 bg-white hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 text-sm sm:text-base"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-300"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                          ) : (
                            <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <div className="mt-1 sm:mt-2 flex items-center text-xs sm:text-sm text-red-600 animate-shake">
                          <span className="mr-1"> </span>
                          {errors.password}
                        </div>
                      )}
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 animate-fade-in-up delay-600">
                      <div className="flex items-center">
                        <input
                          id="rememberMe"
                          name="rememberMe"
                          type="checkbox"
                          checked={formData.rememberMe}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 transition-colors duration-300"
                        />
                        <label htmlFor="rememberMe" className="ml-2 block text-xs sm:text-sm text-gray-700 cursor-pointer">
                          Remember me
                        </label>
                      </div>
                      <Link
                        to="/forgot-password"
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors duration-300"
                      >
                        Forgot Password?
                      </Link>
                    </div>

                    {/* reCAPTCHA */}
                    <div className="animate-fade-in-up delay-700">
                      <div className="w-full max-w-full overflow-visible sm:overflow-hidden">
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
                      </div>
                      {errors.recaptcha && (
                        <div className="mt-1 sm:mt-2 flex items-center text-xs sm:text-sm text-red-600 animate-shake">
                          <span className="mr-1"> </span>
                          {errors.recaptcha}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="animate-fade-in-up delay-800">
                      <button
                        type="submit"
                        disabled={!recaptcha.isVerified || isSubmitting}
                        className={`w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-transparent text-xs sm:text-sm font-medium text-white transition-all duration-300 ${
                          !recaptcha.isVerified || isSubmitting
                            ? 'bg-gray-400 cursor-not-allowed transform scale-95'
                            : 'bg-[#24345A] hover:bg-[#1e2a47] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24345A] hover:shadow-lg'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                            <span className="animate-pulse text-xs sm:text-sm">Signing in...</span>
                          </>
                        ) : !recaptcha.isVerified ? (
                          <>
                            <Shield className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                            <span className="text-xs sm:text-sm">Complete reCAPTCHA to continue</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs sm:text-sm">Sign in</span>
                            <ArrowRight className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                          </>
                        )}
                      </button>
                      
                      {/* Helper text for disabled button */}
                      {!recaptcha.isVerified && (
                        <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-1 sm:mt-2 flex items-center justify-center gap-1 animate-fade-in">
                          <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          Please complete the reCAPTCHA verification above to enable sign in
                        </p>
                      )}
                    </div>
                  </form>

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .animate-fade-in-left {
          animation: fadeInLeft 0.6s ease-out forwards;
        }

        .animate-fade-in-right {
          animation: fadeInRight 0.6s ease-out forwards;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .delay-700 { animation-delay: 0.7s; }
        .delay-800 { animation-delay: 0.8s; }
        .delay-900 { animation-delay: 0.9s; }
        .delay-1000 { animation-delay: 1.0s; }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .animate-fade-in-up,
          .animate-fade-in-left,
          .animate-fade-in-right {
            animation-duration: 0.4s;
          }
        }

        /* Touch-friendly interactions */
        @media (hover: none) and (pointer: coarse) {
          /* Removed scale hover effects for touch devices */
        }
        
        /* Mobile reCAPTCHA specific styles */
        @media (max-width: 640px) {
          .recaptcha-container {
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            justify-content: center !important;
          }
          
          /* Ensure the reCAPTCHA grid is fully visible on mobile */
          .recaptcha-widget-container {
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
            min-width: 304px !important;
            transform: scale(0.9) !important;
            transform-origin: center !important;
          }
          
          /* Make sure the reCAPTCHA iframe doesn't get cut off */
          .recaptcha-widget iframe {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 304px !important;
            height: 78px !important;
            overflow: hidden !important;
          }
          
          /* Fix for reCAPTCHA challenge container */
          .g-recaptcha {
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            transform: scale(0.9) !important;
            transform-origin: center !important;
          }
          
          /* Ensure the challenge grid is fully accessible */
          .g-recaptcha iframe {
            width: 304px !important;
            height: 78px !important;
            overflow: visible !important;
          }
          
          /* Fix for the challenge popup on mobile */
          .recaptcha-checkbox-border {
            width: 304px !important;
            height: 78px !important;
          }
          
          /* Mobile container specific styles */
          .recaptcha-container-mobile {
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 auto !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
          
          /* Ensure challenge popup is fully visible */
          .recaptcha-challenge-popup {
            width: 100% !important;
            max-width: 100% !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            position: fixed !important;
            z-index: 9999 !important;
          }
          
          /* Fix for the 3x3 grid challenge */
          .recaptcha-challenge-grid {
            width: 100% !important;
            max-width: 304px !important;
            overflow: visible !important;
          }
          
          /* Ensure challenge images are properly sized */
          .recaptcha-challenge-image {
            width: 100% !important;
            height: auto !important;
            max-width: 304px !important;
          }
        }
        
        /* Desktop reCAPTCHA container */
        .recaptcha-container-desktop {
          width: 100% !important;
          max-width: 100% !important;
        }
        
        /* Global reCAPTCHA mobile fixes */
        @media (max-width: 640px) {
          /* Ensure the reCAPTCHA challenge popup is centered and fully visible */
          .g-recaptcha-bubble-arrow {
            display: none !important;
          }
          
          /* Fix for the challenge container positioning */
          .recaptcha-checkbox {
            margin: 0 auto !important;
            display: block !important;
          }
          
          /* Ensure the challenge popup doesn't get cut off */
          body.recaptcha-challenge-open {
            overflow-x: auto !important;
            overflow-y: auto !important;
          }
          
          /* Fix for the challenge popup positioning */
          .recaptcha-checkbox-popup {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 9999 !important;
            width: 90% !important;
            max-width: 304px !important;
            max-height: 90vh !important;
            overflow: auto !important;
          }
          
          /* Ensure the challenge grid is properly sized */
          .recaptcha-challenge {
            width: 100% !important;
            max-width: 304px !important;
            margin: 0 auto !important;
          }
        }
        
        /* Tablet reCAPTCHA styles */
        @media (min-width: 641px) and (max-width: 1024px) {
          .recaptcha-container {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            overflow-y: visible !important;
          }
        }
      `}</style>
      
      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        title="Login Error"
      />
      
      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        message={successModal.message}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        title="Login Successful"
      />
    </PublicLayout>
  );
};

export default Login;