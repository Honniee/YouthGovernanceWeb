import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Loader2,
  ArrowLeft,
  Copy,
  Check,
  Award,
  Shield,
  Send,
  RefreshCw
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import surveySubmissionService from '../../services/surveySubmissionService';
import ReCaptchaComponent from '../../components/ui/ReCaptchaComponent';
import { useReCaptcha } from '../../hooks/useReCaptcha';
import logger from '../../utils/logger.js';

const SurveySubmissionStatus = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resendParam = searchParams.get('resend');
  
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [errorYouthId, setErrorYouthId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showResendForm, setShowResendForm] = useState(resendParam === 'true');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState(null);
  const [resendFormData, setResendFormData] = useState({ youthId: '', email: '' });
  const [resendCooldown, setResendCooldown] = useState(0); // Cooldown timer in seconds
  const [lastResendTime, setLastResendTime] = useState(null); // Track last successful resend
  
  // reCAPTCHA hook
  const recaptcha = useReCaptcha({ 
    required: true,
    onError: () => {
      logger.error('reCAPTCHA verification failed', null);
    }
  });

  useEffect(() => {
    if (token) {
      fetchSubmission();
    } else if (resendParam === 'true') {
      // If resend=true but no token, show resend form directly
      setLoading(false);
      setShowResendForm(true);
    } else {
      setError('No access token provided. Please use the link from your email.');
      setLoading(false);
    }
  }, [token, resendParam]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorType(null);
      setErrorYouthId(null);
      const response = await surveySubmissionService.getSubmissionByToken(token);
      logger.debug('Survey submission response', { success: response.success, hasData: !!response.data });
      if (response.success) {
        logger.debug('Submission data loaded', { hasData: !!response.data });
        setSubmission(response.data);
      } else {
        logger.error('Failed to load submission', null, { message: response.message, errorType: response.errorType });
        setError(response.message || 'Failed to load submission');
        setErrorType(response.errorType || null);
        setErrorYouthId(response.youthId || null);
      }
    } catch (err) {
      logger.error('Error fetching submission', err, { token: token?.substring(0, 10) + '...' });
      const errorData = err.response?.data || {};
      setError(errorData.message || 'Failed to load submission. Please check your link.');
      setErrorType(errorData.errorType || null);
      setErrorYouthId(errorData.youthId || null);
    } finally {
      setLoading(false);
    }
  };

  // Cooldown timer effect
  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendCooldown]);

  // Check cooldown on mount and when form data changes
  useEffect(() => {
    if (lastResendTime) {
      const timeSinceLastResend = Math.floor((Date.now() - lastResendTime) / 1000);
      const cooldownPeriod = 60 * 60; // 1 hour in seconds
      const remainingCooldown = Math.max(0, cooldownPeriod - timeSinceLastResend);
      
      if (remainingCooldown > 0) {
        setResendCooldown(remainingCooldown);
      } else {
        setLastResendTime(null);
        setResendCooldown(0);
      }
    }
  }, [lastResendTime, resendFormData.youthId, resendFormData.email]);

  const handleResendEmail = async (e) => {
    e.preventDefault();
    
    // Check cooldown
    if (resendCooldown > 0) {
      const minutes = Math.floor(resendCooldown / 60);
      const seconds = resendCooldown % 60;
      setResendError(`Please wait ${minutes}:${seconds.toString().padStart(2, '0')} before requesting another email.`);
      return;
    }
    
    // Check reCAPTCHA verification
    if (!recaptcha.isVerified) {
      setResendError('Please complete the reCAPTCHA verification before submitting.');
      // Scroll to reCAPTCHA (try both possible IDs)
      const recaptchaElement = document.getElementById('resend-email-recaptcha') || 
                                document.getElementById('resend-email-recaptcha-error');
      if (recaptchaElement) {
        recaptchaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setResendLoading(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const response = await surveySubmissionService.resendEmail(
        resendFormData.youthId.trim(),
        resendFormData.email.trim(),
        recaptcha.token
      );
      
      if (response.success) {
        setResendSuccess(true);
        setLastResendTime(Date.now()); // Track successful resend
        setResendCooldown(60 * 60); // Set 1 hour cooldown
        setResendFormData({ youthId: '', email: '' });
        recaptcha.reset(); // Reset reCAPTCHA after successful submission
        setTimeout(() => {
          setShowResendForm(false);
          setResendSuccess(false);
        }, 3000);
      } else {
        setResendError(response.message || 'Failed to resend email');
        recaptcha.reset(); // Reset reCAPTCHA on error
      }
    } catch (err) {
      logger.error('Error resending email', err, { youthId: resendFormData.youthId });
      
      // Handle rate limit error specifically
      if (err.response?.status === 429) {
        const retryAfter = err.response?.data?.retryAfter || 3600;
        setResendCooldown(retryAfter);
        setLastResendTime(Date.now());
        setResendError(err.response?.data?.message || 'Too many requests. Please wait before requesting another email.');
      } else {
        setResendError(err.response?.data?.message || 'Failed to resend email. Please try again.');
      }
      recaptcha.reset(); // Reset reCAPTCHA on error
    } finally {
      setResendLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'validated':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      default:
        return <FileText className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'validated':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'validated':
        return 'Approved';
      case 'rejected':
        return 'Requires Revision';
      case 'pending':
        return 'Pending Review';
      default:
        return status;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getErrorCopy = (type) => {
    switch (type) {
      case 'expired_token':
        return {
          title: 'Link Expired',
          message: 'This link has expired. Request a new access link below.'
        };
      case 'invalid_token':
        return {
          title: 'Invalid or Old Link',
          message: 'This link is no longer valid. Use your latest email link or request a new one.'
        };
      case 'anonymized_profile':
        return {
          title: 'Submission Unavailable',
          message: 'This submission is no longer available. If you have questions, please contact support.'
        };
      case 'not_found':
        return {
          title: 'Submission Not Found',
          message: 'We could not find a submission for this link. Please verify your link or request a new one.'
        };
      case 'server_error':
        return {
          title: 'Service Unavailable',
          message: 'We are having trouble right now. Please try again in a moment.'
        };
      default:
        return {
          title: 'Access Error',
          message: 'Failed to load submission. Please check your link.'
        };
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-[#24345A] animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Loading your submission...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Show resend form if resend=true in URL (even without error)
  if (resendParam === 'true' && !token && !loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <Send className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Request New Email</h2>
              <p className="text-gray-600 mb-4">Enter your Youth ID and email to receive a new access link.</p>
            </div>
            
            <form onSubmit={handleResendEmail} className="space-y-4">
              {resendSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-green-800">
                    ✓ New access link has been sent to your email. Please check your inbox.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Youth ID
                    </label>
                    <input
                      type="text"
                      value={resendFormData.youthId}
                      onChange={(e) => setResendFormData({ ...resendFormData, youthId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your Youth ID"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={resendFormData.email}
                      onChange={(e) => setResendFormData({ ...resendFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  {resendError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-800">{resendError}</p>
                    </div>
                  )}
                  
                  {/* Cooldown timer */}
                  {resendCooldown > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <p className="text-sm text-blue-800">
                          Please wait <strong>{Math.floor(resendCooldown / 60)}:{(resendCooldown % 60).toString().padStart(2, '0')}</strong> before requesting another email.
                        </p>
                      </div>
                      <p className="text-xs text-blue-600 mt-1 text-center">
                        You can request up to 3 emails per hour.
                      </p>
                    </div>
                  )}
                  
                  {/* reCAPTCHA verification */}
                  <div id="resend-email-recaptcha" className="flex justify-center mb-4">
                    <ReCaptchaComponent
                      ref={recaptcha.ref}
                      onVerify={recaptcha.onVerify}
                      onError={recaptcha.onError}
                      onExpire={recaptcha.onExpire}
                      theme="light"
                      size="normal"
                    />
                  </div>
                  
                  {!recaptcha.isVerified && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-4">
                      <p className="text-xs text-yellow-800 text-center">
                        Please complete the reCAPTCHA verification to continue
                      </p>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={resendLoading || !recaptcha.isVerified || resendCooldown > 0}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send New Link
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
            
            <div className="mt-4 text-center">
              <Link
                to="/kk-survey"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← Back to Survey
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }


  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  const formatBirthday = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    });
  };

  // Show loading state
  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your submission...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Show error state
  if (error && !submission) {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] bg-gray-50 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="max-w-2xl w-full text-center">
            <h1 className="text-2xl font-bold text-black mb-4">KK Survey</h1>
            {(() => {
              const ec = getErrorCopy(errorType);
              return (
                <>
                  <div className="inline-flex items-center justify-center gap-2 text-red-700 font-semibold">
                    <XCircle className="w-5 h-5" />
                    <span>{ec.title}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{ec.message}</p>
                </>
              );
            })()}

            {errorType === 'expired_token' && (
              <div className="mt-6 max-w-md mx-auto">
                {!showResendForm ? (
                  <button
                    onClick={() => {
                      setShowResendForm(true);
                      setResendFormData({ youthId: errorYouthId || '', email: '' });
                      setResendError(null);
                    }}
                    className="w-full inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold text-white bg-[#24345A] hover:bg-[#1e2a47] shadow-md"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Request New Access Link
                  </button>
                ) : (
                  <form onSubmit={handleResendEmail} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Youth ID</label>
                      <input
                        type="text"
                        value={resendFormData.youthId}
                        onChange={(e) => setResendFormData({ ...resendFormData, youthId: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your Youth ID"
                        required
                      />
                      {errorYouthId && (
                        <p className="text-xs text-gray-600 mt-1">Your Youth ID: <strong>{errorYouthId}</strong></p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={resendFormData.email}
                        onChange={(e) => setResendFormData({ ...resendFormData, email: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    {resendError && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-800">{resendError}</p>
                      </div>
                    )}

                    {resendCooldown > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <p className="text-sm text-blue-800">
                            Please wait <strong>{Math.floor(resendCooldown / 60)}:{(resendCooldown % 60).toString().padStart(2, '0')}</strong> before requesting another email.
                          </p>
                        </div>
                      </div>
                    )}

                    <div id="resend-email-recaptcha-error" className="flex justify-center">
                      <ReCaptchaComponent
                        ref={recaptcha.ref}
                        onVerify={recaptcha.onVerify}
                        onError={recaptcha.onError}
                        onExpire={recaptcha.onExpire}
                        theme="light"
                        size="normal"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={resendLoading || !recaptcha.isVerified || resendCooldown > 0}
                        className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold text-white bg-[#24345A] hover:bg-[#1e2a47] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                      >
                        {resendLoading ? (
                          <>
                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Send New Link
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowResendForm(false);
                          setResendFormData({ youthId: '', email: '' });
                          setResendError(null);
                          recaptcha.reset();
                        }}
                        className="px-6 py-3 rounded-full font-semibold text-[#24345A] border-2 border-[#24345A] hover:bg-[#24345A] hover:text-white shadow-md"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div className="mt-6">
              <Link
                to="/kk-survey"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold text-white bg-[#24345A] hover:bg-[#1e2a47] shadow-md"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Survey
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // If no submission data, show message
  if (!submission) {
  return (
    <PublicLayout>
        <div className="min-h-[70vh] bg-gray-50 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="max-w-4xl w-full bg-white shadow-lg p-8 text-center">
            {/* Header - Matching Questionnaire Format */}
            <div className="border-b-2 border-black pb-4 mb-6">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-bold text-black">KK Survey</h1>
                <div className="text-right" />
              </div>
            </div>

            <div role="status" className="mb-6 text-center">
              <div className="inline-flex items-center justify-center gap-2 text-yellow-700 font-semibold">
                <AlertCircle className="w-5 h-5" />
                <span>No Submission Data</span>
                </div>
              <p className="mt-2 text-sm text-gray-700">
                Unable to load your survey submission. Please check your access link or contact support if the problem persists.
                  </p>
                </div>

            {/* Actions */}
            <div className="mt-6 pt-6 border-t-2 border-gray-300">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/kk-survey"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold text-white bg-[#24345A] hover:bg-[#1e2a47] shadow-md"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Survey
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  logger.debug('Rendering submission', { hasSubmission: !!submission, submissionId: submission?.response_id });

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white p-8 border border-gray-300 shadow-sm">
          {/* Header - Matching Questionnaire Format */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-black">KK Survey Questionnaire</h1>
              <div className="text-right text-sm">
                <div className="mb-1">
                  <span className="font-semibold">ANNEX 3</span>
                </div>
                <div className="flex gap-4 text-xs mt-2">
                  <div>
                    <span className="font-semibold">Respondent #:</span>
                    <span className="ml-2 border-b border-black inline-block min-w-[150px] text-left text-[10px]">
                      {submission.response_id || submission.youth_id || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Date:</span>
                    <span className="ml-2 border-b border-black inline-block min-w-[80px] text-left">
                      {submission.created_at ? formatDate(submission.created_at) : formatDate(new Date())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Introductory Message Box */}
          <div className="border-2 border-black p-4 mb-6 bg-white">
            <p className="font-bold mb-2 text-sm">TO THE RESPONDENT:</p>
            <p className="text-xs leading-relaxed text-justify">
              <strong>Good Day!</strong> This study aims to assess the demographic information of the Katipunan ng Kabataan. 
              Your participation in this survey is highly appreciated. Please answer all questions accurately and honestly. 
              <strong> ALL INFORMATION GATHERED FROM THIS FACE STUDY WILL BE TREATED WITH UTMOST CONFIDENTIALITY.</strong>
            </p>
          </div>

          {/* Section I: PROFILE */}
          <div className="mb-8 text-left">
            <h2 className="text-lg font-bold text-black mb-4 border-b-2 border-black pb-1">I. PROFILE</h2>
            
            {/* Name of Respondent */}
            <div className="mb-4">
              <p className="font-semibold mb-2 text-sm">Name of Respondent:</p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-gray-700 mb-1">Last Name</p>
                  <div className="border-b-2 border-black pb-1 min-h-[28px] text-sm">{submission.last_name || '—'}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-700 mb-1">Middle Name</p>
                  <div className="border-b-2 border-black pb-1 min-h-[28px] text-sm">{submission.middle_name || '—'}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-700 mb-1">Given Name</p>
                  <div className="border-b-2 border-black pb-1 min-h-[28px] text-sm">{submission.first_name || '—'}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-700 mb-1">Suffix</p>
                  <div className="border-b-2 border-black pb-1 min-h-[28px] text-sm">{submission.suffix || '—'}</div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="mb-4">
              <p className="font-semibold mb-2 text-sm">Location:</p>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <p className="text-xs text-gray-700 mb-1">Region</p>
                  <div className="border-b-2 border-black pb-1 min-h-[28px] text-xs">{submission.region_name || '—'}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-700 mb-1">Province</p>
                  <div className="border-b-2 border-black pb-1 min-h-[28px] text-xs">{submission.province_name || '—'}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-700 mb-1">City/Municipality</p>
                  <div className="border-b-2 border-black pb-1 min-h-[28px] text-xs">{submission.municipality_name || '—'}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-700 mb-1">Barangay</p>
                  <div className="border-b-2 border-black pb-1 min-h-[28px] text-xs">{submission.barangay_name || '—'}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-700 mb-1">Purok/Zone</p>
                  <div className="border-b-2 border-black pb-1 min-h-[28px] text-xs">{submission.purok_zone || '—'}</div>
                </div>
              </div>
            </div>

            {/* Sex Assigned By Birth, Age, and Birthday */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="font-semibold mb-2 text-sm">Sex Assigned By Birth:</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-default">
                    <input 
                      type="checkbox" 
                      checked={submission.gender === 'Male'} 
                      readOnly 
                      className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                      style={{ cursor: 'default' }}
                    />
                    <span className="text-sm">Male</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-default">
                    <input 
                      type="checkbox" 
                      checked={submission.gender === 'Female'} 
                      readOnly 
                      className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                      style={{ cursor: 'default' }}
                    />
                    <span className="text-sm">Female</span>
                  </label>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-2 text-sm">Age:</p>
                <div className="border-b-2 border-black pb-1 min-h-[28px] text-sm">{submission.age || '—'}</div>
              </div>
              <div>
                <p className="font-semibold mb-2 text-sm">Birthday:</p>
                <div className="border-b-2 border-black pb-1 min-h-[28px] text-sm">
                  {submission.birth_date ? formatBirthday(submission.birth_date) : '—'}
                </div>
              </div>
            </div>

            {/* Email and Contact */}
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="font-semibold mb-2 text-sm">Email Address:</p>
                <div className="border-b-2 border-black pb-1 min-h-[28px] text-sm">{submission.email || '—'}</div>
              </div>
              <div>
                <p className="font-semibold mb-2 text-sm">Contact #:</p>
                <div className="border-b-2 border-black pb-1 min-h-[28px] text-sm">{submission.contact_number || '—'}</div>
              </div>
            </div>
          </div>

          {/* Section II: DEMOGRAPHIC CHARACTERISTICS */}
          <div className="mb-8 text-left">
            <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-1">II. DEMOGRAPHIC CHARACTERISTICS</h2>
            <p className="text-xs mb-4 italic text-gray-700">Please put a check mark next to the word or phrase that matches your response.</p>
            
            {/* Civil Status */}
            <div className="mb-4 border-2 border-black p-3 bg-white">
              <p className="font-semibold mb-2 text-sm">Civil Status:</p>
              <div className="grid grid-cols-4 gap-x-4 gap-y-1">
                {['Single', 'Married', 'Widowed', 'Divorced', 'Separated', 'Annulled', 'Unknown', 'Live-in'].map((status) => (
                  <label key={status} className="flex items-center gap-2 cursor-default">
                    <input 
                      type="checkbox" 
                      checked={submission.civil_status === status || submission.demographics?.civil_status === status} 
                      readOnly 
                      className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                      style={{ cursor: 'default' }}
                    />
                    <span className="text-xs">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Youth Classification */}
            <div className="mb-4 border-2 border-black p-3 bg-white">
              <p className="font-semibold mb-2 text-sm">Youth Classification:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                {['In School Youth', 'Out of School Youth', 'Working Youth', 'Youth w/Specific Needs:'].map((classification) => (
                  <label key={classification} className="flex items-center gap-2 cursor-default">
                    <input 
                      type="checkbox" 
                      checked={submission.youth_classification === classification || submission.demographics?.youth_classification === classification} 
                      readOnly 
                      className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                      style={{ cursor: 'default' }}
                    />
                    <span className="text-xs">{classification}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-2">
                {['Person w/Disability', 'Children in Conflict w/ Law', 'Indigenous People'].map((need) => (
                  <label key={need} className="flex items-center gap-2 cursor-default">
                    <input 
                      type="checkbox" 
                      checked={submission.youth_specific_needs?.includes(need) || submission.demographics?.youth_specific_needs?.includes(need)} 
                      readOnly 
                      className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                      style={{ cursor: 'default' }}
                    />
                    <span className="text-xs">{need}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Youth Age Group */}
            <div className="mb-4 border-2 border-black p-3 bg-white">
              <p className="font-semibold mb-2 text-sm">Youth Age Group:</p>
              <div className="space-y-1">
                {['Child Youth (15-17 yrs old)', 'Core Youth (18-24 yrs old)', 'Young Adult (15-30 yrs old)'].map((ageGroup) => (
                  <label key={ageGroup} className="flex items-center gap-2 cursor-default">
                    <input 
                      type="checkbox" 
                      checked={submission.youth_age_group === ageGroup || submission.demographics?.youth_age_group === ageGroup} 
                      readOnly 
                      className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                      style={{ cursor: 'default' }}
                    />
                    <span className="text-xs">{ageGroup}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Work Status */}
            <div className="mb-4 border-2 border-black p-3 bg-white">
              <p className="font-semibold mb-2 text-sm">Work Status:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {['Employed', 'Unemployed', 'Self-Employed', 'Currently looking for a Job', 'Not interested looking for a job'].map((status) => (
                  <label key={status} className="flex items-center gap-2 cursor-default">
                    <input 
                      type="checkbox" 
                      checked={submission.work_status === status || submission.demographics?.work_status === status} 
                      readOnly 
                      className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                      style={{ cursor: 'default' }}
                    />
                    <span className="text-xs">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Educational Background */}
            <div className="mb-4 border-2 border-black p-3 bg-white">
              <p className="font-semibold mb-2 text-sm">Educational Background:</p>
              <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                {['Elementary Level', 'Elementary Grad', 'High School Level', 'High School Grad', 'Vocational Grad', 'College Level', 'College Grad', 'Masters Level', 'Masters Grad', 'Doctorate Level', 'Doctorate Graduate'].map((edu) => (
                  <label key={edu} className="flex items-center gap-2 cursor-default">
                    <input 
                      type="checkbox" 
                      checked={submission.educational_background === edu || submission.demographics?.educational_background === edu} 
                      readOnly 
                      className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                      style={{ cursor: 'default' }}
                    />
                    <span className="text-xs">{edu}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Registered SK Voter */}
            <div className="mb-4">
              <p className="font-semibold mb-2 text-sm">Registered SK Voter:</p>
              <div className="flex gap-8">
                <label className="flex items-center gap-2 cursor-default">
                  <input 
                    type="checkbox" 
                    checked={submission.registered_sk_voter === true || submission.civic?.registered_sk_voter === true} 
                    readOnly 
                    className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                    style={{ cursor: 'default' }}
                  />
                  <span className="text-xs">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-default">
                  <input 
                    type="checkbox" 
                    checked={submission.registered_sk_voter === false || submission.civic?.registered_sk_voter === false} 
                    readOnly 
                    className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                    style={{ cursor: 'default' }}
                  />
                  <span className="text-xs">No</span>
                </label>
              </div>
            </div>

            {/* Did you vote last SK election? */}
            <div className="mb-4">
              <p className="font-semibold mb-2 text-sm">Did you vote last SK election?:</p>
              <div className="flex gap-8">
                <label className="flex items-center gap-2 cursor-default">
                  <input 
                    type="checkbox" 
                    checked={submission.voted_last_sk === true || submission.civic?.voted_last_sk === true} 
                    readOnly 
                    className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                    style={{ cursor: 'default' }}
                  />
                  <span className="text-xs">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-default">
                  <input 
                    type="checkbox" 
                    checked={submission.voted_last_sk === false || submission.civic?.voted_last_sk === false} 
                    readOnly 
                    className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                    style={{ cursor: 'default' }}
                  />
                  <span className="text-xs">No</span>
                </label>
              </div>
            </div>

            {/* Registered National Voter? */}
            <div className="mb-4">
              <p className="font-semibold mb-2 text-sm">Registered National Voter?:</p>
              <div className="flex gap-8">
                <label className="flex items-center gap-2 cursor-default">
                  <input 
                    type="checkbox" 
                    checked={submission.registered_national_voter === true || submission.civic?.registered_national_voter === true} 
                    readOnly 
                    className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                    style={{ cursor: 'default' }}
                  />
                  <span className="text-xs">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-default">
                  <input 
                    type="checkbox" 
                    checked={submission.registered_national_voter === false || submission.civic?.registered_national_voter === false} 
                    readOnly 
                    className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                    style={{ cursor: 'default' }}
                  />
                  <span className="text-xs">No</span>
                </label>
              </div>
            </div>

            {/* Have you already attended a KK Assembly? */}
            <div className="mb-4">
              <p className="font-semibold mb-2 text-sm">Have you already attended a KK Assembly?:</p>
              <div className="flex gap-8 mb-2">
                <label className="flex items-center gap-2 cursor-default">
                  <input 
                    type="checkbox" 
                    checked={submission.attended_kk_assembly === true || submission.civic?.attended_kk_assembly === true} 
                    readOnly 
                    className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                    style={{ cursor: 'default' }}
                  />
                  <span className="text-xs">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-default">
                  <input 
                    type="checkbox" 
                    checked={submission.attended_kk_assembly === false || submission.civic?.attended_kk_assembly === false} 
                    readOnly 
                    className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                    style={{ cursor: 'default' }}
                  />
                  <span className="text-xs">No</span>
                </label>
              </div>
              <div className="ml-6 mt-2 mb-2">
                <p className="text-xs mb-1 font-semibold">If Yes, How many times?:</p>
                <div className="flex gap-4">
                  {['1-2 Times', '3-4 Times', '5 and above'].map((times) => (
                    <label key={times} className="flex items-center gap-2 cursor-default">
                      <input 
                        type="checkbox" 
                        checked={submission.times_attended === times || submission.civic?.kkAssemblyTimes === times} 
                        readOnly 
                        className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                        style={{ cursor: 'default' }}
                      />
                      <span className="text-xs">{times}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="ml-6 mt-2">
                <p className="text-xs mb-1 font-semibold">If No, Why?:</p>
                <div className="flex gap-4">
                  {['There was no KK Assembly Meeting', 'Not interested to Attend'].map((reason) => (
                    <label key={reason} className="flex items-center gap-2 cursor-default">
                      <input 
                        type="checkbox" 
                        checked={submission.reason_not_attended === reason || submission.civic?.reason_not_attended === reason || submission.civic?.notAttendedReason === reason} 
                        readOnly 
                        className="w-4 h-4 accent-black cursor-default pointer-events-none" 
                        style={{ cursor: 'default' }}
                      />
                      <span className="text-xs">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Thank you message */}
          <div className="mt-8 mb-6 text-left">
            <p className="text-base font-semibold">Thank you for your participation!</p>
          </div>

          {/* Status Message */}
          {submission.validation_status === 'validated' && (
            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Award className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900 mb-1">Submission Approved</p>
                  <p className="text-green-800 text-sm mb-2">
                    Your survey submission has been validated and approved. Thank you for your participation!
                  </p>
                  {submission.validator_name && (
                    <p className="text-xs text-green-700 mt-2">
                      Validated by: {submission.validator_name}
                      {submission.validation_date && (
                        <span className="ml-2">
                          on {new Date(submission.validation_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {submission.validation_status === 'rejected' && (
            <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 mb-1">Submission Requires Revision</p>
                  <p className="text-red-800 text-sm mb-2">
                    Your submission requires revision or additional information.
                  </p>
                  {submission.validation_comments && (
                    <div className="mt-3 p-3 bg-white rounded-md border border-red-200">
                      <p className="text-xs font-semibold text-red-900 mb-1">Comments from Reviewer:</p>
                      <p className="text-sm text-red-800 whitespace-pre-wrap">{submission.validation_comments}</p>
                    </div>
                  )}
                  {submission.validator_name && (
                    <p className="text-xs text-red-700 mt-2">
                      Reviewed by: {submission.validator_name}
                      {submission.validation_date && (
                        <span className="ml-2">
                          on {new Date(submission.validation_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {submission.validation_status === 'pending' && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900 mb-1">Pending Review</p>
                  <p className="text-yellow-800 text-sm">
                    Your submission is currently under review. You will receive an email notification once the review is complete.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 pt-6 border-t-2 border-gray-300">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/kk-survey"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full font-semibold text-sm text-white bg-[#24345A] hover:bg-[#1e2a47] shadow-md"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Survey
              </Link>
              <button
                onClick={() => copyToClipboard(window.location.href)}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full font-semibold text-sm text-[#24345A] border-2 border-[#24345A] hover:bg-[#24345A] hover:text-white shadow-md"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Information */}
          <div className="mt-6 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Data Privacy Notice</p>
                <p className="mb-2">
                  This link will expire in 72 hours. Your personal data is protected under the Data Privacy Act of 2012 (RA 10173). 
                  {' '}
                  <Link 
                    to="/survey-submission/status?resend=true" 
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    If you need a new link
                  </Link>
                  {' '}
                  or have questions, please contact us at{' '}
                  <a 
                    href="mailto:lydo@sanjosebatangas.gov.ph" 
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    lydo@sanjosebatangas.gov.ph
                  </a>
                  .
                </p>
                <p className="mb-2">
                  <Link 
                    to="/data-subject-rights" 
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Request access, correction, or deletion of your data →
                  </Link>
                </p>
                {submission.youth_id && (
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Note:</strong> You'll need your Youth ID ({submission.youth_id}) when submitting a request.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default SurveySubmissionStatus;

