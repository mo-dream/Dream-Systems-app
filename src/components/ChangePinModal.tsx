import React, { useState } from 'react';
import { KeyRound, Check, X, AlertCircle } from 'lucide-react';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPin: string;
  onSaveNewPin: (newPin: string) => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  onClose,
  currentPin,
  onSaveNewPin,
}) => {
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPinInput !== currentPin) {
      setErrorMsg('الرمز السري الحالي غير صحيح');
      return;
    }
    if (newPinInput.length < 4) {
      setErrorMsg('الرمز الجديد يجب أن يتكون من 4 أرقام أو أحرف على الأقل');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setErrorMsg('الرمز الجديد وتأكيده غير متطابقين');
      return;
    }

    onSaveNewPin(newPinInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md glass p-6 border border-white/10 rounded-3xl space-y-5 relative shadow-2xl animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#b68c58]/20 border border-[#b68c58]/40 flex items-center justify-center text-[#b68c58]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">تغيير رمز المرور السري (PIN)</h3>
            <p className="text-xs text-slate-400">تحديث الرمز لحماية مركز الإدارة HQ</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">الرمز السري الحالي</label>
            <input
              type="password"
              required
              value={oldPinInput}
              onChange={(e) => setOldPinInput(e.target.value)}
              placeholder="••••"
              className="custom-input text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">الرمز السري الجديد</label>
            <input
              type="password"
              required
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value)}
              placeholder="أدخل الرمز الجديد"
              className="custom-input text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">تأكيد الرمز السري الجديد</label>
            <input
              type="password"
              required
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value)}
              placeholder="أعد إدخال الرمز الجديد"
              className="custom-input text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl btn-gold text-xs font-bold transition-all shadow-md"
            >
              حفظ الرمز الجديد ✨
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
