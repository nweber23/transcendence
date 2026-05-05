import { useCallback, useReducer } from 'react';
import { ToastMessage, ToastType } from '@/components/ui/Toast';

interface ToastState {
  toasts: ToastMessage[];
}

type ToastAction =
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string };

const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        toasts: [...state.toasts, action.payload],
      };
    case 'REMOVE_TOAST':
      return {
        toasts: state.toasts.filter((toast) => toast.id !== action.payload),
      };
    default:
      return state;
  }
};

interface ShowToastOptions {
  duration?: number;
}

export const useToast = () => {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', options?: ShowToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: ToastMessage = {
        id,
        message,
        type,
        duration: options?.duration,
      };
      dispatch({ type: 'ADD_TOAST', payload: toast });
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);

  const success = useCallback(
    (message: string, options?: ShowToastOptions) =>
      showToast(message, 'success', options),
    [showToast]
  );

  const error = useCallback(
    (message: string, options?: ShowToastOptions) =>
      showToast(message, 'error', options),
    [showToast]
  );

  const info = useCallback(
    (message: string, options?: ShowToastOptions) =>
      showToast(message, 'info', options),
    [showToast]
  );

  const warning = useCallback(
    (message: string, options?: ShowToastOptions) =>
      showToast(message, 'warning', options),
    [showToast]
  );

  return {
    toasts: state.toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
};
