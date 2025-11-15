import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Download,
  Edit,
  Trash2,
  Ban,
  UserMinus
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import dataSubjectRightsService from '../../services/dataSubjectRightsService';
import ReCaptchaComponent from '../../components/ui/ReCaptchaComponent';
import { useReCaptcha } from '../../hooks/useReCaptcha';
import logger from '../../utils/logger.js';

const DataSubjectRights = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    requestType: '',
    requesterEmail: '',
    youthId: '',
    email: '',
    requestDescription: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const recaptcha = useReCaptcha({
    required: true,
    onSuccess: () => {
      setError(null);
    },
    onError: () => {
      setError('Please complete the reCAPTCHA verification before submitting.');
    },
  });

  const requestTypes = [
    {
      value: 'access',
      label: 'Right to Access',
      description: 'Request access to your personal data',
      icon: <FileText className="w-6 h-6" />,
    },
    {
      value: 'rectification',
      label: 'Right to Rectification',
      description: 'Request correction of inaccurate data',
      icon: <Edit className="w-6 h-6" />,
    },
    {
      value: 'erasure',
      label: 'Right to Erasure',
      description: 'Request deletion of your personal data',
      icon: <Trash2 className="w-6 h-6" />,
    },
    {
      value: 'portability',
      label: 'Right to Data Portability',
      description: 'Request export of your data in a portable format',
      icon: <Download className="w-6 h-6" />,
    },
    {
      value: 'object',
      label: 'Right to Object',
      description: 'Object to processing of your personal data',
      icon: <Ban className="w-6 h-6" />,
    },
    {
      value: 'consent_withdrawal',
      label: 'Consent Withdrawal',
      description: 'Withdraw your consent for data processing',
      icon: <UserMinus className="w-6 h-6" />,
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value;

    if (name === 'youthId') {
      updatedValue = value.toUpperCase().replace(/\s+/g, '');
    } else if (name === 'requesterEmail' || name === 'email') {
      updatedValue = value.trimStart();
    }

    setFormData(prev => ({
      ...prev,
      [name]: updatedValue,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.requestType) {
      setError('Please select a request type');
      return;
    }

    const requesterEmail = formData.requesterEmail.trim();
    const youthId = formData.youthId.trim().toUpperCase();
    const contactEmail = (formData.email || formData.requesterEmail).trim();

    if (!requesterEmail || !formData.requestDescription || !youthId) {
      setError('Please fill in all required fields');
      return;
    }

    // Youth ID validation
    if (!youthId) {
      setError('Youth ID is required. You can find it in your survey confirmation email.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!recaptcha.isVerified) {
      setError('Please complete the reCAPTCHA verification before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await dataSubjectRightsService.createRequest(
        {
          requestType: formData.requestType,
          requesterEmail,
          youthId,
          email: contactEmail,
          requestDescription: formData.requestDescription,
          requestDetails: {},
        },
        recaptcha.token
      );

      if (response.success) {
        setSuccess(true);
        setSubmittedRequest(response.data.request);
        
        // Redirect to status page if token is available
        if (response.data.accessToken) {
          setTimeout(() => {
            navigate(`/data-subject-rights/status?token=${response.data.accessToken}`);
          }, 2000);
        }
      } else {
        setError(response.message || 'Failed to submit request');
      }
    } catch (err) {
      logger.error('Error submitting request', err);
      setError(err.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
      recaptcha.reset();
    }
  };

  if (success) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted Successfully</h2>
            <p className="text-gray-600 mb-4">
              Your data subject rights request has been received. We will process it within 30 days as required by RA 10173.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Request ID: <strong>{submittedRequest?.request_id}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              A confirmation email has been sent to <strong>{formData.requesterEmail}</strong> with a link to track your request.
            </p>
            <p className="text-sm text-blue-600">
              Redirecting to request status page...
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Data Subject Rights Request
            </h1>
            <p className="text-gray-600">
              Under the Data Privacy Act of 2012 (RA 10173), you have the right to access, rectify, erase, 
              and object to the processing of your personal data. Submit a request below.
            </p>
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Important Information:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>We will process your request within 30 days as required by RA 10173</li>
                  <li>A confirmation email will be sent with a link to track your request</li>
                  <li>You may need to provide proof of identity for verification</li>
                  <li>For data deletion requests, data may be anonymized instead of deleted if still within retention period</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Request Type Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Request Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requestTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, requestType: type.value }))}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.requestType === type.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`mr-3 ${formData.requestType === type.value ? 'text-blue-600' : 'text-gray-400'}`}>
                      {type.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{type.label}</h3>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Request Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Request Information</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Requester Email */}
              <div>
                <label htmlFor="requesterEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="requesterEmail"
                  name="requesterEmail"
                  value={formData.requesterEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email address"
                />
              </div>

              {/* Youth ID (Required) */}
              <div>
                <label htmlFor="youthId" className="block text-sm font-medium text-gray-700 mb-1">
                  Youth ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="youthId"
                  name="youthId"
                  value={formData.youthId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your Youth ID (e.g., YTH1234567890123456789)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your Youth ID is required. You can find it in your survey confirmation email.
                </p>
              </div>

              {/* Request Description */}
              <div>
                <label htmlFor="requestDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Request Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="requestDescription"
                  name="requestDescription"
                  value={formData.requestDescription}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please describe your request in detail. For rectification requests, please specify what data needs to be corrected."
                />
              </div>
            </div>

            {/* reCAPTCHA */}
            <div className="mt-6 flex justify-center">
              <ReCaptchaComponent
                ref={recaptcha.ref}
                onVerify={recaptcha.onVerify}
                onError={recaptcha.onError}
                onExpire={recaptcha.onExpire}
                theme="light"
                size="normal"
              />
            </div>

            {/* Submit Button */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={submitting || !recaptcha.isVerified}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Information */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 text-center">
              For questions or concerns, please contact our Data Protection Officer.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default DataSubjectRights;

