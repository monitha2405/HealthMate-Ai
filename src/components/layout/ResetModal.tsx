import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete?: () => void;
}

export const ResetModal: React.FC<ResetModalProps> = ({ isOpen, onClose, onResetComplete }) => {
  const { resetGuestSession, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleConfirmReset = async () => {
    setLoading(true);
    setStatusMessage(null);

    const result = await resetGuestSession();

    setLoading(false);
    if (result.success) {
      setStatusMessage({
        type: 'success',
        text: 'All guest records have been permanently purged. A fresh anonymous session has been initialized.'
      });
      setTimeout(() => {
        onClose();
        if (onResetComplete) onResetComplete();
      }, 1800);
    } else {
      setStatusMessage({
        type: 'error',
        text: result.message || 'Purge failed. Please retry.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Reset Guest Session & Data</h3>
              <p className="text-xs text-slate-500">Permanent cryptographic deletion of user-scoped records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 space-y-3">
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p>
              This action is <strong className="font-semibold">irreversible</strong>. In accordance with strict guest privacy and data-isolation standards, all records tied to your anonymous UID (<code className="bg-rose-100 px-1 py-0.5 rounded text-[11px] font-mono">{user?.uid ? `${user.uid.slice(0, 10)}...` : 'active-session'}</code>) will be permanently deleted from the database.
            </p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">The following will be completely deleted:</p>
          <ul className="text-xs text-slate-600 space-y-1.5 pl-2 list-disc list-inside">
            <li>Uploaded medical reports, PDF text, and preview files</li>
            <li>Document chunks and PostgreSQL pgvector cosine embeddings</li>
            <li>Extracted biomarker lab values (verified and unverified)</li>
            <li>Health tracker measurements (blood pressure, glucose, weight)</li>
            <li>AI assistant conversation history and memory logs</li>
            <li>Custom nutrition goals, preferences, and generated meal plans</li>
            <li>Daily wellness habits, hydration, and streak counters</li>
            <li>Execution traces and user-specific evaluation logs</li>
          </ul>

          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmReset}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Purging Records...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Permanent Deletion</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
