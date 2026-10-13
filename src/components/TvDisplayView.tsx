import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  SunMedium,
  Moon,
  Building2,
  UserCheck,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Clock,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Tv,
} from 'lucide-react';
import { Nurse, AppSettings, ShiftConfig, ShiftDuty } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import {
  getWitaDateString,
  getWitaTimeString,
  formatWitaFullDate,
  normalizeTimeToDot,
  determineActiveShiftContext,
  getScheduleDateForShift,
} from '../utils/witaTime';
import { StorageService } from '../services/storage';

interface TvDisplayViewProps {
  currentShift: string;
  settings: AppSettings;
  nurses: Nurse[];
  schedules: ShiftDuty[];
  onExitTvMode?: () => void;
}

export const TvDisplayView: React.FC<TvDisplayViewProps> = ({
  currentShift,
  settings,
  nurses,
  schedules,
  onExitTvMode,
}) => {
  const [autoFollowShift, setAutoFollowShift] = useState(true);
  const [selectedShift, setSelectedShift] = useState<string>(currentShift);
  const [isPlaying, setIsPlaying] = useState(true);
  const [slideDurationSec, setSlideDurationSec] = useState<number>(() => {
    try {
      if (typeof StorageService?.getTvSlideDuration === 'function') {
        return StorageService.getTvSlideDuration();
      }
    } catch {
      // Fallback
    }
    return 8;
  });
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [witaDate, setWitaDate] = useState<Date>(new Date());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const slideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Sync body class & title for clean TV display
  useEffect(() => {
    document.body.classList.add('careshift-tv-active');
    const prevTitle = document.title;
    document.title = `CareShift TV · ${settings.wardName || 'Display Ruangan'}`;

    // Request Screen Wake Lock if supported
    let wakeLockSentinel: any = null;
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock
        ?.request('screen')
        .then((lock: any) => {
          wakeLockSentinel = lock;
        })
        .catch(() => {
          // ignore wakeLock rejection on non-supported browsers
        });
    }

    return () => {
      document.body.classList.remove('careshift-tv-active');
      document.title = prevTitle;
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [settings.wardName]);

  // 2. Real-time WITA clock
  useEffect(() => {
    const timer = setInterval(() => {
      setWitaDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Auto-follow current shift
  useEffect(() => {
    if (autoFollowShift) {
      setSelectedShift(currentShift);
    }
  }, [currentShift, autoFollowShift]);

  // 4. Resolve active shift context & schedule date (Requirement 2: Accurate night shift overnight rollover)
  const activeShiftCtx = determineActiveShiftContext(settings?.shiftConfigs, witaDate);
  const liveShift = activeShiftCtx.shiftId;
  const effectiveShift = autoFollowShift ? liveShift : selectedShift;

  const effectiveScheduleDate = getScheduleDateForShift(
    effectiveShift,
    activeShiftCtx,
    settings?.shiftConfigs,
    witaDate
  );

  const todayDuty = schedules.find(
    (s) => s.date === effectiveScheduleDate && s.shift === effectiveShift
  );
  const dutyNurseIds = todayDuty?.nurseIds || [];
  const assignedNurses = nurses.filter((n) => dutyNurseIds.includes(n.id));
  const activeNurses =
    assignedNurses.length > 0 ? assignedNurses : nurses.slice(0, 4);

  const safeSlideIdx =
    currentSlideIdx < activeNurses.length ? currentSlideIdx : 0;
  const currentNurse = activeNurses[safeSlideIdx] || activeNurses[0];

  // 5. Automatic slide playback
  useEffect(() => {
    if (!isPlaying || activeNurses.length <= 1) {
      if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setSlideProgress(0);
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
  }, [
    safeSlideIdx,
    isPlaying,
    slideDurationSec,
    activeNurses.length,
    effectiveShift,
  ]);

  // 6. TV remote / keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Any interaction reveals controls temporarily
      triggerControlsActive();

      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (isFullScreen) {
          exitFullscreen();
        } else if (onExitTvMode) {
          onExitTvMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNurses.length, isFullScreen]);

  // 7. Auto-hide floating controls after 4s
  const triggerControlsActive = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  useEffect(() => {
    triggerControlsActive();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const handleNext = () => {
    setCurrentSlideIdx((prev) => (prev + 1) % activeNurses.length);
    setSlideProgress(0);
  };

  const handlePrev = () => {
    setCurrentSlideIdx(
      (prev) => (prev - 1 + activeNurses.length) % activeNurses.length
    );
    setSlideProgress(0);
  };

  const handleDurationChange = (sec: number) => {
    setSlideDurationSec(sec);
    try {
      if (typeof StorageService?.saveTvSlideDuration === 'function') {
        StorageService.saveTvSlideDuration(sec);
      }
    } catch {
      // Ignore
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => {
        setIsFullScreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullScreen(false);
      }).catch(() => {});
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().then(() => {
        setIsFullScreen(false);
      }).catch(() => {});
    }
  };

  // Shift config info
  const shiftConfigs =
    settings?.shiftConfigs && settings.shiftConfigs.length > 0
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

  const getShiftData = (shiftId: string) => {
    switch (shiftId) {
      case 'pagi':
        return {
          icon: Sun,
          gradientClass: 'tv-gradient-pagi',
          badgeBg: '#f59e0b',
          accentColor: '#fbbf24',
          dutyBadgeText: 'bg-amber-500 text-slate-900',
          title: 'Fokus Pelayanan Sif Pagi',
          items: [
            'Visit Dokter Penanggung Jawab Pasien (DPJP) & Edukasi Medis',
            'Pemberian Terapi Obat Pagi & Monitoring Tanda Vital (TTV)',
            'Persiapan Fisik & Mental Pasien Menjelang Tindakan Medis / Bedah',
          ],
          motto:
            'Membuka hari dengan ramah, senyum tulus, dan memastikan asuhan keperawatan optimal.',
        };
      case 'siang':
        return {
          icon: SunMedium,
          gradientClass: 'tv-gradient-siang',
          badgeBg: '#f97316',
          accentColor: '#fb923c',
          dutyBadgeText: 'bg-orange-500 text-white',
          title: 'Fokus Pelayanan Sif Siang',
          items: [
            'Observasi & Pemulihan Pasien Pasca-Tindakan di Ruang Rawat Inap',
            'Pendampingan Mobilisasi Dini & Perawatan Luka Steril',
            'Penerimaan & Edukasi Keluarga Pasien pada Jam Kunjungan Siang/Sore',
          ],
          motto:
            'Melanjutkan perawatan berkesinambungan dengan pemantauan ketat dan kenyamanan pasien.',
        };
      default:
        return {
          icon: Moon,
          gradientClass: 'tv-gradient-malam',
          badgeBg: '#6366f1',
          accentColor: '#818cf8',
          dutyBadgeText: 'bg-indigo-600 text-white',
          title: 'Fokus Pelayanan Sif Malam',
          items: [
            'Menciptakan Suasana Tenang untuk Istirahat & Pemulihan Pasien',
            'Ronda Malam Berkala, Pemantauan Cairan Infus & Oksigen',
            'Kesiapsiagaan Cepat Merespons Panggilan Bel (Nurse Call) 24 Jam',
          ],
          motto:
            'Menjaga kenyamanan dan ketenangan istirahat malam pasien dengan kesiapsiagaan penuh.',
        };
    }
  };

  const shiftData = getShiftData(effectiveShift);
  const ShiftIcon = shiftData.icon;

  const witaFormattedDate = formatWitaFullDate(witaDate);
  const witaTimeFormatted = getWitaTimeString(witaDate, true);
  const startDot = normalizeTimeToDot(currentConfig.startTime);
  const endDot = normalizeTimeToDot(currentConfig.endTime);

  return (
    <div
      onMouseMove={triggerControlsActive}
      onTouchStart={triggerControlsActive}
      className={`tv-root-viewport ${shiftData.gradientClass}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        color: '#ffffff',
      }}
    >
      {/* 16:9 Inner Canvas Boundary */}
      <div
        className="tv-canvas-16-9"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '177.78vh',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* ==================================================== */}
        {/* 1. TOP HEADER (Branding, Shift Badge, Realtime Clock) */}
        {/* ==================================================== */}
        <header
          className="tv-header-container"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Hospital & Ward Info */}
          <div
            className="tv-header-left"
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
          >
            <div
              className="tv-logo-box"
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                marginRight: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {settings.hospitalLogoUrl ? (
                <img
                  src={settings.hospitalLogoUrl}
                  alt="Logo RS"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <Building2 style={{ width: 28, height: 28, color: '#e2e8f0' }} />
              )}
            </div>
            <div>
              <h1 className="tv-hospital-title">
                {settings.hospitalName || 'RS PKU Muhammadiyah'}
              </h1>
              <p className="tv-ward-subtitle">
                {settings.wardName || 'Ruang Rawat Inap Bedah'}
              </p>
            </div>
          </div>

          {/* Right: Shift Status & Live Clock */}
          <div
            className="tv-header-right"
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
          >
            {/* Live Digital Clock WITA */}
            <div className="tv-clock-badge">
              <div className="tv-clock-time">
                {witaTimeFormatted}{' '}
                <span style={{ color: shiftData.accentColor, fontSize: '0.8em' }}>
                  WITA
                </span>
              </div>
              <div className="tv-clock-date">{witaFormattedDate}</div>
            </div>

            {/* Current Shift Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 16px',
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                marginRight: 12,
              }}
            >
              <ShiftIcon
                style={{
                  width: 20,
                  height: 20,
                  color: shiftData.accentColor,
                  marginRight: 8,
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 800 }}>
                {currentConfig.name} ({startDot} - {endDot})
              </span>
            </div>

            {/* Nurse Slide Counter */}
            <div
              style={{
                padding: '8px 14px',
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontFamily: 'monospace, sans-serif',
                fontSize: 13,
                fontWeight: 700,
                color: '#cbd5e1',
              }}
            >
              {safeSlideIdx + 1} / {activeNurses.length}
            </div>
          </div>
        </header>

        {/* ==================================================== */}
        {/* 2. MAIN STAGE (Landscape 2-Column Nurse Presentation) */}
        {/* ==================================================== */}
        <main
          className="tv-stage-row"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Column 1: Proportional Nurse Portrait */}
          <div
            className="tv-photo-column"
            style={{
              flex: '0 0 38%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              className="tv-nurse-frame"
              style={{
                width: 290,
                height: 290,
                borderRadius: 26,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
              }}
            >
              <ImageWithFallback
                src={currentNurse?.photoUrl || ''}
                alt={currentNurse?.name || 'Perawat'}
                className="w-full h-full object-cover"
                fallbackIcon={
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#1e1b4b',
                      color: '#a78bfa',
                    }}
                  >
                    <UserCheck style={{ width: 84, height: 84, marginBottom: 8 }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      Foto Perawat
                    </span>
                  </div>
                }
              />
            </div>

            {/* Floating Role Badge */}
            <div className="tv-nurse-floating-badge">
              <ShieldCheck
                style={{
                  width: 15,
                  height: 15,
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  marginRight: 6,
                }}
              />
              <span style={{ verticalAlign: 'middle' }}>
                {currentNurse?.role || 'Perawat Jaga'}
              </span>
            </div>
          </div>

          {/* Column 2: Nurse Details & Shift Focus */}
          <div
            className="tv-details-column"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingLeft: 40,
            }}
          >
            {/* Live Indicator Pill */}
            <div
              className="tv-duty-pill"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'rgba(52, 211, 153, 0.4)',
                color: '#6ee7b7',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  marginRight: 8,
                  display: 'inline-block',
                }}
              />
              PERAWAT JAGA {currentConfig.name.toUpperCase()} ({startDot} - {endDot})
            </div>

            {/* Nurse Full Name */}
            <h2 className="tv-nurse-name-text">
              {currentNurse?.name || 'Nama Perawat'}
            </h2>

            {/* NIP / Metadata Tags */}
            <div
              className="tv-meta-row"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <span className="tv-meta-tag">
                NIP/STR: {currentNurse?.nip || '-'}
              </span>
              <span className="tv-meta-tag">
                Dinas Aktif: {currentConfig.name}
              </span>
              {autoFollowShift && (
                <span
                  className="tv-meta-tag"
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.25)',
                    color: '#e9d5ff',
                  }}
                >
                  Otomatis Sesuai Jam WITA
                </span>
              )}
            </div>

            {/* Shift Focus & Service Motto Card */}
            <div className="tv-focus-card">
              <h3
                className="tv-focus-title"
                style={{ color: shiftData.accentColor }}
              >
                <ShiftIcon
                  style={{ width: 16, height: 16, marginRight: 6, display: 'inline-block' }}
                />
                {shiftData.title}
              </h3>

              <ul className="tv-focus-list">
                {shiftData.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>

              <div className="tv-motto-text">"{shiftData.motto}"</div>
            </div>
          </div>
        </main>

        {/* ==================================================== */}
        {/* 3. BOTTOM BAR (Progress Line & Roster Quick Overview) */}
        {/* ==================================================== */}
        <footer className="tv-footer-container">
          {/* Autoplay Progress Line */}
          {isPlaying && activeNurses.length > 1 && (
            <div className="tv-progress-line">
              <div
                className="tv-progress-fill"
                style={{
                  width: `${slideProgress}%`,
                  backgroundColor: shiftData.accentColor,
                }}
              />
            </div>
          )}

          <div
            className="tv-footer-info"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Quick Roster Pills */}
            <div
              className="tv-nurse-roster-pills"
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#cbd5e1',
                  marginRight: 10,
                }}
              >
                Tim Jaga ({activeNurses.length}):
              </span>
              {activeNurses.map((nurse, idx) => (
                <div
                  key={nurse.id}
                  onClick={() => setCurrentSlideIdx(idx)}
                  className={`tv-roster-pill ${idx === safeSlideIdx ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  {idx + 1}. {nurse.name.split(' ')[0]}
                </div>
              ))}
            </div>

            {/* Emergency Phone & Status */}
            <div>
              {settings.emergencyPhone && (
                <span style={{ marginRight: 16 }}>
                  Nurse Call / Darurat: <strong>{settings.emergencyPhone}</strong>
                </span>
              )}
              <span>
                Durasi Slide: <strong>{slideDurationSec}d</strong>
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* ==================================================== */}
      {/* 4. SUBTLE FLOATING CONTROLS (TV Remote / Mouse Access) */}
      {/* ==================================================== */}
      <div
        className="tv-floating-controls"
        style={{
          opacity: showControls ? 1 : 0.08,
          pointerEvents: showControls ? 'auto' : 'auto',
        }}
      >
        {/* Shift Overrides */}
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 4 }}>
          <button
            onClick={() => setAutoFollowShift(true)}
            className="tv-control-btn"
            style={{
              backgroundColor: autoFollowShift
                ? '#7c3aed'
                : 'rgba(255, 255, 255, 0.1)',
            }}
            title="Ikuti Sif Otomatis sesuai Jam WITA"
          >
            Auto Sif
          </button>
          {shiftConfigs.map((cfg) => (
            <button
              key={cfg.id}
              onClick={() => {
                setAutoFollowShift(false);
                setSelectedShift(cfg.id);
                setCurrentSlideIdx(0);
              }}
              className="tv-control-btn"
              style={{
                backgroundColor:
                  !autoFollowShift && selectedShift === cfg.id
                    ? '#7c3aed'
                    : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              {cfg.name}
            </button>
          ))}
        </div>

        {/* Prev / Play / Next */}
        <button
          onClick={handlePrev}
          className="tv-control-btn"
          title="Slide Sebelumnya (←)"
        >
          <SkipBack style={{ width: 14, height: 14 }} />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="tv-control-btn"
          style={{
            backgroundColor: isPlaying ? '#eab308' : '#10b981',
            color: isPlaying ? '#000000' : '#ffffff',
          }}
          title={isPlaying ? 'Jeda Slide (Spasi)' : 'Putar Slide (Spasi)'}
        >
          {isPlaying ? (
            <Pause style={{ width: 14, height: 14 }} />
          ) : (
            <Play style={{ width: 14, height: 14 }} />
          )}
        </button>

        <button
          onClick={handleNext}
          className="tv-control-btn"
          title="Slide Berikutnya (→)"
        >
          <SkipForward style={{ width: 14, height: 14 }} />
        </button>

        {/* Slide Duration Dropdown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginLeft: 8,
            paddingLeft: 8,
            borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Clock style={{ width: 14, height: 14, marginRight: 4, color: '#c084fc' }} />
          <select
            value={slideDurationSec}
            onChange={(e) => handleDurationChange(Number(e.target.value))}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '4px 6px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value={5} style={{ background: '#1e293b' }}>5s</option>
            <option value={8} style={{ background: '#1e293b' }}>8s (Standar)</option>
            <option value={12} style={{ background: '#1e293b' }}>12s</option>
            <option value={15} style={{ background: '#1e293b' }}>15s</option>
            <option value={20} style={{ background: '#1e293b' }}>20s</option>
          </select>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="tv-control-btn"
          title={isFullScreen ? 'Keluar Layar Penuh (Esc)' : 'Layar Penuh TV (F)'}
        >
          {isFullScreen ? (
            <Minimize2 style={{ width: 14, height: 14 }} />
          ) : (
            <Maximize2 style={{ width: 14, height: 14 }} />
          )}
        </button>

        {/* Exit TV Mode (Return to Normal App) */}
        {onExitTvMode && (
          <button
            onClick={onExitTvMode}
            className="tv-control-btn"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              color: '#ffffff',
            }}
            title="Keluar dari Mode TV & Kembali ke Menu Utama"
          >
            <ArrowLeft style={{ width: 14, height: 14, marginRight: 4 }} />
            Keluar Mode TV
          </button>
        )}
      </div>
    </div>
  );
};
