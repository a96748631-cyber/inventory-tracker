import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  subMessage?: string;
  itemsToDelete?: { partNumber: string; itemName: string }[];
  confirmText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  secondaryAction?: {
    label: string;
    onAction: () => void;
    variant?: 'danger' | 'default';
  };
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  subMessage,
  itemsToDelete,
  confirmText = 'Delete',
  confirmVariant = 'danger',
  secondaryAction,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="confirm-action-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                confirmVariant === 'danger'
                  ? 'bg-red-100 text-red-600 border border-red-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}
            >
              {confirmVariant === 'danger' ? (
                <Trash2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{message}</p>

              {itemsToDelete && itemsToDelete.length > 0 && (
                <div className="mt-3 max-h-36 overflow-y-auto bg-slate-50 rounded-xl p-2.5 border border-slate-200 space-y-1.5 divide-y divide-slate-200/60">
                  {itemsToDelete.map((item, idx) => (
                    <div key={idx} className="pt-1.5 first:pt-0 text-xs">
                      <span className="font-mono font-bold text-slate-800">{item.partNumber}</span>
                      <span className="text-slate-500 ml-1.5 truncate block">{item.itemName}</span>
                    </div>
                  ))}
                </div>
              )}

              {subMessage && (
                <p className="text-xs text-slate-500 mt-2 font-medium">{subMessage}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
            <div>
              {secondaryAction && (
                <button
                  type="button"
                  onClick={() => {
                    secondaryAction.onAction();
                    onClose();
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    secondaryAction.variant === 'danger'
                      ? 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
                      : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-modal-action-btn"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  confirmVariant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {confirmVariant === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
                <span>{confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
