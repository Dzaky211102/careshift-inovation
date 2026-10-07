import React, { useState } from 'react';
import {
  Sun,
  SunMedium,
  Moon,
  Users,
  Presentation,
  Tv,
  HeartHandshake,
  Heart,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Calendar,
  Send,
  Radio,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  Usb,
  BookOpen,
} from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { ConnectTvModal } from './ConnectTvModal';
import { UsbFlashdiskModal } from './UsbFlashdiskModal';
import { Nurse, Patient, AppSettings, ShiftDuty, ShiftConfig } from '../types';
import {
  getWitaDateString,
  normalizeTimeToDot,
  formatWitaFullDate,
} from '../utils/witaTime';

interface ShiftDisplayDashboardProps {
  currentShift: string;
  selectedShift: string;
  onSelectShift: (shift: string) => void;
  todayDuties: ShiftDuty | undefined;
  nurses: Nurse[];
  patients: Patient[];
  settings: AppSettings;
  schedules?: ShiftDuty[];
  isAdmin: boolean;
  onOpenCanva: () => void;
  onOpenPatientPortal: (rmOrName?: string) => void;
  onOpenEducation?: () => void;
  onOpenMonthlySchedule: () => void;
  onOpenImageSettings: () => void;
}

export const ShiftDisplayDashboard: React.FC<ShiftDisplayDashboardProps> = ({
  currentShift,
  selectedShift,
  onSelectShift,
  todayDuties,
  nurses,
  patients,
  settings,
  schedules = [],
  isAdmin,
  onOpenCanva,
  onOpenPatientPortal,
  onOpenEducation,
  onOpenMonthlySchedule,
  onOpenImageSettings,
}) => {
  const [isConnectTvOpen, setIsConnectTvOpen] = useState(false);
  const [isUsbModalOpen, setIsUsbModalOpen] = useState(false);
  const todayWitaDate = getWitaDateString(new Date());

  // Requirement 5: Synchronized nurse list directly from duty nurseIds
  const assignedIds = todayDuties?.nurseIds || [];
  const assignedNurses = (nurses || []).filter((n) => assignedIds.includes(n.id));
  const assignedNurseCount = assignedNurses.length;

  const shiftConfigs =
    settings?.shiftConfigs && Array.isArray(settings.shiftConfigs) && settings.shiftConfigs.length > 0
      ? settings.shiftConfigs
      : [
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

  // Selected shift config
  const selectedConfig: ShiftConfig =
    shiftConfigs.find((s) => s.id === selectedShift) ||
    shiftConfigs[0] || {
      id: selectedShift,
      name: `Sif ${selectedShift.charAt(0).toUpperCase() + selectedShift.slice(1)}`,
      startTime: '07:00',
      endTime: '14:00',
      colorTheme: 'amber',
    };

  const getShiftIcon = (shiftId: string) => {
    switch (shiftId) {
      case 'pagi':
        return Sun;
      case 'siang':
        return SunMedium;
      default:
        return Moon;
    }
  };

  const getShiftBadgeTheme = (shiftId: string) => {
    switch (shiftId) {
      case 'pagi':
        return {
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
          gradient: 'from-amber-400 to-orange-400',
          cardBorder: 'border-amber-200/80',
        };
      case 'siang':
        return {
          badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
          gradient: 'from-orange-400 to-pink-500',
          cardBorder: 'border-orange-200/80',
        };
      default:
        return {
          badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          gradient: 'from-indigo-500 to-purple-600',
          cardBorder: 'border-indigo-200/80',
        };
    }
  };

  const themeInfo = getShiftBadgeTheme(selectedShift);
  const startDot = normalizeTimeToDot(selectedConfig.startTime);
  const endDot = normalizeTimeToDot(selectedConfig.endTime);

  const getGreeting = () => {
    if (selectedShift === 'pagi') return settings.greetingMorning;
    if (selectedShift === 'siang') return settings.greetingAfternoon;
    return settings.greetingNight;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Kepala Ruangan':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'Katim / Perawat Primer':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Penanggung Jawab Shift':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    }
  };

  const surgicalPatients = patients.filter(
    (p) => p.stage === 'pra_operasi' || p.stage === 'sedang_operasi'
  );

  // Requirement 6: Dashboard image determined by Admin
  const dashboardImages =
    settings?.dashboardImages && Array.isArray(settings.dashboardImages) && settings.dashboardImages.length > 0
      ? settings.dashboardImages
      : [
          {
            id: 'dash-img-1',
            title: 'Maskot Perawat CareShift 3D',
            url: 'https://images.unsplash.com/photo-1594824813524-87be361b7fcf?auto=format&fit=crop&w=800&q=80',
            caption: 'Maskot Utama Ruangan Rawat Inap',
            isActive: true,
            uploadedAt: '2026-10-01',
          },
        ];

  const activeDashboardImage =
    dashboardImages.find((img) => img.id === settings?.selectedDashboardImageId) ||
    dashboardImages.find((img) => img.isActive) ||
    dashboardImages[0];

  const getThemeStyling = () => {
    switch (settings?.dashboardColorTheme) {
      case 'teal':
        return {
          heroGradient: 'bg-gradient-to-br from-teal-50/90 via-emerald-50/70 to-cyan-50/90 border-teal-200/80',
          badgeClass: 'bg-teal-100 text-teal-800',
          btnPrimary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200',
          iconBg: 'bg-teal-100 text-teal-700',
          noticeBg: 'bg-teal-100/70 border-teal-200 text-teal-900',
          subtext: 'text-teal-700',
        };
      case 'blue':
        return {
          heroGradient: 'bg-gradient-to-br from-blue-50/90 via-sky-50/70 to-indigo-50/90 border-blue-200/80',
          badgeClass: 'bg-blue-100 text-blue-800',
          btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
          iconBg: 'bg-blue-100 text-blue-700',
          noticeBg: 'bg-blue-100/70 border-blue-200 text-blue-900',
          subtext: 'text-blue-700',
        };
      case 'emerald':
        return {
          heroGradient: 'bg-gradient-to-br from-emerald-50/90 via-green-50/70 to-teal-50/90 border-emerald-200/80',
          badgeClass: 'bg-emerald-100 text-emerald-800',
          btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
          iconBg: 'bg-emerald-100 text-emerald-700',
          noticeBg: 'bg-emerald-100/70 border-emerald-200 text-emerald-900',
          subtext: 'text-emerald-700',
        };
      case 'rose':
        return {
          heroGradient: 'bg-gradient-to-br from-rose-50/90 via-pink-50/70 to-purple-50/90 border-rose-200/80',
          badgeClass: 'bg-rose-100 text-rose-800',
          btnPrimary: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
          iconBg: 'bg-rose-100 text-rose-700',
          noticeBg: 'bg-rose-100/70 border-rose-200 text-rose-900',
          subtext: 'text-rose-700',
        };
      case 'indigo':
        return {
          heroGradient: 'bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-slate-50/90 border-indigo-200/80',
          badgeClass: 'bg-indigo-100 text-indigo-800',
          btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
          iconBg: 'bg-indigo-100 text-indigo-700',
          noticeBg: 'bg-indigo-100/70 border-indigo-200 text-indigo-900',
          subtext: 'text-indigo-700',
        };
      default:
        return {
          heroGradient: 'bg-gradient-to-br from-pink-50/90 via-purple-50/70 to-indigo-50/90 border-purple-100',
          badgeClass: 'bg-purple-100 text-purple-800',
          btnPrimary: 'bg-[#8D6DCF] hover:bg-[#7B59BD] text-white shadow-purple-200',
          iconBg: 'bg-purple-100 text-purple-700',
          noticeBg: 'bg-purple-100/70 border-purple-200 text-purple-900',
          subtext: 'text-purple-700',
        };
    }
  };

  const themeStyle = getThemeStyling();

  return (
    <div className="space-y-6">
      {/* Running Notice Banner */}
      {settings.bannerNotice && (
        <div className={`${themeStyle.noticeBg} px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs md:text-sm font-medium shadow-sm`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping shrink-0" />
            <span>{settings.bannerNotice}</span>
          </div>
          <button
            onClick={onOpenMonthlySchedule}
            className="hidden sm:inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold underline text-xs ml-3 shrink-0"
          >
            Lihat Jadwal Perawat <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Card & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Hero Card with Admin-managed Dashboard Image */}
        <div className={`lg:col-span-7 clay-card ${themeStyle.heroGradient} p-5 md:p-6 relative overflow-hidden flex flex-col justify-between border`}>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 relative z-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 text-purple-700 text-xs font-bold shadow-sm mb-3">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>Ruang Perawatan Rawat Inap</span>
              </div>
              <h1 className="font-display font-black text-2xl md:text-3xl text-slate-950 leading-tight">
                {selectedShift === 'pagi' && 'Selamat Pagi! ☀️'}
                {selectedShift === 'siang' && 'Selamat Siang! 🌤️'}
                {selectedShift === 'malam' && 'Selamat Malam! 🌙'}
              </h1>
              <p className="text-slate-900 text-sm mt-1 max-w-sm font-bold">
                {getGreeting()}
              </p>
            </div>

            {/* Dashboard Image Managed by Admin */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden shadow-lg border-4 border-white bg-purple-100 clay-avatar">
                {activeDashboardImage ? (
                  <ImageWithFallback
                    src={activeDashboardImage.url}
                    alt={activeDashboardImage.title || 'Foto Dashboard'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    fallbackIcon={<Sparkles className="w-10 h-10 text-purple-400" />}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-purple-400">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold">Foto Dashboard</span>
                  </div>
                )}
              </div>
              {activeDashboardImage?.caption && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-purple-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap backdrop-blur-xs">
                  {activeDashboardImage.caption}
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={onOpenImageSettings}
                  className="absolute top-1 right-1 w-6 h-6 bg-white/90 hover:bg-white text-purple-700 rounded-full shadow flex items-center justify-center text-[10px]"
                  title="Ganti atau Kelola Gambar Dashboard"
                >
                  ✎
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-purple-200/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Status Sif:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${themeInfo.badgeColor}`}>
                {selectedConfig.name} ({startDot} - {endDot})
              </span>
              {selectedShift !== currentShift ? (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                  Mode Pratinjau
                </span>
              ) : (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sif Sedang Aktif
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsConnectTvOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-300 transition-all text-xs"
                title="Buka panduan & koneksi praktis ke TV"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Sambungkan ke TV</span>
              </button>

              <button
                onClick={() => setIsUsbModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-300 transition-all text-xs"
                title="Unduh paket slide 1080p untuk TV biasa (putar via Flashdisk USB)"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Paket Flashdisk TV</span>
              </button>

              <button
                onClick={onOpenCanva}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 ${themeStyle.btnPrimary} rounded-xl font-bold shadow-md transition-all text-xs`}
              >
                <Presentation className="w-3.5 h-3.5" />
                <span>Buka Tampilan TV</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Summary Stats Cards */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {/* Requirement 4 & 5: Dynamic Nurse Count directly from assigned nurses */}
          <div className="clay-card-flat bg-white p-4 flex items-center justify-between border-2 border-purple-200 hover:shadow-md transition-shadow">
            <div>
              <span className="text-xs font-black text-slate-800 block">
                Perawat Jaga Sif Ini
              </span>
              <div className="text-2xl font-black text-slate-950 font-display tabular-nums mt-1">
                {assignedNurseCount}{' '}
                <span className="text-xs font-black text-purple-800">Perawat Bertugas</span>
              </div>
              <div className="text-[11px] text-emerald-800 font-bold mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {assignedNurseCount > 0
                    ? `Siaga ${assignedNurseCount} staf di ruangan`
                    : 'Belum ada perawat ditugaskan'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-inner shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="clay-card-flat bg-white p-4 flex items-center justify-between border-2 border-pink-200 hover:shadow-md transition-shadow">
            <div>
              <span className="text-xs font-black text-slate-800 block">
                Pasien Tindakan Bedah
              </span>
              <div className="text-2xl font-black text-slate-950 font-display tabular-nums mt-1">
                {surgicalPatients.length}{' '}
                <span className="text-xs font-bold text-slate-700">Pasien</span>
              </div>
              <div className="text-[11px] text-rose-800 font-bold mt-0.5 flex items-center gap-1">
                <span>Jadwal Operasi Hari Ini</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 shadow-inner shrink-0">
              <Heart className="w-6 h-6" />
            </div>
          </div>

          <div className="clay-card-flat bg-white p-4 flex items-center justify-between border-2 border-emerald-200 hover:shadow-md transition-shadow">
            <div>
              <span className="text-xs font-black text-slate-800 block">
                Layanan Home Care
              </span>
              <div className="text-lg font-black text-slate-950 font-display mt-0.5">
                Siap Melayani
              </div>
              <a
                href={`https://wa.me/${settings.homecareWhatsappNumber}?text=${encodeURIComponent(
                  settings.homecareWhatsappMessage
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold mt-0.5 flex items-center gap-1 underline"
              >
                <span>Kontak WhatsApp Rawat Luka</span>
                <Send className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Shift Switcher Bar (Configured via Settings) */}
      <div className="clay-card-flat bg-white p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-[#8D6DCF] shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Pilihan Sif Perawat Jaga ({todayWitaDate})
            </h3>
            <p className="text-xs text-slate-500">
              Sistem otomatis menentukan sif aktif berdasarkan jam dinas ({startDot} - {endDot}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl w-full md:w-auto overflow-x-auto">
          {shiftConfigs.map((cfg) => {
            const isSelected = selectedShift === cfg.id;
            const isLive = currentShift === cfg.id;
            const ShiftIcon = getShiftIcon(cfg.id);
            const sDot = normalizeTimeToDot(cfg.startTime);
            const eDot = normalizeTimeToDot(cfg.endTime);

            return (
              <button
                key={cfg.id}
                onClick={() => onSelectShift(cfg.id)}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-purple-900 shadow-md shadow-purple-900/10 scale-102 border border-purple-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ShiftIcon
                  className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`}
                />
                <span>
                  {cfg.name} ({sDot} - {eDot})
                </span>
                {isLive && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"
                    title="Shift Aktif Berjalan Sekarang"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Requirement 4 & 5: Nurse List without limits */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-extrabold text-lg text-slate-800 flex items-center gap-2 flex-wrap">
              <span>
                {selectedConfig.name} — {assignedNurseCount} Perawat
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {startDot} - {endDot}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh nama perawat yang ditugaskan pada sif ini ditampilkan di bawah.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenMonthlySchedule}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Kelola Jadwal Perawat' : 'Lihat Jadwal Perawat'}</span>
            </button>
          </div>
        </div>

        {/* Empty state when 0 nurses assigned */}
        {assignedNurses.length === 0 ? (
          <div className="clay-card bg-white p-8 text-center border border-dashed border-purple-200 rounded-3xl">
            <Users className="w-12 h-12 text-purple-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700">0 Perawat Ditugaskan di Sif Ini</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Saat ini belum ada perawat yang dipilih untuk {selectedConfig.name}.
              {isAdmin
                ? ' Silakan buka kalender jadwal perawat untuk memilih perawat.'
                : ' Hubungi Admin/Kepala Ruangan untuk mengatur penugasan perawat.'}
            </p>
            {isAdmin ? (
              <button
                onClick={onOpenMonthlySchedule}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all inline-flex items-center gap-1.5"
              >
                <span>Atur Jadwal Sekarang</span>
              </button>
            ) : (
              <div className="mt-3 text-xs text-purple-600 font-medium">
                (Pengguna biasa: Hanya dapat memantau jadwal)
              </div>
            )}
          </div>
        ) : (
          /* Render all nurses, no limit! (1, 2, 5, 7, 10, etc.) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assignedNurses.map((nurse, idx) => {
              const slideNum = idx + 1;
              return (
                <div
                  key={nurse.id}
                  className="clay-card bg-white p-4 flex flex-col justify-between hover:shadow-xl transition-all duration-300 border border-purple-100 group relative rounded-2xl"
                >
                  <div>
                    <div className="flex items-start gap-3.5">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-purple-50 shrink-0 group-hover:scale-105 transition-transform">
                        <ImageWithFallback
                          src={nurse.photoUrl}
                          alt={nurse.name}
                          fallbackText={nurse.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full block w-fit truncate mb-1 ${getRoleBadge(
                            nurse.role
                          )}`}
                        >
                          {nurse.role}
                        </span>
                        <h4
                          className="font-display font-extrabold text-slate-800 text-sm leading-snug truncate"
                          title={nurse.name}
                        >
                          {nurse.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                          {nurse.nip}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Shift Dinas:</span>
                        <span className="font-bold text-purple-700 capitalize">
                          {selectedConfig.name} ({startDot} - {endDot})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Tampilan TV:</span>
                        <span className="font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Slide #{slideNum}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex-1 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] font-bold border border-emerald-200/80">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Siaga di Ruangan</span>
                    </div>
                    <button
                      onClick={onOpenCanva}
                      title="Lihat di Tampilan TV"
                      className="w-7 h-7 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-purple-600 flex items-center justify-center border border-slate-200 transition-colors"
                    >
                      <Presentation className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide TV & Patient Portal Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        <div className="clay-card-flat bg-gradient-to-r from-purple-600 to-[#7A5CBF] p-5 text-white flex flex-col justify-between shadow-lg shadow-purple-500/20 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <Presentation className="w-4 h-4" />
              </div>
              <h3 className="font-display font-black text-base">Tampilan TV Otomatis</h3>
            </div>
            <p className="text-xs text-purple-100 leading-relaxed">
              Tampilan layar TV ruangan menampilkan perawat yang sedang bertugas ({assignedNurseCount} staf pada {selectedConfig.name}). Berganti otomatis mengikuti jam dinas.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsConnectTvOpen(true)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Sambungkan ke TV</span>
            </button>
            <button
              onClick={() => setIsUsbModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
              title="Unduh paket slide untuk TV biasa (putar via Flashdisk USB)"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>Paket Flashdisk TV</span>
            </button>
            <button
              onClick={onOpenCanva}
              className="px-4 py-2 bg-white text-purple-800 rounded-xl text-xs font-black shadow-md hover:bg-purple-50 transition-all flex items-center gap-1.5"
            >
              <span>Buka Tampilan TV</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="clay-card-flat bg-gradient-to-r from-rose-500 to-pink-500 p-5 text-white flex flex-col justify-between shadow-lg shadow-rose-400/20 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-display font-black text-base">Pusat Edukasi Pasien Bedah</h3>
            </div>
            <p className="text-xs text-rose-100 leading-relaxed">
              Panduan puasa pra-bedah, kalkulator puasa interaktif, manajemen nyeri, dan perawatan luka di rumah untuk pasien & keluarga.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => (onOpenEducation ? onOpenEducation() : onOpenPatientPortal())}
              className="px-4 py-2 bg-white text-rose-700 rounded-xl text-xs font-black shadow-md hover:bg-rose-50 transition-all flex items-center gap-1.5"
            >
              <span>Buka Halaman Edukasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onOpenPatientPortal()}
              className="px-3 py-2 bg-rose-600/70 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>Status Pasien (RM)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="clay-card-flat bg-white/90 p-4 border border-purple-100 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3 rounded-2xl">
        <div>
          <p className="font-semibold text-slate-700">{settings.footerText}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Jam Kunjungan: <strong className="text-slate-600">{settings.visitingHours}</strong>
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
            <Sparkles className="w-3 h-3" />
            {settings.hospitalName} · {settings.wardName}
          </span>
        </div>
      </footer>

      {/* Connect TV Modal */}
      <ConnectTvModal
        isOpen={isConnectTvOpen}
        onClose={() => setIsConnectTvOpen(false)}
        onOpenFullscreen={onOpenCanva}
        onOpenUsbFlashdisk={() => setIsUsbModalOpen(true)}
        wardName={settings.wardName}
        hospitalName={settings.hospitalName}
      />

      {/* USB Flashdisk Modal */}
      <UsbFlashdiskModal
        isOpen={isUsbModalOpen}
        onClose={() => setIsUsbModalOpen(false)}
        nurses={nurses}
        schedules={schedules}
        settings={settings}
        currentShift={selectedShift}
      />
    </div>
  );
};
