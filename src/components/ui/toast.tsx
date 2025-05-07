// components/ui/toast.tsx
'use client';

import * as React from 'react';
import { X } from 'lucide-react';

// Helper function to combine class names
function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
  onDismiss?: () => void;
}

type Toast = ToastProps & {
  id: string;
  visible: boolean;
  timeout: any;
};

type ToastContextType = {
  toasts: Toast[];
  toast: (props: ToastProps) => string;
  dismiss: (id: string) => void;
};

// Create the context
const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

// Toast components
function ToastComponent({
  id,
  title,
  description,
  action,
  variant = 'default',
  onDismiss,
}: Toast) {
  // Variant based styling
  const variantStyles = {
    default: "bg-white border border-gray-200 text-gray-900",
    destructive: "bg-red-600 text-white border-red-500",
    success: "bg-green-600 text-white border-green-500",
  };

  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md p-6 pr-8 shadow-lg transition-all",
        variantStyles[variant]
      )}
    >
      <div className="grid gap-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {description && <p className="text-sm opacity-90">{description}</p>}
      </div>
      {action}
      <button
        onClick={() => onDismiss?.()}
        className="absolute right-2 top-2 rounded-md p-1 text-gray-500 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Provider component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  // Function to dismiss a toast
  const dismiss = React.useCallback((id: string) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, visible: false } : toast
      )
    );

    // Remove the toast after animation
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    }, 300);
  }, []);

  // Function to add a toast
  const toast = React.useCallback(
    ({
      id = Math.random().toString(36).substring(2, 9),
      title,
      description,
      action,
      variant = "default",
      duration = 5000,
      onDismiss,
    }: ToastProps) => {
      setToasts((prevToasts) => {
        // Check if the toast with this ID already exists
        const existingToastIndex = prevToasts.findIndex((t) => t.id === id);

        // Clear any existing timeout for the toast
        if (existingToastIndex !== -1 && prevToasts[existingToastIndex].timeout) {
          clearTimeout(prevToasts[existingToastIndex].timeout);
        }

        let timeout: any = null;
        if (duration > 0) {
          timeout = window.setTimeout(() => {
            dismiss(id);
          }, duration);
        }

        const newToast: Toast = {
          id,
          title,
          description,
          action,
          variant,
          duration,
          visible: true,
          timeout,
          onDismiss: () => {
            dismiss(id);
            onDismiss?.();
          },
        };

        if (existingToastIndex !== -1) {
          const newToasts = [...prevToasts];
          newToasts[existingToastIndex] = newToast;
          return newToasts;
        }

        return [...prevToasts, newToast];
      });

      return id;
    },
    [dismiss]
  );

  // Create the context value
  const contextValue = React.useMemo(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss]
  );

  // For global toast function outside React
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const handler = (e: CustomEvent<ToastProps>) => {
        toast(e.detail);
      };
      
      window.addEventListener('toast-event', handler as EventListener);
      return () => {
        window.removeEventListener('toast-event', handler as EventListener);
      };
    }
  }, [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "mb-2 transform transition-all duration-300 ease-in-out",
              toast.visible
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0 pointer-events-none"
            )}
          >
            <ToastComponent {...toast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Hook to use toast inside components
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}