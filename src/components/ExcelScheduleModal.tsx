import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  X,
  Calendar,
  Users,
  ShieldCheck,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Nurse, ShiftDuty, ShiftConfig } from '../types';

interface ExcelScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  nurses: Nurse[];
  schedules: ShiftDuty[];
  shiftConfigs: ShiftConfig[];
  onImportSchedules: (updatedSchedules: ShiftDuty[]) => void;
}

interface ParsedScheduleRow {
  date: string; // YYYY-MM-DD
  shift: string; // 'pagi' | 'siang' | 'malam'
  rawNurseNames: string;
  matchedNurseIds: string[];
  unmatchedNames: string[];
  notes?: string;
}

interface MergePreviewItem {
  date: string;
  shift: string;
  existingNurseIds: string[];
  newNurseIdsToAdd: string[];
  finalNurseIds: string[];
  notes?: string;
}

export const ExcelScheduleModal: React.FC<ExcelScheduleModalProps> = ({
  isOpen,
  onClose,
  nurses,
  schedules,
  shiftConfigs,
  onImportSchedules,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsingError, setParsingError] = useState<string>('');
  const [previewItems, setPreviewItems] = useState<MergePreviewItem[]>([]);
  const [unmatchedNamesGlobal, setUnmatchedNamesGlobal] = useState<string[]>([]);
  const [isSuccessImport, setIsSuccessImport] = useState<boolean>(false);
  const [successCount, setSuccessCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Clean a nurse name for robust matching (removes clinical degrees, prefixes, symbols)
  const cleanNameForMatching = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/ns\.|s\.kep|m\.kep|a\.md\.kep|skep|mkep|amdkep/gi, '')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Find nurse ID by name or NIP
  const findNurseId = (inputStr: string): string | null => {
    const raw = inputStr.trim();
    if (!raw) return null;

    // 1. Check exact or partial NIP match
    const byNip = nurses.find((n) => {
      const cleanNip = n.nip.replace(/\D/g, '');
      const cleanInput = raw.replace(/\D/g, '');
      return cleanInput.length >= 4 && cleanNip.includes(cleanInput);
    });
    if (byNip) return byNip.id;

    // 2. Exact name match (case-insensitive)
    const byExactName = nurses.find(
      (n) => n.name.trim().toLowerCase() === raw.toLowerCase()
    );
    if (byExactName) return byExactName.id;

    // 3. Cleaned name match
    const cleanedInput = cleanNameForMatching(raw);
    if (cleanedInput.length < 2) return null;

    const byCleanName = nurses.find((n) => {
      const cleanedTarget = cleanNameForMatching(n.name);
      return (
        cleanedTarget === cleanedInput ||
        cleanedTarget.includes(cleanedInput) ||
        cleanedInput.includes(cleanedTarget)
      );
    });
    if (byCleanName) return byCleanName.id;

    return null;
  };

  // Parse Excel Date (handles numbers like 45570 or strings like "2026-10-05", "05/10/2026")
  const parseExcelDate = (val: any): string | null => {
    if (!val) return null;

    // If it's an Excel serial date number
    if (typeof val === 'number') {
      const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      const y = jsDate.getUTCFullYear();
      const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(jsDate.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const str = String(val).trim();

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
      const [y, m, d] = str.split('-');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Slash format: DD/MM/YYYY or YYYY/MM/DD
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY/MM/DD
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
        // DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Dash format: DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
      const [d, m, y] = str.split('-');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    return null;
  };

  // Parse Shift String to 'pagi' | 'siang' | 'malam'
  const parseShiftType = (val: any): string => {
    const s = String(val || '')
      .toLowerCase()
      .trim();
    if (s.includes('siang') || s === 's') return 'siang';
    if (s.includes('malam') || s === 'm') return 'malam';
    return 'pagi'; // default
  };

  // Generate and download sample Excel template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template Format
    const templateData = [
      {
        Tanggal: '2026-10-15',
        Sif: 'Pagi',
        Nama_Perawat: 'Ns. Sarah Amelia, S.Kep, Ns. Dewi Sartika, S.Kep',
        NIP: '',
        Keterangan: 'Dinas Pagi Tim Rawat Inap',
      },
      {
        Tanggal: '2026-10-15',
        Sif: 'Siang',
        Nama_Perawat: 'Ns. Budi Santoso, S.Kep',
        NIP: '199008152015031002',
        Keterangan: 'Dinas Siang',
      },
      {
        Tanggal: '2026-10-15',
        Sif: 'Malam',
        Nama_Perawat: 'Ns. Maya Indah, S.Kep',
        NIP: '199401222019022004',
        Keterangan: 'Dinas Malam',
      },
      {
        Tanggal: '2026-10-16',
        Sif: 'Pagi',
        Nama_Perawat: 'Ns. Ahmad Fauzi, S.Kep, Ns. Rina Kartika, S.Kep',
        NIP: '',
        Keterangan: '',
      },
    ];
    const wsTemplate = XLSX.utils.json_to_sheet(templateData);
    wsTemplate['!cols'] = [
      { wch: 14 },
      { wch: 10 },
      { wch: 45 },
      { wch: 22 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Format_Jadwal');

    // Sheet 2: Reference List of All Nurses
    const nurseReference = nurses.map((n) => ({
      ID: n.id,
      Nama_Lengkap: n.name,
      NIP: n.nip,
      Peran_Jabatan: n.role,
    }));
    const wsNurses = XLSX.utils.json_to_sheet(nurseReference);
    wsNurses['!cols'] = [
      { wch: 12 },
      { wch: 32 },
      { wch: 24 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsNurses, 'Daftar_Perawat_Tersedia');

    XLSX.writeFile(wb, 'Format_Import_Jadwal_CareShift.xlsx');
  };

  // Process File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsingError('');
    setPreviewItems([]);
    setUnmatchedNamesGlobal([]);
    setIsSuccessImport(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (rawRows.length === 0) {
          setParsingError('File Excel kosong atau tidak memiliki data baris.');
          return;
        }

        const unmatchedList: string[] = [];
        const parsedRows: ParsedScheduleRow[] = [];

        rawRows.forEach((row) => {
          // Flexible key detection
          const dateVal =
            row['Tanggal'] ??
            row['tanggal'] ??
            row['Date'] ??
            row['date'] ??
            row['Tgl'] ??
            row['tgl'];

          const shiftVal =
            row['Sif'] ??
            row['sif'] ??
            row['Shift'] ??
            row['shift'] ??
            row['Sift'] ??
            row['sift'];

          const nurseVal =
            row['Nama_Perawat'] ??
            row['Nama Perawat'] ??
            row['nama_perawat'] ??
            row['Perawat'] ??
            row['perawat'] ??
            row['Nurse'] ??
            row['nurse'];

          const nipVal = row['NIP'] ?? row['nip'];
          const notesVal =
            row['Keterangan'] ??
            row['keterangan'] ??
            row['Catatan'] ??
            row['catatan'] ??
            row['Notes'] ??
            row['notes'];

          const dateStr = parseExcelDate(dateVal);
          if (!dateStr) return; // skip row without valid date

          const shiftType = parseShiftType(shiftVal);

          // Split multiple nurse names by comma, semicolon, pipe, or newline
          const namesStr = String(nurseVal || '').trim();
          const nipStr = String(nipVal || '').trim();

          const candidates: string[] = [];
          if (namesStr) {
            namesStr
              .split(/[,;\n|]+/)
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
              .forEach((n) => candidates.push(n));
          }
          if (nipStr && candidates.length === 0) {
            candidates.push(nipStr);
          }

          const matchedIds: string[] = [];
          const rowUnmatched: string[] = [];

          candidates.forEach((cand) => {
            const foundId = findNurseId(cand);
            if (foundId) {
              if (!matchedIds.includes(foundId)) {
                matchedIds.push(foundId);
              }
            } else {
              rowUnmatched.push(cand);
              if (!unmatchedList.includes(cand)) {
                unmatchedList.push(cand);
              }
            }
          });

          parsedRows.push({
            date: dateStr,
            shift: shiftType,
            rawNurseNames: namesStr,
            matchedNurseIds: matchedIds,
            unmatchedNames: rowUnmatched,
            notes: notesVal ? String(notesVal).trim() : undefined,
          });
        });

        if (parsedRows.length === 0) {
          setParsingError(
            'Tidak ada data tanggal dan perawat yang valid ditemukan di file Excel. Pastikan menggunakan kolom: Tanggal, Sif, Nama_Perawat.'
          );
          return;
        }

        // Group by (date, shift) and prepare MERGE PREVIEW (WITHOUT DELETING PREVIOUS ASSIGNMENTS!)
        const groupMap = new Map<string, MergePreviewItem>();

        parsedRows.forEach((row) => {
          const key = `${row.date}_${row.shift}`;
          const existingSchedule = schedules.find(
            (s) => s.date === row.date && s.shift === row.shift
          );
          const existingIds = existingSchedule?.nurseIds || [];

          if (!groupMap.has(key)) {
            // New nurses to add (excluding ones already assigned)
            const toAdd = row.matchedNurseIds.filter(
              (id) => !existingIds.includes(id)
            );
            const finalCombined = Array.from(new Set([...existingIds, ...row.matchedNurseIds]));

            groupMap.set(key, {
              date: row.date,
              shift: row.shift,
              existingNurseIds: existingIds,
              newNurseIdsToAdd: toAdd,
              finalNurseIds: finalCombined,
              notes: row.notes,
            });
          } else {
            const currentItem = groupMap.get(key)!;
            const updatedAdd = Array.from(
              new Set([...currentItem.newNurseIdsToAdd, ...row.matchedNurseIds.filter(
                (id) => !existingIds.includes(id)
              )])
            );
            const updatedFinal = Array.from(
              new Set([...currentItem.finalNurseIds, ...row.matchedNurseIds])
            );
            const updatedNotes = [currentItem.notes, row.notes].filter(Boolean).join(' | ');

            groupMap.set(key, {
              ...currentItem,
              newNurseIdsToAdd: updatedAdd,
              finalNurseIds: updatedFinal,
              notes: updatedNotes || currentItem.notes,
            });
          }
        });

        const previewList = Array.from(groupMap.values()).sort((a, b) =>
          a.date.localeCompare(b.date)
        );

        setPreviewItems(previewList);
        setUnmatchedNamesGlobal(unmatchedList);
      } catch (err: any) {
        console.error('Error parsing Excel:', err);
        setParsingError(
          `Gagal membaca file Excel: ${err?.message || 'Format tidak sesuai.'}`
        );
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  // Apply Changes: Merge new duties safely
  const handleApplyImport = () => {
    if (previewItems.length === 0) return;

    // Build the merged ShiftDuty list
    const updatedMap = new Map<string, ShiftDuty>();
    schedules.forEach((s) => updatedMap.set(`${s.date}_${s.shift}`, s));

    let addedCount = 0;

    previewItems.forEach((item) => {
      const key = `${item.date}_${item.shift}`;
      const existing = updatedMap.get(key);

      if (existing) {
        // Safe Merge: Union existing nurse IDs with new ones!
        const mergedNurses = Array.from(
          new Set([...(existing.nurseIds || []), ...item.newNurseIdsToAdd])
        );
        const mergedNotes = [existing.notes, item.notes].filter(Boolean).join(' | ');

        const mergedDuty: ShiftDuty = {
          ...existing,
          nurseIds: mergedNurses,
          notes: mergedNotes || existing.notes,
          updatedAt: new Date().toISOString(),
        };
        updatedMap.set(key, mergedDuty);
        addedCount += item.newNurseIdsToAdd.length;
      } else {
        // New record for date/shift
        const newDuty: ShiftDuty = {
          id: `duty-${item.date}-${item.shift}`,
          date: item.date,
          shift: item.shift,
          nurseIds: item.finalNurseIds,
          notes: item.notes || `Diimpor dari Excel`,
          updatedAt: new Date().toISOString(),
        };
        updatedMap.set(key, newDuty);
        addedCount += item.finalNurseIds.length;
      }
    });

    const finalScheduleList = Array.from(updatedMap.values());
    onImportSchedules(finalScheduleList);

    setSuccessCount(addedCount);
    setIsSuccessImport(true);
    setTimeout(() => {
      setIsSuccessImport(false);
      onClose();
    }, 2200);
  };

  const getNurseName = (id: string): string => {
    return nurses.find((n) => n.id === id)?.name || id;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="clay-card bg-white w-full max-w-3xl p-5 md:p-6 border border-purple-100 shadow-2xl relative rounded-3xl max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-purple-100 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Impor Roster Aman
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-600" />
                Tanpa Menimpa Data Lama
              </span>
            </div>
            <h3 className="font-display font-extrabold text-lg md:text-xl text-slate-800 leading-tight">
              Tambah Jadwal Perawat via Excel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unggah file Excel (.xlsx / .csv). Jadwal yang sudah ada sebelumnya tetap aman dan perawat baru akan ditambahkan otomatis.
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Success Notification */}
          {isSuccessImport && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-3 shadow-md animate-bounce">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Jadwal Berhasil Ditambahkan!</h4>
                <p className="text-xs text-emerald-700">
                  {previewItems.length} sesi sif diperbarui dengan {successCount} penugasan perawat baru. Data sebelumnya tetap utuh.
                </p>
              </div>
            </div>
          )}

          {/* Action 1: Template Download Bar */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-purple-50/80 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800">
                  Unduh Format File Excel Resmi
                </h4>
                <p className="text-[11px] text-slate-500">
                  Format siap pakai berisi kolom Tanggal, Sif, dan Daftar Nama Perawat ruangan
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template .xlsx</span>
            </button>
          </div>

          {/* Action 2: File Upload Zone */}
          <div className="p-4 bg-slate-50 border-2 border-dashed border-purple-200 rounded-2xl text-center hover:bg-purple-50/40 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
              id="excel-file-input"
            />
            <label
              htmlFor="excel-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-purple-100 flex items-center justify-center text-purple-600">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  {file ? file.name : 'Klik untuk Pilih File Excel (.xlsx, .xls, .csv)'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mendukung multi-perawat dalam satu baris (pisahkan dengan koma)
                </p>
              </div>
              <span className="px-3 py-1 bg-white border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold shadow-2xs hover:bg-purple-50">
                {file ? 'Ganti File Excel' : 'Pilih File'}
              </span>
            </label>
          </div>

          {/* Error Message */}
          {parsingError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{parsingError}</span>
            </div>
          )}

          {/* Unmatched Nurse Warning */}
          {unmatchedNamesGlobal.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  Perhatian: Ada {unmatchedNamesGlobal.length} nama perawat yang tidak cocok dengan data database:
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  {unmatchedNamesGlobal.join(', ')}
                </p>
                <p className="text-[10px] text-amber-700 mt-1 italic">
                  Pastikan ejaan nama sesuai nama yang terdaftar di menu "Daftar Perawat".
                </p>
              </div>
            </div>
          )}

          {/* Preview Table of Merged Data */}
          {previewItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-display font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span>Pratinjau Penggabungan Jadwal ({previewItems.length} Sesi Sif)</span>
                </h4>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                    Abu-abu = Sudah Ada (Aman)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Hijau = Ditambahkan Baru
                  </span>
                </div>
              </div>

              <div className="border border-purple-100 rounded-2xl overflow-hidden shadow-xs max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-purple-50/80 text-purple-900 font-bold border-b border-purple-100 sticky top-0 backdrop-blur-sm">
                    <tr>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Sif</th>
                      <th className="p-2.5">Perawat Sebelumnya</th>
                      <th className="p-2.5">Perawat Baru dari Excel</th>
                      <th className="p-2.5 text-right">Total Perawat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/30">
                        <td className="p-2.5 font-mono font-bold text-slate-700">
                          {item.date}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] capitalize ${
                              item.shift === 'pagi'
                                ? 'bg-amber-100 text-amber-800'
                                : item.shift === 'siang'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {item.shift}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {item.existingNurseIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.existingNurseIds.map((id) => (
                                <span
                                  key={id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                                  title={getNurseName(id)}
                                >
                                  {getNurseName(id).split(',')[0]}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Belum ada</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {item.newNurseIdsToAdd.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.newNurseIdsToAdd.map((id) => (
                                <span
                                  key={id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300"
                                  title={getNurseName(id)}
                                >
                                  + {getNurseName(id).split(',')[0]}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Semua sudah terdaftar
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-purple-900">
                          {item.finalNurseIds.length} Perawat
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={previewItems.length === 0 || isSuccessImport}
            onClick={handleApplyImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 ${
              previewItems.length > 0 && !isSuccessImport
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Terapkan Jadwal ke Kalender (Simpan Aman)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
