import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { HeaderMainContent } from '../../components/portal_main_content';
import systemNoticeService from '../../services/systemNoticeService';
import { ToastContainer, showSuccessToast, showErrorToast, ConfirmationModal } from '../../components/universal';
import useConfirmation from '../../hooks/useConfirmation';

const SystemNotice = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    enabled: false,
    dismissible: true,
    type: 'info',
    text: '',
    expiresAt: ''
  });
  const [loadedState, setLoadedState] = useState(null);
  const confirmation = useConfirmation();

  // Format a Date (or date string) to an input[type="datetime-local"] value using LOCAL time
  const toDateTimeLocal = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (!isFinite(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const HH = pad(d.getHours());
    const MM = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${HH}:${MM}`;
  };

  const expiredNow = (() => {
    if (!form.expiresAt) return false;
    try {
      const dt = new Date(form.expiresAt);
      return isFinite(dt.getTime()) && dt.getTime() < Date.now();
    } catch {
      return false;
    }
  })();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await systemNoticeService.getSystemNotice();
      if (resp?.success && resp?.data) {
        const d = resp.data;
        const next = {
          enabled: !!d.enabled,
          dismissible: d.dismissible !== false,
          type: d.type || 'info',
          text: d.text || '',
          // keep local wall-clock time consistent, avoid UTC shift
          expiresAt: d.expiresAt ? toDateTimeLocal(d.expiresAt) : ''
        };
        setForm(next);
        setLoadedState(next);
      }
    } catch (e) {
      setError('Failed to load notice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      if (form.enabled && expiredNow) {
        showErrorToast('Cannot Save as Enabled', 'Expires At is in the past. Update the date/time or disable the banner.');
        setSaving(false);
        return;
      }
      const payload = {
        enabled: form.enabled,
        dismissible: form.dismissible,
        type: form.type,
        text: form.text,
        // Send as local datetime string; backend parses as local time
        expiresAt: form.expiresAt || null
      };
      // Ask confirmation on save (emphasize when changing visibility)
      const confirmed = await confirmation.showConfirmation({
        title: loadedState && loadedState.enabled !== form.enabled
          ? (form.enabled ? 'Enable System Notice?' : 'Disable System Notice?')
          : 'Save System Notice?',
        message: loadedState && loadedState.enabled !== form.enabled
          ? (form.enabled
            ? 'This will show the banner publicly until disabled or it expires.'
            : 'This will hide the banner from the public site.')
          : 'Apply the changes to the system notice?',
        confirmText: 'Save',
        variant: form.enabled ? 'success' : 'default'
      });
      if (!confirmed) {
        setSaving(false);
        return;
      }
      confirmation.hideConfirmation();

      await systemNoticeService.updateSystemNotice(payload);
      await load();
      showSuccessToast('Notice Saved', 'Your system notice was saved successfully.');
    } catch (e) {
      setError('Failed to save notice');
      showErrorToast('Save Failed', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const typePreviewClass = (() => {
    switch (form.type) {
      case 'success': return 'bg-green-100 border-green-500 text-green-800';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'danger': return 'bg-red-100 border-red-500 text-red-800';
      default: return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  })();

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" maxToasts={5} />
      <HeaderMainContent
        title="System Notice"
        description="Manage the public important notice banner"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-700 ring-1 ring-red-200">{error}</div>
          )}

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Display Settings</h3>
            <p className="text-xs text-gray-500">Control visibility and behavior of the public banner.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={form.enabled}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-800">Enabled</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="dismissible"
                  checked={form.dismissible}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-800">Dismissible</span>
              </label>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (optional)</label>
                <input
                  type="datetime-local"
                  name="expiresAt"
                  value={form.expiresAt}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                {form.expiresAt && expiredNow && (
                  <div className="mt-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                    This date/time is already in the past. The banner will not appear publicly unless you update it or disable expiration.
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                name="text"
                value={form.text}
                onChange={handleChange}
                rows={4}
                placeholder="Enter the notice text to display on the public site"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">Keep it concise. The banner scrolls long messages for readability.</p>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Notice'}
              </Button>
              <Button type="button" variant="secondary" onClick={load} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Live Preview</h3>
            <p className="text-xs text-gray-500">This is how the banner will appear on the public site.</p>
          </div>
          <div className={`border-l-4 ${typePreviewClass} rounded relative overflow-hidden`}>
            <div className="px-3 py-2 whitespace-nowrap text-xs">{form.text || 'Your notice text will appear here.'}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center justify-between bg-gray-50 rounded p-2 ring-1 ring-gray-200">
              <span>Status</span>
              <span className="font-medium text-gray-900">{form.enabled ? (expiredNow ? 'Enabled (Expired)' : 'Enabled') : 'Disabled'}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded p-2 ring-1 ring-gray-200">
              <span>Type</span>
              <span className="font-medium text-gray-900 capitalize">{form.type}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded p-2 ring-1 ring-gray-200">
              <span>Dismissible</span>
              <span className="font-medium text-gray-900">{form.dismissible ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded p-2 ring-1 ring-gray-200">
              <span>Expires</span>
              <span className="font-medium text-gray-900">{form.expiresAt ? `${new Date(form.expiresAt).toLocaleString()}${expiredNow ? ' (Expired)' : ''}` : '—'}</span>
            </div>
          </div>
        </Card>
      </div>
      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default SystemNotice;


