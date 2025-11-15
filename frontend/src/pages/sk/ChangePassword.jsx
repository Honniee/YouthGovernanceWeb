import React, { useEffect, useMemo, useState } from 'react';
import { User, Mail, Shield, IdCard, Phone, Save, Edit2, ImagePlus, Trash2, CheckCircle2, Calendar, Lock, Eye, EyeOff, AlertTriangle, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.js';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import { HeaderMainContent } from '../../components/portal_main_content';
import logger from '../../utils/logger.js';

const Field = ({ label, children, description }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-900">{label}</label>
    {children}
    {description ? (
      <p className="text-xs text-gray-600">{description}</p>
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
          stroke={percent === 100 ? '#10b981' : '#22c55e'}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.4))'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 leading-none tracking-tight">
            {percent}%
          </div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 opacity-80">
            Complete
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="grid grid-cols-12 gap-3 items-center py-1.5">
    <div className="col-span-12 md:col-span-2 text-sm text-gray-600 dark:text-gray-300 md:text-right">{label}:</div>
    <div className="col-span-12 md:col-span-10">
      <div className="w-full px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-900 dark:bg-gray-800/60 dark:border-gray-700 dark:text-gray-100">
        {value || '—'}
      </div>
    </div>
  </div>
);

const EditableRow = ({ label, children }) => (
  <div className="grid grid-cols-12 gap-3 items-center py-1.5">
    <div className="col-span-12 md:col-span-2 text-sm text-gray-600 dark:text-gray-300 md:text-right">{label}:</div>
    <div className="col-span-12 md:col-span-10">
      {children}
    </div>
  </div>
);

const ChangePassword = () => {
  const { user } = useAuth();
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });
  const [touchedFields, setTouchedFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const confirmation = (useConfirmation && useConfirmation()) || { showConfirmation: async () => true, hideConfirmation: () => {}, setLoading: () => {}, modalProps: {} };

  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    let score = 0;
    const feedback = [];
    
    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Lowercase letter');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Uppercase letter');
    
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Number');
    
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push('Special character');
    
    return { score, feedback };
  };

  // Update password strength when new password changes
  useEffect(() => {
    if (passwordData.newPassword) {
      setPasswordStrength(calculatePasswordStrength(passwordData.newPassword));
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [passwordData.newPassword]);

  // Password validation - only show errors for touched fields or after submit attempt
  const passwordErrors = useMemo(() => {
    const errors = {};
    
    // Only show errors if field is touched or user has attempted to submit
    const shouldShowError = (fieldName) => hasAttemptedSubmit || touchedFields[fieldName];
    
    if (shouldShowError('currentPassword') && !passwordData.currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (shouldShowError('newPassword') && !passwordData.newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else if (shouldShowError('newPassword') && passwordData.newPassword.trim() && passwordStrength.score < 3) {
      errors.newPassword = 'Password is too weak';
    }
    
    if (shouldShowError('confirmPassword') && !passwordData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (shouldShowError('confirmPassword') && passwordData.confirmPassword.trim() && passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (passwordData.currentPassword && passwordData.newPassword && 
        passwordData.currentPassword === passwordData.newPassword && 
        shouldShowError('newPassword')) {
      errors.newPassword = 'New password must be different from current password';
    }
    
    return errors;
  }, [passwordData, passwordStrength.score, touchedFields, hasAttemptedSubmit]);

  const isFormValid = useMemo(() => {
    return Object.keys(passwordErrors).length === 0 && 
           passwordData.currentPassword && 
           passwordData.newPassword && 
           passwordData.confirmPassword;
  }, [passwordErrors, passwordData]);

  // Password change handlers
  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChangePassword = async () => {
    // Mark that user has attempted to submit
    setHasAttemptedSubmit(true);
    
    if (!isFormValid || isChangingPassword) return;

    const confirmed = await (confirmation.showConfirmation
      ? confirmation.showConfirmation({
          title: 'Change Password?',
          message: 'This will update your SK account password. You will need to log in again.',
          confirmText: 'Change Password',
          cancelText: 'Cancel',
          variant: 'warning'
        })
      : Promise.resolve(true));

    if (!confirmed) return;

    try {
      setIsChangingPassword(true);
      confirmation.setLoading && confirmation.setLoading(true);

      // Call the actual password change API
      const response = await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
        passwordData.confirmPassword
      );

      if (response.success) {
        // Clear form on success
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTouchedFields({
          currentPassword: false,
          newPassword: false,
          confirmPassword: false
        });
        setHasAttemptedSubmit(false);

        showSuccessToast && showSuccessToast('Password Changed', response.message || 'Your SK password has been updated successfully.');
      } else {
        // Handle API errors
        const errorMessage = response.message || 'Unable to change password';
        const errorDetails = response.errors && response.errors.length > 0 
          ? response.errors.map(err => err.msg || err).join(', ')
          : '';
        
        showErrorToast && showErrorToast('Change Failed', errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      }
      
    } catch (e) {
      logger.error('Password change error', e);
      showErrorToast && showErrorToast('Change Failed', e.message || 'Unable to change password');
    } finally {
      setIsChangingPassword(false);
      confirmation.setLoading && confirmation.setLoading(false);
      confirmation.hideConfirmation && confirmation.hideConfirmation();
    }
  };

  const handleCancel = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setTouchedFields({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false
    });
    setHasAttemptedSubmit(false);
  };

  // Password strength indicator component
  const PasswordStrengthIndicator = () => {
    const strengthColors = {
      0: 'bg-gray-200',
      1: 'bg-red-400',
      2: 'bg-orange-400', 
      3: 'bg-yellow-400',
      4: 'bg-blue-400',
      5: 'bg-green-400'
    };
    
    const strengthLabels = {
      0: 'Very Weak',
      1: 'Very Weak',
      2: 'Weak',
      3: 'Fair',
      4: 'Good',
      5: 'Strong'
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`h-2 rounded-full transition-all duration-300 ${
                  level <= passwordStrength.score 
                    ? strengthColors[passwordStrength.score] 
                    : 'bg-gray-200'
                }`}
                style={{ width: '20%' }}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-gray-600">
            {strengthLabels[passwordStrength.score]}
          </span>
        </div>
        {passwordStrength.feedback.length > 0 && (
          <div className="text-xs text-gray-500">
            <p className="mb-1">Password should include:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {passwordStrength.feedback.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <HeaderMainContent 
        title="Change Password" 
        description="Update your SK account password to keep your account secure."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Password Change Form */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">SK Password Settings</h3>
              <p className="text-sm text-gray-500 mt-1">Enter your current password and choose a new secure password for your SK account</p>
            </div>
            
            <form className="p-6" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
              <div className="space-y-6">
                {/* Current Password */}
                <Field label="Current Password" description="Enter your current password to verify your identity">
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      onBlur={() => handleFieldBlur('currentPassword')}
                      className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                        passwordErrors.currentPassword 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-200 focus:ring-green-500 focus:border-green-500'
                      } bg-white transition-colors`}
                      placeholder="Enter your current password"
                      disabled={isChangingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </Field>

                {/* New Password */}
                <Field label="New Password" description="Choose a strong password with at least 8 characters">
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      onBlur={() => handleFieldBlur('newPassword')}
                      className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                        passwordErrors.newPassword 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-200 focus:ring-green-500 focus:border-green-500'
                      } bg-white transition-colors`}
                      placeholder="Enter your new password"
                      disabled={isChangingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.newPassword}</p>
                  )}
                  {passwordData.newPassword && <PasswordStrengthIndicator />}
                </Field>

                {/* Confirm Password */}
                <Field label="Confirm New Password" description="Re-enter your new password to confirm">
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      onBlur={() => handleFieldBlur('confirmPassword')}
                      className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                        passwordErrors.confirmPassword 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-200 focus:ring-green-500 focus:border-green-500'
                      } bg-white transition-colors`}
                      placeholder="Confirm your new password"
                      disabled={isChangingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </Field>
        </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-6 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
                  disabled={isChangingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || isChangingPassword}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                    isFormValid && !isChangingPassword
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isChangingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
            <Lock className="w-4 h-4" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security Tips Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                SK Security Tips
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Key className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Use a Strong Password</h4>
                  <p className="text-xs text-gray-600 mt-1">Include uppercase, lowercase, numbers, and special characters</p>
                </div>
          </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Unique Password</h4>
                  <p className="text-xs text-gray-600 mt-1">Don't reuse passwords from other accounts</p>
                </div>
            </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Regular Updates</h4>
                  <p className="text-xs text-gray-600 mt-1">Change your password periodically for better security</p>
            </div>
              </div>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-green-200">
              <h3 className="text-lg font-semibold text-green-900">SK Password Requirements</h3>
            </div>
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-800">At least 8 characters long</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Contains uppercase and lowercase letters</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Includes numbers and special characters</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Different from your current password</span>
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

export default ChangePassword;