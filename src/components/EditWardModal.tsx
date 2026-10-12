import React, { useState, useEffect } from 'react';
import {
  PenLine,
  Building2,
  X,
  Save,
  Palette,
} from 'lucide-react';
import { WardInfo } from '../types';

interface EditWardModalProps {
  isOpen: boolean;
  onClose: () => void;
  ward: WardInfo | null;
  onSaveWard: (wardId: string, updated: Partial<WardInfo>) => void;
}

export const EditWardModal: React.FC<EditWardModalProps> = ({
  isOpen,
  onClose,
  ward,
  onSaveWard,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [floor, setFloor] = useState('');
  const [building, setBuilding] = useState('');
  const [description, setDescription] = useState('');
  const [colorTheme, setColorTheme] = useState('purple');

  useEffect(() => {
    if (ward) {
      setName(ward.name || '');
      setCode(ward.code || '');
      setFloor(ward.floor || '');
      setBuilding(ward.building || '');
      setDescription(ward.description || '');
      setColorTheme(ward.colorTheme || 'purple');
    }
  }, [ward]);

  if (!isOpen || !ward) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveWard(ward.id, {
      name: name.trim(),
      code: (code.trim() || ward.id.toUpperCase()).toUpperCase(),
      floor: floor.trim(),
      building: building.trim(),
      description: description.trim(),
      colorTheme,
    });
    onClose();
  };

  const themeColors = [
    { id: 'purple', label: 'Ungu CareShift', class: 'bg-purple-600' },
    { id: 'teal', label: 'Teal Hospital', class: 'bg-teal-600' },
    { id: 'blue', label: 'Biru Samudra', class: 'bg-blue-600' },
    { id: 'emerald', label: 'Hijau Sehat', class: 'bg-emerald-600' },
    { id: 'rose', label: 'Rose Harmoni', class: 'bg-rose-600' },
    { id: 'indigo', label: 'Indigo Modern', class: 'bg-indigo-600' },
    { id: 'amber', label: 'Amber Dinamis', class: 'bg-amber-600' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="clay-card bg-white w-full max-w-lg p-5 sm:p-7 border border-purple-100 shadow-2xl relative rounded-3xl my-6">
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
            <PenLine className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
              Pengaturan Identitas
            </span>
            <h3 className="font-display font-black text-xl text-slate-900 leading-tight mt-0.5">
              Edit Nama & Informasi Ruangan
            </h3>
            <p className="text-xs text-slate-500">
              Perubahan nama akan otomatis sinkron ke header, jadwal, dan tampilan TV ruangan ini.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ward Name */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Nama Ruangan / Bangsal: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Ruang Rawat Inap Teratai - Lantai 3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* Code & Floor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Kode Singkatan Ruangan:
              </label>
              <input
                type="text"
                placeholder="Contoh: TERATAI"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Lantai:
              </label>
              <input
                type="text"
                placeholder="Contoh: Lantai 3"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Building */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Gedung / Paviliun:
            </label>
            <input
              type="text"
              placeholder="Contoh: Gedung Teratai (Bedah & Rawat Inap)"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* Color Theme */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-600" />
              Warna Tema Ruangan:
            </label>
            <div className="flex flex-wrap gap-2">
              {themeColors.map((theme) => {
                const isSelected = colorTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setColorTheme(theme.id)}
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

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Keterangan Singkat / Layanan Ruangan:
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Perawatan bedah pasca operasi dan rawat inap umum..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 resize-none"
            />
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
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Ruangan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
