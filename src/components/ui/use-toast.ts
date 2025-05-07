// components/ui/use-toast.ts
'use client';

import { useToast as useInternalToast, ToastProps } from './toast';

// Re-export the hook for use in components
export const useToast = useInternalToast;

// For use outside of React components
export function toast(props: ToastProps) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('toast-event', { detail: props });
    window.dispatchEvent(event);
  }
  return props.id || Math.random().toString(36).substring(2, 9);
}

// Re-export the interface
export type { ToastProps };