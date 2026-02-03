import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="h-5 w-5" />,
        error: <AlertCircle className="h-5 w-5" />,
        warning: <AlertTriangle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />
    };

    const iconColors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    const borderColors = {
        success: 'rgba(16, 185, 129, 0.5)',
        error: 'rgba(239, 68, 68, 0.5)',
        warning: 'rgba(245, 158, 11, 0.5)',
        info: 'rgba(59, 130, 246, 0.5)'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 right-4 z-[100] max-w-md w-full pointer-events-auto"
        >
            <div 
                className="flex items-start gap-3 p-4 rounded-xl shadow-2xl"
                style={{
                    background: 'var(--surface-glass)',
                    backdropFilter: 'blur(var(--blur-lg))',
                    WebkitBackdropFilter: 'blur(var(--blur-lg))',
                    border: `1px solid ${borderColors[type]}`,
                    boxShadow: `var(--shadow-xl), 0 0 0 1px ${borderColors[type]}`
                }}
            >
                <div className="flex-shrink-0 mt-0.5" style={{ color: iconColors[type] }}>
                    {icons[type]}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words" style={{ color: 'var(--text)' }}>
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 ml-2 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text)' }}
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </motion.div>
    );
};

// Toast Container Component
export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-0 right-0 z-[100] pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast, index) => (
                    <div key={toast.id} style={{ marginTop: index * 80 }}>
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            duration={toast.duration}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default Toast;
