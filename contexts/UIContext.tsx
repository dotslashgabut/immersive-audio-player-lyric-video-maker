import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ToastContainer, ToastMessage, ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

interface UIContextType {
    toast: {
        success: (message: string, duration?: number) => void;
        error: (message: string, duration?: number) => void;
        info: (message: string, duration?: number) => void;
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

    const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, type, message, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (msg: string, dur?: number) => addToast('success', msg, dur),
        error: (msg: string, dur?: number) => addToast('error', msg, dur),
        info: (msg: string, dur?: number) => addToast('info', msg, dur),
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
