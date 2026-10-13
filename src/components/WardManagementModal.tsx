import React, { useState } from 'react';
import {
  Building2,
  Copy,
  Plus,
  Tv,
  ExternalLink,
  Download,
  Upload,
  Trash2,
  Check,
  CheckCircle2,
  X,
  Share2,
  ArrowRight,
  Sparkles,
  PenLine,
  Lock,
} from 'lucide-react';
import { WardInfo } from '../types';
import { StorageService } from '../services/storage';
import { EditWardModal } from './EditWardModal';

interface WardManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  wards: WardInfo[];
  activeWardId: string;
  onSelectWard: (wardId: string) => void;
  onOpenDuplicateModal: (sourceWard: WardInfo) => void;
  onDeleteWard: (wardId: string) => void;
  onImportWard: (ward: WardInfo) => void;
  onUpdateWard?: (wardId: string, updated: Partial<WardInfo>) => void;
  isAdmin?: boolean;
  onOpenLoginModal?: () => void;
}

export const WardManagementModal: React.FC<WardManagementModalProps> = ({
  isOpen,
  onClose,
  wards,
  activeWardId,
  onSelectWard,
  onOpenDuplicateModal,
  onDeleteWard,
  onImportWard,
  onUpdateWard,
  isAdmin = false,
  onOpenLoginModal,
}) => {
  const importFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [copiedWardId, setCopiedWardId] = useState<string | null>(null);
  const [copiedTvId, setCopiedTvId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingWard, setEditingWard] = useState<WardInfo | null>(null);

  if (!isOpen) return null;

  const handleCopyWardUrl = (wardId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?ward=${wardId}`;
    navigator.clipboard.writeText(url);
    setCopiedWardId(wardId);
    setTimeout(() => setCopiedWardId(null), 2500);
  };

  const handleCopyTvUrl = (wardId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?mode=tv&ward=${wardId}`;
    navigator.clipboard.writeText(url);
    setCopiedTvId(wardId);
    setTimeout(() => setCopiedTvId(null), 2500);
  };

  const handleExportWard = (wardId: string) => {
    try {
      const jsonStr = StorageService.exportWardJson(wardId);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `careshift-backup-${wardId}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const imported = StorageService.importWardJson(text);
        onImportWard(imported);
      } catch (err: any) {
        alert(err?.message || 'Gagal mengimpor file backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="clay-card bg-white w-full max-w-2xl p-5 sm:p-7 border border-purple-100 shadow-2xl relative rounded-3xl my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Pusat Manajemen Bangsal
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {wards.length} Ruangan Aktif
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Tersinkron ke Semua Perangkat
              </span>
            </div>
            <h3 className="font-display font-black text-xl text-slate-900 leading-tight mt-0.5">
              Daftar & Duplikasi Ruangan Rawat Inap
            </h3>
            <p className="text-xs text-slate-500">
              Kelola ruangan, duplikat roster untuk ruang berbeda, atau dapatkan tautan khusus display TV masing-masing bangsal.
            </p>
          </div>
        </div>

        {/* Admin Access Banner */}
        {!isAdmin ? (
          <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl mb-4 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Fitur Edit Nama, Duplikasi & Hapus Ruangan khusus Administrator.</span>
            </div>
            {onOpenLoginModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLoginModal();
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shrink-0 transition-colors shadow-xs cursor-pointer"
              >
                Masuk Admin
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4 text-xs text-emerald-900 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Akses Admin Aktif: Anda berwenang mengedit nama, menduplikat, dan menghapus ruangan.</span>
          </div>
        )}

        {/* Action Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-purple-50/70 border border-purple-100 rounded-2xl mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-purple-950">
              ⚡ Tindakan Cepat:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (!isAdmin) {
                  onOpenLoginModal?.();
                  alert('Akses Terbatas: Hanya Admin yang dapat menduplikat ruangan rawat inap. Silakan masuk terlebih dahulu.');
                  return;
                }
                const current = wards.find((w) => w.id === activeWardId) || wards[0];
                onOpenDuplicateModal(current);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-xs transition-all hover:scale-102"
              title={isAdmin ? 'Duplikat ruangan aktif' : 'Duplikat Ruangan (Khusus Admin)'}
            >
              {isAdmin ? <Copy className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>Duplikat Ruangan Aktif</span>
              {!isAdmin && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-white/20 text-white font-bold">
                  Admin
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isAdmin) {
                  onOpenLoginModal?.();
                  alert('Akses Terbatas: Hanya Admin yang dapat mengimpor file ruangan rawat inap. Silakan masuk terlebih dahulu.');
                  return;
                }
                importFileInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-purple-200 text-purple-900 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              title={isAdmin ? 'Impor backup ruangan' : 'Impor Ruangan (Khusus Admin)'}
            >
              {isAdmin ? (
                <Upload className="w-3.5 h-3.5 text-purple-600" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>Impor Backup Ruangan</span>
              {!isAdmin && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                  Admin
                </span>
              )}
            </button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </div>

        {/* Ward Cards List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {wards.map((ward) => {
            const isActive = ward.id === activeWardId;
            const nurses = StorageService.getNurses(ward.id);
            const patients = StorageService.getPatients(ward.id);

            let colorBadge = 'bg-purple-100 text-purple-800 border-purple-200';
            if (ward.colorTheme === 'teal') colorBadge = 'bg-teal-100 text-teal-800 border-teal-200';
            else if (ward.colorTheme === 'blue') colorBadge = 'bg-blue-100 text-blue-800 border-blue-200';
            else if (ward.colorTheme === 'emerald') colorBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            else if (ward.colorTheme === 'rose') colorBadge = 'bg-rose-100 text-rose-800 border-rose-200';
            else if (ward.colorTheme === 'indigo') colorBadge = 'bg-indigo-100 text-indigo-800 border-indigo-200';
            else if (ward.colorTheme === 'amber') colorBadge = 'bg-amber-100 text-amber-800 border-amber-200';

            return (
              <div
                key={ward.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-purple-50/50 border-purple-300 ring-2 ring-purple-500/20 shadow-md'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${colorBadge}`}>
                        {ward.code || ward.id.toUpperCase()}
                      </span>
                      {ward.floor && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {ward.floor}
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Sedang Dibuka
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-black text-base text-slate-900 leading-snug">
                      {ward.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {ward.building ? `${ward.building} · ` : ''}
                      {ward.description || 'Ruangan rawat inap terpadu'}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-600 mt-2">
                      <span>👥 {nurses.length} Perawat</span>
                      <span>🛏️ {patients.length} Pasien</span>
                    </div>
                  </div>

                  {/* Actions for this Ward */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {!isActive ? (
                      <button
                        onClick={() => {
                          onSelectWard(ward.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 transition-transform hover:scale-102"
                        title="Buka ruangan ini"
                      >
                        <span>Buka Ruang</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={onClose}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1"
                      >
                        <span>Aktif Sekarang</span>
                      </button>
                    )}

                    {/* Edit button (Khusus Admin) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAdmin) {
                          onOpenLoginModal?.();
                          alert('Akses Terbatas: Hanya Admin yang dapat mengedit nama dan informasi ruangan rawat inap.');
                          return;
                        }
                        setEditingWard(ward);
                      }}
                      className="p-2 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-purple-700 rounded-xl transition-colors shadow-xs"
                      title={isAdmin ? 'Edit nama dan detail ruangan ini' : 'Edit Ruangan (Khusus Admin)'}
                    >
                      {isAdmin ? <PenLine className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-600" />}
                    </button>

                    {/* Clone button (Khusus Admin) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAdmin) {
                          onOpenLoginModal?.();
                          alert('Akses Terbatas: Hanya Admin yang dapat menduplikat ruangan rawat inap.');
                          return;
                        }
                        onOpenDuplicateModal(ward);
                      }}
                      className="p-2 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-700 rounded-xl transition-colors shadow-xs"
                      title={isAdmin ? 'Duplikat dari ruangan ini' : 'Duplikat Ruangan (Khusus Admin)'}
                    >
                      {isAdmin ? <Copy className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-600" />}
                    </button>

                    {/* Copy Direct URL */}
                    <button
                      onClick={() => handleCopyWardUrl(ward.id)}
                      className={`p-2 border rounded-xl transition-all shadow-xs ${
                        copiedWardId === ward.id
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                      title="Salin Link Langsung Ruangan"
                    >
                      {copiedWardId === ward.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>

                    {/* Copy TV URL */}
                    <button
                      onClick={() => handleCopyTvUrl(ward.id)}
                      className={`p-2 border rounded-xl transition-all shadow-xs ${
                        copiedTvId === ward.id
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                      title="Salin Link Display TV Ruangan Ini (?mode=tv)"
                    >
                      {copiedTvId === ward.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Tv className="w-4 h-4" />
                      )}
                    </button>

                    {/* Export JSON */}
                    <button
                      onClick={() => handleExportWard(ward.id)}
                      className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-colors shadow-xs"
                      title="Download Backup Ruangan (JSON)"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Delete (Khusus Admin & jika bukan satu-satunya ruangan) */}
                    {isAdmin && wards.length > 1 && (
                      <>
                        {deleteConfirmId === ward.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onDeleteWard(ward.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-1 bg-rose-600 text-white text-[10px] font-black rounded-lg shadow-xs cursor-pointer"
                            >
                              Yakin Hapus?
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(ward.id)}
                            className="p-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-600 rounded-xl transition-colors shadow-xs cursor-pointer"
                            title="Hapus Ruangan (Khusus Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}

                    {!isAdmin && wards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenLoginModal?.();
                          alert('Akses Terbatas: Hanya Admin yang dapat menghapus ruangan rawat inap. Silakan masuk sebagai Admin terlebih dahulu.');
                        }}
                        className="p-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-400 hover:text-amber-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                        title="Hapus Ruangan (Khusus Admin)"
                      >
                        <Lock className="w-4 h-4 text-amber-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit Ward Modal inside Hub */}
        <EditWardModal
          isOpen={Boolean(editingWard)}
          onClose={() => setEditingWard(null)}
          ward={editingWard}
          isAdmin={isAdmin}
          onOpenLoginModal={onOpenLoginModal}
          onSaveWard={(wId, upd) => {
            if (onUpdateWard) {
              onUpdateWard(wId, upd);
            } else {
              StorageService.updateWard(wId, upd);
            }
            setEditingWard(null);
          }}
        />
      </div>
    </div>
  );
};
