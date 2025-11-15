import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Mail,
  Calendar,
  User,
  Shield,
  Loader2,
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import dataSubjectRightsService from '../../services/dataSubjectRightsService';
import logger from '../../utils/logger.js';

const DataSubjectRightsStatus = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (token) {
      fetchRequest();
    } else {
      setError('No access token provided. Please use the link from your email.');
      setLoading(false);
    }
  }, [token]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dataSubjectRightsService.getRequestByToken(token);
      if (response.success) {
        setRequest(response.data);
      } else {
        setError(response.message || 'Failed to load request');
      }
    } catch (err) {
      logger.error('Error fetching request', err, { token: token?.substring(0, 10) + '...' });
      setError(err.response?.data?.message || 'Failed to load request. Please check your link.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'in_progress':
        return <Clock className="w-6 h-6 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      default:
        return <FileText className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRequestTypeLabel = (type) => {
    const types = {
      access: 'Right to Access',
      rectification: 'Right to Rectification',
      erasure: 'Right to Erasure',
      portability: 'Right to Data Portability',
      object: 'Right to Object',
      consent_withdrawal: 'Consent Withdrawal',
    };
    return types[type] || type;
  };

  const handleDownloadData = () => {
    if (request.response_data) {
      const dataStr = JSON.stringify(request.response_data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-data-request-${request.request_id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your request...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link
                to="/data-subject-rights"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Request Form
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!request) {
    return null;
  }

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Receipt Ticket Container */}
          <div className="bg-white shadow-lg border border-gray-200 overflow-hidden">
            {/* Ticket Header */}
            <div className="px-6 py-5 border-b-2 border-dashed border-gray-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    Data Subject Rights Request
                  </h1>
                  <p className="text-sm text-gray-600 font-mono">
                    Request #{request.request_id}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${getStatusColor(request.request_status)}`}>
                  {getStatusIcon(request.request_status)}
                  <span className="capitalize">{request.request_status.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="border-t-2 border-dashed border-gray-300"></div>

            {/* Request Details Section */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">
                    Request Type
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {getRequestTypeLabel(request.request_type)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">
                    Expected Response Date
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(request.due_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">
                    Request Date
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(request.requested_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">
                    Requester
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">
                    {request.requester_name || '—'}
                  </p>
                  <p className="text-xs text-gray-600 break-all">
                    {request.requester_email || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="border-t-2 border-dashed border-gray-300"></div>

            {/* Request Description Section */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-600" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Request Description
                </h2>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {request.request_description || '—'}
              </p>
            </div>

            {/* Dashed Separator */}
            <div className="border-t-2 border-dashed border-gray-300"></div>

            {/* Response Section */}
            {request.response_text && (
              <>
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-4 h-4 text-gray-600" />
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Response
                    </h2>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {request.response_text}
                    </p>
                  </div>
                </div>
                {/* Dashed Separator */}
                <div className="border-t-2 border-dashed border-gray-300"></div>
              </>
            )}

            {/* Data Access Section */}
            {request.request_status === 'completed' && 
             (request.request_type === 'access' || request.request_type === 'portability') &&
             request.response_data && (
              <>
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Download className="w-4 h-4 text-gray-600" />
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Your Data
                    </h2>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
                    <pre className="text-xs text-gray-700 overflow-auto max-h-96 font-mono">
                      {JSON.stringify(request.response_data, null, 2)}
                    </pre>
                  </div>
                  <button
                    onClick={handleDownloadData}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Data (JSON)
                  </button>
                </div>
                {/* Dashed Separator */}
                <div className="border-t-2 border-dashed border-gray-300"></div>
              </>
            )}

            {/* Request History Section */}
            {request.logs && request.logs.length > 0 && (
              <>
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Request History
                    </h2>
                  </div>
                  <div className="space-y-2.5">
                    {request.logs.map((log, index) => (
                      <div key={index} className="border-l-2 border-blue-500 pl-3 py-2">
                        <p className="text-sm text-gray-900 font-semibold">{log.log_entry}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(log.logged_at).toLocaleString()}
                          {log.logged_by && log.logged_by !== 'SYSTEM' && ` • by ${log.logged_by}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Dashed Separator */}
                <div className="border-t-2 border-dashed border-gray-300"></div>
              </>
            )}

            {/* Action Buttons Section */}
            <div className="px-6 py-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/data-subject-rights"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  New Request
                </Link>
                <button
                  onClick={() => copyToClipboard(window.location.href)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="border-t-2 border-dashed border-gray-300"></div>

            {/* Footer Note */}
            <div className="px-6 py-4 bg-blue-50/50">
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>Note:</strong> This link will expire in 72 hours. If you need a new link or have questions, 
                please contact our Data Protection Officer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default DataSubjectRightsStatus;


