import React, { useMemo, useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { HeaderMainContent } from '../../components/portal_main_content';

const Requirement = ({ ok, text }) => (
  <div className={`text-sm ${ok ? 'text-emerald-600' : 'text-gray-500'} flex items-center gap-2`}>
    <ShieldCheck className={`w-4 h-4 ${ok ? '' : 'opacity-40'}`} /> {text}
  </div>
);

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const rules = useMemo(() => ({
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword)
  }), [newPassword]);

  const valid = rules.length && rules.upper && rules.lower && rules.digit && newPassword === confirmPassword && currentPassword.length > 0;

  const pwInput = (value, setValue, shown, toggleShown, placeholder) => (
    <div className="relative">
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
      />
      <button type="button" onClick={toggleShown} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <HeaderMainContent title="Change Password" description="Set a strong password to keep your account secure." />

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-200/70 dark:border-gray-700/70 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Update Password</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Lock className="w-4 h-4" />
            <span className="text-sm">We never store or log your raw password.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Current Password</label>
              {pwInput(currentPassword, setCurrentPassword, show.current, () => setShow(s => ({ ...s, current: !s.current })), 'Enter current password')}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800 dark:text-gray-200">New Password</label>
              {pwInput(newPassword, setNewPassword, show.next, () => setShow(s => ({ ...s, next: !s.next })), 'Enter new password')}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Confirm New Password</label>
              {pwInput(confirmPassword, setConfirmPassword, show.confirm, () => setShow(s => ({ ...s, confirm: !s.confirm })), 'Re-enter new password')}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Password Requirements</label>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1.5">
                <Requirement ok={rules.length} text="At least 8 characters" />
                <Requirement ok={rules.upper} text="Contains an uppercase letter" />
                <Requirement ok={rules.lower} text="Contains a lowercase letter" />
                <Requirement ok={rules.digit} text="Contains a number" />
              </div>
            </div>
          </div>

          <div>
            <button disabled={!valid} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${valid ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
              Update Password (demo)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;


