import React, { useState } from 'react';
import { Lock, Shield, KeyRound, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';

interface AdminLockScreenProps {
  onUnlock: () => void;
  correctPin: string;
}

export const AdminLockScreen: React.FC<AdminLockScreenProps> = ({ onUnlock, correctPin }) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === correctPin) {
      setErrorMsg('');
      onUnlock();
    } else {
      setErrorMsg('رمز الدخول غير صحيح! يرجى المحاولة مرة أخرى.');
      setPinInput('');
    }
  };

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 8) {
      const next = pinInput + num;
      setPinInput(next);
      setErrorMsg('');
      if (next === correctPin) {
        onUnlock();
      }
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative font-['Cairo',sans-serif] select-none">
      {/* Background radial atmosphere */}
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617]">
        <div className="w-96 h-96 bg-[#b68c58]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md glass p-8 border border-white/10 shadow-2xl rounded-3xl space-y-6 text-center animate-fadeIn">
        {/* Brand Lock Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#b68c58]/20 to-indigo-600/20 border border-[#b68c58]/40 flex items-center justify-center text-[#b68c58] shadow-lg shadow-[#b68c58]/10">
          <Shield className="w-10 h-10" />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#020617] border border-[#b68c58] flex items-center justify-center text-[#b68c58]">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black italic tracking-wide text-[#b68c58]">
            DREAM MASTER
          </h1>
          <p className="text-xs text-indigo-400 font-bold uppercase tracking-[0.3em]">
            Admin Security Gate
          </p>
          <p className="text-xs text-slate-400 pt-2">
            لوحة الإدارة والتحكم محمية. يرجى إدخال رمز المرور السري (PIN).
          </p>
        </div>

        {/* PIN Dots Display */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              autoFocus
              maxLength={12}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setErrorMsg('');
              }}
              placeholder="••••"
              className="custom-input text-center text-2xl tracking-[0.4em] font-mono py-3"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute left-3 top-3.5 text-slate-400 hover:text-white transition-colors"
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="py-3.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 text-lg font-bold text-white transition-all shadow-xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleDelete}
              className="py-3.5 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 border border-white/5 text-xs font-bold text-slate-400 transition-all"
            >
              مسح ⌫
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="py-3.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 text-lg font-bold text-white transition-all shadow-xs"
            >
              0
            </button>
            <button
              type="submit"
              className="py-3.5 rounded-xl btn-gold text-sm font-bold flex items-center justify-center transition-all shadow-md"
            >
              دخول 🔓
            </button>
          </div>
        </form>

        <div className="pt-2 text-[11px] text-slate-500 border-t border-white/5">
          الرمز الافتراضي: <span className="text-[#b68c58] font-mono font-bold">1183</span> (يمكنك تغييره بعد الدخول)
        </div>
      </div>
    </div>
  );
};
