// Universal Frontend Components
// Provides consistent UI/UX across all management systems

// Toast Notifications
export { default as ToastNotification } from './ToastNotification';
export { 
  default as ToastContainer,
  showToast,
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  showStaffSuccessToast,
  showSKSuccessToast,
  showReportSuccessToast,
  clearToasts
} from './ToastContainer';

// Confirmation Modals
export { 
  default as ConfirmationModal,
  showConfirmation,
  confirmPresets 
} from './ConfirmationModal';

// Hooks
export { default as useActivityLogger } from '../../hooks/useActivityLogger';
export { default as useConfirmation } from '../../hooks/useConfirmation';
