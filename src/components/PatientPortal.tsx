import React, { useState } from 'react';
import {
  Heart,
  Search,
  CheckCircle,
  Eye,
  EyeOff,
  User,
  Bed,
  Stethoscope,
  Calendar,
  AlertCircle,
  Lock,
  ArrowLeft,
  Video,
  ExternalLink,
  Phone,
  Sparkles,
  Check,
  Play,
  Link2,
  PenLine,
  BookOpen,
  MessageSquareHeart,
  Star,
} from 'lucide-react';
import { Patient, EducationArticle, AppSettings } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface PatientPortalProps {
  patients: Patient[];
  educationArticles: EducationArticle[];
  settings: AppSettings;
  initialSearchQuery?: string;
  onUpdatePatientChecklist: (patientId: string, checklistId: string, completed: boolean) => void;
  isAdmin?: boolean;
  onOpenEducationSettings?: () => void;
  onOpenEducationPortal?: () => void;
  onOpenSurveyPortal?: () => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  patients,
  educationArticles,
  settings,
  initialSearchQuery = '',
  onUpdatePatientChecklist,
  isAdmin = false,
  onOpenEducationSettings,
  onOpenEducationPortal,
  onOpenSurveyPortal,
}) => {
  const [searchInput, setSearchInput] = useState(initialSearchQuery);
  const [activePatient, setActivePatient] = useState<Patient | null>(() => {
    if (initialSearchQuery) {
      const q = initialSearchQuery.trim().toLowerCase();
      return (
        patients.find(
          (p) =>
            p.rmNumber.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q)
        ) || null
      );
    }
    return null;
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [isPrivacyCensored, setIsPrivacyCensored] = useState(false);
  const [activeEduTab, setActiveEduTab] = useState<string>('sebelum_operasi');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().toLowerCase();
    if (!query) {
      setErrorMessage('Silakan masukkan Nomor Rekam Medis (No. RM) atau Nama Lengkap.');
      return;
    }

    const found = patients.find(
      (p) =>
        p.rmNumber.toLowerCase() === query ||
        p.name.toLowerCase().includes(query) ||
        p.rmNumber.toLowerCase().includes(query)
    );

    if (found) {
      setActivePatient(found);
      setErrorMessage('');
    } else {
      setErrorMessage(
        'Data pasien tidak ditemukan. Pastikan Nomor Rekam Medis atau Nama sesuai kartu rawat inap Anda.'
      );
    }
  };

  const handleClearPatient = () => {
    setActivePatient(null);
    setSearchInput('');
    setErrorMessage('');
  };

  const censorText = (text: string) => {
    if (!text || text.length <= 4) return '****';
    return text.slice(0, 3) + '****' + text.slice(-2);
  };

  const filteredEduArticles = educationArticles.filter(
    (a) => a.category === activeEduTab
  );

  const getStageBadge = (stage: Patient['stage']) => {
    switch (stage) {
      case 'pra_operasi':
        return {
          label: 'Pra-Operasi (Persiapan Bedah)',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'sedang_operasi':
        return {
          label: 'Sedang Berada di Ruang Operasi',
          bg: 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse',
        };
      case 'post_operasi':
        return {
          label: 'Pasca-Operasi (Pemulihan Ruangan)',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
        };
      default:
        return {
          label: 'Pemulihan & Rencana Pulang',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="clay-card-flat bg-white p-5 border border-pink-100 flex flex-col md:flex-row items-center justify-between gap-4 rounded-3xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              Portal Pasien Rawat Inap & Bedah
            </span>
            <h2 className="font-display font-extrabold text-xl text-slate-800">
              Panduan Edukasi Operasi & Perawatan Pasien
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Akses rencana medis Anda, panduan puasa sebelum operasi, langkah pemulihan, dan kontak Home Care.
          </p>
        </div>

        {activePatient && (
          <button
            onClick={handleClearPatient}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ganti Akun Pasien</span>
          </button>
        )}
      </div>

      {activePatient ? (
        /* Patient Dashboard View */
        <div className="space-y-6">
          <div className="clay-card bg-gradient-to-br from-white via-purple-50/40 to-pink-50/30 p-6 border border-purple-100 rounded-3xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-purple-100">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-200 shrink-0">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-black text-xl text-slate-800">
                      {isPrivacyCensored ? censorText(activePatient.name) : activePatient.name}
                    </h3>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      {isPrivacyCensored ? censorText(activePatient.rmNumber) : activePatient.rmNumber}
                    </span>
                    <button
                      onClick={() => setIsPrivacyCensored(!isPrivacyCensored)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 transition-colors"
                      title={isPrivacyCensored ? 'Tampilkan Nama Lengkap' : 'Sensor / Samarkan Nama (Mode Privasi)'}
                    >
                      {isPrivacyCensored ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{isPrivacyCensored ? 'Buka Sensor' : 'Sensor Privasi'}</span>
                    </button>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStageBadge(activePatient.stage).bg}`}>
                      {getStageBadge(activePatient.stage).label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Bed className="w-3.5 h-3.5 text-purple-500" />
                      {activePatient.roomBed}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-medium">
                      <Stethoscope className="w-3.5 h-3.5 text-purple-500" />
                      DPJP: {activePatient.doctorName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Home Care Button */}
              <a
                href={`https://wa.me/${settings.homecareWhatsappNumber}?text=${encodeURIComponent(
                  `Halo Layanan Home Care RS Citra Sehat Care, saya ingin mendaftar layanan rawat luka pasca-operasi untuk pasien ${activePatient.name} (${activePatient.rmNumber}) yang dirawat di ${activePatient.roomBed}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-2 shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Pesan Jasa Home Care (WhatsApp)</span>
              </a>
            </div>

            {/* Quick Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
              <div className="p-3.5 bg-white/80 rounded-2xl border border-purple-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  Rencana Operasi / Prosedur:
                </span>
                <p className="text-xs font-extrabold text-slate-800">
                  {activePatient.procedureName}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{activePatient.procedureDate}</span>
                </div>
              </div>

              <div className="p-3.5 bg-white/80 rounded-2xl border border-purple-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  Diagnosa Klinis Medis:
                </span>
                <p className="text-xs font-extrabold text-slate-800">
                  {activePatient.diagnosis}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Riwayat Alergi: <strong className="text-rose-600">{activePatient.allergies || 'Tidak ada'}</strong>
                </p>
              </div>

              <div className="p-3.5 bg-white/80 rounded-2xl border border-purple-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  Instruksi Khusus Perawat:
                </span>
                <p className="text-xs text-slate-700 font-medium">
                  {activePatient.notes || 'Patuhi jadwal puasa dan instruksi perawat ruangan.'}
                </p>
              </div>
            </div>

            {/* Checklist */}
            {activePatient.checklist && activePatient.checklist.length > 0 && (
              <div className="mt-5 pt-4 border-t border-purple-100">
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Checklist Persiapan & Pemulihan Mandiri Pasien:
                  </span>
                  <span className="text-[11px] text-purple-700">
                    {activePatient.checklist.filter((c) => c.completed).length} dari{' '}
                    {activePatient.checklist.length} Selesai
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activePatient.checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        onUpdatePatientChecklist(
                          activePatient.id,
                          item.id,
                          !item.completed
                        )
                      }
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        item.completed
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                          item.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {item.completed && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold leading-tight ${item.completed ? 'line-through opacity-80' : ''}`}>
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Education Modules */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-extrabold text-xl text-slate-800 flex items-center gap-2">
                  <span>Modul Edukasi Pasien Terpadu</span>
                  <Sparkles className="w-4 h-4 text-purple-500" />
                </h3>
                <p className="text-xs text-slate-500">
                  Pelajari tahapan sebelum operasi, manajemen nyeri setelah tindakan, dan perawatan luka steril di rumah.
                </p>
              </div>

              {onOpenEducationPortal && (
                <button
                  onClick={onOpenEducationPortal}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Buka Sub-Halaman Khusus Edukasi</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'sebelum_operasi', label: '1. Sebelum Operasi (Pra-Bedah)' },
                { id: 'setelah_operasi', label: '2. Setelah Operasi (Pemulihan)' },
                { id: 'perawatan_luka', label: '3. Perawatan Luka di Rumah' },
                { id: 'umum', label: '4. Tata Tertib & Hak Pasien' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveEduTab(tab.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                    activeEduTab === tab.id
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5">
              {filteredEduArticles.map((article) => (
                <div
                  key={article.id}
                  className="clay-card bg-white p-5 md:p-6 border border-purple-100 space-y-4 rounded-3xl"
                >
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {article.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100"
                          >
                            #{tag}
                          </span>
                        ))}
                        {isAdmin && onOpenEducationSettings && (
                          <button
                            onClick={onOpenEducationSettings}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 flex items-center gap-1 transition-colors"
                            title="Buka panel admin untuk mengedit modul edukasi"
                          >
                            <PenLine className="w-3 h-3" />
                            <span>Edit Modul (Admin)</span>
                          </button>
                        )}
                      </div>
                      <h4 className="font-display font-black text-lg text-slate-800 leading-snug">
                        {article.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                        {article.summary}
                      </p>
                    </div>

                    {article.imageUrl && (
                      <div className="w-full md:w-44 h-32 rounded-2xl overflow-hidden shadow-md shrink-0 bg-purple-50 border border-white">
                        <ImageWithFallback
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-700 leading-relaxed">
                    {article.content.map((p, idx) => (
                      <p key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                        <span>{p}</span>
                      </p>
                    ))}
                  </div>

                  {article.videoUrl && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-purple-600" />
                        Video Tutorial Edukasi Medis:
                      </span>
                      <div className="relative aspect-video max-w-xl rounded-2xl overflow-hidden bg-slate-900 shadow-md">
                        {article.videoUrl.startsWith('data:video/') ||
                        article.videoUrl.startsWith('blob:') ||
                        /\.(mp4|webm|ogg|mov|m4v)($|\?)/i.test(article.videoUrl) ||
                        (!article.videoUrl.includes('youtube.com') && !article.videoUrl.includes('youtu.be')) ? (
                          <video
                            src={article.videoUrl}
                            controls
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <iframe
                            src={article.videoUrl}
                            title={article.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {article.externalLink && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <a
                        href={article.externalLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1.5 hover:underline"
                      >
                        <span>Pedoman Medis Resmi: {article.externalLink.title}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Patient Search Box */
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="clay-card bg-white p-6 md:p-8 border border-purple-100 text-center relative overflow-hidden rounded-3xl">
            <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden shadow-lg border-4 border-white bg-purple-100 clay-avatar mb-4">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80"
                alt="Doctor Guide"
                className="w-full h-full object-cover"
                fallbackIcon={<Sparkles className="w-8 h-8 text-purple-400" />}
              />
            </div>
            <h3 className="font-display font-extrabold text-2xl text-slate-800 mb-1">
              Selamat Datang di Portal Pasien
            </h3>
            <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto mb-6">
              Demi privasi dan kerahasiaan rekam medis Anda, masukkan <strong>Nomor Rekam Medis (No. RM)</strong> atau <strong>Nama Pasien</strong> yang terdaftar.
            </p>

            <form onSubmit={handleSearch} className="max-w-md mx-auto space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Ketik Nomor Rekam Medis (No. RM) atau Nama..."
                  className="w-full pl-10 pr-4 py-3 bg-purple-50/50 hover:bg-purple-50 border border-purple-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-inner font-medium"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-left flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#8D6DCF] hover:bg-[#7859BD] text-white rounded-2xl text-sm font-bold shadow-lg shadow-purple-300 transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Buka Rencana & Edukasi Pasien</span>
              </button>
            </form>

            <div className="mt-8 pt-5 border-t border-slate-100 text-center">
              {onOpenSurveyPortal && (
                <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Star className="w-5 h-5 fill-amber-300 text-amber-300" />
                    </div>
                    <div>
                      <p className="font-display font-black text-xs md:text-sm text-slate-900">
                        Survei Kepuasan & Kotak Suara Pasien
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Bagikan pengalaman, kritik, atau saran Anda selama dirawat di ruangan ini.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenSurveyPortal}
                    className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shrink-0 shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <MessageSquareHeart className="w-3.5 h-3.5" />
                    <span>Beri Penilaian & Saran</span>
                  </button>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5 text-left">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">
                    Privasi & Kerahasiaan Medis Terlindungi
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Sistem ini tidak menampilkan daftar nama maupun Nomor RM pasien lain di layar publik. Nomor Rekam Medis (No. RM) Anda dapat dilihat pada <strong>gelang identitas pasien</strong> atau berkas rawat inap Anda.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
