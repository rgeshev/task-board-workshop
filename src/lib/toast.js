import { initToasts, pushToast } from '../components/Toast/Toast.js';

export function initToast() {
  initToasts();
}

export function toastError(message, options = {}) {
  return pushToast({ message, type: 'error', ...options });
}

export function toastInfo(message, options = {}) {
  return pushToast({ message, type: 'info', ...options });
}

export function toastSuccess(message, options = {}) {
  return pushToast({ message, type: 'success', ...options });
}

export function toastFromError(error, fallback = 'Something went wrong. Please try again.') {
  const message =
    typeof error === 'string'
      ? error
      : error?.message || error?.error_description || fallback;

  return toastError(message);
}

export const toast = {
  error: toastError,
  info: toastInfo,
  success: toastSuccess,
  fromError: toastFromError,
};
