import React, { useState, useEffect } from 'react';
import {
  Tv,
  X,
  Maximize2,
  ExternalLink,
  Copy,
  Check,
  Cast,
  Monitor,
  Sparkles,
  Sun,
  ShieldCheck,
  Flame,
  Usb,
} from 'lucide-react';

interface ConnectTvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullscreen: () => void;
  onOpenUsbFlashdisk?: () => void;
  wardName: string;
  hospitalName: string;
}

export const ConnectTvModal: React.FC<ConnectTvModalProps> = ({
  isOpen,
  onClose,
  onOpenFullscreen,
  onOpenUsbFlashdisk,
  wardName,
  hospitalName,
}) => {
  const [copied, setCopied] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);

  useEffect(() => {
    if ('wakeLock' in navigator) {
      setWakeLockSupported(true);
    }
  }, []);

  if (!isOpen) return null;

  const tvUrl = `${window.location.origin}${window.location.pathname}?mode=tv`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(tvUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        if (!wakeLockActive) {
          await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
        } else {
          setWakeLockActive(false);
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="clay-card bg-white w-full max-w-lg p-6 border border-purple-100 shadow-2xl relative rounded-3xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-inner shrink-0">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              Koneksi Praktis
            </span>
            <h3 className="font-display font-extrabold text-xl text-slate-800 leading-tight">
              Sambungkan Tampilan TV
            </h3>
            <p className="text-xs text-slate-500">
              {hospitalName} · {wardName}
            </p>
          </div>
        </div>

        {/* 3 Quick Action Cards */}
        <div className="space-y-3 mb-5">
          {/* Action 1: Open Fullscreen Directly */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between gap-3 hover:bg-purple-100/60 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-slate-800">1. Layar Penuh TV (Di Layar Ini)</h4>
                <p className="text-[11px] text-slate-500 truncate">
                  Jalankan Tampilan TV langsung tanpa menu dan toolbar
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onOpenFullscreen();
                onClose();
              }}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap"
            >
              Mulai TV
            </button>
          </div>

          {/* Action 2: Open Dedicated Window for Secondary Display / HDMI */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between gap-3 hover:bg-indigo-100/60 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <ExternalLink className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-slate-800">2. Jendela Bersih Khusus TV (HDMI)</h4>
                <p className="text-[11px] text-slate-500 truncate">
                  Buka jendela bersih, tinggal geser ke TV tab/monitor kedua
                </p>
              </div>
            </div>
            <a
              href={tvUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onClose()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap inline-flex items-center gap-1"
            >
              <span>Buka TV</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Action 3: Copy TV Link for Smart TV Browser */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3 hover:bg-emerald-100/60 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Monitor className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-slate-800">3. Salin Link Smart TV</h4>
                <p className="text-[11px] text-slate-500 truncate">
                  Buka browser bawaan di Android TV / Smart TV ruangan
                </p>
              </div>
            </div>
            <button
              onClick={handleCopyLink}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap ${
                copied
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
            </button>
          </div>

          {/* Action 4: Non-Smart TV / USB Flashdisk Playback */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 flex items-center justify-between gap-3 hover:bg-amber-100/70 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Usb className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-slate-800">4. TV Biasa (Bukan Smart TV) - Flashdisk USB</h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                    Solusi Praktis
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Unduh paket foto slide 1080p untuk dicolokkan dan diputar langsung lewat port USB TV
                </p>
              </div>
            </div>
            {onOpenUsbFlashdisk && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUsbFlashdisk();
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap"
              >
                Paket USB
              </button>
            )}
          </div>
        </div>

        {/* Prevent TV Sleep / Wake Lock */}
        {wakeLockSupported && (
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900 leading-tight">
                  Cegah TV Mati / Tidur Otomatis
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Menjaga layar TV tetap menyala terus selama jam dinas
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleWakeLock}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                wakeLockActive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-amber-300 text-amber-800'
              }`}
            >
              {wakeLockActive ? 'Aktif' : 'Aktifkan'}
            </button>
          </div>
        )}

        {/* Practical Step-by-Step Guide */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
          <p className="font-bold text-slate-800 flex items-center gap-1">
            <Cast className="w-3.5 h-3.5 text-purple-600" />
            <span>Cara Menyambungkan ke TV:</span>
          </p>
          <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
            <li>
              <strong>TV Biasa (Flashdisk USB)</strong>: Klik tombol <em>"Paket USB"</em> di atas untuk mengunduh foto slide 1080p, salin ke Flashdisk, lalu tancapkan ke port USB TV dan tekan Play di remote TV.
            </li>
            <li>
              <strong>Smart TV (Browser / Cast)</strong>: Buka browser bawaan TV atau gunakan tombol <em>"Transmisikan / Cast"</em> di browser Chrome/Edge.
            </li>
            <li>
              <strong>Kabel HDMI</strong>: Hubungkan laptop ke TV, klik <em>"Buka TV"</em> lalu geser ke layar TV dan tekan F11.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
