import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Search,
  ShieldPlus,
  Building2,
  Cloud,
  Sun,
  SunMedium,
  Moon,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LockOpen,
  Copy,
  PenLine,
} from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { ShiftConfig, WardInfo } from '../types';
import { getWitaTimeString, formatWitaFullDate, normalizeTimeToDot } from '../utils/witaTime';
import { SyncStatusInfo } from '../services/firebase';

interface HeaderProps {
  currentShift: string;
  shiftConfigs: ShiftConfig[];
  effectiveTheme: string;
  hospitalName: string;
  wardName: string;
  hospitalLogoUrl: string;
  institutionLogoUrl: string;
  emergencyPhone: string;
  isAdmin: boolean;
  onOpenLoginModal: () => void;
  onLogoutAdmin: () => void;
  onSearchPatient?: (query: string) => void;
  onSelectShiftPreview?: (shift: string) => void;
  wards?: WardInfo[];
  activeWardId?: string;
  onOpenWardManagement?: () => void;
  onOpenDuplicateWard?: () => void;
  onEditActiveWard?: () => void;
  syncStatus?: SyncStatusInfo;
}

export const Header: React.FC<HeaderProps> = ({
  currentShift,
  shiftConfigs,
  effectiveTheme,
  hospitalName,
  wardName,
  hospitalLogoUrl,
  institutionLogoUrl,
  emergencyPhone,
  isAdmin,
  onOpenLoginModal,
  onLogoutAdmin,
  onSearchPatient,
  wards,
  activeWardId,
  onOpenWardManagement,
  onOpenDuplicateWard,
  onEditActiveWard,
  syncStatus,
}) => {
  const [currentWitaDate, setCurrentWitaDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentWitaDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const witaTimeStr = getWitaTimeString(currentWitaDate, true);
  const witaDateStr = formatWitaFullDate(currentWitaDate);

  // Active shift config
  const configs = shiftConfigs && Array.isArray(shiftConfigs) && shiftConfigs.length > 0 ? shiftConfigs : [
    {
      id: 'pagi',
      name: 'Sif Pagi',
      startTime: '07:00',
      endTime: '14:00',
      colorTheme: 'amber',
    },
    {
      id: 'siang',
      name: 'Sif Siang',
      startTime: '14:00',
      endTime: '21:00',
      colorTheme: 'orange',
    },
    {
      id: 'malam',
      name: 'Sif Malam',
      startTime: '21:00',
      endTime: '07:00',
      colorTheme: 'indigo',
    },
  ];
  const activeConfig = configs.find((s) => s.id === currentShift) || configs[0];

  const getShiftBadge = () => {
    const startFormatted = normalizeTimeToDot(activeConfig.startTime);
    const endFormatted = normalizeTimeToDot(activeConfig.endTime);

    switch (activeConfig.id) {
      case 'pagi':
        return {
          label: `${activeConfig.name} (${startFormatted} - ${endFormatted})`,
          icon: Sun,
          className: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        };
      case 'siang':
        return {
          label: `${activeConfig.name} (${startFormatted} - ${endFormatted})`,
          icon: SunMedium,
          className: 'bg-orange-100 text-orange-900 border-orange-300 font-bold',
        };
      default:
        return {
          label: `${activeConfig.name} (${startFormatted} - ${endFormatted})`,
          icon: Moon,
          className: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold',
        };
    }
  };

  const shiftInfo = getShiftBadge();
  const ShiftIcon = shiftInfo.icon;

  return (
    <header className="clay-card-flat bg-white/90 backdrop-blur-md px-4 md:px-6 py-3.5 mb-5 flex flex-col md:flex-row items-center justify-between gap-3 border border-purple-100/70 shadow-sm">
      {/* Left: Logos & Hospital Name */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-11 h-11 rounded-2xl bg-white p-1 border border-purple-200/80 shadow-sm flex items-center justify-center overflow-hidden"
            title={hospitalName}
          >
            {hospitalLogoUrl ? (
              <ImageWithFallback
                src={hospitalLogoUrl}
                alt={hospitalName}
                className="w-full h-full object-contain"
                fallbackIcon={<ShieldPlus className="w-5 h-5 text-purple-600" />}
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                <ShieldPlus className="w-5 h-5" />
              </div>
            )}
          </div>

          <div
            className="w-11 h-11 rounded-2xl bg-white p-1 border border-purple-200/80 shadow-sm flex items-center justify-center overflow-hidden"
            title="Logo Instansi Kesehatan"
          >
            {institutionLogoUrl ? (
              <ImageWithFallback
                src={institutionLogoUrl}
                alt="Logo Instansi"
                className="w-full h-full object-contain"
                fallbackIcon={<Building2 className="w-5 h-5 text-emerald-600" />}
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <Building2 className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-black text-sm md:text-base text-slate-950 leading-tight">
              {hospitalName}
            </h2>

            {/* Interactive Ward Switcher Pill */}
            {onOpenWardManagement ? (
              <button
                type="button"
                onClick={onOpenWardManagement}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-100/80 hover:bg-purple-200/90 text-purple-950 border border-purple-300 text-xs font-black transition-all hover:scale-102 group shadow-2xs"
                title="Klik untuk memilih ruangan lain atau duplikat aplikasi"
              >
                <Building2 className="w-3.5 h-3.5 text-purple-700 group-hover:rotate-6 transition-transform shrink-0" />
                <span className="truncate max-w-[190px]">{wardName}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/80 text-purple-800 font-extrabold ml-0.5 shrink-0 border border-purple-200">
                  {wards && wards.length > 1 ? `${wards.length} Ruang ▾` : 'Ganti / Klon ▾'}
                </span>
              </button>
            ) : (
              <span className="text-purple-800 font-black text-sm md:text-base">· {wardName}</span>
            )}

            {/* Quick Edit Ward Name Button (Khusus Admin) */}
            {onEditActiveWard && (
              <button
                type="button"
                onClick={() => {
                  if (!isAdmin) {
                    onOpenLoginModal();
                    alert('Akses Terbatas: Hanya Admin yang dapat mengedit nama ruangan rawat inap. Silakan masuk sebagai Admin terlebih dahulu.');
                    return;
                  }
                  onEditActiveWard();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-all hover:scale-102 shadow-2xs"
                title={isAdmin ? 'Edit nama dan informasi ruangan aktif' : 'Edit Ruangan (Khusus Admin)'}
              >
                {isAdmin ? (
                  <PenLine className="w-3 h-3 text-purple-600" />
                ) : (
                  <Lock className="w-3 h-3 text-amber-600" />
                )}
                <span className="hidden sm:inline">Edit Ruang</span>
                {!isAdmin && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold ml-0.5">
                    Admin
                  </span>
                )}
              </button>
            )}

            {/* Quick Duplicate Button (Khusus Admin) */}
            {onOpenDuplicateWard && (
              <button
                type="button"
                onClick={() => {
                  if (!isAdmin) {
                    onOpenLoginModal();
                    alert('Akses Terbatas: Hanya Admin yang dapat menduplikat ruangan rawat inap. Silakan masuk sebagai Admin terlebih dahulu.');
                    return;
                  }
                  onOpenDuplicateWard();
                }}
                className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-xl bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold shadow-2xs transition-colors"
                title={isAdmin ? 'Duplikat aplikasi untuk ruangan rawat inap lain' : 'Duplikat Ruangan (Khusus Admin)'}
              >
                {isAdmin ? (
                  <Copy className="w-3 h-3 text-purple-600" />
                ) : (
                  <Lock className="w-3 h-3 text-amber-600" />
                )}
                <span>+ Duplikat Ruang</span>
                {!isAdmin && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold ml-0.5">
                    Admin
                  </span>
                )}
              </button>
            )}

            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${shiftInfo.className}`}
            >
              <ShiftIcon className="w-3 h-3 text-current" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              {shiftInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700 font-bold mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <span>{witaDateStr}</span>
          </div>
        </div>
      </div>

      {/* Middle: Patient Search Bar */}
      <div className="w-full md:w-64 lg:w-72">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (onSearchPatient && searchQuery.trim()) {
              onSearchPatient(searchQuery.trim());
            }
          }}
          className="relative"
        >
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari No. RM atau Nama Pasien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-slate-200 focus:border-purple-600 rounded-2xl text-xs md:text-sm text-slate-950 placeholder:text-slate-500 focus:outline-none transition-all shadow-inner font-bold"
          />
        </form>
      </div>

      {/* Right: WITA Clock & Admin Access */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
        {/* Real-time WITA Clock */}
        <div className="flex items-center gap-2 bg-purple-50/90 border border-purple-200 px-3 py-1.5 rounded-2xl shadow-xs">
          <Clock className="w-4 h-4 text-purple-600 shrink-0 animate-pulse" />
          <div className="text-right">
            <span className="font-mono tabular-nums font-black text-sm md:text-base text-purple-950 leading-none block">
              {witaTimeStr} <span className="text-[11px] font-sans font-bold text-purple-700">WITA</span>
            </span>
          </div>
        </div>

        {/* Admin Status & Toggle */}
        {isAdmin ? (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-2xl text-xs font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Admin Aktif</span>
            <button
              onClick={onLogoutAdmin}
              className="ml-1 text-[11px] text-emerald-700 hover:text-rose-600 underline font-semibold transition-colors"
              title="Keluar dari akun Admin"
            >
              Keluar
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 bg-white hover:bg-purple-50 border border-purple-200 text-purple-800 px-3 py-1.5 rounded-2xl text-xs font-bold shadow-xs transition-all hover:scale-102"
            title="Masuk sebagai Admin untuk mengatur roster dan waktu sift"
          >
            <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Mode Admin</span>
          </button>
        )}

        {/* Cloud Sync Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl text-[11px] font-bold shadow-xs shrink-0 transition-colors ${
            syncStatus?.state === 'saving'
              ? 'bg-amber-50 border border-amber-300 text-amber-800'
              : syncStatus?.state === 'offline'
              ? 'bg-slate-100 border border-slate-300 text-slate-700'
              : syncStatus?.state === 'error'
              ? 'bg-rose-50 border border-rose-300 text-rose-800'
              : syncStatus?.state === 'loading'
              ? 'bg-sky-50 border border-sky-300 text-sky-800'
              : 'bg-emerald-50/90 border border-emerald-200 text-emerald-800'
          }`}
          title={syncStatus?.detail || syncStatus?.label || 'Sinkronisasi real-time antar perangkat aktif'}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              syncStatus?.state === 'saving'
                ? 'bg-amber-500 animate-spin'
                : syncStatus?.state === 'offline'
                ? 'bg-slate-400'
                : syncStatus?.state === 'error'
                ? 'bg-rose-500'
                : syncStatus?.state === 'loading'
                ? 'bg-sky-500 animate-pulse'
                : 'bg-emerald-500 animate-pulse'
            }`}
          />
          <Cloud className="w-3.5 h-3.5 text-current shrink-0" />
          <span className="hidden sm:inline">
            {syncStatus?.label || 'Tersinkronisasi Cloud'}
          </span>
          <span className="sm:hidden">
            {syncStatus?.state === 'saving'
              ? 'Menyimpan...'
              : syncStatus?.state === 'offline'
              ? 'Offline'
              : syncStatus?.state === 'error'
              ? 'Gagal'
              : 'Live'}
          </span>
        </div>
      </div>
    </header>
  );
};
