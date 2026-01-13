import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ToastContainer, ToastMessage, ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export interface ToastOptions {
    duration?: number;
    id?: string;
}

interface UIContextType {
    toast: {
        success: (message: string, options?: number | ToastOptions) => void;
        error: (message: string, options?: number | ToastOptions) => void;
        info: (message: string, options?: number | ToastOptions) => void;
    };
    confirm: (message: string, title?: string) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Toast State
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((type: ToastType, message: string, options?: number | ToastOptions) => {
        let duration: number | undefined;
        let customId: string | undefined;

        if (typeof options === 'number') {
            duration = options;
        } else if (typeof options === 'object') {
            duration = options.duration;
            customId = options.id;
        }

        const id = customId || Math.random().toString(36).substr(2, 9);

        setToasts(prev => {
            // If ID exists, remove old one first (replace/update)
            const filtered = prev.filter(t => t.id !== id);
            return [...filtered, { id, type, message, duration }];
        });
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (msg: string, opt?: number | ToastOptions) => addToast('success', msg, opt),
        error: (msg: string, opt?: number | ToastOptions) => addToast('error', msg, opt),
        info: (msg: string, opt?: number | ToastOptions) => addToast('info', msg, opt),
    };

    // Confirm Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        message: string;
        title: string;
        resolve: ((value: boolean) => void) | null;
    }>({
        isOpen: false,
        message: '',
        title: '',
        resolve: null,
    });

    const confirm = useCallback((message: string, title: string = 'Confirm Action') => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({
                isOpen: true,
                message,
                title,
                resolve,
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (confirmState.resolve) {
            confirmState.resolve(true);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false, resolve: null }));
    }, [confirmState]);

    const handleCancel = useCallback(() => {
        if (confirmState.resolve) {
            confirmState.resolve(false);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false, resolve: null }));
    }, [confirmState]);

    return (
        <UIContext.Provider value={{ toast, confirm }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <ConfirmModal
                isOpen={confirmState.isOpen}
                message={confirmState.message}
                title={confirmState.title}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </UIContext.Provider>
    );
};
