import React from 'react';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  userName?: string;
  userPhone?: string;
  title?: string;
  description?: string;
  isLogoutMode?: boolean;
}

/**
 * TEMPORARILY DISABLED
 *
 * The PIN flow is being rebuilt. The app must remain usable while that work is
 * in progress, so this component deliberately bypasses PIN verification.
 * Keep the component/API in place so the rebuilt PIN flow can be restored
 * without changing the App integration.
 */
export const PinVerificationModal: React.FC<Props> = ({ isOpen, onSuccess }) => {
  React.useEffect(() => {
    if (!isOpen) return;
    // Give React one tick to finish the state transition before continuing.
    const timer = window.setTimeout(() => onSuccess(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, onSuccess]);

  return null;
};