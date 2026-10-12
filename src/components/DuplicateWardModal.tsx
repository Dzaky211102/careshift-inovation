import React, { useState } from 'react';
import {
  Copy,
  Building2,
  Sparkles,
  Layers,
  Users,
  CalendarDays,
  Settings,
  HeartHandshake,
  Check,
  X,
  Plus,
} from 'lucide-react';
import { WardInfo } from '../types';

interface DuplicateWardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWard: WardInfo;
  availableWards: WardInfo[];
  onDuplicateSuccess: (newWard: WardInfo) => void;
}

export const DuplicateWardModal: React.FC<DuplicateWardModalProps> = ({
  isOpen,
  onClose,
  sourceWard,
  availableWards,
  onDuplicateSuccess,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(sourceWard.id);
  const [newWardName, setNewWardName] = useState<string>('');
  const [newWardCode, setNewWardCode] = useState<string>('');
  const [newWardFloor, setNewWardFloor] = useState<string>('');
  const [newWardBuilding, setNewWardBuilding] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('teal');

  // Options
  const [copyNurses, setCopyNurses] = useState(true);
  const [copySchedules, setCopySchedules] = useState(true);
  const [copySettings, setCopySettings] = useState(true);
  const [copyPatients, setCopyPatients] = useState(false);

  // Quick suggestions
  const suggestions = [
    { name: 'Ruang Melati - Lantai 2', code: 'MELATI', floor: 'Lantai 2', theme: 'teal' },
    { name: 'Ruang Mawar - Lantai 3', code: 'MAWAR', floor: 'Lantai 3', theme: 'rose' },
    { name: 'Ruang Bougenville - Lantai 4', code: 'BOUGENVILLE', floor: 'Lantai 4', theme: 'blue' },
    { name: 'Ruang Dahlia (VIP) - Lantai 5', code: 'DAHLIA', floor: 'Lantai 5', theme: 'indigo' },
    { name: 'Ruang ICU & HCU - Lantai 1', code: 'ICU', floor: 'Lantai 1', theme: 'emerald' },
    { name: 'Ruang Kenanga - Paviliun', code: 'KENANGA', floor: 'Lantai 2', theme: 'amber' },
  ];

  if (!isOpen) return null;

  const currentSource = availableWards.find((w) => w.id === selectedSourceId) || sourceWard;

  const handleApplySuggestion = (s: typeof suggestions[0]) => {
    setNewWardName(s.name);
    setNewWardCode(s.code);
    setNewWardFloor(s.floor);
    setSelectedTheme(s.theme);
  };

  const handleCreateDuplicate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWardName.trim()) return;

    const baseCode = (newWardCode.trim() || newWardName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)).toUpperCase();
    const slugId = baseCode.toLowerCase().replace(/[^a-z0-9]/g, '-') || `ward-${Date.now()}`;

    // Ensure unique ID
    let finalId = slugId;
    let counter = 1;
    while (availableWards.some((w) => w.id === finalId)) {
      finalId = `${slugId}-${counter}`;
      counter++;
    }

    const newWard: WardInfo = {
      id: finalId,
      name: newWardName.trim(),
      code: baseCode,
      floor: newWardFloor.trim() || 'Lantai 2',
      building: newWardBuilding.trim() || 'Gedung Utama',
      colorTheme: selectedTheme,
      description: `Ruangan duplikasi dari ${currentSource.name}`,
      createdAt: new Date().toISOString(),
    };

    onDuplicateSuccess(newWard);
  };

  const themeColors = [
    { id: 'purple', label: 'Ungu CareShift', class: 'bg-purple-600 border-purple-400' },
    { id: 'teal', label: 'Teal Hospital', class: 'bg-teal-600 border-teal-400' },
    { id: 'blue', label: 'Biru Samudra', class: 'bg-blue-600 border-blue-400' },
    { id: 'emerald', label: 'Hijau Sehat', class: 'bg-emerald-600 border-emerald-400' },
    { id: 'rose', label: 'Rose Harmoni', class: 'bg-rose-600 border-rose-400' },
    { id: 'indigo', label: 'Indigo Modern', class: 'bg-indigo-600 border-indigo-400' },
    { id: 'amber', label: 'Amber Dinamis', class: 'bg-amber-600 border-amber-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="clay-card bg-white w-full max-w-xl p-5 sm:p-7 border border-purple-100 shadow-2xl relative rounded-3xl my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Copy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Multi-Ruangan
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Kloning Roster Terpadu
              </span>
            </div>
            <h3 className="font-display font-black text-xl text-slate-900 leading-tight mt-0.5">
              Duplikat Ruangan Baru
            </h3>
            <p className="text-xs text-slate-500">
              Buat salinan instan aplikasi untuk ruangan/bangsal lain dengan template perawat dan jam sift yang sama.
            </p>
          </div>
        </div>

        {/* Quick Suggestions */}
        <div className="mb-5 bg-purple-50/80 p-3 rounded-2xl border border-purple-100">
          <span className="text-[11px] font-extrabold text-purple-900 block mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Contoh Ruangan Rumah Sakit (Klik Cepat):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => handleApplySuggestion(s)}
                className="text-xs px-2.5 py-1 bg-white hover:bg-purple-100/80 text-purple-950 font-bold rounded-xl border border-purple-200 shadow-xs transition-all hover:scale-102"
              >
                + {s.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreateDuplicate} className="space-y-4">
          {/* Source Ward */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Sumber Data yang Diduplikasi:
            </label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
            >
              {availableWards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* New Ward Name */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Nama Ruangan / Bangsal Baru: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Ruang Rawat Inap Melati - Lantai 2"
              value={newWardName}
              onChange={(e) => setNewWardName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* Grid: Code & Floor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Kode Singkatan Ruangan:
              </label>
              <input
                type="text"
                placeholder="Contoh: MELATI"
                value={newWardCode}
                onChange={(e) => setNewWardCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Lantai / Lokasi:
              </label>
              <input
                type="text"
                placeholder="Contoh: Lantai 2"
                value={newWardFloor}
                onChange={(e) => setNewWardFloor(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Theme Color */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              Tema Warna Identitas Ruangan:
            </label>
            <div className="flex flex-wrap gap-2">
              {themeColors.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-all ${
                      isSelected
                        ? 'border-slate-800 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${theme.class}`} />
                    <span>{theme.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Copy Options */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-xs font-black text-slate-800 block mb-1">
              Data yang Disalin ke Ruangan Baru:
            </span>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={copyNurses}
                onChange={(e) => setCopyNurses(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <Users className="w-4 h-4 text-purple-600" />
              <span>Salin Struktur & Nama Perawat (dapat disesuaikan nanti)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={copySchedules}
                onChange={(e) => setCopySchedules(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <CalendarDays className="w-4 h-4 text-purple-600" />
              <span>Salin Roster Dinas Bulanan (Jadwal 3 Sif WITA)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={copySettings}
                onChange={(e) => setCopySettings(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <Settings className="w-4 h-4 text-purple-600" />
              <span>Salin Logo RS, Jam Kunjung & Pengaturan Kontak Darurat</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={copyPatients}
                onChange={(e) => setCopyPatients(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <HeartHandshake className="w-4 h-4 text-purple-600" />
              <span>Salin Contoh Daftar Pasien & Kamar Rawat Inap</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all hover:scale-102"
            >
              <Copy className="w-4 h-4" />
              <span>⚡ Duplikat & Buka Ruangan Sekarang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
