import React from 'react';
import { 
  Calendar, 
  User, 
  Tag, 
  Star, 
  Pin, 
  Image, 
  Paperclip,
  ChevronRight
} from 'lucide-react';

const AnnouncementCard = ({ 
  announcement, 
  onClick, 
  showAuthor = true, 
  showDate = true,
  variant = 'default' // 'default', 'compact', 'featured'
}) => {
  // Get category info
  const getCategoryInfo = (category) => {
    const categories = {
      general: { label: 'General', color: 'blue', icon: Tag },
      event: { label: 'Event', color: 'green', icon: Calendar },
      survey: { label: 'Survey', color: 'purple', icon: Tag },
      meeting: { label: 'Meeting', color: 'blue', icon: Calendar },
      deadline: { label: 'Deadline', color: 'red', icon: Calendar },
      achievement: { label: 'Achievement', color: 'yellow', icon: Star },
      update: { label: 'Update', color: 'gray', icon: Tag }
    };
    return categories[category] || { label: category, color: 'blue', icon: Tag };
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge
  const getStatusBadge = (announcement) => {
    if (announcement.is_pinned) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
          <Pin className="w-3 h-3" />
          Pinned
        </span>
      );
    }
    if (announcement.is_featured) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
          <Star className="w-3 h-3" />
          Featured
        </span>
      );
    }
    return null;
  };

  const categoryInfo = getCategoryInfo(announcement.category);
  const CategoryIcon = categoryInfo.icon;

  const baseClasses = "bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer";
  const variantClasses = {
    default: "p-6",
    compact: "p-4",
    featured: "p-8 border-2 border-blue-200"
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <CategoryIcon className={`w-4 h-4 text-${categoryInfo.color}-600`} />
          <span className={`text-xs font-medium text-${categoryInfo.color}-600 bg-${categoryInfo.color}-100 px-2 py-1 rounded-full`}>
            {categoryInfo.label}
          </span>
        </div>
        {getStatusBadge(announcement)}
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-gray-900 mb-2 line-clamp-2 ${
        variant === 'featured' ? 'text-xl' : 'text-lg'
      }`}>
        {announcement.title}
      </h3>

      {/* Summary */}
      {announcement.summary && (
        <p className={`text-gray-600 mb-4 line-clamp-3 ${
          variant === 'compact' ? 'text-sm' : 'text-sm'
        }`}>
          {announcement.summary}
        </p>
      )}

      {/* Attachments */}
      {(announcement.image_url || announcement.attachment_url) && (
        <div className="flex items-center gap-2 mb-4">
          {announcement.image_url && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Image className="w-3 h-3" />
              <span>Image</span>
            </div>
          )}
          {announcement.attachment_url && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Paperclip className="w-3 h-3" />
              <span>{announcement.attachment_name || 'Attachment'}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {showAuthor && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{announcement.creator_name || 'Admin'}</span>
            </div>
          )}
          {showDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(announcement.published_at || announcement.created_at)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center text-blue-600 text-sm font-medium">
          <span>Read More</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;

