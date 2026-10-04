import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
  SunMedium,
  Moon,
  Check,
  Copy,
  Users,
  CheckCircle,
  Save,
  Lock,
  LockOpen,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';
import { Nurse, ShiftDuty, ShiftConfig } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { ExcelScheduleModal } from './ExcelScheduleModal';
import {
  getWitaDateParts,
  getWitaDateString,
  normalizeTimeToDot,
} from '../utils/witaTime';

interface MonthlyScheduleCalendarProps {
  nurses: Nurse[];
  schedules: ShiftDuty[];
  shiftConfigs: ShiftConfig[];
  isAdmin: boolean;
  onSaveSchedule: (schedule: ShiftDuty) => void;
  onImportSchedules?: (importedDuties: ShiftDuty[]) => void;
  onOpenLoginModal: () => void;
}

export const MonthlyScheduleCalendar: React.FC<MonthlyScheduleCalendarProps> = ({
  nurses,
  schedules,
  shiftConfigs,
  isAdmin,
  onSaveSchedule,
  onImportSchedules,
  onOpenLoginModal,
}) => {
  // Current month & year in WITA
  const todayWita = getWitaDateParts(new Date());
  const todayDateStr = getWitaDateString(new Date());

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [selectedShift, setSelectedShift] = useState<string>('pagi');
  const [showToast, setShowToast] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Month & Day calculations based on currentDate
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Safe fallbacks
  const safeSchedules = schedules || [];
  const configs =
    shiftConfigs && Array.isArray(shiftConfigs) && shiftConfigs.length > 0
      ? shiftConfigs
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

  // Find schedule for selected date & shift
  const currentSchedule = safeSchedules.find(
    (s) => s.date === selectedDate && s.shift === selectedShift
  ) || {
    id: `duty-${selectedDate}-${selectedShift}`,
    date: selectedDate,
    shift: selectedShift,
    nurseIds: [],
    notes: '',
    updatedAt: new Date().toISOString(),
  };

  // Requirement 2: Strict function-level access check for Admin
  // Requirement 4: Absolutely NO limit on nurse count!
  const handleToggleNurse = (nurseId: string) => {
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Admin yang dapat mengubah atau mengatur roster sift. Silakan masuk sebagai Admin.');
      return;
    }

    const currentIds = [...currentSchedule.nurseIds];
    const index = currentIds.indexOf(nurseId);

    if (index >= 0) {
      currentIds.splice(index, 1);
    } else {
      // Requirement 4: No maximum limit! 1, 2, 5, 8, 10, etc. are all allowed!
      currentIds.push(nurseId);
    }

    const updated: ShiftDuty = {
      ...currentSchedule,
      nurseIds: currentIds,
      updatedAt: new Date().toISOString(),
    };

    onSaveSchedule(updated);
    triggerSavedToast();
  };

  const triggerSavedToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleCopyToNextDay = () => {
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Admin yang dapat menyalin roster sift.');
      return;
    }

    const nextDateObj = new Date(selectedDate);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDateStr = nextDateObj.toISOString().split('T')[0];

    const updated: ShiftDuty = {
      id: `duty-${nextDateStr}-${selectedShift}`,
      date: nextDateStr,
      shift: selectedShift,
      nurseIds: [...currentSchedule.nurseIds],
      notes: `Disalin dari ${selectedDate}`,
      updatedAt: new Date().toISOString(),
    };

    onSaveSchedule(updated);
    setSelectedDate(nextDateStr);
    triggerSavedToast();
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

  // Aggregate stats per date
  const scheduleCountByDate: Record<string, Record<string, number>> = {};
  safeSchedules.forEach((sch) => {
    if (!scheduleCountByDate[sch.date]) {
      scheduleCountByDate[sch.date] = {};
    }
    scheduleCountByDate[sch.date][sch.shift] = sch.nurseIds ? sch.nurseIds.length : 0;
  });

  const selectedConfig = configs.find((s) => s.id === selectedShift) || configs[0] || {
    id: selectedShift,
    name: `Sif ${selectedShift}`,
    startTime: '07:00',
    endTime: '14:00',
    colorTheme: 'amber',
  };

  const selectedStartDot = normalizeTimeToDot(selectedConfig.startTime);
  const selectedEndDot = normalizeTimeToDot(selectedConfig.endTime);

  return (
    <div className="space-y-6">
      {/* Realtime Saved Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 z-50 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">
            Roster Sif Berhasil Diperbarui & Tersinkronisasi Online!
          </span>
        </div>
      )}

      {/* Header Bar */}
      <div className="clay-card-flat bg-white p-5 border border-purple-100 flex flex-col md:flex-row items-center justify-between gap-4 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
              Jadwal Perawat Bulanan
            </span>
            <h2 className="font-display font-extrabold text-xl text-slate-800">
              Jadwal Perawat 1 Bulan Penuh
            </h2>
            {isAdmin ? (
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Mode Edit Admin Aktif
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-600" />
                Mode Lihat (Pengguna Biasa)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Admin dapat memilih tanggal dan menambahkan/menghapus perawat tanpa batas jumlah.'
              : 'Pengguna biasa dapat memantau jadwal. Masuk sebagai Admin untuk melakukan perubahan penugasan perawat.'}
          </p>
        </div>

        {/* Actions & Month Navigation */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {isAdmin ? (
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5 shrink-0"
              title="Tambah atau unggah jadwal dinas dari file Excel (.xlsx / .csv) tanpa menimpa data lama"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Tambah Jadwal via Excel</span>
            </button>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              title="Masuk sebagai Admin untuk mengimpor jadwal Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Impor Excel (Admin)</span>
            </button>
          )}

          {/* Month Navigation */}
          <div className="flex items-center gap-3 bg-purple-50/80 px-3 py-1.5 rounded-2xl border border-purple-200/60 shadow-inner">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl bg-white hover:bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs transition-all"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center px-2">
              <span className="font-display font-black text-sm md:text-base text-purple-900 block leading-tight">
                {monthNames[month]} {year}
              </span>
              <span className="text-[10px] text-purple-600 font-semibold block">
                {daysInMonth} Hari Terjadwal
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl bg-white hover:bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs transition-all"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Access Permission Notice if Not Admin */}
      {!isAdmin && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">
                Pengaturan Roster Sift Dikunci untuk Pengguna Biasa
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Anda hanya dapat melihat daftar penugasan perawat. Perubahan roster hanya dapat dilakukan oleh Admin.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenLoginModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
          >
            <LockOpen className="w-3.5 h-3.5" />
            <span>Masuk Mode Admin</span>
          </button>
        </div>
      )}

      {/* Main Grid: Calendar (Left) & Nurse Assignment (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid (7 cols) */}
        <div className="lg:col-span-7 clay-card bg-white p-5 border border-purple-100 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <span>
                Kalender Roster {monthNames[month]} {year}
              </span>
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Pagi
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400" /> Siang
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Malam
              </span>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-slate-400 mb-2">
            <div className="text-rose-500">Min</div>
            <div>Sen</div>
            <div>Sel</div>
            <div>Rab</div>
            <div>Kam</div>
            <div>Jum</div>
            <div>Sab</div>
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="h-16 md:h-20 rounded-2xl bg-slate-50/50 border border-transparent"
              />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayStr = String(dayNum).padStart(2, '0');
              const monthStr = String(month + 1).padStart(2, '0');
              const dateStr = `${year}-${monthStr}-${dayStr}`;
              const isSelected = selectedDate === dateStr;
              const isToday = todayDateStr === dateStr;

              const counts = scheduleCountByDate[dateStr] || {};
              const pagiCount = counts.pagi || 0;
              const siangCount = counts.siang || 0;
              const malamCount = counts.malam || 0;
              const totalStaff = pagiCount + siangCount + malamCount;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-16 md:h-20 p-1.5 rounded-2xl text-left flex flex-col justify-between transition-all relative border ${
                    isSelected
                      ? 'bg-purple-100/90 border-purple-500 shadow-md ring-2 ring-purple-400'
                      : isToday
                      ? 'bg-purple-50/60 border-purple-200 hover:bg-purple-50'
                      : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-purple-950 font-black'
                          : isToday
                          ? 'text-purple-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold px-1 rounded bg-purple-600 text-white">
                        Hari Ini
                      </span>
                    )}
                  </div>

                  {/* Summary Indicators per shift */}
                  <div className="space-y-0.5">
                    {totalStaff > 0 ? (
                      <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                        <span className="text-amber-700 font-bold" title="Pagi">
                          {pagiCount}p
                        </span>
                        <span className="text-orange-700 font-bold" title="Siang">
                          {siangCount}s
                        </span>
                        <span className="text-indigo-700 font-bold" title="Malam">
                          {malamCount}m
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-300">Kosong</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Nurse Assignment for Selected Date & Shift */}
        <div className="lg:col-span-5 space-y-4">
          <div className="clay-card bg-white p-5 border border-purple-100 rounded-3xl">
            {/* Header of Date & Copy Action */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                  Tanggal Terpilih:
                </span>
                <h3 className="font-display font-extrabold text-lg text-slate-800">
                  {selectedDate}
                </h3>
              </div>
              {isAdmin && (
                <button
                  onClick={handleCopyToNextDay}
                  title="Salin penugasan ini ke hari berikutnya (H+1)"
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin ke H+1</span>
                </button>
              )}
            </div>

            {/* Shift Tabs */}
            <div className="grid grid-cols-3 gap-2 my-4">
              {configs.map((cfg) => {
                const isCurrentActive = selectedShift === cfg.id;
                const ShiftIcon = getShiftIcon(cfg.id);
                const count =
                  safeSchedules.find(
                    (s) => s.date === selectedDate && s.shift === cfg.id
                  )?.nurseIds?.length || 0;

                return (
                  <button
                    key={cfg.id}
                    onClick={() => setSelectedShift(cfg.id)}
                    className={`p-2.5 rounded-2xl text-center border transition-all flex flex-col items-center justify-center gap-1 ${
                      isCurrentActive
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-300 font-bold'
                        : 'bg-slate-50 hover:bg-purple-50/50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <ShiftIcon className="w-4 h-4" />
                    <span className="text-xs leading-none truncate max-w-full">
                      {cfg.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isCurrentActive
                          ? 'bg-purple-700 text-purple-100'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count} Perawat
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Nurse List Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">
                  {selectedConfig.name} — {currentSchedule.nurseIds.length} Perawat
                </span>
                <span className="text-[11px] text-purple-700 font-semibold">
                  ({selectedStartDot} - {selectedEndDot} WITA)
                </span>
              </div>

              {!isAdmin && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mb-2">
                  🔒 Anda dalam mode lihat. Hanya Admin yang dapat mencentang atau menghapus perawat dari roster.
                </p>
              )}

              {/* Requirement 4: List all available nurses, toggling without any max limit */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {nurses.map((nurse) => {
                  const isAssigned = currentSchedule.nurseIds.includes(nurse.id);

                  return (
                    <div
                      key={nurse.id}
                      onClick={() => handleToggleNurse(nurse.id)}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isAdmin
                          ? 'cursor-pointer'
                          : 'cursor-not-allowed opacity-90'
                      } ${
                        isAssigned
                          ? 'bg-purple-50/90 border-purple-300 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-purple-100 shrink-0 border border-white shadow-xs">
                          <ImageWithFallback
                            src={nurse.photoUrl}
                            alt={nurse.name}
                            fallbackText={nurse.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="text-xs font-extrabold text-slate-800 truncate">
                            {nurse.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span>{nurse.role}</span>
                            <span>·</span>
                            <span className="font-mono">
                              {nurse.nip.split(':')[1]?.trim() || nurse.nip}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                          isAssigned
                            ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom notification */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {isAdmin
                  ? 'Perubahan otomatis tersinkronisasi ke seluruh perangkat'
                  : 'Roster ini tersinkronisasi terpusat'}
              </span>
              <span className="font-semibold text-purple-700 flex items-center gap-1">
                <Save className="w-3 h-3" />
                <span>Realtime Cloud Sync</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Excel Schedule Importer Modal */}
      <ExcelScheduleModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        nurses={nurses}
        schedules={schedules}
        shiftConfigs={configs}
        onImportSchedules={(merged) => {
          if (onImportSchedules) {
            onImportSchedules(merged);
          } else {
            merged.forEach((d) => onSaveSchedule(d));
          }
        }}
      />
    </div>
  );
};
