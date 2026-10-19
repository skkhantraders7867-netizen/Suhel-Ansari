import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#070e24] rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] border border-[#14234b] space-y-5 animate-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            isDestructive 
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
          }`}>
            {isDestructive ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="text-lg font-black text-white font-heading">{title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#0f1d44] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white bg-[#09122e] hover:bg-[#0f1d44] border border-[#172654] rounded-xl transition-colors min-h-[44px] cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 min-h-[44px] cursor-pointer active:scale-95 ${
              isDestructive 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400/40'
            }`}
          >
            {isDestructive && <Trash2 className="w-4 h-4" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
