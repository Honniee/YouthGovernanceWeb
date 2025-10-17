import React, { useEffect, useMemo, useState } from 'react';
import { User, Mail, Shield, IdCard, Phone, Save, Edit2, ImagePlus, Trash2, CheckCircle2, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.js';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import Cropper from 'react-easy-crop';
import { HeaderMainContent, TabContainer, Tab } from '../../components/portal_main_content';

const Field = ({ label, children, description }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-800">{label}</label>
    {children}
    {description ? (
      <p className="text-xs text-gray-500">{description}</p>
    ) : null}
  </div>
);

const ReadOnlyInput = ({ value }) => (
  <div className="w-full px-3 py-2 rounded-md border border-gray-100 bg-gray-50 text-gray-800">
    {value || '-'}
  </div>
);

const Card = ({ title, children, right, footer }) => (
  <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/70 shadow-sm">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {right}
    </div>
    <div className="p-5">
      {children}
    </div>
    {footer && (
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
        {footer}
      </div>
    )}
  </div>
);

const StatItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 bg-white">
    <div className="shrink-0 w-9 h-9 grid place-items-center rounded-md bg-gray-100 text-gray-700">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-gray-900 truncate">{value || '—'}</div>
    </div>
  </div>
);

const ProgressRing = ({ percent = 0 }) => {
  const radius = 60;
  const strokeWidth = 6;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative w-36 h-36">
      <svg
        className="w-36 h-36 transform -rotate-90"
        width="144"
        height="144"
      >
        {/* Background circle */}
        <circle
          cx="72"
          cy="72"
          r={normalizedRadius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        {/* Progress circle */}
        <circle
          cx="72"
          cy="72"
          r={normalizedRadius}
          fill="none"
          stroke={percent === 100 ? '#10b981' : '#3b82f6'}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4))'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900 leading-none tracking-tight" style={{ textShadow: '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.6)' }}>
            {percent}%
          </div>
          <div className="text-xs font-medium text-gray-700 mt-2" style={{ textShadow: '0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(255,255,255,0.6)' }}>
            Complete
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="grid grid-cols-12 gap-3 items-center py-1.5">
    <div className="col-span-12 md:col-span-2 text-sm text-gray-600 md:text-right">{label}:</div>
    <div className="col-span-12 md:col-span-10">
      <div className="w-full px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-900">
        {value || '—'}
      </div>
    </div>
  </div>
);

const EditableRow = ({ label, children }) => (
  <div className="grid grid-cols-12 gap-3 items-center py-1.5">
    <div className="col-span-12 md:col-span-2 text-sm text-gray-600 md:text-right">{label}:</div>
    <div className="col-span-12 md:col-span-10">
      {children}
    </div>
  </div>
);

const Avatar = ({ name, src, size = 56, version }) => {
  const getFileUrl = (p) => {
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    let base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '');
    if (!base) {
      // sensible dev fallback if env not set
      if (window.location && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
        base = 'http://localhost:3001';
      }
    }
    let url = `${base}${p}`;
    if (version && !/\?/.test(url)) {
      url += `?v=${encodeURIComponent(version)}`;
    }
    return url;
  };
  const [errored, setErrored] = React.useState(false);
  React.useEffect(() => { setErrored(false); }, [src, version]);
  const initials = useMemo(() => {
    if (!name) return 'A';
    const parts = String(name).trim().split(' ');
    return parts.slice(0, 2).map(p => p.charAt(0)).join('').toUpperCase();
  }, [name]);

  const url = src ? getFileUrl(src) : '';
  if (url && !errored) {
    return (
      <img
        src={url}
        alt="Profile"
        className={`rounded-full object-cover shadow-sm`}
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <div className="rounded-full bg-gradient-to-br from-emerald-600 to-green-500 text-white flex items-center justify-center font-semibold shadow-sm" style={{ width: size, height: size }}>
      {initials}
    </div>
  );
};

const StaffProfile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({ 
    lydo_id: '', 
    first_name: '', 
    last_name: '', 
    middle_name: '', 
    suffix: '', 
    email: '', 
    personal_email: '', 
    profile_picture: '', 
    is_active: true, 
    email_verified: false, 
    created_at: '', 
    updated_at: '', 
    role_id: '',
    role_name: ''
  });
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const fileInputRef = React.useRef(null);
  const originalProfileRef = React.useRef(null);
  const confirmation = (useConfirmation && useConfirmation()) || { showConfirmation: async () => true, hideConfirmation: () => {}, setLoading: () => {}, modalProps: {} };

  useEffect(() => {
    if (user) {
      console.log('🔍 User object from AuthContext:', user);
      setProfile({
        lydo_id: user.lydo_id || user.id || '',
        first_name: user.firstName || user.first_name || '',
        last_name: user.lastName || user.last_name || '',
        middle_name: user.middleName || user.middle_name || '',
        suffix: user.suffix || '',
        email: user.email || '',
        personal_email: user.personalEmail || user.personal_email || '',
        profile_picture: user.profilePicture || user.profile_picture || '',
        is_active: user.isActive !== undefined ? user.isActive : (user.is_active !== undefined ? user.is_active : true),
        email_verified: user.emailVerified !== undefined ? user.emailVerified : (user.email_verified !== undefined ? user.email_verified : false),
        created_at: user.createdAt || user.created_at || '',
        updated_at: user.updatedAt || user.updated_at || '',
        role_id: user.role_id || '',
        role_name: user.role || user.userType || user.role_name || ''
      });
      originalProfileRef.current = {
        first_name: user.firstName || user.first_name || '',
        last_name: user.lastName || user.last_name || '',
        middle_name: user.middleName || user.middle_name || '',
        suffix: user.suffix || '',
        email: user.email || '',
        personal_email: user.personalEmail || user.personal_email || '',
        role_name: user.role || user.userType || user.role_name || ''
      };
    }
  }, [user]);

  const fullName = useMemo(() => {
    const first = String(profile.first_name || '').trim();
    const middle = String(profile.middle_name || '').trim();
    const middleInitial = middle ? `${middle.charAt(0).toUpperCase()}.` : '';
    const last = String(profile.last_name || '').trim();
    const suffix = String(profile.suffix || '').trim();
    const core = [first, middleInitial, last].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return suffix ? `${core}, ${suffix}` : core;
  }, [profile.first_name, profile.middle_name, profile.last_name, profile.suffix]);
  const middleInitial = useMemo(() => {
    const m = String(profile.middle_name || '').trim();
    return m ? `${m.charAt(0).toUpperCase()}.` : '';
  }, [profile.middle_name]);
  const roleDisplay = useMemo(() => {
    const r = (profile.role_name || '').toString().toLowerCase();
    if (r === 'admin') return 'Administrator';
    return profile.role_name || '—';
  }, [profile.role_name]);
  const handleNameChange = (value) => {
    const parts = String(value).split(' ');
    const first = parts.shift() || '';
    const last = parts.join(' ') || '';
    setProfile(prev => ({ ...prev, first_name: first, last_name: last }));
  };

  const handleTriggerUpload = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // basic client validation
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showErrorToast && showErrorToast('Invalid file', 'Use JPG/PNG/WEBP');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showErrorToast && showErrorToast('Too large', 'Max 3 MB');
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setSelectedFile(file);
    setCropOpen(true);
  };
  const handleRemovePhoto = () => {
    confirmation.showConfirmation && confirmation.showConfirmation({
      title: 'Remove photo?',
      message: 'This will delete your current profile picture.',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'warning'
    }).then(async (ok) => {
      if (!ok) return;
      try {
        confirmation.setLoading && confirmation.setLoading(true);
        const res = await authService.removeProfilePicture();
        if (res.success) {
          setAvatarPreview('');
          const ts = new Date().toISOString();
          setProfile(prev => ({ ...prev, profile_picture: '', updated_at: ts }));
          updateUser?.({ profilePicture: null, updatedAt: ts });
          showSuccessToast && showSuccessToast('Removed', 'Profile photo removed');
        } else {
          showErrorToast && showErrorToast('Remove failed', res.message || 'Try again');
        }
      } catch (e) {
        showErrorToast && showErrorToast('Remove failed', e.message || 'Try again');
      } finally {
        confirmation.setLoading && confirmation.setLoading(false);
        confirmation.hideConfirmation && confirmation.hideConfirmation();
      }
    });
  };

  // keep selected file in state
  const [selectedFile, setSelectedFile] = useState(null);
  const onCropComplete = (_, croppedPixels) => setCroppedAreaPixels(croppedPixels);

  const getCroppedBlob = (image, crop) => new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    };
    img.src = URL.createObjectURL(image);
  });

  const handleCropSave = async () => {
    try {
      if (!selectedFile || !croppedAreaPixels) return;
      setIsUploading(true);
      setUploadProgress(0);
      const blob = await getCroppedBlob(selectedFile, croppedAreaPixels);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const res = await authService.uploadProfilePicture(file, (evt) => {
        if (evt && evt.total) {
          setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      });
      if (res.success) {
        setProfile(prev => ({ ...prev, profile_picture: res.url, updated_at: res.updatedAt }));
        updateUser?.({ profilePicture: res.url, updatedAt: res.updatedAt });
        showSuccessToast && showSuccessToast('Photo updated', 'Your profile photo was saved.');
      } else {
        showErrorToast && showErrorToast('Upload failed', res.message || 'Try again');
      }
    } catch (e) {
      showErrorToast && showErrorToast('Upload failed', e.message || 'Try again');
    } finally {
      setIsUploading(false);
      setCropOpen(false);
      setSelectedFile(null);
    }
  };

  // Validation & Dirty-state helpers
  const isEmail = (val) => /.+@.+\..+/.test(String(val || '').trim());
  const dirtyPersonal = useMemo(() => {
    const orig = originalProfileRef.current || {};
    return (
      profile.first_name !== orig.first_name ||
      profile.last_name !== orig.last_name ||
      profile.middle_name !== orig.middle_name ||
      profile.suffix !== orig.suffix
    );
  }, [profile.first_name, profile.last_name, profile.middle_name, profile.suffix]);
  const validPersonal = useMemo(() => {
    return String(profile.first_name).trim().length > 0 && String(profile.last_name).trim().length > 0;
  }, [profile.first_name, profile.last_name]);
  const dirtyContact = useMemo(() => {
    const orig = originalProfileRef.current || {};
    return (
      profile.personal_email !== orig.personal_email
    );
  }, [profile.personal_email]);
  const validContact = useMemo(() => {
    if (String(profile.personal_email || '').trim().length === 0) return true;
    return isEmail(profile.personal_email);
  }, [profile.personal_email]);
  // Settings dirty/valid state
  const dirtySettings = useMemo(() => {
    const orig = originalProfileRef.current || {};
    return (
      profile.first_name !== orig.first_name ||
      profile.middle_name !== orig.middle_name ||
      profile.last_name !== orig.last_name ||
      profile.suffix !== orig.suffix ||
      profile.personal_email !== orig.personal_email
    );
  }, [profile.first_name, profile.middle_name, profile.last_name, profile.suffix, profile.personal_email]);
  const settingsErrors = useMemo(() => {
    const errors = {};
    if (!String(profile.first_name).trim()) errors.first_name = 'First name is required';
    if (!String(profile.last_name).trim()) errors.last_name = 'Last name is required';
    const pe = String(profile.personal_email || '').trim();
    if (pe && !isEmail(pe)) errors.personal_email = 'Enter a valid email address';
    return errors;
  }, [profile.first_name, profile.last_name, profile.personal_email]);
  const validSettings = Object.keys(settingsErrors).length === 0;

  // Profile completion logic
  const profileCompletion = useMemo(() => {
    const items = [
      {
        id: 'account_setup',
        label: 'Setup account',
        weight: 30,
        completed: !!(profile.email && profile.first_name && profile.last_name),
        icon: CheckCircle2,
        color: 'emerald'
      },
      {
        id: 'profile_photo',
        label: 'Upload your photo',
        weight: 25,
        completed: !!profile.profile_picture,
        icon: ImagePlus,
        color: 'amber',
        action: () => fileInputRef.current?.click()
      },
      {
        id: 'personal_info',
        label: 'Personal Info',
        weight: 25,
        completed: !!(profile.first_name && profile.last_name && profile.personal_email),
        icon: Calendar,
        color: 'blue',
        action: () => setActiveTab('settings')
      },
      {
        id: 'additional_info',
        label: 'Complete details',
        weight: 20,
        completed: true, // Middle name and suffix are optional
        icon: User,
        color: 'purple',
        action: () => setActiveTab('settings')
      }
    ];

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const completedWeight = items.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0);
    const percentage = Math.round((completedWeight / totalWeight) * 100);

    return { items, percentage, totalItems: items.length, completedItems: items.filter(item => item.completed).length };
  }, [profile.email, profile.first_name, profile.last_name, profile.profile_picture, profile.personal_email, profile.middle_name, profile.suffix]);

  const handleSavePersonal = () => {
    // Demo: persist to original ref and exit edit mode
    originalProfileRef.current = {
      ...(originalProfileRef.current || {}),
      first_name: profile.first_name,
      last_name: profile.last_name,
      middle_name: profile.middle_name,
      suffix: profile.suffix,
      email: profile.email,
      personal_email: profile.personal_email,
      role_name: profile.role_name
    };
    setEditingPersonal(false);
  };
  const handleSaveContact = () => {
    originalProfileRef.current = {
      ...(originalProfileRef.current || {}),
      personal_email: profile.personal_email
    };
    setEditingContact(false);
  };
  const handleResendVerification = () => {
    // Demo only
    console.log('Resend verification requested');
  };
  const onSubmitSettings = async (e) => {
    e.preventDefault();
    if (!dirtySettings || !validSettings || isSavingSettings) return;
    await handleSaveSettings();
  };
  const handleSaveSettings = async () => {
    console.log('🔘 Save clicked');
    showInfoToast && showInfoToast('Saving', 'Opening confirmation…');
    if (!validSettings) {
      const firstError = settingsErrors.first_name || settingsErrors.last_name || settingsErrors.personal_email || 'Please review the highlighted fields';
      showErrorToast && showErrorToast('Validation error', firstError);
      return;
    }

    const confirmed = await (confirmation.showConfirmation
      ? confirmation.showConfirmation({
          title: 'Save changes?',
          message: 'This will update your profile information.',
          confirmText: 'Save',
          cancelText: 'Cancel',
          variant: 'success'
        })
      : Promise.resolve(true));
    if (!confirmed) return;

    const updates = {
      first_name: profile.first_name,
      middle_name: profile.middle_name,
      last_name: profile.last_name,
      suffix: profile.suffix,
      personal_email: profile.personal_email
    };
    try {
      setIsSavingSettings(true);
      confirmation.setLoading && confirmation.setLoading(true);
      const res = await authService.updateProfile(updates);
      if (res.success && res.user) {
        // sync local original state
        originalProfileRef.current = {
          ...(originalProfileRef.current || {}),
          first_name: res.user.firstName || updates.first_name,
          middle_name: res.user.middleName ?? updates.middle_name,
          last_name: res.user.lastName || updates.last_name,
          suffix: res.user.suffix ?? updates.suffix,
          personal_email: res.user.personalEmail ?? updates.personal_email
        };
        // reflect returned values into profile
        setProfile((prev) => ({
          ...prev,
          first_name: res.user.firstName ?? prev.first_name,
          middle_name: res.user.middleName ?? prev.middle_name,
          last_name: res.user.lastName ?? prev.last_name,
          suffix: res.user.suffix ?? prev.suffix,
          personal_email: res.user.personalEmail ?? prev.personal_email,
          updated_at: res.user.updatedAt ?? prev.updated_at
        }));
        // update auth context user
        updateUser?.(res.user);
        showSuccessToast && showSuccessToast('Profile updated', 'Your profile information has been saved.');
      } else {
        console.warn('Update failed', res.message);
        showErrorToast && showErrorToast('Update failed', res.message || 'Please try again');
      }
    } catch (e) {
      console.error('Failed to save profile settings', e);
      showErrorToast && showErrorToast('Update failed', e.message || 'Unable to save changes');
    } finally {
      setIsSavingSettings(false);
      confirmation.setLoading && confirmation.setLoading(false);
      confirmation.hideConfirmation && confirmation.hideConfirmation();
    }
  };
  const handleCancelSettings = () => {
    const orig = originalProfileRef.current || {};
    setProfile(prev => ({
      ...prev,
      first_name: orig.first_name || '',
      middle_name: orig.middle_name || '',
      last_name: orig.last_name || '',
      suffix: orig.suffix || '',
      personal_email: orig.personal_email || ''
    }));
  };

  return (
    <div className="space-y-6">
      <HeaderMainContent 
        title="Profile" 
        description="Manage your personal information and account details."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Tabs and content in a single card (no gap) */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <TabContainer activeTab={activeTab} onTabChange={setActiveTab} variant="underline" size="md">
            <Tab id="overview" label="Overview" shortLabel="Overview" color="blue" />
            <Tab id="settings" label="Settings" shortLabel="Settings" color="yellow" />
          </TabContainer>
          <form className="p-6 border-t border-gray-100" onSubmit={onSubmitSettings}>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Edit Button - Mobile: Top, Desktop: Top Right */}
                <div className="flex justify-end md:justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Left: Photo */}
                  <div className="md:col-span-3 flex flex-col items-center gap-2 md:pr-4">
                    <div className="flex justify-center">
                      <Avatar name={fullName || profile.email} src={profile.profile_picture || avatarPreview} size={116} version={profile.updated_at} />
                    </div>
                    <div className="mt-1 text-base font-semibold text-gray-900 text-center">
                      {fullName || profile.email}
                    </div>
                    <div className="text-xs text-gray-500 text-center capitalize">
                      {roleDisplay}
                    </div>
                  </div>
                  {/* Right: Details */}
                  <div className="md:col-span-9">
                    <div className="space-y-1 max-w-5xl">
                      <InfoRow label="Full Name" value={fullName} />
                      <InfoRow label="Personal Email" value={profile.personal_email || '—'} />
                      <InfoRow label="Work Email" value={profile.email} />
                      <InfoRow label="Joined" value={profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-sm text-gray-600">Update your profile information</div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-3 items-start">
                  {/* Left: Photo - Mobile: Full width, Desktop: 3 columns */}
                  <div className="md:col-span-3 flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center gap-3">
                      <Avatar name={fullName || profile.email} src={profile.profile_picture || avatarPreview} size={116} version={profile.updated_at} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                        <ImagePlus className="w-4 h-4" />
                        Change Photo
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      <div onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault(); if(e.dataTransfer.files?.[0]) handleFileChange({ target: { files: e.dataTransfer.files } });}} className="text-xs text-gray-500 text-center leading-tight max-w-48 border border-dashed border-gray-300 rounded-md px-3 py-2">
                        Drag & drop to upload
                      </div>
                      <div className="text-xs text-gray-500 text-center leading-tight max-w-48">At least 800×800 px.<br/>JPG/PNG/WEBP ≤ 3 MB</div>
                      {profile.profile_picture && (
                        <button type="button" onClick={handleRemovePhoto} className="text-xs text-red-700 border border-red-200 rounded-full px-3 py-1 hover:bg-red-50">Remove Photo</button>
                      )}
                    </div>
                  </div>
                  {/* Right: Details - Mobile: Full width, Desktop: 9 columns */}
                  <div className="md:col-span-9">
                    <div className="space-y-4">
                      <EditableRow label="Last Name">
                        <input value={profile.last_name || ''} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} className={`w-full px-3 py-2 rounded-md border ${settingsErrors.last_name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500'} bg-white`} />
                      </EditableRow>
                      <EditableRow label="First Name">
                        <input value={profile.first_name || ''} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} className={`w-full px-3 py-2 rounded-md border ${settingsErrors.first_name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500'} bg-white`} />
                      </EditableRow>
                      <EditableRow label="Middle Name">
                        <input value={profile.middle_name || ''} onChange={(e) => setProfile({ ...profile, middle_name: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                      </EditableRow>
                      <EditableRow label="Suffix">
                        <input value={profile.suffix || ''} onChange={(e) => setProfile({ ...profile, suffix: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                      </EditableRow>
                      <EditableRow label="Personal Email">
                        <input value={profile.personal_email || ''} onChange={(e) => setProfile({ ...profile, personal_email: e.target.value })} className={`w-full px-3 py-2 rounded-md border ${settingsErrors.personal_email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500'} bg-white`} />
                      </EditableRow>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons - Moved to bottom */}
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 border-t border-gray-100">
                  <button type="button" onClick={handleCancelSettings} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors">Cancel</button>
                  <button type="button" disabled={!dirtySettings || !validSettings || isSavingSettings} onClick={handleSaveSettings} className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 transition-colors ${dirtySettings && validSettings && !isSavingSettings ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>{isSavingSettings ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            )}
          </form>
          {/* Footer with last updated date */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-end text-xs text-gray-500">
              <span>Last updated: {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>

        {/* Right Column - Enhanced Profile Completion */}
        <div className="space-y-4">
          {/* Floating Action Button for Mobile */}
          {profileCompletion.percentage < 100 && (
            <div className="xl:hidden fixed bottom-6 right-6 z-50">
              <button
                onClick={() => setActiveTab('settings')}
                className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center"
              >
                <Edit2 className="w-6 h-6" />
              </button>
            </div>
          )}

          <div className={`relative overflow-hidden rounded-2xl border shadow-lg backdrop-blur-sm transition-all duration-500 ${
            profileCompletion.percentage === 100 
              ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 shadow-emerald-100' 
              : 'border-gray-200/60 bg-white/95'
          }`}>
            {/* Header Section */}
            <div className="relative px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    profileCompletion.percentage === 100 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Profile Completion
                    </h3>
                    <p className="text-sm text-gray-500">
                      {profileCompletion.percentage === 100 
                        ? 'All set! Your profile is complete' 
                        : `${profileCompletion.percentage}% complete`}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  profileCompletion.percentage === 100 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                    : profileCompletion.percentage >= 75 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : profileCompletion.percentage >= 50
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {profileCompletion.percentage}%
                </div>
              </div>

              {/* Enhanced Progress Ring */}
              <div className="flex justify-center mb-8 py-4">
                <div className="relative">
                  <ProgressRing percent={profileCompletion.percentage} />
                  {profileCompletion.percentage === 100 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Completion Items */}
            <div className="px-6 pb-6">
              <div className="space-y-3">
                {profileCompletion.items.map((item, index) => {
                  const IconComponent = item.icon;
                  const isCompleted = item.completed;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`group relative p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${
                        isCompleted 
                          ? 'bg-emerald-50/50 border-emerald-200/60' 
                          : 'bg-gray-50/50 border-gray-200/60 hover:border-gray-300/60'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isCompleted 
                              ? 'bg-emerald-100 text-emerald-600' 
                              : `bg-${item.color}-100 text-${item.color}-600`
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <IconComponent className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-medium transition-colors ${
                              isCompleted 
                                ? 'text-emerald-700 line-through' 
                                : 'text-gray-700'
                            }`}>
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.weight}% of total score
                            </p>
                          </div>
                        </div>
                        
                        {isCompleted ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                              ✓ Complete
                            </span>
                          </div>
                        ) : (
                          <button 
                            onClick={item.action}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 hover:scale-105 ${
                              item.color === 'amber' 
                                ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100' :
                                item.color === 'blue' 
                                ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100' :
                                item.color === 'purple' 
                                ? 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100' :
                                'border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            {item.id === 'profile_photo' ? 'Upload Photo' : 'Complete'}
                          </button>
                        )}
                      </div>
                      
                      {/* Progress bar for individual item */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              isCompleted ? 'bg-emerald-400' : `bg-${item.color}-400`
                            }`}
                            style={{ width: isCompleted ? '100%' : '0%' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Completion Celebration */}
              {profileCompletion.percentage === 100 && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-800">Profile Complete!</h4>
                      <p className="text-xs text-emerald-600">Excellent work! Your profile is fully optimized.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips and Benefits */}
              {profileCompletion.percentage < 100 ? (
                <div className="mt-4 space-y-2">
                  <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200/50">
                    <p className="text-xs text-blue-600 text-center">
                      💡 Complete your profile to unlock better features and improve your experience
                    </p>
                  </div>
                  
                  {/* Benefits list */}
                  <div className="p-3 rounded-lg bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-indigo-200/50">
                    <h5 className="text-xs font-semibold text-indigo-700 mb-2">Benefits of completing:</h5>
                    <ul className="space-y-1 text-xs text-indigo-600">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                        Enhanced security and verification
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                        Better personalized experience
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                        Access to premium features
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-emerald-50/50 to-green-50/50 border border-emerald-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <h5 className="text-xs font-semibold text-emerald-700">All benefits unlocked!</h5>
                  </div>
                  <p className="text-xs text-emerald-600">You now have access to all premium features and enhanced security.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" maxToasts={5} />
      <div className="relative z-[99999]">
        <ConfirmationModal {...(confirmation?.modalProps || {})} />
      </div>
      {cropOpen && (
        <div className="fixed inset-0 z-[99998] bg-black/60 grid place-items-center p-3 sm:p-4" onClick={() => setCropOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[calc(100vw-24px)] sm:max-w-xl h-[90vh] sm:h-auto max-h-[90vh] overflow-y-auto flex flex-col p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full flex-1 min-h-[50vh] sm:h-80 bg-gray-200 rounded-md overflow-hidden">
              <Cropper
                image={avatarPreview}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
              <div className="flex items-center gap-3 w-full sm:w-2/3">
                <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
                {/* Round preview thumbnail */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-gray-200">
                  <img src={avatarPreview} alt="preview" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 sm:justify-end">
                <button type="button" onClick={() => setCropOpen(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
                <button type="button" onClick={handleCropSave} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white">{isUploading ? `Saving ${uploadProgress}%` : 'Use Photo'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Avatar };
export default StaffProfile;
