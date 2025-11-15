import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAnnouncementById, updateAnnouncement, uploadAnnouncementImage } from '../../services/announcementsService';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Calendar, 
  MapPin, 
  Star, 
  Pin, 
  Save, 
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Image,
  Settings,
  Loader2
} from 'lucide-react';
import { ToastContainer, showSuccessToast, showErrorToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import { HeaderMainContent } from '../../components/portal_main_content';
import { useRealtime } from '../../realtime/useRealtime';
import logger from '../../utils/logger.js';

const AnnouncementEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const confirmation = (useConfirmation && useConfirmation()) || { showConfirmation: async () => true, hideConfirmation: () => {}, setLoading: () => {}, modalProps: {} };
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('programs');
  const [status, setStatus] = useState('draft');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState('all_youth');
  const [tags, setTags] = useState('');
  const [publishAt, setPublishAt] = useState('');
  
  // Helper: today's date in local timezone for <input type="date" min>
  const todayLocalDate = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Helper function to convert relative URLs to full URLs
  const getFileUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    let base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '');
    if (!base) {
      // sensible dev fallback if env not set
      if (window.location && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
        base = 'http://localhost:3001';
      }
    }
    return `${base}${path}`;
  };

  const loadById = async (opts = { silent: false }) => {
    const { silent } = opts || { silent: false };
    try {
      if (!silent) { setDataLoading(true); setError(null); }
      const response = await getAnnouncementById(id);
      if (response.success && response.data) {
        const announcement = response.data;
        setTitle(announcement.title || '');
        setContent(announcement.content || '');
        setSummary(announcement.summary || '');
        setCategory(announcement.category || 'programs');
        setStatus(announcement.status || 'draft');
        setIsFeatured(announcement.is_featured || false);
        setIsPinned(announcement.is_pinned || false);
        setEventDate(announcement.event_date ? announcement.event_date.split('T')[0] : '');
        setEndDate(announcement.end_date ? announcement.end_date.split('T')[0] : '');
        setLocation(announcement.location || '');
        setPublishAt(announcement.published_at ? announcement.published_at.split('T')[0] : '');
        if (announcement.image_url) {
          setExistingImageUrl(getFileUrl(announcement.image_url));
        } else {
          setExistingImageUrl(null);
        }
      } else {
        throw new Error('Failed to load announcement data');
      }
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load announcement. Please try again.');
    } finally {
      if (!silent) setDataLoading(false);
    }
  };

  // Load announcement data on mount
  useEffect(() => { if (id) loadById({ silent: false }); }, [id]);

  // Realtime: silently refresh form if this announcement changes
  useRealtime('announcement:changed', async (payload) => {
    const pid = payload?.item?.announcement_id;
    if (!pid) return;
    if (String(pid) !== String(id)) return;
    await loadById({ silent: true });
  });

  // Step definitions
  const steps = [
    {
      id: 1,
      title: 'Basic Info',
      description: 'Title, category, and summary',
      icon: FileText,
      fields: ['title', 'category', 'summary']
    },
    {
      id: 2,
      title: 'Content',
      description: 'Write your announcement',
      icon: FileText,
      fields: ['content']
    },
    {
      id: 3,
      title: 'Media & Events',
      description: 'Images, attachments, and event details',
      icon: Image,
      fields: ['imageFile', 'attachmentFile', 'eventDate', 'location']
    },
    {
      id: 4,
      title: 'Options',
      description: 'Special settings and options',
      icon: Settings,
      fields: ['isFeatured', 'isPinned']
    }
  ];

  // Image upload handler with immediate upload (like StaffProfile)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Enhanced validation (matching StaffProfile.jsx patterns)
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Invalid file type. Please use JPG, PNG, or WEBP images.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File too large. Maximum size is 10MB.');
      return;
    }
    
    // Clear any previous errors
    setError('');
    
    try {
      setImageUploading(true);
      
      // Upload image immediately (like StaffProfile)
      logger.debug('Uploading image immediately for announcement', { announcementId: id });
      const response = await uploadAnnouncementImage(id, file);
      
      if (response.success) {
        // Update the existing image URL with the new one
        setExistingImageUrl(getFileUrl(response.data.image_url));
        setImagePreview(null); // Clear preview since we're using the uploaded image
        setImageFile(null); // Clear file since it's already uploaded
        
        logger.info('Image uploaded successfully', { announcementId: id, imageUrl: response.data.image_url });
      } else {
        throw new Error(response.message || 'Failed to upload image');
      }
    } catch (error) {
      logger.error('Error uploading image', error, { announcementId: id });
      setError(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = async () => {
    try {
      // For now, just clear the UI state
      // TODO: Implement backend endpoint to remove image
      setImageFile(null);
      setImagePreview(null);
      setExistingImageUrl(null);
      logger.debug('Image removed from UI (backend removal not implemented yet)', { announcementId: id });
    } catch (error) {
      logger.error('Error removing image', error, { announcementId: id });
      setError('Failed to remove image. Please try again.');
    }
  };

  // Step navigation functions
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  // Step validation
  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return title.trim() !== '' && category !== '';
      case 2:
        return content.trim() !== '';
      case 3:
        return true; // Media and events are optional
      case 4:
        return true; // Publishing options are optional
      default:
        return false;
    }
  };

  const canProceed = isStepValid(currentStep);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare form data - no image handling since images are uploaded immediately
      const formData = {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || null,
        category,
        is_featured: isFeatured,
        is_pinned: isPinned,
        event_date: eventDate || null,
        end_date: endDate || null,
        location: location.trim() || null
        // No imageFile - images are uploaded immediately via dedicated endpoint
      };

      logger.debug('Updating announcement', { announcementId: id, hasData: !!formData });
      
      // Update announcement
      const response = await updateAnnouncement(id, formData);
      logger.info('Announcement updated successfully', { announcementId: id, success: response.success });

      showSuccessToast && showSuccessToast('Update Successful', 'Announcement updated successfully!');
      
      navigate('/staff/announcements', {
        state: {
          flash: {
            type: 'success',
            title: 'Update Successful',
            message: 'Announcement updated successfully!'
          }
        }
      });
      
    } catch (error) {
      logger.error('Error updating announcement', error, { announcementId: id });
      const message = error?.response?.data?.message || error.message || 'Failed to update announcement. Please try again.';
      setError(message);
      showErrorToast && showErrorToast('Update Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // Confirm + submit flow similar to AnnouncementCreate.jsx
  const confirmAndSubmit = async () => {
    const confirmed = await (confirmation.showConfirmation
      ? confirmation.showConfirmation({
          title: 'Save Changes?',
          message: 'This will update the announcement details.',
          confirmText: 'Save',
          cancelText: 'Cancel',
          variant: 'success'
        })
      : Promise.resolve(true));

    if (!confirmed) return;

    try {
      confirmation.setLoading && confirmation.setLoading(true);
      await handleSubmit({ preventDefault: () => {} });
    } finally {
      confirmation.setLoading && confirmation.setLoading(false);
      confirmation.hideConfirmation && confirmation.hideConfirmation();
    }
  };

  // Show loading state while fetching data
  if (dataLoading) {
    return (
      <div className="space-y-6">
        <HeaderMainContent
          title="Edit Announcement"
          description="Loading announcement data..."
          leading={(
            <button
              onClick={() => navigate('/staff/announcements')}
              aria-label="Back"
              className="inline-flex items-center p-1 text-gray-700 text-base sm:text-sm sm:px-3 sm:py-2 sm:border sm:border-gray-300 sm:rounded-lg hover:bg-transparent sm:hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
        />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading announcement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <HeaderMainContent
        title="Edit Announcement"
        description="Update announcement details and settings."
        leading={(
          <button
            onClick={() => navigate('/staff/announcements')}
            aria-label="Back"
            className="inline-flex items-center p-1 text-gray-700 text-base sm:text-sm sm:px-3 sm:py-2 sm:border sm:border-gray-300 sm:rounded-lg hover:bg-transparent sm:hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
      />

      {/* Step Progress Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isClickable = currentStep > step.id || isStepValid(step.id);
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center">
                    <button
                      onClick={() => isClickable && goToStep(step.id)}
                      disabled={!isClickable}
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        isActive
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : isCompleted
                          ? 'border-green-600 bg-green-600 text-white cursor-pointer hover:bg-green-700'
                          : isClickable
                          ? 'border-gray-300 bg-white text-gray-400 cursor-pointer hover:border-gray-400'
                          : 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </button>
                    <div className="ml-3 hidden sm:block">
                      <p className={`text-sm font-medium ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`hidden sm:block mx-4 h-0.5 w-16 ${
                      currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-0">
          
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="px-4 sm:px-6 py-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Basic Information</h3>
                <p className="text-sm text-gray-600">Update the essential details of your announcement.</p>
              </div>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter announcement title"
                    required
                  />
                </div>

                {/* Summary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Summary
                  </label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Short summary for preview (optional)"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="projects">Projects</option>
                    <option value="programs">Programs</option>
                    <option value="activities">Activities</option>
                    <option value="meetings">Meetings</option>
                    <option value="achievement">Achievement</option>
                    <option value="announcements">Announcements</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Content */}
          {currentStep === 2 && (
            <div className="px-4 sm:px-6 py-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Content</h3>
                <p className="text-sm text-gray-600">Update the main content of your announcement.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={12}
                  placeholder="Write your announcement content here..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can use basic formatting. Rich text editor will be added later.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Media & Events */}
          {currentStep === 3 && (
            <div className="px-4 sm:px-6 py-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Media & Events</h3>
                <p className="text-sm text-gray-600">Update images, attachments, and event details (all optional).</p>
              </div>
              
              <div className="space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Announcement Image (Thumbnail)
                  </label>
                  
                  {/* Show current image if available */}
                  {existingImageUrl && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Current image:</p>
                      <div className="relative inline-block">
                        <img 
                          src={existingImageUrl} 
                          alt="Current announcement image" 
                          className="h-32 w-auto rounded-lg object-cover shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) {
                        handleImageUpload({ target: { files: e.dataTransfer.files } });
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      {imageUploading ? (
                        <div className="space-y-2">
                          <div className="mx-auto h-12 w-12 text-blue-500 animate-spin">
                            <Upload className="w-full h-full" />
                          </div>
                          <p className="text-sm text-blue-600">Processing image...</p>
                        </div>
                      ) : imagePreview ? (
                        <div className="space-y-3">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="mx-auto h-32 w-auto rounded-lg object-cover shadow-sm"
                          />
                          <p className="text-sm text-gray-600">Click to change image</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="mx-auto h-12 w-12 text-gray-400">
                            <Upload className="w-full h-full" />
                          </div>
                          <p className="text-sm text-gray-600">
                            {existingImageUrl ? 'Click to replace image or drag & drop' : 'Click to upload or drag & drop'}
                          </p>
                          <p className="text-xs text-gray-500">JPG, PNG, WEBP up to 10MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                  
                  {(imagePreview || existingImageUrl) && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove image
                    </button>
                  )}
                </div>

                {/* Event Details */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Event Details (Optional)</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Event Start Date
                      </label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Event End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Event location (optional)"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Special Options */}
          {currentStep === 4 && (
            <div className="px-4 sm:px-6 py-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Special Options</h3>
                <p className="text-sm text-gray-600">Configure special settings for this announcement.</p>
              </div>
              
              <div className="space-y-6">
                {/* Special Options */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Announcement Settings</h4>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 flex items-center">
                        <Star className="w-4 h-4 mr-1" />
                        Featured Announcement
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 flex items-center">
                        <Pin className="w-4 h-4 mr-1" />
                        Pin to Top
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step Navigation */}
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentStep === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
                }`}
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              
              <div className="flex items-center space-x-3">
                {currentStep === totalSteps ? (
                  <>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                      onClick={() => navigate('/staff/announcements')}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={confirmAndSubmit}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      canProceed
                        ? 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    }`}
                    onClick={nextStep}
                    disabled={!canProceed}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
      <ToastContainer position="top-right" maxToasts={5} />
      <div className="relative z-[99999]">
        <ConfirmationModal {...(confirmation?.modalProps || {})} />
      </div>
    </div>
  );
};

export default AnnouncementEdit;
