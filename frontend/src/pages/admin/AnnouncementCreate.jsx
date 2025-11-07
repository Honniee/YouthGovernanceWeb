import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAnnouncement } from '../../services/announcementsService';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  Star, 
  Pin, 
  Save, 
  Send,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Image,
  Settings,
  Send as SendIcon
} from 'lucide-react';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import { HeaderMainContent } from '../../components/portal_main_content';

const AnnouncementCreate = () => {
  const navigate = useNavigate();
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
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState('all_youth');
  const [tags, setTags] = useState('');
  const [publishAt, setPublishAt] = useState('');
  // Publishing mode: 'draft' | 'publish'
  const [publishMode, setPublishMode] = useState('draft');
  
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
  const [error, setError] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const draftToastShownRef = useRef(false);

  // Draft persistence key
  const DRAFT_STORAGE_KEY = 'announcementCreateDraft';
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return setDraftLoaded(true);
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return setDraftLoaded(true);
      if (Object.prototype.hasOwnProperty.call(saved, 'currentStep')) setCurrentStep(saved.currentStep || 1);
      if (Object.prototype.hasOwnProperty.call(saved, 'title')) setTitle(saved.title || '');
      if (Object.prototype.hasOwnProperty.call(saved, 'content')) setContent(saved.content || '');
      if (Object.prototype.hasOwnProperty.call(saved, 'summary')) setSummary(saved.summary || '');
      if (Object.prototype.hasOwnProperty.call(saved, 'category')) setCategory(saved.category || 'programs');
      if (Object.prototype.hasOwnProperty.call(saved, 'isFeatured')) setIsFeatured(!!saved.isFeatured);
      if (Object.prototype.hasOwnProperty.call(saved, 'isPinned')) setIsPinned(!!saved.isPinned);
      if (Object.prototype.hasOwnProperty.call(saved, 'eventDate')) setEventDate(saved.eventDate || '');
      if (Object.prototype.hasOwnProperty.call(saved, 'endDate')) setEndDate(saved.endDate || '');
      if (Object.prototype.hasOwnProperty.call(saved, 'location')) setLocation(saved.location || '');
      if (Object.prototype.hasOwnProperty.call(saved, 'audience')) setAudience(saved.audience || 'all_youth');
      if (Object.prototype.hasOwnProperty.call(saved, 'tags')) setTags(saved.tags || '');
      if (Object.prototype.hasOwnProperty.call(saved, 'publishAt')) setPublishAt(saved.publishAt || '');
      if (Object.prototype.hasOwnProperty.call(saved, 'publishMode')) setPublishMode(saved.publishMode || 'draft');
      if (!draftToastShownRef.current) {
        showInfoToast && showInfoToast('Draft restored', 'We loaded your saved draft.');
        draftToastShownRef.current = true;
      }
      console.log('🧩 Loaded announcement draft from storage:', saved);
    } catch (e) {
      console.warn('Failed to load announcement draft from storage:', e);
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  // Autosave draft to localStorage on changes
  useEffect(() => {
    if (!draftLoaded) return;
    setIsAutoSaving(true);
    const handle = setTimeout(() => {
      try {
        const draft = {
          currentStep,
          title,
          content,
          summary,
          category,
          isFeatured,
          isPinned,
          eventDate,
          endDate,
          location,
          audience,
          tags,
          publishAt,
          publishMode
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setLastSavedAt(new Date());
      } catch {}
      setIsAutoSaving(false);
    }, 500);
    return () => clearTimeout(handle);
  }, [draftLoaded, currentStep, title, content, summary, category, isFeatured, isPinned, eventDate, endDate, location, audience, tags, publishAt, publishMode]);

  // Ensure last changes are saved on page refresh/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const draft = {
          currentStep,
          title,
          content,
          summary,
          category,
          isFeatured,
          isPinned,
          eventDate,
          endDate,
          location,
          audience,
          tags,
          publishAt,
          publishMode
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep, title, content, summary, category, isFeatured, isPinned, eventDate, endDate, location, audience, tags, publishAt, publishMode]);

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
      title: 'Publishing',
      description: 'Scheduling and options',
      icon: Settings,
      fields: ['publishAt', 'isFeatured', 'isPinned']
    }
  ];

  // Image upload handler with better validation
  const handleImageUpload = (e) => {
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
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
    } catch (error) {
      console.error('Error processing image:', error);
      setError('Failed to process image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // (Attachment removed)

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

  const handleSubmit = async (e, action = 'draft') => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    // Enforce: If saving as Draft and a Publish Date is provided, it must be today or future
    if (publishMode === 'draft' && publishAt) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const picked = new Date(publishAt);
        picked.setHours(0, 0, 0, 0);
        if (picked < today) {
          setError('For drafts, Publish Date cannot be in the past.');
          return;
        }
      } catch {
        // If date parsing fails, block submission
        setError('Please select a valid Publish Date');
        return;
      }
    }


    try {
      setLoading(true);
      setError(null);

      // Decide status/published_at based on mode and action
      let computedStatus = 'draft';
      let computedPublishedAt = publishAt || null;

      if (action === 'publish') {
        computedStatus = 'published';
        // If user provided a date, keep it; otherwise backend will set now
        computedPublishedAt = publishAt || null;
      } else {
        // draft mode
        computedStatus = 'draft';
      }

      // Prepare form data
      const formData = {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || null,
      category,
        status: computedStatus,
        is_featured: isFeatured,
        is_pinned: isPinned,
        event_date: eventDate || null,
        end_date: endDate || null,
        location: location.trim() || null,
        published_at: computedPublishedAt,
        imageFile: imageFile // Include the image file for upload
      };

      console.log('🔍 Creating announcement with data:', formData);
      
      // Create announcement
      const response = await createAnnouncement(formData);
      console.log('✅ Announcement created successfully:', response);
      
      
      // Navigate back to announcements and show toast there via flash state
      try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
      navigate('/admin/announcements', {
        state: {
          flash: {
            type: 'success',
            title: 'Success',
            message: `Announcement ${computedStatus === 'published' ? 'published' : 'saved as draft'} successfully!`
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error creating announcement:', error);
      const message = error?.response?.data?.message || error.message || 'Failed to create announcement. Please try again.';
      setError(message);
      showErrorToast && showErrorToast('Create failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNow = () => {
    handleSubmit({ preventDefault: () => {} }, 'publish');
  };

  // Confirm + progress toast flow similar to StaffProfile.jsx
  const confirmAndSubmit = async (action) => {
    const isPublish = action === 'publish';
    const ok = await (confirmation.showConfirmation
      ? confirmation.showConfirmation({
          title: isPublish ? 'Publish announcement?' : 'Save as draft?',
          message: isPublish
            ? 'This will make your announcement publicly visible.'
            : 'This will save your progress as a draft. You can publish later.',
          confirmText: isPublish ? 'Publish' : 'Save',
          cancelText: 'Cancel',
          variant: isPublish ? 'success' : 'info'
        })
      : Promise.resolve(true));
    if (!ok) return;

    handleSubmit({ preventDefault: () => {} }, action);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <HeaderMainContent
        title="Create Announcement"
        description="Compose a new announcement for the youth community."
        leading={(
          <button
            onClick={() => navigate('/admin/announcements')}
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
                <p className="text-sm text-gray-600">Let's start with the essential details of your announcement.</p>
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
                <p className="text-sm text-gray-600">Write the main content of your announcement.</p>
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
                <p className="text-sm text-gray-600">Add images, attachments, and event details (all optional).</p>
              </div>
              
              <div className="space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Announcement Image (Thumbnail)
                  </label>
                  
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
                          <p className="text-sm text-gray-600">Click to upload or drag & drop</p>
                          <p className="text-xs text-gray-500">JPG, PNG, WEBP up to 10MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                  
                  {imagePreview && (
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

                {/* Attachment section removed */}

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

          {/* Step 4: Publishing Options */}
          {currentStep === 4 && (
            <div className="px-4 sm:px-6 py-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Publishing Options</h3>
                <p className="text-sm text-gray-600">Configure when this announcement should be published.</p>
              </div>
              
              <div className="space-y-6">
                {/* Publishing Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publishing Mode</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={`px-3 py-2 rounded-lg border text-sm ${publishMode === 'draft' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => setPublishMode('draft')}
                    >
                      Draft
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2 rounded-lg border text-sm ${publishMode === 'publish' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => setPublishMode('publish')}
                    >
                      Publish
                    </button>
                  </div>
                </div>

                {/* Publish Date (only for Draft; optional) */}
                {publishMode === 'draft' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                      Publish Date (optional)
                  </label>
                  <input
                    type="date"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                      min={todayLocalDate}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                      Optional. If set, this can be used for auto-publish later; otherwise you can publish manually anytime.
                  </p>
                </div>
                )}

                {/* Special Options */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Special Options</h4>
                  
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
                      onClick={async () => {
                        const ok = await (confirmation.showConfirmation
                          ? confirmation.showConfirmation({
                              title: 'Discard changes?',
                              message: 'You have unsaved changes. Are you sure you want to leave this page?',
                              confirmText: 'Discard',
                              cancelText: 'Stay',
                              variant: 'warning'
                            })
                          : Promise.resolve(true));
                        if (ok) navigate('/admin/announcements');
                      }}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => confirmAndSubmit(publishMode === 'publish' ? 'publish' : 'draft')}
                      className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${publishMode === 'publish' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
                    >
                      {publishMode === 'publish' ? (
                        <>
                      <SendIcon className="w-4 h-4 mr-2" />
                          {loading ? 'Publishing...' : 'Publish Now'}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {loading ? 'Saving...' : 'Save as Draft'}
                        </>
                      )}
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
      {/* Toasts and Confirmations */}
      <ToastContainer position="top-right" maxToasts={5} />
      <div className="relative z-[99999]">
        <ConfirmationModal {...(confirmation?.modalProps || {})} />
      </div>
    </div>
  );
};

export default AnnouncementCreate;