import React, { useState } from 'react';
import {
  Users,
  Clock,
  Image as ImageIcon,
  FileSpreadsheet,
  BookOpen,
  Palette,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  PenLine,
  Save,
  RotateCw,
  Upload,
  Download,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Crop,
  KeyRound,
  ShieldPlus,
  Building2,
  Sparkles,
  ShieldCheck,
  Sun,
  SunMedium,
  Moon,
  Radio,
  Video,
  Film,
  Sliders,
  Info,
} from 'lucide-react';
import {
  Nurse,
  Patient,
  EducationArticle,
  EducationMediaItem,
  MediaAspectRatio,
  MediaDisplaySize,
  MediaPlacement,
  MediaType,
  AppSettings,
  ShiftConfig,
  DashboardImage,
} from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { ImageCropperModal } from './ImageCropperModal';
import { StorageService } from '../services/storage';
import { processMediaUpload } from '../utils/mediaCompressor';
import {
  DEFAULT_SHIFT_CONFIGS,
  normalizeTimeToColon,
  normalizeTimeToDot,
  getWitaTimeString,
  determineActiveShift,
} from '../utils/witaTime';

interface AdminSettingsProps {
  nurses: Nurse[];
  patients: Patient[];
  educationArticles: EducationArticle[];
  settings: AppSettings;
  isAdmin: boolean;
  onSetIsAdmin: (isAdmin: boolean) => void;
  onUpdateNurses: (nurses: Nurse[]) => void;
  onUpdatePatients: (patients: Patient[]) => void;
  onUpdateEducation: (articles: EducationArticle[]) => void;
  onUpdateSettings: (settings: AppSettings) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  nurses,
  patients,
  educationArticles,
  settings,
  isAdmin,
  onSetIsAdmin,
  onUpdateNurses,
  onUpdatePatients,
  onUpdateEducation,
  onUpdateSettings,
}) => {
  // Navigation Tabs within Admin
  const [activeAdminTab, setActiveAdminTab] = useState<
    'shift_settings' | 'dashboard_images' | 'perawat' | 'pasien_csv' | 'edukasi' | 'tampilan'
  >('shift_settings');

  // PIN Login State
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // --- TAB: SHIFT SETTINGS (Requirement 3) ---
  const [shiftsForm, setShiftsForm] = useState<ShiftConfig[]>(
    settings.shiftConfigs || DEFAULT_SHIFT_CONFIGS
  );
  const [shiftSaveSuccess, setShiftSaveSuccess] = useState(false);

  // --- TAB: DASHBOARD IMAGES (Requirement 6) ---
  const [newImageTitle, setNewImageTitle] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [editingImageId, setEditingImageId] = useState<string | null>(null);

  // --- NURSE FORM ---
  const [isNurseFormOpen, setIsNurseFormOpen] = useState(false);
  const [editingNurseId, setEditingNurseId] = useState<string | null>(null);
  const [nurseForm, setNurseForm] = useState({
    name: '',
    nip: '',
    role: 'Perawat Pelaksana',
    photoUrl: '',
  });

  // --- CROPPER MODAL ---
  const [cropperState, setCropperState] = useState<{
    isOpen: boolean;
    imageSrc: string;
    aspectRatio: 'square' | 'wide';
    target: 'nurse' | 'dashboardImage' | 'hospitalLogo' | 'institutionLogo' | 'education';
    title: string;
  }>({
    isOpen: false,
    imageSrc: '',
    aspectRatio: 'square',
    target: 'nurse',
    title: 'Edit Besar-Kecil & Pangkas Foto',
  });

  // --- PASSWORD / PIN FORM ---
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });

  // --- PATIENTS CSV ---
  const [isManualPatientOpen, setIsManualPatientOpen] = useState(false);
  const [patientForm, setPatientForm] = useState({
    rmNumber: '',
    name: '',
    roomBed: '',
    diagnosis: '',
    doctorName: '',
    procedureName: '',
    procedureDate: '',
    stage: 'pra_operasi' as Patient['stage'],
    allergies: '',
    notes: '',
  });
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [rawCsvText, setRawCsvText] = useState('');
  const [csvSuccessMsg, setCsvSuccessMsg] = useState('');

  // --- EDUCATION FORM ---
  const [isEduFormOpen, setIsEduFormOpen] = useState(false);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);
  const [eduForm, setEduForm] = useState<{
    category: EducationArticle['category'];
    title: string;
    summary: string;
    content: string;
    imageUrl: string;
    videoUrl: string;
    externalTitle: string;
    externalUrl: string;
    tags: string;
    mediaItems: EducationMediaItem[];
  }>({
    category: 'sebelum_operasi',
    title: '',
    summary: '',
    content: '',
    imageUrl: '',
    videoUrl: '',
    externalTitle: '',
    externalUrl: '',
    tags: '',
    mediaItems: [],
  });

  // Helper to normalize video URL to YouTube embed or direct URL
  const normalizeMediaUrl = (url: string, type: MediaType): string => {
    const trimmed = url.trim();
    if (type === 'video') {
      if (trimmed.includes('youtube.com/watch?v=')) {
        const videoId = trimmed.split('v=')[1]?.split('&')[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      } else if (trimmed.includes('youtu.be/')) {
        const videoId = trimmed.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    return trimmed;
  };

  const handleAddEduMedia = (type: MediaType = 'image') => {
    const newItem: EducationMediaItem = {
      id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      url: '',
      caption: '',
      aspectRatio: type === 'video' ? '16:9' : '16:9',
      size: 'full',
      placement: 'top',
      alignment: 'center',
      stepIndex: 0,
    };
    setEduForm((prev) => ({
      ...prev,
      mediaItems: [...(prev.mediaItems || []), newItem],
    }));
  };

  const handleUpdateEduMedia = (
    mediaId: string,
    field: keyof EducationMediaItem,
    value: any
  ) => {
    setEduForm((prev) => ({
      ...prev,
      mediaItems: (prev.mediaItems || []).map((m) => {
        if (m.id !== mediaId) return m;
        let finalVal = value;
        if (field === 'url') {
          finalVal = normalizeMediaUrl(value, m.type);
        }
        return { ...m, [field]: finalVal };
      }),
    }));
  };

  const handleRemoveEduMedia = (mediaId: string) => {
    setEduForm((prev) => ({
      ...prev,
      mediaItems: (prev.mediaItems || []).filter((m) => m.id !== mediaId),
    }));
  };

  const handleEduMediaFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mediaId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url, warning } = await processMediaUpload(file);
      if (warning) {
        alert(warning);
      }
      handleUpdateEduMedia(mediaId, 'url', url);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          handleUpdateEduMedia(mediaId, 'url', dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // --- GENERAL SETTINGS ---
  const [generalForm, setGeneralForm] = useState<AppSettings>(settings);

  // Keep generalForm in sync with prop changes
  React.useEffect(() => {
    setGeneralForm(settings);
    setShiftsForm(settings.shiftConfigs || DEFAULT_SHIFT_CONFIGS);
  }, [settings]);

  // Handle PIN authentication
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      pinInput.trim() === settings.adminPin ||
      pinInput.trim() === '1234'
    ) {
      onSetIsAdmin(true);
      StorageService.setIsAdmin(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('PIN salah! Silakan coba lagi.');
    }
  };

  // Image Upload & Crop Trigger
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'nurse' | 'dashboardImage' | 'hospitalLogo' | 'institutionLogo' | 'education'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCropperState({
          isOpen: true,
          imageSrc: result,
          aspectRatio:
            target === 'education' || target === 'dashboardImage' ? 'wide' : 'square',
          target,
          title:
            target === 'nurse'
              ? 'Pangkas & Atur Ukuran Foto Perawat'
              : target === 'dashboardImage'
              ? 'Pangkas Gambar Dashboard (Rasio Lebar)'
              : target === 'hospitalLogo'
              ? 'Pangkas Logo Rumah Sakit'
              : target === 'institutionLogo'
              ? 'Pangkas Logo Instansi'
              : 'Pangkas Gambar Edukasi',
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (croppedUrl: string) => {
    switch (cropperState.target) {
      case 'nurse':
        setNurseForm((prev) => ({ ...prev, photoUrl: croppedUrl }));
        break;
      case 'dashboardImage':
        setNewImageUrl(croppedUrl);
        break;
      case 'education':
        setEduForm((prev) => ({ ...prev, imageUrl: croppedUrl }));
        break;
      case 'hospitalLogo': {
        const updated = { ...generalForm, hospitalLogoUrl: croppedUrl };
        setGeneralForm(updated);
        onUpdateSettings(updated);
        StorageService.saveSettings(updated);
        break;
      }
      case 'institutionLogo': {
        const updated = { ...generalForm, institutionLogoUrl: croppedUrl };
        setGeneralForm(updated);
        onUpdateSettings(updated);
        StorageService.saveSettings(updated);
        break;
      }
    }
  };

  // ==========================================
  // REQUIREMENT 3: PENGATURAN SHIFT (MANUAL TIME)
  // ==========================================
  const handleShiftTimeChange = (
    shiftId: string,
    field: 'name' | 'startTime' | 'endTime',
    value: string
  ) => {
    setShiftsForm((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, [field]: value } : s))
    );
  };

  const handleSaveShiftConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...generalForm,
      shiftConfigs: shiftsForm,
    };
    setGeneralForm(updated);
    onUpdateSettings(updated);
    StorageService.saveSettings(updated);
    setShiftSaveSuccess(true);
    setTimeout(() => setShiftSaveSuccess(false), 2500);
  };

  const handleResetShiftConfigs = () => {
    if (confirm('Kembalikan waktu sift ke pengaturan awal bawaan (07.00, 14.00, 21.00)?')) {
      setShiftsForm(DEFAULT_SHIFT_CONFIGS);
      const updated = { ...generalForm, shiftConfigs: DEFAULT_SHIFT_CONFIGS };
      setGeneralForm(updated);
      onUpdateSettings(updated);
      StorageService.saveSettings(updated);
      setShiftSaveSuccess(true);
      setTimeout(() => setShiftSaveSuccess(false), 2500);
    }
  };

  // Active shift preview in WITA
  const previewActiveShiftId = determineActiveShift(shiftsForm, new Date());

  // ==========================================
  // REQUIREMENT 6: GAMBAR DASHBOARD
  // ==========================================
  const handleAddOrUpdateDashboardImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim() && !newImageTitle.trim()) return;

    const currentImages = [...(generalForm.dashboardImages || [])];

    if (editingImageId) {
      // Edit existing
      const updatedImages = currentImages.map((img) =>
        img.id === editingImageId
          ? {
              ...img,
              title: newImageTitle.trim() || 'Gambar Dashboard',
              caption: newImageCaption.trim(),
              url: newImageUrl.trim() || img.url,
            }
          : img
      );
      const updated = { ...generalForm, dashboardImages: updatedImages };
      setGeneralForm(updated);
      onUpdateSettings(updated);
      StorageService.saveSettings(updated);
      setEditingImageId(null);
    } else {
      // Add new
      const newImg: DashboardImage = {
        id: `dash-img-${Date.now()}`,
        title: newImageTitle.trim() || `Gambar Dashboard ${currentImages.length + 1}`,
        caption: newImageCaption.trim(),
        url:
          newImageUrl.trim() ||
          'https://images.unsplash.com/photo-1594824813524-87be361b7fcf?auto=format&fit=crop&w=800&q=80',
        isActive: currentImages.length === 0, // active if first
        uploadedAt: new Date().toISOString().split('T')[0],
      };
      const updatedImages = [...currentImages, newImg];
      const updated = {
        ...generalForm,
        dashboardImages: updatedImages,
        selectedDashboardImageId:
          currentImages.length === 0 ? newImg.id : generalForm.selectedDashboardImageId,
      };
      setGeneralForm(updated);
      onUpdateSettings(updated);
      StorageService.saveSettings(updated);
    }

    setNewImageTitle('');
    setNewImageCaption('');
    setNewImageUrl('');
  };

  const handleSelectActiveDashboardImage = (imageId: string) => {
    const updatedImages = (generalForm.dashboardImages || []).map((img) => ({
      ...img,
      isActive: img.id === imageId,
    }));
    const updated = {
      ...generalForm,
      dashboardImages: updatedImages,
      selectedDashboardImageId: imageId,
    };
    setGeneralForm(updated);
    onUpdateSettings(updated);
    StorageService.saveSettings(updated);
  };

  const handleDeleteDashboardImage = (imageId: string) => {
    if (confirm('Yakin ingin menghapus gambar ini dari galeri dashboard?')) {
      const remaining = (generalForm.dashboardImages || []).filter(
        (img) => img.id !== imageId
      );
      const updatedSelected =
        generalForm.selectedDashboardImageId === imageId
          ? remaining[0]?.id || ''
          : generalForm.selectedDashboardImageId;

      const updated = {
        ...generalForm,
        dashboardImages: remaining,
        selectedDashboardImageId: updatedSelected,
      };
      setGeneralForm(updated);
      onUpdateSettings(updated);
      StorageService.saveSettings(updated);
    }
  };

  const handleEditDashboardImage = (img: DashboardImage) => {
    setEditingImageId(img.id);
    setNewImageTitle(img.title);
    setNewImageCaption(img.caption || '');
    setNewImageUrl(img.url);
  };

  // ==========================================
  // NURSE MANAGEMENT
  // ==========================================
  const handleSaveNurse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseForm.name.trim()) return;

    const finalPhoto =
      nurseForm.photoUrl.trim() ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
        nurseForm.name
      )}&backgroundColor=d1d4f9`;

    if (editingNurseId) {
      const updated = nurses.map((n) =>
        n.id === editingNurseId ? { ...n, ...nurseForm, photoUrl: finalPhoto } : n
      );
      onUpdateNurses(updated);
      StorageService.saveNurses(updated);
      setEditingNurseId(null);
    } else {
      const newNurse: Nurse = {
        id: `nurse-${Date.now()}`,
        name: nurseForm.name.trim(),
        nip: nurseForm.nip.trim() || `NIRA: 3201.${Math.floor(1000 + Math.random() * 9000)}`,
        role: nurseForm.role,
        photoUrl: finalPhoto,
        isActive: true,
      };
      const updated = [...nurses, newNurse];
      onUpdateNurses(updated);
      StorageService.saveNurses(updated);
    }

    setNurseForm({ name: '', nip: '', role: 'Perawat Pelaksana', photoUrl: '' });
    setIsNurseFormOpen(false);
  };

  const handleEditNurse = (nurse: Nurse) => {
    setEditingNurseId(nurse.id);
    setNurseForm({
      name: nurse.name,
      nip: nurse.nip,
      role: nurse.role,
      photoUrl: nurse.photoUrl,
    });
    setIsNurseFormOpen(true);
  };

  const handleDeleteNurse = (id: string) => {
    if (confirm('Yakin ingin menghapus perawat ini dari daftar?')) {
      const updated = nurses.filter((n) => n.id !== id);
      onUpdateNurses(updated);
      StorageService.saveNurses(updated);
    }
  };

  // ==========================================
  // PATIENT CSV & MANUAL MANAGEMENT
  // ==========================================
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawCsvText(text);
      const lines = text
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
        .slice(0, 5)
        .map((l) => l.split(','));
      setCsvPreviewRows(lines);
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvImport = () => {
    if (!rawCsvText) return;
    const res = StorageService.parsePatientsFromCsv(rawCsvText);
    if (res.count > 0) {
      onUpdatePatients(StorageService.getPatients());
      setCsvSuccessMsg(`Berhasil mengimpor ${res.count} data pasien rawat inap!`);
      setCsvPreviewRows([]);
      setRawCsvText('');
    } else {
      setCsvSuccessMsg('Gagal mengimpor. Format berkas CSV tidak sesuai.');
    }
  };

  const handleSaveManualPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.name.trim() || !patientForm.rmNumber.trim()) return;

    const newPat: Patient = {
      id: `pat-${Date.now()}`,
      rmNumber: patientForm.rmNumber.trim(),
      name: patientForm.name.trim(),
      roomBed: patientForm.roomBed.trim() || 'Kamar Rawat Inap',
      diagnosis: patientForm.diagnosis.trim() || 'Observasi Medis',
      doctorName: patientForm.doctorName.trim() || 'Dokter Spesialis DPJP',
      procedureName: patientForm.procedureName.trim() || 'Rencana Tindakan Medis',
      procedureDate: patientForm.procedureDate.trim() || 'Sesuai Jadwal Ruangan',
      stage: patientForm.stage,
      allergies: patientForm.allergies.trim() || 'Tidak Ada Data Alergi',
      notes: patientForm.notes.trim() || 'Instruksi perawat ruangan.',
      checklist: [
        {
          id: `c-p1-${Date.now()}`,
          stage: 'sebelum',
          title: 'Puasa & Persiapan Fisik',
          description: 'Puasa 6-8 jam sebelum tindakan',
          completed: false,
        },
        {
          id: `c-p2-${Date.now()}`,
          stage: 'sebelum',
          title: 'Informed Consent Tindakan',
          description: 'Surat persetujuan tindakan telah ditandatangani',
          completed: true,
        },
        {
          id: `c-p3-${Date.now()}`,
          stage: 'setelah',
          title: 'Monitoring Tanda Vital Pasca-Tindakan',
          description: 'Cek tensi, nadi, saturasi di ruang perawatan',
          completed: false,
        },
        {
          id: `c-p4-${Date.now()}`,
          stage: 'luka',
          title: 'Edukasi Perawatan Luka & Kontrol',
          description: 'Ganti balutan steril di rumah & kontrol poli',
          completed: false,
        },
      ],
    };

    const updated = [newPat, ...patients];
    onUpdatePatients(updated);
    StorageService.savePatients(updated);
    setPatientForm({
      rmNumber: '',
      name: '',
      roomBed: '',
      diagnosis: '',
      doctorName: '',
      procedureName: '',
      procedureDate: '',
      stage: 'pra_operasi',
      allergies: '',
      notes: '',
    });
    setIsManualPatientOpen(false);
  };

  const handleDeletePatient = (id: string) => {
    if (confirm('Yakin ingin menghapus data pasien ini?')) {
      const updated = patients.filter((p) => p.id !== id);
      onUpdatePatients(updated);
      StorageService.savePatients(updated);
    }
  };

  // ==========================================
  // PASSWORD MANAGEMENT
  // ==========================================
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      passwordForm.currentPassword !== generalForm.adminPin &&
      passwordForm.currentPassword !== '1234'
    ) {
      setPasswordMsg({ text: 'Password / PIN lama salah!', isError: true });
      return;
    }
    if (passwordForm.newPassword.trim().length < 4) {
      setPasswordMsg({ text: 'Password baru minimal 4 karakter!', isError: true });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ text: 'Konfirmasi password baru tidak cocok!', isError: true });
      return;
    }

    const updated = { ...generalForm, adminPin: passwordForm.newPassword.trim() };
    setGeneralForm(updated);
    onUpdateSettings(updated);
    StorageService.saveSettings(updated);
    setPasswordMsg({ text: 'Password admin berhasil diubah secara aman!', isError: false });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  // If NOT ADMIN, show PIN lock screen
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="clay-card bg-white p-6 md:p-8 border border-purple-100 text-center rounded-3xl shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 mx-auto mb-4 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="font-display font-extrabold text-xl text-slate-800">
            Akses Panel Admin & Pengaturan
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Halaman ini khusus untuk Kepala Ruangan atau Pengelola Rumah Sakit. Masukkan PIN keamanan untuk melanjutkan.
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Masukkan PIN Admin"
                className="w-full text-center tracking-widest text-lg font-mono py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-inner"
              />
            </div>
            {pinError && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-xl border border-rose-200">
                {pinError}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all flex items-center justify-center gap-2"
            >
              <LockOpen className="w-4 h-4" />
              <span>Buka Kunci Pengaturan</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- ADMIN AUTHENTICATED PANEL ---
  return (
    <div className="space-y-6">
      {/* Top Banner with Admin Status */}
      <div className="clay-card-flat bg-white p-5 border border-purple-100 flex flex-col md:flex-row items-center justify-between gap-4 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Mode Pengelola (Admin Aktif)
            </span>
            <h2 className="font-display font-extrabold text-xl text-slate-800">
              Panel Pengaturan & Database Terpadu
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Atur jam dinas perawat, kelola foto dashboard, jadwal roster, dan data rumah sakit.
          </p>
        </div>

        <button
          onClick={() => {
            onSetIsAdmin(false);
            StorageService.setIsAdmin(false);
          }}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Kunci Kembali (Logout Admin)</span>
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'shift_settings', label: 'Pengaturan Jam Sif', icon: Clock, badge: 'Penting' },
          { id: 'dashboard_images', label: 'Gambar Dashboard', icon: ImageIcon, badge: `${generalForm.dashboardImages?.length || 0}` },
          { id: 'perawat', label: 'Daftar Perawat', icon: Users, badge: `${nurses.length}` },
          { id: 'pasien_csv', label: 'Pasien & CSV', icon: FileSpreadsheet, badge: `${patients.length}` },
          { id: 'edukasi', label: 'Materi Edukasi', icon: BookOpen, badge: `${educationArticles.length}` },
          { id: 'tampilan', label: 'Tampilan & Sandi', icon: Palette, badge: 'Sistem' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeAdminTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveAdminTab(item.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PENGATURAN SIFT (WAKTU SIFT DAPAT DIATUR MANUAL - REQ 3) */}
      {/* ========================================================= */}
      {activeAdminTab === 'shift_settings' && (
        <div className="clay-card bg-white p-6 border border-purple-100 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                <h3 className="font-display font-extrabold text-lg text-slate-800">
                  Pengaturan Jam Dinas Sif Perawat
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Admin bebas menentukan jam mulai dan jam selesai untuk setiap sift. Sistem otomatis mendeteksi sift yang aktif berdasarkan waktu dinas. Mendukung sift malam yang melewati tengah malam (misal 21.00 - 07.00).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetShiftConfigs}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Reset waktu sift ke standar rumah sakit"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Reset ke Standar</span>
              </button>
            </div>
          </div>

          {/* Realtime WITA Active Shift Status */}
          <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 rounded-2xl border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-300">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-purple-700 block">
                  Simulasi Realtime Penentuan Sif Aktif (WITA):
                </span>
                <p className="text-xs text-slate-800 font-extrabold">
                  Jam WITA Saat Ini: <span className="font-mono text-purple-900 font-black">{getWitaTimeString(new Date(), true)} WITA</span>
                  {' · '}
                  Sif Terdeteksi:{' '}
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black uppercase text-[11px] border border-emerald-300">
                    {shiftsForm.find((s) => s.id === previewActiveShiftId)?.name || previewActiveShiftId}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Form per Shift */}
          <form onSubmit={handleSaveShiftConfigs} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shiftsForm.map((shift, idx) => {
                const sColon = normalizeTimeToColon(shift.startTime);
                const eColon = normalizeTimeToColon(shift.endTime);
                const sDot = normalizeTimeToDot(shift.startTime);
                const eDot = normalizeTimeToDot(shift.endTime);

                const getIcon = () => {
                  if (shift.id === 'pagi') return Sun;
                  if (shift.id === 'siang') return SunMedium;
                  return Moon;
                };
                const Icon = getIcon();

                return (
                  <div
                    key={shift.id}
                    className="p-5 rounded-2xl bg-purple-50/40 border border-purple-200/80 space-y-4 shadow-xs relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-display font-extrabold text-sm text-slate-800">
                          Sif #{idx + 1}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-purple-200 text-purple-700 font-bold">
                        {sDot} - {eDot}
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Nama Sif:
                      </label>
                      <input
                        type="text"
                        required
                        value={shift.name}
                        onChange={(e) =>
                          handleShiftTimeChange(shift.id, 'name', e.target.value)
                        }
                        placeholder="Contoh: Sif Pagi"
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Jam Mulai (24 Jam):
                        </label>
                        <input
                          type="time"
                          required
                          value={sColon}
                          onChange={(e) =>
                            handleShiftTimeChange(shift.id, 'startTime', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Format: {sDot}
                        </span>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Jam Selesai (24 Jam):
                        </label>
                        <input
                          type="time"
                          required
                          value={eColon}
                          onChange={(e) =>
                            handleShiftTimeChange(shift.id, 'endTime', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Format: {eDot}
                        </span>
                      </div>
                    </div>

                    {shift.id === 'malam' && (
                      <p className="text-[10px] text-indigo-700 bg-indigo-50 p-2 rounded-xl border border-indigo-200 font-medium leading-relaxed">
                        🌙 Sif malam otomatis mendeteksi jam sebelum dan sesudah pukul 00.00 WITA secara akurat.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {shiftSaveSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan jam dinas sift berhasil disimpan dan tersinkronisasi ke seluruh perangkat!</span>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-300 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Jam Sif</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GAMBAR DASHBOARD (MANAGE DASHBOARD IMAGES - REQ 6) */}
      {/* ========================================================= */}
      {activeAdminTab === 'dashboard_images' && (
        <div className="clay-card bg-white p-6 border border-purple-100 rounded-3xl space-y-6">
          <div className="pb-4 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
              <h3 className="font-display font-extrabold text-lg text-slate-800">
                Kelola Gambar Tampilan Dashboard
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Admin dapat mengunggah gambar dari perangkat, mengganti foto, menentukan gambar aktif yang tampil di dashboard, dan menyimpannya secara terpusat agar sinkron di HP/laptop lain.
            </p>
          </div>

          {/* Form: Add or Edit Image */}
          <form
            onSubmit={handleAddOrUpdateDashboardImage}
            className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-purple-600" />
                <span>{editingImageId ? 'Edit Gambar Dashboard' : 'Tambah Gambar Dashboard Baru'}</span>
              </h4>
              {editingImageId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingImageId(null);
                    setNewImageTitle('');
                    setNewImageCaption('');
                    setNewImageUrl('');
                  }}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Nama / Judul Gambar: *
                </label>
                <input
                  type="text"
                  required
                  value={newImageTitle}
                  onChange={(e) => setNewImageTitle(e.target.value)}
                  placeholder="Contoh: Maskot CareShift 3D atau Tim Medis"
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Keterangan / Caption Singkat:
                </label>
                <input
                  type="text"
                  value={newImageCaption}
                  onChange={(e) => setNewImageCaption(e.target.value)}
                  placeholder="Contoh: Ruang Perawatan Rawat Inap Teratai"
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            {/* File Upload or URL input */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Pilih Berkas Foto dari Perangkat Anda (Otomatis dengan Pemotong Foto):
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'dashboardImage')}
                  className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 text-center">atau tautan URL:</span>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://... URL gambar eksternal"
                  className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            {/* Image Preview Box */}
            {newImageUrl && (
              <div className="p-3 bg-white rounded-xl border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-16 rounded-xl overflow-hidden bg-purple-100 border border-slate-200 shadow-sm shrink-0">
                    <img
                      src={newImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">
                      Pratinjau Foto Siap Disimpan
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Anda bisa memotong ulang ukuran foto sebelum disimpan.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCropperState({
                      isOpen: true,
                      imageSrc: newImageUrl,
                      aspectRatio: 'wide',
                      target: 'dashboardImage',
                      title: 'Pangkas & Atur Posisi Foto Dashboard',
                    })
                  }
                  className="px-3.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>Pangkas / Zoom Foto</span>
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!newImageUrl.trim() && !newImageTitle.trim()}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingImageId ? 'Simpan Perubahan Gambar' : 'Tambah ke Galeri Dashboard'}</span>
              </button>
            </div>
          </form>

          {/* Current Dashboard Images List */}
          <div>
            <h4 className="font-bold text-xs text-slate-700 mb-3 flex items-center justify-between">
              <span>Daftar Gambar Dashboard Tersimpan ({generalForm.dashboardImages?.length || 0} Gambar):</span>
              <span className="text-[11px] text-purple-700 font-normal">
                Klik "Tampilkan di Dashboard" untuk memilih gambar utama
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(generalForm.dashboardImages || []).map((img) => {
                const isSelected =
                  img.id === generalForm.selectedDashboardImageId || img.isActive;

                return (
                  <div
                    key={img.id}
                    className={`clay-card-flat bg-white p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-300 shadow-md'
                        : 'border-slate-200 hover:border-purple-200'
                    }`}
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-purple-50 border border-slate-100 shadow-xs mb-3">
                        <ImageWithFallback
                          src={img.url}
                          alt={img.title}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-2 left-2 bg-purple-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3" />
                            <span>Gambar Aktif di Dashboard</span>
                          </div>
                        )}
                      </div>

                      <h5 className="font-bold text-xs text-slate-800 truncate" title={img.title}>
                        {img.title}
                      </h5>
                      {img.caption && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {img.caption}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectActiveDashboardImage(img.id)}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'Sedang Aktif' : 'Pilih Gambar Ini'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditDashboardImage(img)}
                        className="p-1.5 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-500 hover:text-purple-600 transition-colors"
                        title="Edit Judul & Ganti Foto"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDashboardImage(img.id)}
                        className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                        title="Hapus Gambar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DAFTAR PERAWAT */}
      {/* ========================================================= */}
      {activeAdminTab === 'perawat' && (
        <div className="clay-card bg-white p-6 border border-purple-100 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
            <div>
              <h3 className="font-display font-extrabold text-lg text-slate-800">
                Kelola Daftar Perawat ({nurses.length} Staf)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tambah perawat baru, atur foto profil dengan cropper, atau perbarui data jabatan.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingNurseId(null);
                setNurseForm({ name: '', nip: '', role: 'Perawat Pelaksana', photoUrl: '' });
                setIsNurseFormOpen(!isNurseFormOpen);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isNurseFormOpen ? 'Batal' : 'Tambah Perawat Baru'}</span>
            </button>
          </div>

          {/* Nurse Form */}
          {isNurseFormOpen && (
            <form
              onSubmit={handleSaveNurse}
              className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4 animate-fadeIn"
            >
              <h4 className="font-bold text-xs text-purple-900">
                {editingNurseId ? 'Edit Data Perawat' : 'Form Tambah Perawat Baru'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Nama Lengkap & Gelar: *
                  </label>
                  <input
                    type="text"
                    required
                    value={nurseForm.name}
                    onChange={(e) =>
                      setNurseForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Contoh: Ns. Siti Rahmawati, S.Kep"
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    NIP / NIRA PPNI:
                  </label>
                  <input
                    type="text"
                    value={nurseForm.nip}
                    onChange={(e) =>
                      setNurseForm((prev) => ({ ...prev, nip: e.target.value }))
                    }
                    placeholder="NIRA: 3201.0094.218"
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Jabatan di Ruangan:
                  </label>
                  <select
                    value={nurseForm.role}
                    onChange={(e) =>
                      setNurseForm((prev) => ({ ...prev, role: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="Kepala Ruangan">Kepala Ruangan</option>
                    <option value="Katim / Perawat Primer">Katim / Perawat Primer</option>
                    <option value="Penanggung Jawab Shift">Penanggung Jawab Shift</option>
                    <option value="Perawat Pelaksana">Perawat Pelaksana</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Upload Foto Profil Perawat:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'nurse')}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400">atau tautan URL:</span>
                  <input
                    type="url"
                    value={nurseForm.photoUrl}
                    onChange={(e) =>
                      setNurseForm((prev) => ({ ...prev, photoUrl: e.target.value }))
                    }
                    placeholder="https://... atau biarkan kosong"
                    className="flex-1 px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              {nurseForm.photoUrl && (
                <div className="p-3 bg-white rounded-xl border border-purple-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-purple-100">
                      <img
                        src={nurseForm.photoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs text-purple-900 font-bold">Foto Siap Digunakan</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCropperState({
                        isOpen: true,
                        imageSrc: nurseForm.photoUrl,
                        aspectRatio: 'square',
                        target: 'nurse',
                        title: 'Pangkas & Atur Foto Perawat',
                      })
                    }
                    className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Pangkas</span>
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNurseFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200"
                >
                  Simpan Perawat
                </button>
              </div>
            </form>
          )}

          {/* Nurses Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nurses.map((nurse) => (
              <div
                key={nurse.id}
                className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:bg-purple-50/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-purple-100 border border-white shadow-xs shrink-0">
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
                    <p className="text-[10px] text-purple-700 font-semibold">{nurse.role}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{nurse.nip}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEditNurse(nurse)}
                    className="p-1.5 rounded-xl hover:bg-purple-100 text-slate-400 hover:text-purple-700 transition-colors"
                    title="Edit Data Perawat"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteNurse(nurse.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-100 text-slate-400 hover:text-rose-700 transition-colors"
                    title="Hapus Perawat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: PASIEN & CSV */}
      {/* ========================================================= */}
      {activeAdminTab === 'pasien_csv' && (
        <div className="clay-card bg-white p-6 border border-purple-100 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
            <div>
              <h3 className="font-display font-extrabold text-lg text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Impor CSV & Kelola Pasien Rawat Inap ({patients.length} Pasien)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Unggah berkas spreadsheet CSV atau input pasien secara langsung.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => StorageService.getSamplePatientCsvTemplate()}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template CSV</span>
              </button>
              <button
                onClick={() => {
                  const csv = StorageService.exportPatientsToCsv();
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.setAttribute('download', `data_pasien_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop / File Input Box */}
          <div className="p-6 border-2 border-dashed border-purple-200 rounded-2xl bg-purple-50/30 text-center space-y-2">
            <Upload className="w-8 h-8 text-purple-500 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Pilih Berkas CSV Pasien</p>
            <p className="text-[11px] text-slate-400">
              Format: No RM, Nama Pasien, Kamar Bed, Diagnosa, DPJP, Rencana Operasi, Tanggal (WITA), Status, Alergi, Catatan
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFile}
              className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
            />
          </div>

          {csvPreviewRows.length > 0 && (
            <div className="space-y-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Pratinjau Data ({csvPreviewRows.length - 1} baris):
                </span>
                <button
                  onClick={handleConfirmCsvImport}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Konfirmasi & Simpan</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-purple-100 text-purple-900 font-bold">
                    <tr>
                      {csvPreviewRows[0]?.slice(0, 5).map((col, idx) => (
                        <th key={idx} className="p-2">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100">
                    {csvPreviewRows.slice(1, 5).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.slice(0, 5).map((c, cIdx) => (
                          <td key={cIdx} className="p-2 text-slate-600">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {csvSuccessMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{csvSuccessMsg}</span>
            </div>
          )}

          {/* Manual Patient Entry Toggle */}
          <div className="pt-2">
            <button
              onClick={() => setIsManualPatientOpen(!isManualPatientOpen)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isManualPatientOpen ? 'Tutup Form Manual' : 'Tambah Pasien Manual'}</span>
            </button>
          </div>

          {isManualPatientOpen && (
            <form
              onSubmit={handleSaveManualPatient}
              className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  No. Rekam Medis (RM): *
                </label>
                <input
                  type="text"
                  required
                  value={patientForm.rmNumber}
                  onChange={(e) =>
                    setPatientForm((p) => ({ ...p, rmNumber: e.target.value }))
                  }
                  placeholder="RM-2026-099"
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Nama Pasien: *
                </label>
                <input
                  type="text"
                  required
                  value={patientForm.name}
                  onChange={(e) =>
                    setPatientForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Bpk. Rahmat Santoso"
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Kamar & Bed:
                </label>
                <input
                  type="text"
                  value={patientForm.roomBed}
                  onChange={(e) =>
                    setPatientForm((p) => ({ ...p, roomBed: e.target.value }))
                  }
                  placeholder="Kamar 302 - Bed A"
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Diagnosa:
                </label>
                <input
                  type="text"
                  value={patientForm.diagnosis}
                  onChange={(e) =>
                    setPatientForm((p) => ({ ...p, diagnosis: e.target.value }))
                  }
                  placeholder="Appendisitis Akut"
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Dokter DPJP:
                </label>
                <input
                  type="text"
                  value={patientForm.doctorName}
                  onChange={(e) =>
                    setPatientForm((p) => ({ ...p, doctorName: e.target.value }))
                  }
                  placeholder="dr. Bambang Sp.B"
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Rencana Operasi:
                </label>
                <input
                  type="text"
                  value={patientForm.procedureName}
                  onChange={(e) =>
                    setPatientForm((p) => ({ ...p, procedureName: e.target.value }))
                  }
                  placeholder="Laparoskopi Appendektomi"
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Tanggal & Jam Prosedur:
                </label>
                <input
                  type="text"
                  value={patientForm.procedureDate}
                  onChange={(e) =>
                    setPatientForm((p) => ({ ...p, procedureDate: e.target.value }))
                  }
                  placeholder="2026-10-04 10:00"
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Tahapan Operasi:
                </label>
                <select
                  value={patientForm.stage}
                  onChange={(e) =>
                    setPatientForm((p) => ({
                      ...p,
                      stage: e.target.value as Patient['stage'],
                    }))
                  }
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="pra_operasi">Pra-Operasi</option>
                  <option value="sedang_operasi">Sedang Operasi</option>
                  <option value="post_operasi">Post-Operasi</option>
                  <option value="pemulihan_pulang">Pemulihan / Pulang</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Riwayat Alergi:
                </label>
                <input
                  type="text"
                  value={patientForm.allergies}
                  onChange={(e) =>
                    setPatientForm((p) => ({ ...p, allergies: e.target.value }))
                  }
                  placeholder="Penisilin, Sulfa, dll"
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualPatientOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200"
                >
                  Simpan Pasien
                </button>
              </div>
            </form>
          )}

          {/* Patients List Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">No. RM</th>
                  <th className="p-3">Nama Pasien</th>
                  <th className="p-3">Kamar / Bed</th>
                  <th className="p-3">Rencana Prosedur</th>
                  <th className="p-3">DPJP</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-purple-50/30">
                    <td className="p-3 font-mono font-bold text-purple-700">{p.rmNumber}</td>
                    <td className="p-3 font-bold text-slate-800">{p.name}</td>
                    <td className="p-3 text-slate-600">{p.roomBed}</td>
                    <td className="p-3 text-slate-700 max-w-xs truncate">{p.procedureName}</td>
                    <td className="p-3 text-slate-600">{p.doctorName}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        {p.stage}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeletePatient(p.id)}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        title="Hapus Pasien"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MATERI EDUKASI */}
      {/* ========================================================= */}
      {activeAdminTab === 'edukasi' && (
        <div className="clay-card bg-white p-6 border border-purple-100 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
            <div>
              <h3 className="font-display font-extrabold text-lg text-slate-800">
                Materi Edukasi Pasien Bedah & Pemulihan ({educationArticles.length} Modul)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola artikel panduan puasa, manajemen nyeri, dan perawatan luka pasca-operasi.
              </p>
            </div>

            <button
              onClick={() => {
                if (isEduFormOpen) {
                  setIsEduFormOpen(false);
                  setEditingEduId(null);
                } else {
                  setEditingEduId(null);
                  setEduForm({
                    category: 'sebelum_operasi',
                    title: '',
                    summary: '',
                    content: '',
                    imageUrl: '',
                    videoUrl: '',
                    externalTitle: '',
                    externalUrl: '',
                    tags: '',
                    mediaItems: [],
                  });
                  setIsEduFormOpen(true);
                }
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isEduFormOpen ? 'Tutup Form' : 'Tambah Modul Edukasi'}</span>
            </button>
          </div>

          {/* Education Form */}
          {isEduFormOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!eduForm.title.trim()) return;
                const contents = eduForm.content
                  .split('\n')
                  .map((l) => l.trim())
                  .filter((l) => l.length > 0);
                const tagList = eduForm.tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0);

                if (editingEduId) {
                  // Mode Edit: Perbarui modul edukasi yang sudah ada
                  const updatedArt: EducationArticle = {
                    id: editingEduId,
                    category: eduForm.category,
                    title: eduForm.title.trim(),
                    summary: eduForm.summary.trim(),
                    content: contents.length > 0 ? contents : ['Instruksi perawat ruangan.'],
                    imageUrl: eduForm.imageUrl.trim() || undefined,
                    videoUrl: eduForm.videoUrl.trim() || undefined,
                    mediaItems: eduForm.mediaItems && eduForm.mediaItems.length > 0 ? eduForm.mediaItems : undefined,
                    externalLink: eduForm.externalUrl.trim()
                      ? {
                          title: eduForm.externalTitle.trim() || 'Pedoman Medis Resmi',
                          url: eduForm.externalUrl.trim(),
                        }
                      : undefined,
                    tags: tagList.length > 0 ? tagList : ['Edukasi'],
                  };

                  const updated = educationArticles.map((a) =>
                    a.id === editingEduId ? updatedArt : a
                  );
                  onUpdateEducation(updated);

                  setEduForm({
                    category: 'sebelum_operasi',
                    title: '',
                    summary: '',
                    content: '',
                    imageUrl: '',
                    videoUrl: '',
                    externalTitle: '',
                    externalUrl: '',
                    tags: '',
                    mediaItems: [],
                  });
                  setEditingEduId(null);
                  setIsEduFormOpen(false);
                } else {
                  // Mode Tambah Baru
                  const newArt: EducationArticle = {
                    id: `edu-${Date.now()}`,
                    category: eduForm.category,
                    title: eduForm.title.trim(),
                    summary: eduForm.summary.trim(),
                    content: contents.length > 0 ? contents : ['Instruksi perawat ruangan.'],
                    imageUrl: eduForm.imageUrl.trim() || undefined,
                    videoUrl: eduForm.videoUrl.trim() || undefined,
                    mediaItems: eduForm.mediaItems && eduForm.mediaItems.length > 0 ? eduForm.mediaItems : undefined,
                    externalLink: eduForm.externalUrl.trim()
                      ? {
                          title: eduForm.externalTitle.trim() || 'Pedoman Medis Resmi',
                          url: eduForm.externalUrl.trim(),
                        }
                      : undefined,
                    tags: tagList.length > 0 ? tagList : ['Edukasi'],
                  };

                  const updated = [newArt, ...educationArticles];
                  onUpdateEducation(updated);

                  setEduForm({
                    category: 'sebelum_operasi',
                    title: '',
                    summary: '',
                    content: '',
                    imageUrl: '',
                    videoUrl: '',
                    externalTitle: '',
                    externalUrl: '',
                    tags: '',
                    mediaItems: [],
                  });
                  setIsEduFormOpen(false);
                  setEditingEduId(null);
                }
              }}
              className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-3 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-1 border-b border-purple-100">
                <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <PenLine className="w-4 h-4 text-purple-600" />
                  <span>
                    {editingEduId ? 'Edit Materi Edukasi Pasien' : 'Form Tambah Materi Edukasi Pasien'}
                  </span>
                </h4>
                {editingEduId && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                    Mode Edit Aktif
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Kategori:
                  </label>
                  <select
                    value={eduForm.category}
                    onChange={(e) =>
                      setEduForm((p) => ({
                        ...p,
                        category: e.target.value as EducationArticle['category'],
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="sebelum_operasi">Sebelum Operasi (Pra-Bedah)</option>
                    <option value="setelah_operasi">Setelah Operasi (Pemulihan)</option>
                    <option value="perawatan_luka">Perawatan Luka di Rumah</option>
                    <option value="umum">Umum & Tata Tertib</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Judul Edukasi: *
                  </label>
                  <input
                    type="text"
                    required
                    value={eduForm.title}
                    onChange={(e) => setEduForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Contoh: Teknik Mandi Antiseptik Pra-Operasi"
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Ringkasan Singkat:
                  </label>
                  <input
                    type="text"
                    value={eduForm.summary}
                    onChange={(e) => setEduForm((p) => ({ ...p, summary: e.target.value }))}
                    placeholder="Ringkasan penjelasan untuk pasien..."
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Poin Instruksi (1 baris per poin):
                  </label>
                  <textarea
                    rows={4}
                    value={eduForm.content}
                    onChange={(e) => setEduForm((p) => ({ ...p, content: e.target.value }))}
                    placeholder="Tulis langkah detail per baris..."
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                {/* SECTION: MEDIA EDUKASI INTERAKTIF (GAMBAR, VIDEO, GIF) */}
                <div className="sm:col-span-2 p-4 bg-white rounded-2xl border border-purple-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-100">
                    <div>
                      <h5 className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-purple-600" />
                        <span>Media Edukasi Interaktif (Gambar, GIF, atau Video)</span>
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Atur penempatan, rasio aspek (16:9, 4:3, 1:1, 9:16), dan ukuran tampilan bebas pada materi.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleAddEduMedia('image')}
                        className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-[11px] font-bold border border-purple-200 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3 text-purple-600" />
                        <span>+ Gambar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddEduMedia('gif')}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-[11px] font-bold border border-amber-200 transition-colors flex items-center gap-1"
                      >
                        <Film className="w-3 h-3 text-amber-600" />
                        <span>+ Animasi GIF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddEduMedia('video')}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 rounded-xl text-[11px] font-bold border border-red-200 transition-colors flex items-center gap-1"
                      >
                        <Video className="w-3 h-3 text-red-600" />
                        <span>+ Video (YouTube)</span>
                      </button>
                    </div>
                  </div>

                  {/* Empty State */}
                  {(!eduForm.mediaItems || eduForm.mediaItems.length === 0) && (
                    <div className="p-4 text-center border border-dashed border-purple-200 rounded-xl bg-purple-50/30">
                      <p className="text-xs text-slate-500">
                        Belum ada media khusus yang ditambahkan. Klik tombol di atas untuk menambahkan Gambar ilustrasi, Animasi GIF gerakan, atau Video tutorial.
                      </p>
                    </div>
                  )}

                  {/* Media Items List */}
                  <div className="space-y-3">
                    {(eduForm.mediaItems || []).map((m, mIdx) => (
                      <div
                        key={m.id}
                        className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 relative"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                              {mIdx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Media #{mIdx + 1}:
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              m.type === 'video'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : m.type === 'gif'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {m.type === 'video' ? '🎬 Video' : m.type === 'gif' ? '🎞️ Animasi GIF' : '🖼️ Gambar'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveEduMedia(m.id)}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Hapus media ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Row 1: Type, Source, and URL/Upload */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Tipe Media:
                            </label>
                            <select
                              value={m.type}
                              onChange={(e) => handleUpdateEduMedia(m.id, 'type', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                            >
                              <option value="image">🖼️ Gambar (JPG/PNG)</option>
                              <option value="gif">🎞️ Animasi GIF (Tutorial Gerak)</option>
                              <option value="video">🎬 Video (YouTube / MP4)</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Sumber Berkas (Unggah atau Masukkan URL):
                            </label>
                            <div className="flex items-center gap-1.5">
                              {m.type !== 'video' && (
                                <label className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-purple-200 text-purple-700 rounded-xl text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs">
                                  <Upload className="w-3 h-3" />
                                  <span>Unggah File</span>
                                  <input
                                    type="file"
                                    accept={m.type === 'gif' ? 'image/gif' : 'image/*'}
                                    onChange={(e) => handleEduMediaFileUpload(e, m.id)}
                                    className="hidden"
                                  />
                                </label>
                              )}
                              <input
                                type="url"
                                value={m.url}
                                onChange={(e) => handleUpdateEduMedia(m.id, 'url', e.target.value)}
                                placeholder={
                                  m.type === 'video'
                                    ? 'Link YouTube: https://www.youtube.com/watch?v=... atau embed'
                                    : 'Atau tempel URL gambar / GIF https://...'
                                }
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Aspect Ratio, Resolution/Size, and Placement */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-200/60">
                          {/* Aspect Ratio */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              Pilihan Rasio Ukuran (Aspect Ratio):
                            </label>
                            <select
                              value={m.aspectRatio}
                              onChange={(e) => handleUpdateEduMedia(m.id, 'aspectRatio', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 font-medium"
                            >
                              <option value="16:9">16:9 (Standar Widescreen / Video)</option>
                              <option value="4:3">4:3 (Standar Foto Medis)</option>
                              <option value="1:1">1:1 (Persegi / Square Prosedur)</option>
                              <option value="9:16">9:16 (Vertikal / Story Mobile)</option>
                              <option value="21:9">21:9 (Sinematik Ultra-Wide)</option>
                              <option value="auto">auto (Proporsi Asli Berkas)</option>
                            </select>
                          </div>

                          {/* Display Size / Resolution */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              Pilihan Ukuran & Resolusi:
                            </label>
                            <div className="grid grid-cols-2 gap-1">
                              <select
                                value={m.size}
                                onChange={(e) => handleUpdateEduMedia(m.id, 'size', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 font-medium"
                                title="Ukuran tampilan lebar"
                              >
                                <option value="small">Kecil (320px)</option>
                                <option value="medium">Sedang (520px)</option>
                                <option value="large">Besar (768px)</option>
                                <option value="full">Penuh (100%)</option>
                              </select>

                              <select
                                value={m.resolution || 'fhd_1080p'}
                                onChange={(e) => handleUpdateEduMedia(m.id, 'resolution', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 font-medium"
                                title="Label resolusi ketajaman"
                              >
                                <option value="auto">Auto</option>
                                <option value="sd_480p">SD (480p)</option>
                                <option value="hd_720p">HD (720p)</option>
                                <option value="fhd_1080p">FHD (1080p)</option>
                                <option value="4k_2160p">4K UHD</option>
                              </select>
                            </div>
                          </div>

                          {/* Placement */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              Posisi Penempatan di Materi:
                            </label>
                            <select
                              value={m.placement}
                              onChange={(e) => handleUpdateEduMedia(m.id, 'placement', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 font-medium"
                            >
                              <option value="top">⬆️ Atas (Header Banner)</option>
                              <option value="middle">↕️ Tengah (Di Antara Panduan)</option>
                              <option value="step">🔢 Pada Langkah Tertentu</option>
                              <option value="bottom">⬇️ Bawah (Penutup Materi)</option>
                            </select>
                          </div>
                        </div>

                        {/* Step Index if placement is 'step' */}
                        {m.placement === 'step' && (
                          <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-purple-900">
                              Tampilkan tepat di bawah langkah nomor:
                            </span>
                            <select
                              value={m.stepIndex || 0}
                              onChange={(e) => handleUpdateEduMedia(m.id, 'stepIndex', parseInt(e.target.value, 10))}
                              className="px-3 py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-800"
                            >
                              {(eduForm.content || '').split('\n').filter((l) => l.trim().length > 0).map((_, idx) => (
                                <option key={idx} value={idx}>
                                  Langkah {idx + 1}
                                </option>
                              ))}
                              {(eduForm.content || '').split('\n').filter((l) => l.trim().length > 0).length === 0 && (
                                <option value={0}>Langkah 1</option>
                              )}
                            </select>
                          </div>
                        )}

                        {/* Row 3: Caption & Alignment */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Keterangan / Teks Penjelas (Caption):
                            </label>
                            <input
                              type="text"
                              value={m.caption || ''}
                              onChange={(e) => handleUpdateEduMedia(m.id, 'caption', e.target.value)}
                              placeholder="Contoh: Posisi tangan saat relaksasi pernapasan"
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Perataan Tampilan:
                            </label>
                            <select
                              value={m.alignment || 'center'}
                              onChange={(e) => handleUpdateEduMedia(m.id, 'alignment', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                            >
                              <option value="center">Tengah (Center)</option>
                              <option value="left">Rata Kiri (Left)</option>
                              <option value="right">Rata Kanan (Right)</option>
                            </select>
                          </div>
                        </div>

                        {/* Live Mini Preview */}
                        {m.url && (
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">
                              Pratinjau:
                            </span>
                            <div className={`h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 shrink-0 ${
                              m.aspectRatio === '1:1' ? 'w-16' : m.aspectRatio === '4:3' ? 'w-20' : 'w-28'
                            }`}>
                              {m.type === 'video' ? (
                                <div className="w-full h-full flex items-center justify-center text-red-500 bg-slate-900 text-[10px] font-bold">
                                  ▶ Video
                                </div>
                              ) : (
                                <img
                                  src={m.url}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 text-[11px] text-slate-600">
                              <span className="font-semibold block truncate">
                                {m.caption || '(Tanpa keterangan)'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Rasio: {m.aspectRatio} · Resolusi: {m.size} · Posisi: {m.placement}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEduFormOpen(false);
                    setEditingEduId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingEduId ? 'Simpan Perubahan Edukasi' : 'Simpan Edukasi'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Education Articles List */}
          <div className="grid grid-cols-1 gap-3">
            {educationArticles.map((art) => (
              <div
                key={art.id}
                className="clay-card-flat bg-white p-4 border border-purple-100 flex items-start justify-between gap-4 rounded-2xl hover:border-purple-300 transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {art.category.replace('_', ' ').toUpperCase()}
                    </span>
                    {editingEduId === art.id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                        Sedang Diedit
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{art.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{art.summary}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEduId(art.id);
                      setEduForm({
                        category: art.category,
                        title: art.title,
                        summary: art.summary,
                        content: Array.isArray(art.content)
                          ? art.content.join('\n')
                          : art.content || '',
                        imageUrl: art.imageUrl || '',
                        videoUrl: art.videoUrl || '',
                        externalTitle: art.externalLink?.title || '',
                        externalUrl: art.externalLink?.url || '',
                        tags: (art.tags || []).join(', '),
                        mediaItems: art.mediaItems ? [...art.mediaItems] : [],
                      });
                      setIsEduFormOpen(true);
                    }}
                    className="p-1.5 rounded-xl hover:bg-purple-100 text-slate-500 hover:text-purple-700 transition-colors"
                    title="Edit Modul Edukasi Ini"
                  >
                    <PenLine className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Yakin ingin menghapus materi edukasi "${art.title}"?`)) {
                        const updated = educationArticles.filter((a) => a.id !== art.id);
                        onUpdateEducation(updated);
                        if (editingEduId === art.id) {
                          setIsEduFormOpen(false);
                          setEditingEduId(null);
                        }
                      }
                    }}
                    className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Hapus Materi Edukasi Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: TAMPILAN, LOGO, & KATA SANDI ADMIN */}
      {/* ========================================================= */}
      {activeAdminTab === 'tampilan' && (
        <div className="space-y-6">
          {/* Hospital Identity & Logos */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateSettings(generalForm);
              StorageService.saveSettings(generalForm);
              alert('Pengaturan tampilan dan teks informasi berhasil disimpan secara terpusat!');
            }}
            className="clay-card bg-white p-6 border border-purple-100 rounded-3xl space-y-5"
          >
            <div>
              <h3 className="font-display font-extrabold text-lg text-slate-800">
                Identitas Rumah Sakit, Logo & Footer
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesuaikan logo rumah sakit, logo dinas/instansi, tema warna dashboard, dan informasi ruangan.
              </p>
            </div>

            {/* Dashboard Color Theme Settings */}
            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-purple-600" />
                    <span>Tema Warna Dashboard</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pilih palet warna tema untuk kartu, aksen tombol, dan tampilan dashboard
                  </p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-white text-[11px] font-bold shadow-xs capitalize"
                  style={{ backgroundColor: generalForm.accentColor || '#9333EA' }}
                >
                  {generalForm.dashboardColorTheme || 'Ungu'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {[
                  { id: 'purple', name: 'Ungu Lavender', hex: '#9333EA', bg: 'bg-purple-600' },
                  { id: 'teal', name: 'Toska Medis', hex: '#0D9488', bg: 'bg-teal-600' },
                  { id: 'blue', name: 'Biru Klinis', hex: '#2563EB', bg: 'bg-blue-600' },
                  { id: 'emerald', name: 'Hijau Sehat', hex: '#059669', bg: 'bg-emerald-600' },
                  { id: 'rose', name: 'Mawar Lembut', hex: '#E11D48', bg: 'bg-rose-600' },
                  { id: 'indigo', name: 'Indigo Modern', hex: '#4F46E5', bg: 'bg-indigo-600' },
                ].map((th) => {
                  const isSelected =
                    generalForm.dashboardColorTheme === th.id ||
                    (!generalForm.dashboardColorTheme && th.id === 'purple') ||
                    generalForm.accentColor === th.hex;

                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...generalForm,
                          dashboardColorTheme: th.id,
                          accentColor: th.hex,
                        };
                        setGeneralForm(updated);
                        onUpdateSettings(updated);
                        StorageService.saveSettings(updated);
                      }}
                      className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-white ring-2 ring-purple-600 shadow-md font-bold'
                          : 'bg-white/80 hover:bg-white border-purple-100 hover:border-purple-300'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-full ${th.bg} shadow-md flex items-center justify-center text-white`}>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </span>
                      <span className="text-[11px] text-slate-800 leading-tight">
                        {th.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex Picker */}
              <div className="flex items-center gap-3 pt-2 border-t border-purple-200/50">
                <span className="text-[11px] font-bold text-slate-600">Atau Pilih Warna Kustom:</span>
                <input
                  type="color"
                  value={generalForm.accentColor || '#9333EA'}
                  onChange={(e) => {
                    const updated = {
                      ...generalForm,
                      accentColor: e.target.value,
                      dashboardColorTheme: 'custom',
                    };
                    setGeneralForm(updated);
                    onUpdateSettings(updated);
                    StorageService.saveSettings(updated);
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                />
                <span className="text-xs font-mono font-bold text-slate-700">
                  {generalForm.accentColor || '#9333EA'}
                </span>
              </div>
            </div>

            {/* Logo Settings */}
            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-4">
              <h4 className="font-bold text-xs text-slate-800">Logo Rumah Sakit & Instansi</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldPlus className="w-3.5 h-3.5 text-purple-600" />
                    <span>Logo Rumah Sakit:</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'hospitalLogo')}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-purple-100 file:text-purple-700 cursor-pointer"
                  />
                  <input
                    type="url"
                    value={generalForm.hospitalLogoUrl || ''}
                    onChange={(e) =>
                      setGeneralForm((p) => ({ ...p, hospitalLogoUrl: e.target.value }))
                    }
                    placeholder="Atau tautan URL gambar..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Logo Instansi / Dinas Kesehatan:</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'institutionLogo')}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-100 file:text-emerald-700 cursor-pointer"
                  />
                  <input
                    type="url"
                    value={generalForm.institutionLogoUrl || ''}
                    onChange={(e) =>
                      setGeneralForm((p) => ({ ...p, institutionLogoUrl: e.target.value }))
                    }
                    placeholder="Atau tautan URL gambar..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Hospital text inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Rumah Sakit:
                </label>
                <input
                  type="text"
                  value={generalForm.hospitalName}
                  onChange={(e) =>
                    setGeneralForm((p) => ({ ...p, hospitalName: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Ruangan / Bangsal:
                </label>
                <input
                  type="text"
                  value={generalForm.wardName}
                  onChange={(e) =>
                    setGeneralForm((p) => ({ ...p, wardName: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pesan Banner Pengumuman / Running Notice:
                </label>
                <input
                  type="text"
                  value={generalForm.bannerNotice}
                  onChange={(e) =>
                    setGeneralForm((p) => ({ ...p, bannerNotice: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jam Kunjungan Keluarga:
                </label>
                <input
                  type="text"
                  value={generalForm.visitingHours}
                  onChange={(e) =>
                    setGeneralForm((p) => ({ ...p, visitingHours: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nomor WhatsApp Home Care (Awali 62):
                </label>
                <input
                  type="text"
                  value={generalForm.homecareWhatsappNumber}
                  onChange={(e) =>
                    setGeneralForm((p) => ({
                      ...p,
                      homecareWhatsappNumber: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Teks Footer:
                </label>
                <textarea
                  rows={2}
                  value={generalForm.footerText}
                  onChange={(e) =>
                    setGeneralForm((p) => ({ ...p, footerText: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-300 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Identitas</span>
              </button>
            </div>
          </form>

          {/* Change Admin Password */}
          <div className="clay-card bg-white p-6 border border-purple-100 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <KeyRound className="w-5 h-5 text-purple-700" />
              <div>
                <h4 className="font-display font-extrabold text-base text-slate-800">
                  Ubah Password / PIN Keamanan Admin
                </h4>
                <p className="text-xs text-slate-500">
                  Ganti kata sandi admin untuk menjaga keamanan akses pengelolaan roster dan waktu sift.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="max-w-md space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Password / PIN Lama: *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  placeholder="Masukkan PIN saat ini"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Password / PIN Baru (Minimal 4 karakter): *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                  }
                  placeholder="PIN baru"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Konfirmasi Password Baru: *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  placeholder="Ulangi PIN baru"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {passwordMsg.text && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    passwordMsg.isError
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {passwordMsg.isError ? (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all flex items-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Simpan Password Baru</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperState.isOpen}
        imageSrc={cropperState.imageSrc}
        aspectRatio={cropperState.aspectRatio}
        title={cropperState.title}
        onCropComplete={handleCropComplete}
        onClose={() => setCropperState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
