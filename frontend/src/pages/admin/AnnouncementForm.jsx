import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  Eye, 
  ArrowLeft, 
  Upload, 
  X, 
  Calendar,
  Tag,
  Star,
  Pin,
  FileText,
  Image,
  Paperclip,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { showStaffSuccessToast, showErrorToast } from '../../components/universal';

const AnnouncementForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    category: 'general',
    status: 'draft',
    image_url: '',
    attachment_name: '',
    attachment_url: '',
    is_featured: false,
    is_pinned: false,
    published_at: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [errors, setErrors] = useState({});

  // Categories
  const categories = [
    { value: 'general', label: 'General', icon: FileText, color: 'blue' },
    { value: 'event', label: 'Event', icon: Calendar, color: 'green' },
    { value: 'survey', label: 'Survey', icon: FileText, color: 'purple' },
    { value: 'meeting', label: 'Meeting', icon: Calendar, color: 'blue' },
    { value: 'deadline', label: 'Deadline', icon: Calendar, color: 'red' },
    { value: 'achievement', label: 'Achievement', icon: Star, color: 'yellow' },
    { value: 'update', label: 'Update', icon: FileText, color: 'gray' }
  ];

  // Statuses
  const statuses = [
    { value: 'draft', label: 'Draft', color: 'yellow' },
    { value: 'published', label: 'Published', color: 'green' },
    { value: 'archived', label: 'Archived', color: 'gray' }
  ];

  // Load announcement data for editing
  useEffect(() => {
    if (isEdit) {
      fetchAnnouncement();
    }
  }, [id, isEdit]);

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/announcements/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch announcement');

      const data = await response.json();
      setFormData({
        title: data.data.title || '',
        content: data.data.content || '',
        summary: data.data.summary || '',
        category: data.data.category || 'general',
        status: data.data.status || 'draft',
        image_url: data.data.image_url || '',
        attachment_name: data.data.attachment_name || '',
        attachment_url: data.data.attachment_url || '',
        is_featured: data.data.is_featured || false,
        is_pinned: data.data.is_pinned || false,
        published_at: data.data.published_at || ''
      });
    } catch (error) {
      console.error('Error fetching announcement:', error);
      showErrorToast('Failed to fetch announcement');
      navigate('/admin/announcements');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle file upload
  const handleFileUpload = async (file, type) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload file');

      const data = await response.json();
      
      if (type === 'image') {
        handleInputChange('image_url', data.url);
      } else {
        handleInputChange('attachment_url', data.url);
        handleInputChange('attachment_name', file.name);
      }

      showStaffSuccessToast('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      showErrorToast('Failed to upload file');
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (formData.summary && formData.summary.length > 500) {
      newErrors.summary = 'Summary must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showErrorToast('Please fix the errors before saving');
      return;
    }

    try {
      setSaving(true);

      const url = isEdit ? `/api/announcements/${id}` : '/api/announcements';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save announcement');
      }

      const data = await response.json();
      showStaffSuccessToast(isEdit ? 'Announcement updated successfully' : 'Announcement created successfully');
      
      if (isEdit) {
        navigate('/admin/announcements');
      } else {
        navigate(`/admin/announcements/edit/${data.data.announcement_id}`);
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
      showErrorToast(error.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  // Handle save as draft
  const handleSaveDraft = async () => {
    const originalStatus = formData.status;
    setFormData(prev => ({ ...prev, status: 'draft' }));
    
    await handleSubmit(new Event('submit'));
    
    if (originalStatus !== 'draft') {
      setFormData(prev => ({ ...prev, status: originalStatus }));
    }
  };

  // Handle publish
  const handlePublish = async () => {
    setFormData(prev => ({ 
      ...prev, 
      status: 'published',
      published_at: new Date().toISOString()
    }));
    
    await handleSubmit(new Event('submit'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading announcement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/announcements')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Announcements
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEdit ? 'Edit Announcement' : 'Create Announcement'}
                </h1>
                <p className="text-gray-600">
                  {isEdit ? 'Update announcement details and settings' : 'Create a new announcement for the community'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  previewMode 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Eye className="w-4 h-4" />
                {previewMode ? 'Edit' : 'Preview'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter announcement title..."
                  maxLength={200}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.title}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {formData.title.length}/200 characters
                </p>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summary
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.summary ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Brief summary for preview (optional)..."
                  rows={3}
                  maxLength={500}
                />
                {errors.summary && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.summary}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {formData.summary.length}/500 characters
                </p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.content ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Write your announcement content here..."
                  rows={12}
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.content}
                  </p>
                )}
              </div>

              {/* File Uploads */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Attachments</h3>
                
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Featured Image
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'image');
                      }}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Image
                    </label>
                    {formData.image_url && (
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Image uploaded</span>
                        <button
                          type="button"
                          onClick={() => handleInputChange('image_url', '')}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Attachment
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'document');
                      }}
                      className="hidden"
                      id="document-upload"
                    />
                    <label
                      htmlFor="document-upload"
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </label>
                    {formData.attachment_url && (
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">{formData.attachment_name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange('attachment_url', '');
                            handleInputChange('attachment_name', '');
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
                <div className="space-y-2">
                  {statuses.map((status) => (
                    <label key={status.value} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="status"
                        value={status.value}
                        checked={formData.status === status.value}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className={`text-sm font-medium text-${status.color}-700`}>
                        {status.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Category</h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <label key={category.value} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="category"
                          value={category.value}
                          checked={formData.category === category.value}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <Icon className={`w-4 h-4 text-${category.color}-600`} />
                        <span className="text-sm font-medium text-gray-700">
                          {category.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Options */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Options</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Star className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-700">Featured</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.is_pinned}
                      onChange={(e) => handleInputChange('is_pinned', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Pin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Pinned</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Publish
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementForm;
