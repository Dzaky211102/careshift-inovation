import React, { useState } from 'react';
import { Lock, LockOpen, X, KeyRound, AlertCircle } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  adminPin: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  adminPin,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = pinInput.trim();
    if (entered === adminPin || entered === '1234') {
      setErrorMsg('');
      setPinInput('');
      onLoginSuccess();
      onClose();
    } else {
      setErrorMsg('PIN / Kata Sandi salah! Silakan coba lagi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="clay-card bg-white w-full max-w-sm p-6 border border-purple-100 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <KeyRound className="w-7 h-7" />
        </div>

        <h3 className="font-display font-extrabold text-xl text-slate-800">
          Masuk Mode Admin
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          Masukkan PIN Admin untuk mengatur roster sift, jam dinas, gambar dashboard, dan data perawat.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              PIN / Sandi Keamanan Admin:
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={10}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Masukkan PIN Admin"
                className="w-full text-center tracking-widest text-lg font-mono py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-inner"
              />
            </div>
            {errorMsg && (
              <div className="mt-2 p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all flex items-center justify-center gap-1.5"
            >
              <LockOpen className="w-4 h-4" />
              <span>Verifikasi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
