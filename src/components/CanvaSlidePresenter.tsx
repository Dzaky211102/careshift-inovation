import React, { useState, useEffect, useRef } from 'react';
import {
  Presentation,
  Tv,
  Maximize2,
  Minimize2,
  Clock,
  Calendar,
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Grid3X3,
  Sun,
  SunMedium,
  Moon,
  Radio,
  PhoneCall,
  UserCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Nurse, AppSettings, ShiftConfig } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import {
  getWitaTimeString,
  formatWitaFullDate,
  normalizeTimeToDot,
} from '../utils/witaTime';

interface CanvaSlidePresenterProps {
  currentShift: string;
  assignedNurseIds: string[];
  allNurses: Nurse[];
  settings: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
  onUpdateAllNurses?: (nurses: Nurse[]) => void;
}

export const CanvaSlidePresenter: React.FC<CanvaSlidePresenterProps> = ({
  currentShift,
  assignedNurseIds,
  allNurses,
  settings,
}) => {
  const [autoFollowShift, setAutoFollowShift] = useState(true);
  const [activeShift, setActiveShift] = useState<string>(currentShift);
  const [displayMode, setDisplayMode] = useState<'slideshow' | 'grid'>('slideshow');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [slideDurationSec, setSlideDurationSec] = useState(8);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [witaDate, setWitaDate] = useState<Date>(new Date());

  // Realtime WITA clock
  useEffect(() => {
    const timer = setInterval(() => {
      setWitaDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update active shift when autoFollow is true
  useEffect(() => {
    if (autoFollowShift) {
      setActiveShift(currentShift);
    }
  }, [currentShift, autoFollowShift]);

  const effectiveShift = autoFollowShift ? currentShift : activeShift;

  // Filter assigned nurses for the active shift
  const currentAssigned = allNurses.filter((n) => assignedNurseIds.includes(n.id));
  const activeNurses = currentAssigned.length > 0 ? currentAssigned : allNurses.slice(0, 4);

  const safeSlideIdx = currentSlideIdx < activeNurses.length ? currentSlideIdx : 0;
  const currentNurse = activeNurses[safeSlideIdx] || activeNurses[0];

  const slideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (displayMode !== 'slideshow' || !isPlaying || activeNurses.length <= 1) {
      if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    setSlideProgress(0);
    const startTime = Date.now();
    const durationMs = slideDurationSec * 1000;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setSlideProgress(pct);
    }, 100);

    slideTimeoutRef.current = setTimeout(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % activeNurses.length);
    }, durationMs);

    return () => {
      if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [safeSlideIdx, isPlaying, slideDurationSec, activeNurses.length, displayMode, effectiveShift]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        handlePrevSlide();
      } else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullScreen((f) => !f);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNurses.length]);

  const handleNextSlide = () => {
    setCurrentSlideIdx((prev) => (prev + 1) % activeNurses.length);
    setSlideProgress(0);
  };

  const handlePrevSlide = () => {
    setCurrentSlideIdx((prev) => (prev - 1 + activeNurses.length) % activeNurses.length);
    setSlideProgress(0);
  };

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

  const currentConfig: ShiftConfig =
    shiftConfigs.find((s) => s.id === effectiveShift) ||
    shiftConfigs[0] || {
      id: effectiveShift,
      name: `Sif ${effectiveShift}`,
      startTime: '07:00',
      endTime: '14:00',
      colorTheme: 'amber',
    };

  const getShiftTheme = (shiftId: string) => {
    switch (shiftId) {
      case 'pagi':
        return {
          icon: Sun,
          gradient: 'from-amber-950 via-slate-900 to-purple-950',
          cardBorder: 'border-amber-400/40',
          badgeBg: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
          accentColor: 'text-amber-300',
          ringColor: 'ring-amber-400/50',
          greeting: 'Selamat Pagi! Semangat Melayani dengan Senyum & Ketelitian',
          focusTitle: 'Fokus Pelayanan Sif Pagi',
          focusItems: [
            'Visit Dokter Spesialis & Edukasi Tindakan Medis',
            'Pemberian Terapi Obat Pagi & Monitoring Tanda Vital Pasien',
            'Persiapan Fisik & Mental Pasien Menjelang Tindakan Bedah / Operasi',
          ],
          motto: 'Membuka hari dengan pelayanan ramah, sigap, dan memastikan kebutuhan pasien terpenuhi.',
        };
      case 'siang':
        return {
          icon: SunMedium,
          gradient: 'from-orange-950 via-rose-950 to-purple-950',
          cardBorder: 'border-rose-400/40',
          badgeBg: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white',
          accentColor: 'text-rose-300',
          ringColor: 'ring-rose-400/50',
          greeting: 'Selamat Siang! Tetap Semangat Menjalani Pemulihan Hari Ini',
          focusTitle: 'Fokus Pelayanan Sif Siang',
          focusItems: [
            'Observasi & Pemulihan Pasien Pasca-Operasi (Post-Op di Ruangan)',
            'Pendampingan Mobilisasi Dini & Perawatan Luka Steril',
            'Edukasi Keluarga Pasien pada Jam Kunjungan Siang & Sore',
          ],
          motto: 'Melanjutkan perawatan berkesinambungan dengan pemantauan ketat dan kenyamanan pasien.',
        };
      default:
        return {
          icon: Moon,
          gradient: 'from-slate-950 via-indigo-950 to-purple-950',
          cardBorder: 'border-indigo-400/40',
          badgeBg: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white',
          accentColor: 'text-indigo-300',
          ringColor: 'ring-indigo-400/50',
          greeting: 'Selamat Beristirahat! Perawat Siaga 24 Jam Menjaga Anda',
          focusTitle: 'Fokus Pelayanan Sif Malam',
          focusItems: [
            'Menciptakan Suasana Tenang untuk Pemulihan & Tidur Pasien',
            'Ronda Malam Berkala & Pemantauan Cairan Infus',
            'Kesiapsiagaan Cepat Merespons Panggilan Bel (Nurse Call)',
          ],
          motto: 'Menjaga kenyamanan dan ketenangan istirahat malam pasien dengan kesiapsiagaan penuh.',
        };
    }
  };

  const shiftTheme = getShiftTheme(effectiveShift);
  const ShiftIcon = shiftTheme.icon;

  const witaFormattedDate = formatWitaFullDate(witaDate);
  const witaTimeFormatted = getWitaTimeString(witaDate, true);
  const startDot = normalizeTimeToDot(currentConfig.startTime);
  const endDot = normalizeTimeToDot(currentConfig.endTime);

  return (
    <div
      className={`space-y-5 ${
        isFullScreen
          ? 'fixed inset-0 z-50 bg-slate-950 text-white p-4 md:p-8 overflow-y-auto flex flex-col justify-between'
          : ''
      }`}
    >
      {/* Top Controls Bar */}
      <div
        className={`clay-card-flat ${
          isFullScreen ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-purple-100'
        } p-4 md:p-5 border flex flex-col md:flex-row items-center justify-between gap-4 transition-all rounded-3xl shadow-sm`}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-purple-600" />
              Slide Show TV Perawat Jaga
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs ${shiftTheme.badgeBg}`}
            >
              <ShiftIcon className="w-3.5 h-3.5" />
              <span>
                {currentConfig.name} ({startDot} - {endDot} WITA)
              </span>
            </span>
            {autoFollowShift && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Otomatis Berganti Tiap Sif (WITA)
              </span>
            )}
          </div>
          <h2 className={`font-display font-extrabold text-xl mt-1.5 ${isFullScreen ? 'text-white' : 'text-slate-800'}`}>
            Display TV Ruang Perawatan & Nurse Station
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Slide show perawat bertugas ({activeNurses.length} perawat) aktif mengikuti jam WITA.
          </p>
        </div>

        {/* Shift Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => {
                setAutoFollowShift(true);
                setActiveShift(currentShift);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                autoFollowShift
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mengikuti jam real-time WITA saat ini"
            >
              Auto Sif
            </button>
            {shiftConfigs.map((cfg) => (
              <button
                key={cfg.id}
                onClick={() => {
                  setAutoFollowShift(false);
                  setActiveShift(cfg.id);
                  setCurrentSlideIdx(0);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize transition-all ${
                  !autoFollowShift && activeShift === cfg.id
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cfg.name}
              </button>
            ))}
          </div>

          {/* View Modes */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setDisplayMode('slideshow')}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                displayMode === 'slideshow'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Slide TV</span>
            </button>
            <button
              onClick={() => setDisplayMode('grid')}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                displayMode === 'grid'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Tim Lengkap</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="px-3 py-1.5 bg-[#8D6DCF] hover:bg-[#7859BD] text-white rounded-xl text-xs font-bold shadow-md shadow-purple-300 transition-all flex items-center gap-1.5"
            title={isFullScreen ? 'Keluar Layar Penuh (Esc)' : 'Mode Layar Penuh TV (F)'}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {isFullScreen ? 'Kecilkan' : 'Layar Penuh TV'}
            </span>
          </button>
        </div>
      </div>

      {/* Mode: SLIDESHOW */}
      {displayMode === 'slideshow' && (
        <div className="space-y-4">
          {/* Slideshow Player Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3 rounded-2xl border border-purple-100 shadow-xs">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">
                Perawat Jaga {currentConfig.name}:
              </span>
              <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                {safeSlideIdx + 1} dari {activeNurses.length} Staf
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevSlide}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-700 flex items-center justify-center transition-all"
                title="Slide Sebelumnya (←)"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isPlaying
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-600 text-white shadow-sm'
                }`}
                title={isPlaying ? 'Jeda Slide Otomatis (Spasi)' : 'Putar Slide Otomatis (Spasi)'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Jeda' : 'Putar'}</span>
              </button>
              <button
                onClick={handleNextSlide}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-700 flex items-center justify-center transition-all"
                title="Slide Berikutnya (→)"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200 text-xs text-slate-600">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Kecepatan:</span>
                <select
                  value={slideDurationSec}
                  onChange={(e) => setSlideDurationSec(Number(e.target.value))}
                  className="bg-slate-100 text-slate-800 text-xs font-bold rounded-lg px-2 py-1 border border-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value={5}>5 Detik</option>
                  <option value={8}>8 Detik (Standar)</option>
                  <option value={12}>12 Detik</option>
                  <option value={15}>15 Detik</option>
                  <option value={20}>20 Detik</option>
                </select>
              </div>
            </div>
          </div>

          {/* Autoplay Progress Line */}
          {isPlaying && (
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden shadow-inner">
              <div
                className="bg-purple-600 h-full transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${slideProgress}%` }}
              />
            </div>
          )}

          {/* Master 16:9 Presentation Canvas */}
          <div
            className={`relative w-full aspect-[16/9] min-h-[460px] max-h-[820px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-gradient-to-br ${shiftTheme.gradient} text-white p-6 md:p-10 flex flex-col justify-between transition-all duration-700`}
          >
            {/* Background Glow Ornaments */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Slide Header */}
            <div className="flex items-center justify-between relative z-10 flex-wrap gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md p-1 border border-white/20 flex items-center justify-center shadow-inner">
                  {settings.hospitalLogoUrl ? (
                    <img
                      src={settings.hospitalLogoUrl}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-purple-200" />
                  )}
                </div>
                <div>
                  <h3 className="font-display font-black text-base md:text-xl text-white tracking-wide leading-tight">
                    {settings.hospitalName}
                  </h3>
                  <p className="text-xs md:text-sm text-purple-200 font-medium">
                    {settings.wardName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="font-mono text-xs md:text-sm font-bold text-white tabular-nums">
                    {witaTimeFormatted} <span className="text-amber-300">WITA</span>
                  </span>
                  <span className="text-[11px] text-purple-200/90 font-medium">
                    {witaFormattedDate}
                  </span>
                </div>
                <div
                  className={`px-3.5 py-1.5 rounded-2xl border font-bold text-xs md:text-sm flex items-center gap-2 backdrop-blur-md shadow-md ${shiftTheme.cardBorder} bg-white/10`}
                >
                  <ShiftIcon className="w-4 h-4 text-amber-300 animate-spin-slow" />
                  <span className="text-white">{currentConfig.name}</span>
                </div>
                <div className="px-3 py-1.5 rounded-2xl bg-white/10 border border-white/20 text-xs font-mono font-bold text-purple-200">
                  {safeSlideIdx + 1} / {activeNurses.length}
                </div>
              </div>
            </div>

            {/* Main Stage: Nurse Profile */}
            {currentNurse && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center my-auto relative z-10 py-4">
                <div className="md:col-span-5 flex justify-center">
                  <div className="relative group">
                    <div
                      className={`w-52 h-52 md:w-72 md:h-72 rounded-3xl overflow-hidden border-4 border-white/90 shadow-2xl bg-gradient-to-br from-purple-200 to-indigo-100 ring-8 ${shiftTheme.ringColor} transform hover:scale-105 transition-all duration-500`}
                    >
                      <ImageWithFallback
                        src={currentNurse.photoUrl}
                        alt={currentNurse.name}
                        className="w-full h-full object-cover"
                        fallbackIcon={<UserCheck className="w-24 h-24 text-purple-400" />}
                      />
                    </div>
                    <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs md:text-sm font-black px-4 py-1.5 rounded-full shadow-xl border-2 border-white/80 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{currentNurse.role}</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 space-y-4 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>
                      PERAWAT JAGA {currentConfig.name.toUpperCase()} ({startDot} - {endDot} WITA)
                    </span>
                  </div>

                  <h1 className="font-display font-black text-2xl md:text-4xl text-white tracking-tight leading-tight">
                    {currentNurse.name}
                  </h1>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs md:text-sm">
                    <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 font-mono text-purple-200 font-bold">
                      {currentNurse.nip}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-purple-500/30 border border-purple-300/40 font-bold text-white">
                      Ruang Rawat Inap Bedah
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/30 border border-emerald-300/40 font-bold text-emerald-200 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-emerald-300 animate-pulse" />
                      Siaga di Ruangan
                    </span>
                  </div>

                  {/* Focus Duties Box */}
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-2 text-left">
                    <p
                      className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${shiftTheme.accentColor}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{shiftTheme.focusTitle}</span>
                    </p>
                    <ul className="space-y-1.5 text-xs md:text-sm text-slate-200">
                      {shiftTheme.focusItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-purple-300 font-bold">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-purple-200">
                    <p className="italic text-slate-300 text-xs max-w-md">
                      "{shiftTheme.motto}"
                    </p>
                    <div className="flex items-center gap-2 bg-rose-500/20 border border-rose-400/40 px-3 py-1.5 rounded-xl text-rose-200 font-bold whitespace-nowrap">
                      <PhoneCall className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                      <span>Hotline: {settings.emergencyPhone}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Slide Footer */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4 relative z-10 text-xs flex-wrap gap-3">
              <div className="text-purple-300 font-medium">
                CareShift TV Display System · Ruang Rawat Inap Teratai (WITA)
              </div>

              {/* Dots for all assigned nurses */}
              <div className="flex items-center gap-2">
                {activeNurses.map((nurse, idx) => (
                  <button
                    key={nurse.id}
                    onClick={() => {
                      setCurrentSlideIdx(idx);
                      setSlideProgress(0);
                    }}
                    className={`h-2.5 rounded-full transition-all ${
                      idx === safeSlideIdx
                        ? 'w-8 bg-purple-400'
                        : 'w-2.5 bg-white/30 hover:bg-white/60'
                    }`}
                    title={nurse.name}
                  />
                ))}
              </div>

              <div className="text-purple-300 font-mono">
                {currentConfig.name} ({startDot} - {endDot} WITA)
              </div>
            </div>
          </div>

          {/* Quick Jump Thumbnail Carousel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {activeNurses.map((nurse, idx) => (
              <button
                key={nurse.id}
                onClick={() => {
                  setCurrentSlideIdx(idx);
                  setSlideProgress(0);
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                  idx === safeSlideIdx
                    ? 'bg-purple-100 border-purple-500 shadow-md ring-2 ring-purple-400'
                    : 'bg-white hover:bg-purple-50/50 border-purple-100'
                }`}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-purple-200 shrink-0">
                  <ImageWithFallback
                    src={nurse.photoUrl}
                    alt={nurse.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-slate-800 truncate">
                    {nurse.name.split(',')[0]}
                  </p>
                  <p className="text-[10px] text-purple-700 font-semibold truncate">
                    {nurse.role}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode: GRID (ALL NURSES ON SHIFT) */}
      {displayMode === 'grid' && (
        <div className="space-y-4">
          <div className="clay-card bg-white p-5 border border-purple-100 space-y-4 rounded-3xl">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100 flex-wrap gap-2">
              <div>
                <h3 className="font-display font-extrabold text-lg text-slate-800 flex items-center gap-2">
                  <span>
                    Daftar Tim Perawat Jaga {currentConfig.name} ({activeNurses.length} Orang)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seluruh perawat yang berdinas pada jam dinas <strong>{startDot} - {endDot} WITA</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  {witaFormattedDate}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeNurses.map((nurse, idx) => (
                <div
                  key={nurse.id}
                  className="clay-card-flat bg-white p-4 rounded-2xl border border-purple-100 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-purple-100 shrink-0 border border-purple-200 shadow-sm">
                      <ImageWithFallback
                        src={nurse.photoUrl}
                        alt={nurse.name}
                        className="w-full h-full object-cover"
                        fallbackIcon={<UserCheck className="w-8 h-8 text-purple-400" />}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 block w-fit mb-1 truncate">
                        {nurse.role}
                      </span>
                      <h4 className="font-display font-extrabold text-sm text-slate-800 leading-tight">
                        {nurse.name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {nurse.nip}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Siaga di Ruangan
                    </span>
                    <button
                      onClick={() => {
                        setCurrentSlideIdx(idx);
                        setDisplayMode('slideshow');
                      }}
                      className="text-purple-600 hover:text-purple-800 font-bold underline"
                    >
                      Buka di Slide TV
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
