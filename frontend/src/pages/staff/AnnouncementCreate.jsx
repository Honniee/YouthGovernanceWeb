import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const AnnouncementCreate = () => {
  const navigate = useNavigate();
  
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
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState('all_youth');
  const [tags, setTags] = useState('');
  const [publishAt, setPublishAt] = useState('');

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

  // Image upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
      }
      
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Attachment upload handler
  const handleAttachmentUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachmentFile(file);
      setAttachmentName(file.name);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentName('');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Hook up to API later
    console.log('Form data:', {
      title,
      content,
      summary,
      category,
      status,
      imageFile,
      attachmentFile,
      isFeatured,
      isPinned,
      eventDate,
      endDate,
      location,
      audience,
      tags,
      publishAt
    });
    navigate('/staff/announcements');
  };

  const handlePublishNow = () => {
    setStatus('published');
    handleSubmit({ preventDefault: () => {} });
  };

  return (
    <div className="space-y-6">
      {/* Header Section - Responsive Design */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          {/* Mobile/Tablet Layout - Inline */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/staff/announcements')}
                className="inline-flex items-center p-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">
                Create Announcement
              </h1>
            </div>
          </div>

          {/* Desktop Layout - Horizontal */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/staff/announcements')}
                className="inline-flex items-center p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Create Announcement
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Compose a new announcement for the youth community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    <option value="announcements">Announcements</option>
                    <option value="achievement">Achievement</option>
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
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      {imagePreview ? (
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
                          <p className="text-sm text-gray-600">Click to upload image</p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
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

                {/* Attachment Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachment (Optional)
                  </label>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      onChange={handleAttachmentUpload}
                      className="hidden"
                      id="attachment-upload"
                    />
                    <label htmlFor="attachment-upload" className="cursor-pointer">
                      {attachmentName ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center text-green-600">
                            <Upload className="w-6 h-6" />
                          </div>
                          <p className="text-sm text-gray-600">{attachmentName}</p>
                          <p className="text-xs text-gray-500">Click to change file</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="mx-auto h-8 w-8 text-gray-400">
                            <Upload className="w-full h-full" />
                          </div>
                          <p className="text-sm text-gray-600">Click to upload attachment</p>
                          <p className="text-xs text-gray-500">PDF, DOC, XLS up to 25MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                  
                  {attachmentName && (
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove attachment
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
                        type="datetime-local"
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
                        type="datetime-local"
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
                {/* Publish Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Publish Date
                  </label>
                  <input
                    type="date"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to publish immediately
                  </p>
                </div>

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
                      onClick={() => navigate('/staff/announcements')}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save as Draft
                    </button>
                    
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      onClick={handlePublishNow}
                    >
                      <SendIcon className="w-4 h-4 mr-2" />
                      Publish Now
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
    </div>
  );
};

export default AnnouncementCreate;
