import React, { useEffect, useMemo, useState } from 'react';
import { User, Mail, Shield, IdCard, Phone, Save, Edit2, ImagePlus, Trash2, CheckCircle2, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.js';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import { HeaderMainContent, TabContainer, Tab } from '../../components/portal_main_content';

const Field = ({ label, children, description }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
    {children}
    {description ? (
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    ) : null}
  </div>
);

const ReadOnlyInput = ({ value }) => (
  <div className="w-full px-3 py-2 rounded-md border border-gray-100 bg-gray-50 text-gray-800 dark:bg-gray-800/60 dark:border-gray-700 dark:text-gray-200">
    {value || '-'}
  </div>
);

const Card = ({ title, children, right, footer }) => (
  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-200/70 dark:border-gray-700/70 shadow-sm">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {right}
    </div>
    <div className="p-5">
      {children}
    </div>
    {footer && (
      <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
        {footer}
      </div>
    )}
  </div>
);

const StatItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 bg-white dark:bg-gray-800/60 dark:border-gray-700">
    <div className="shrink-0 w-9 h-9 grid place-items-center rounded-md bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-200">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{value || '—'}</div>
    </div>
  </div>
);

const ProgressRing = ({ percent = 0 }) => (
  <div className="relative w-28 h-28">
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: `conic-gradient(#10b981 ${percent * 3.6}deg, #e5e7eb 0deg)`
      }}
    />
    <div className="absolute inset-2 rounded-full bg-white dark:bg-gray-800 grid place-items-center">
      <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{percent}%</div>
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="grid grid-cols-12 gap-3 items-center py-1.5">
    <div className="col-span-12 md:col-span-3 text-sm text-gray-600 dark:text-gray-300 md:text-right">{label}:</div>
    <div className="col-span-12 md:col-span-9">
      <div className="w-full px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-900 dark:bg-gray-800/60 dark:border-gray-700 dark:text-gray-100">
        {value || '—'}
      </div>
    </div>
  </div>
);

const EditableRow = ({ label, children }) => (
  <div className="grid grid-cols-12 gap-3 items-center py-1.5">
    <div className="col-span-12 md:col-span-3 text-sm text-gray-600 dark:text-gray-300 md:text-right">{label}:</div>
    <div className="col-span-12 md:col-span-9">
      {children}
    </div>
  </div>
);

const Avatar = ({ name, src, size = 56 }) => {
  const initials = useMemo(() => {
    if (!name) return 'A';
    const parts = String(name).trim().split(' ');
    return parts.slice(0, 2).map(p => p.charAt(0)).join('').toUpperCase();
  }, [name]);

  if (src) {
    return <img src={src} alt="Profile" className={`rounded-full object-cover shadow-sm`} style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full bg-gradient-to-br from-emerald-600 to-green-500 text-white flex items-center justify-center font-semibold shadow-sm" style={{ width: size, height: size }}>
      {initials}
    </div>
  );
};

const AdminProfile = () => {
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

  const fullName = useMemo(() => `${profile.first_name} ${profile.last_name}`.trim(), [profile.first_name, profile.last_name]);
  const middleInitial = useMemo(() => {
    const m = String(profile.middle_name || '').trim();
    return m ? `${m.charAt(0).toUpperCase()}.` : '';
  }, [profile.middle_name]);
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
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setIsUploading(true);
    // Demo only: simulate upload delay
    setTimeout(() => {
      setProfile(prev => ({ ...prev, profile_picture: preview }));
      setIsUploading(false);
    }, 600);
  };
  const handleRemovePhoto = () => {
    setAvatarPreview('');
    setProfile(prev => ({ ...prev, profile_picture: '' }));
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Left: Photo */}
                  <div className="md:col-span-3 flex flex-col gap-2 md:pr-4">
                    <div className="flex justify-center md:justify-end">
                      <Avatar name={fullName || profile.email} src={profile.profile_picture || avatarPreview} size={116} />
                    </div>
                    <div className="mt-1 text-base font-semibold text-gray-900 text-center md:text-right">
                      {fullName || profile.email}
                    </div>
                    <div className="text-xs text-gray-500 text-center md:text-right capitalize">
                      {profile.role_name || '—'}
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
                      <Avatar name={fullName || profile.email} src={profile.profile_picture || avatarPreview} size={116} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                        <ImagePlus className="w-4 h-4" />
                        Change Photo
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      <div className="text-xs text-gray-500 text-center leading-tight max-w-48">At least 800×800 px recommended.<br/>JPG or PNG is allowed</div>
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
                  <button type="button" onClick={handleCancelSettings} className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
                  <button type="button" disabled={!dirtySettings || !validSettings || isSavingSettings} onClick={handleSaveSettings} className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm rounded-lg ${dirtySettings && validSettings && !isSavingSettings ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>{isSavingSettings ? 'Saving…' : 'Save'}</button>
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

        {/* Right Column - Replace with Complete your profile graph */}
        <div className="space-y-4">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl border border-gray-200/70 dark:border-gray-700/70 shadow-sm p-5 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Complete your profile</div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">Guide</span>
            </div>
            <div className="flex items-center gap-5">
              <ProgressRing percent={60} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-gray-700">Setup account</span>
                  </div>
                  <span className="text-gray-500">100%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ImagePlus className="w-4 h-4 text-amber-500" />
                    <span className="text-gray-700">Upload your photo</span>
                  </div>
                  <button onClick={() => setActiveTab('settings')} className="text-xs px-2 py-0.5 rounded border border-amber-200 text-amber-700 hover:bg-amber-50">Add</button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700">Personal Info</span>
                  </div>
                  <button onClick={() => setActiveTab('settings')} className="text-xs px-2 py-0.5 rounded border border-blue-200 text-blue-700 hover:bg-blue-50">Review</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" maxToasts={5} />
      <div className="relative z-[99999]">
        <ConfirmationModal {...(confirmation?.modalProps || {})} />
      </div>
    </div>
  );
};

export default AdminProfile;
