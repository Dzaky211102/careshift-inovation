import React, { useState, useEffect } from 'react';
import {
  PenLine,
  Building2,
  X,
  Save,
  Palette,
  Lock,
} from 'lucide-react';
import { WardInfo } from '../types';

interface EditWardModalProps {
  isOpen: boolean;
  onClose: () => void;
  ward: WardInfo | null;
  onSaveWard: (wardId: string, updated: Partial<WardInfo>) => void;
  isAdmin?: boolean;
  onOpenLoginModal?: () => void;
}

export const EditWardModal: React.FC<EditWardModalProps> = ({
  isOpen,
  onClose,
  ward,
  onSaveWard,
  isAdmin = false,
  onOpenLoginModal,
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
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Admin yang berhak mengedit informasi ruangan rawat inap. Silakan masuk terlebih dahulu.');
      onOpenLoginModal?.();
      return;
    }
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
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Pengaturan Identitas
              </span>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                Khusus Admin
              </span>
            </div>
            <h3 className="font-display font-black text-xl text-slate-900 leading-tight mt-0.5">
              Edit Nama & Informasi Ruangan
            </h3>
            <p className="text-xs text-slate-500">
              Perubahan nama akan otomatis sinkron ke header, jadwal, dan tampilan TV ruangan ini.
            </p>
          </div>
        </div>

        {/* Admin Access Notice if not Admin */}
        {!isAdmin && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Akses Terbatas: Hanya Admin yang dapat mengedit nama & informasi ruangan rawat inap.</span>
            </div>
            {onOpenLoginModal && (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shrink-0 transition-colors shadow-xs"
              >
                Login Admin
              </button>
            )}
          </div>
        )}

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
              className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center gap-2 transition-all ${
                isAdmin
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/30 hover:scale-102 cursor-pointer'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer'
              }`}
              title={isAdmin ? 'Simpan Perubahan Ruangan' : 'Khusus Admin - Klik untuk login'}
            >
              {isAdmin ? <Save className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-700" />}
              <span>{isAdmin ? 'Simpan Perubahan Ruangan' : 'Simpan (Khusus Admin)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
