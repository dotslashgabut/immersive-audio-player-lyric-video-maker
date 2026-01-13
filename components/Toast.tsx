import React, { useEffect, useState } from 'react';
import { X, Check, AlertCircle, Info } from './Icons';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, toast.duration || 500);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onRemove, 300); // Wait for animation
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <Check size={18} className="text-green-400" />;
      case 'error': return <AlertCircle size={18} className="text-red-400" />;
      default: return <Info size={18} className="text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success': return 'border-green-500/30';
      case 'error': return 'border-red-500/30';
      default: return 'border-blue-500/30';
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 bg-zinc-900/60 backdrop-blur-xl border ${getBorderColor()} 
        text-zinc-100 px-4 py-3 rounded-xl shadow-2xl min-w-[300px] max-w-md
        transition-all duration-300 transform
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        animate-in slide-in-from-right fade-in
      `}
      role="alert"
    >
      <div className="shrink-0">
        {getIcon()}
      </div>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={handleClose}
        className="text-zinc-500 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
        </div>
      ))}
    </div>
  );
};
