import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'primary';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'destructive'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  variant === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                }`}>
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-2xl font-black text-foreground tracking-tight">{title}</h3>
              </div>
              
              <p className="text-muted-foreground font-medium leading-relaxed">
                {message}
              </p>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs"
                >
                  {cancelText}
                </Button>
                <Button
                  variant={variant === 'destructive' ? 'destructive' : 'default'}
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg"
                >
                  {confirmText}
                </Button>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
