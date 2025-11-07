import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  MoreHorizontal,
  Mail,
  MapPin,
  Phone,
  Calendar,
  BadgeCheck,
  Check,
  BarChart2,
  LogOut
} from 'lucide-react';
import Avatar from './Avatar';
import Status from './Status';

const iconRegistry = {
  map: MapPin,
  location: MapPin,
  email: Mail,
  phone: Phone,
  calendar: Calendar,
  stats: BarChart2,
  logout: LogOut
};

const resolveValue = (value, data) =>
  typeof value === 'function' ? value(data) : value;

const resolveArray = (value, data) => {
  const resolved = resolveValue(value, data);
  return Array.isArray(resolved) ? resolved : [];
};

const deepClone = (value) => JSON.parse(JSON.stringify(value ?? {}));

const displayValue = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' && value.trim() === '') return '—';
  return value;
};

const formatDisplayValue = (type, value) => {
  const raw = displayValue(value);
  if (raw === '—') return raw;

  if (type === 'date' || type === 'datetime') {
    try {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return raw;
      return type === 'date'
        ? date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
    } catch (error) {
      return raw;
    }
  }

  return raw;
};

const getIconComponent = (icon, className = '') => {
  if (!icon) return null;
  const IconComponent = typeof icon === 'string' ? iconRegistry[icon] : icon;
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};

const InputField = ({
  field,
  value,
  mode,
  onChange
}) => {
  const isEditable = mode === 'edit' && field.editable !== false && field.type !== 'status';
  const type = field.type || 'text';
  const name = field.key;

  const handleChange = (eventOrValue) => {
    if (!onChange) return;
    if (eventOrValue && eventOrValue.target) {
      const { target } = eventOrValue;
      const nextValue =
        target.type === 'checkbox' ? target.checked : target.value;
      onChange(name, nextValue);
    } else {
      onChange(name, eventOrValue);
    }
  };

  if (!isEditable) {
    // Render read-only as input-style when requested
    if (field.readOnlyStyle === 'input' || field.variant === 'pill') {
      const formattedValue = formatDisplayValue(type, value);
      const baseClasses = field.variant === 'pill'
        ? 'rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] md:px-4 md:py-2.5 md:text-sm text-gray-600 placeholder-gray-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]'
        : 'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700';
      return (
        <div className={`relative ${baseClasses}`}>
          <span className="block truncate text-gray-900">
            {formattedValue}
          </span>
          {field.successIndicator && (
            <span className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-green-500 text-white">
              <Check className="h-3 w-3" />
            </span>
          )}
        </div>
      );
    }
    if (type === 'status') {
      return <Status status={value} variant="badge" size="md" />;
    }
    if (type === 'boolean') {
      return <span className="text-sm text-gray-900">{value ? 'Enabled' : 'Disabled'}</span>;
    }
    if (type === 'date' || type === 'datetime') {
      const formatted = formatDisplayValue(type, value);
      return <span className="text-sm text-gray-900">{formatted}</span>;
    }
    if (field.renderValue) {
      return field.renderValue(value);
    }
    return <span className="text-sm text-gray-900 break-words">{formatDisplayValue(type, value)}</span>;
  }

  if (field.renderInput) {
    return field.renderInput({ value, onChange: handleChange });
  }

  switch (type) {
    case 'textarea':
      return (
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          rows={field.rows || 4}
          name={name}
          placeholder={field.placeholder}
          value={value ?? ''}
          onChange={handleChange}
        />
      );
    case 'select':
      return (
        <select
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          name={name}
          value={value ?? ''}
          onChange={handleChange}
        >
          {(field.options || []).map((option) => {
            const optionValue = option?.value ?? option;
            const optionLabel = option?.label ?? optionValue;
            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
      );
    case 'boolean':
      return (
        <button
          type="button"
          onClick={() => handleChange(!value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            value ? 'bg-gray-900' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      );
    case 'date':
      return (
        <input
          type="date"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          name={name}
          value={value ?? ''}
          onChange={handleChange}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          name={name}
          value={value ?? ''}
          onChange={handleChange}
        />
      );
    default:
      return (
        <div className="relative">
          <input
            type="text"
            className={`w-full ${
              field.variant === 'pill'
                ? 'rounded-2xl border border-gray-300 bg-white px-3 py-2 text-[13px] md:px-4 md:py-2.5 md:text-sm text-gray-900 placeholder-gray-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900/30'
                : field.variant === 'filled'
                ? 'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                : 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'
            } ${
              field.successIndicator ? 'pr-9' : ''
            }`}
            name={name}
            placeholder={field.placeholder}
            value={value ?? ''}
            onChange={handleChange}
          />
          {field.successIndicator && (
            <span className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-green-500 text-white">
              <Check className="h-3 w-3" />
            </span>
          )}
        </div>
      );
  }
};

const Section = ({ section, data, mode, setFieldValue }) => {
  const fields = section.fields || [];
  const toggles = section.toggles || [];
  const hasContent = fields.length > 0 || toggles.length > 0 || section.render;
  if (!hasContent) return null;

  const isMainSection = section.variant === 'main';
  return (
    <div className={`space-y-2.5 md:space-y-3 ${isMainSection ? 'mt-2' : ''}`} key={section.id || section.title}>
      {section.title && (
        <h3 className={`${isMainSection ? 'text-sm' : 'text-[11px] md:text-xs'} font-semibold text-gray-900`}>{section.title}</h3>
      )}
      {section.description && (
        <p className="text-[11px] md:text-xs text-gray-600">{section.description}</p>
      )}
      {section.render && section.render({ data, mode, setFieldValue })}
      {fields.length > 0 && (
        <div
          className={`grid gap-3 md:gap-5 ${
            section.layout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {fields.map((field) => {
            const widthClass =
              field.width === 'full' ? 'col-span-2' : 'col-span-1';
            const resolvedValue =
              typeof field.value === 'function'
                ? field.value(data)
                : field.value !== undefined
                ? field.value
                : data[field.key];
            return (
              <div key={field.key} className={`space-y-1 md:space-y-1.5 ${widthClass}`}>
                {field.label && (
                  <label className="block text-[11px] md:text-xs font-semibold text-gray-900">
                    {field.label}
                  </label>
                )}
                <InputField
                  field={field}
                  value={resolvedValue}
                  mode={mode}
                  onChange={setFieldValue}
                />
                {field.helper && (
                  <p className="text-[10px] md:text-[11px] text-gray-500">{field.helper}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {toggles.length > 0 && (
        <div className="space-y-4">
          {toggles.map((toggle) => {
            const toggleValue =
              toggle.value !== undefined
                ? (typeof toggle.value === 'function' ? toggle.value(data) : toggle.value)
                : data[toggle.key];
            const isEditableToggle = toggle.editable !== false && mode === 'edit';
            return (
              <div
                key={toggle.key || toggle.label}
                className="flex items-start justify-between"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{toggle.label}</p>
                  {toggle.description && (
                    <p className="text-xs text-gray-500">{toggle.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditableToggle) return;
                    setFieldValue(toggle.key, !toggleValue);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    toggleValue ? 'bg-gray-900' : 'bg-gray-300'
                  } ${isEditableToggle ? '' : 'cursor-default'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      toggleValue ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TabNavigation = ({ tabs, activeTab, setActiveTab }) => {
  if (!tabs.length) return null;
  return (
    <div className="border-b border-gray-200 px-6">
      <nav className="flex gap-4 md:gap-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 pb-2 md:pb-3 text-xs md:text-sm font-medium transition ${
                isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon && getIconComponent(tab.icon, 'h-4 w-4')}
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gray-900" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

const AvatarBlock = ({ header, data }) => {
  const avatarConfig = resolveValue(header.avatar, data) || {};
  const coverGradient = header.coverClass || 'from-gray-300 to-gray-400';
  const avatarType = avatarConfig.type || 'avatar';

  const renderAvatar = () => {
    if (avatarConfig.render) {
      return avatarConfig.render({ data });
    }

    if (avatarType === 'emoji' && avatarConfig.value) {
      return (
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-white p-1 shadow-lg">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-orange-200 to-orange-300 text-3xl">
              {avatarConfig.value}
            </div>
          </div>
          {avatarConfig.badge && (
            <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-pink-500">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-white p-1.5 shadow-lg">
          <div className="h-full w-full overflow-hidden rounded-full">
            <Avatar
              size="xl"
              className="w-full h-full"
              user={avatarConfig.user || {
                firstName: data.firstName,
                lastName: data.lastName,
                personalEmail: data.email,
                profilePicture: data.profilePicture
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <div className={`relative h-32 w-full bg-gradient-to-br ${coverGradient}`}>
        {/* Top right actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {header.menuButton && (
            <button
              onClick={header.menuButton.onClick}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <MoreHorizontal className="h-5 w-5 text-gray-700" />
            </button>
          )}
          {resolveArray(header.actions, data).map((action, index) => (
            <button
              key={index}
              onClick={() => action.onClick?.(data)}
              className="flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-white"
            >
              {action.icon && getIconComponent(action.icon, 'h-4 w-4 text-gray-600')}
              <span>{resolveValue(action.label, data)}</span>
            </button>
          ))}
        </div>
        {/* Avatar overlapping the cover */}
        <div className="absolute left-6 top-full z-10 -translate-y-1/2">
          {renderAvatar()}
        </div>
      </div>
      <div className="px-6 pb-6 pt-12">
        <div className="pt-2 space-y-3">
          <div className="ml-6 mt-2 flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">
              {resolveValue(header.title, data) || 'Profile'}
            </h2>
            {header.verified && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          {resolveArray(header.meta, data).length > 0 && (
            <div className="ml-6 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              {resolveArray(header.meta, data).map((meta, index) => (
                <div key={index} className="flex items-center gap-1">
                  {meta.icon && getIconComponent(meta.icon, 'h-4 w-4')}
                  <span>{resolveValue(meta.value, data) || '—'}</span>
                </div>
              ))}
            </div>
          )}
          {resolveArray(header.pills, data).length > 0 && (
            <div className="ml-6 flex flex-wrap gap-2">
              {resolveArray(header.pills, data).map((pill, index) => (
                <span
                  key={index}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {resolveValue(pill, data)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabbedDetailModal = ({
  isOpen,
  onClose,
  mode = 'view',
  data = {},
  config = {}
}) => {
  const [formState, setFormState] = useState(deepClone(data));
  const [originalData, setOriginalData] = useState(deepClone(data));
  const [activeTab, setActiveTab] = useState(config.tabs?.[0]?.id || 'profile');
  const [currentMode, setCurrentMode] = useState(mode);

  useEffect(() => {
    if (isOpen) {
      const cloned = deepClone(data);
      setFormState(cloned);
      setOriginalData(cloned);
      setCurrentMode(mode);
      if (config.tabs?.length) {
        setActiveTab(config.tabs[0].id);
      }
    }
  }, [isOpen, data, config.tabs, mode]);

  const setFieldValue = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const header = useMemo(() => config.header || {}, [config.header]);
  const tabs = useMemo(() => config.tabs || [], [config.tabs]);
  const isDirty = useMemo(() => JSON.stringify(formState) !== JSON.stringify(originalData), [formState, originalData]);

  const handleDiscard = () => {
    const revert = deepClone(originalData);
    setFormState(revert);
    config.onDiscard?.(revert);
  };

  const handleSave = async () => {
    const result = await config.onSave?.(formState, originalData);
    if (result !== false) {
      if (result && typeof result === 'object') {
        const nextState = deepClone(result);
        setFormState(nextState);
        setOriginalData(nextState);
      } else {
        setOriginalData(deepClone(formState));
      }
      setCurrentMode('view');
    }
  };

  const footerButtons = useMemo(() => {
    const resolved = resolveArray(config.footerButtons, formState);
    if (resolved.length) return resolved;

    if (currentMode === 'edit') {
      return [
        {
          key: 'discard',
          label: 'Discard',
          variant: 'secondary',
          onClick: handleDiscard
        },
        {
          key: 'save',
          label: 'Save Changes',
          variant: 'primary',
          onClick: handleSave,
          disabled: !isDirty
        }
      ];
    }

    return [
      {
        key: 'close',
        label: 'Close',
        variant: 'secondary',
        onClick: onClose
      }
    ];
  }, [config.footerButtons, formState, currentMode, handleDiscard, handleSave, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl h-[95vh] md:h-[80vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <AvatarBlock header={header} data={formState} />

        <TabNavigation tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 overflow-y-scroll px-6 py-6" style={{ scrollbarGutter: 'stable' }}>
          <div className="space-y-6">
            {tabs
              .filter((tab) => tab.id === activeTab)
              .map((tab) => (
                <Fragment key={tab.id}>
                  {tab.sections?.map((section, index) => (
                    <Section
                      key={section.id || index}
                      section={section}
                      data={formState}
                      mode={currentMode}
                      setFieldValue={setFieldValue}
                    />
                  ))}
                </Fragment>
              ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-6">
          {footerButtons.map((button) => {
            const variant = button.variant || 'secondary';
            const isPrimary = variant === 'primary';
            const className = isPrimary
              ? 'px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium transition hover:bg-gray-800 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed'
              : 'px-5 py-2 rounded-lg text-sm font-medium text-gray-700 transition hover:bg-gray-100 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed';
            return (
              <button
                key={button.key || button.label}
                onClick={() => button.onClick?.(formState)}
                className={className}
                disabled={button.disabled}
              >
                {button.icon && getIconComponent(button.icon, 'h-4 w-4')}
                {resolveValue(button.label, formState)}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TabbedDetailModal;