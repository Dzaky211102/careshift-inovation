import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Play,
  ExternalLink,
  CheckCircle,
  Clock,
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  Printer,
  X,
  ChevronRight,
  Phone,
  AlertTriangle,
  Apple,
  PenLine,
  Info,
  Check,
  Video,
  FileText,
  MessageCircle,
  Calculator,
  Smile,
  Meh,
  Frown,
  Activity,
  ArrowUpRight,
  Share2,
} from 'lucide-react';
import { EducationArticle, AppSettings } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface EducationPortalProps {
  educationArticles: EducationArticle[];
  settings: AppSettings;
  isAdmin: boolean;
  onOpenAdminSettings?: () => void;
  onOpenPatientPortal?: () => void;
}

export const EducationPortal: React.FC<EducationPortalProps> = ({
  educationArticles,
  settings,
  isAdmin,
  onOpenAdminSettings,
  onOpenPatientPortal,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mediaFilter, setMediaFilter] = useState<'semua' | 'video' | 'gambar' | 'pedoman'>('semua');
  const [selectedArticle, setSelectedArticle] = useState<EducationArticle | null>(null);
  const [understoodSteps, setUnderstoodSteps] = useState<Record<string, boolean>>({});

  // Fasting Calculator State
  const [fastingSurgeryHour, setFastingSurgeryHour] = useState<string>('08:00');

  // Pain Scale Interactive State
  const [selectedPainScore, setSelectedPainScore] = useState<number>(2);

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return educationArticles.filter((article) => {
      // Category filter
      if (activeCategory !== 'semua' && article.category !== activeCategory) {
        return false;
      }

      // Media filter
      if (mediaFilter === 'video' && !article.videoUrl) return false;
      if (mediaFilter === 'gambar' && !article.imageUrl) return false;
      if (mediaFilter === 'pedoman' && !article.externalLink) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = article.title.toLowerCase().includes(q);
        const inSummary = article.summary.toLowerCase().includes(q);
        const inTags = article.tags.some((t) => t.toLowerCase().includes(q));
        const inContent = Array.isArray(article.content)
          ? article.content.some((c) => c.toLowerCase().includes(q))
          : false;
        return inTitle || inSummary || inTags || inContent;
      }

      return true;
    });
  }, [educationArticles, activeCategory, mediaFilter, searchQuery]);

  // Fasting schedule calculation helper
  const fastingSchedule = useMemo(() => {
    const [hoursStr, minsStr] = fastingSurgeryHour.split(':');
    const h = parseInt(hoursStr || '8', 10);
    const m = parseInt(minsStr || '0', 10);

    const formatHour = (offsetH: number) => {
      let targetH = (h - offsetH + 24) % 24;
      const targetHStr = targetH.toString().padStart(2, '0');
      const targetMStr = m.toString().padStart(2, '0');
      return `${targetHStr}.${targetMStr} WITA`;
    };

    return {
      solidFoodStop: formatHour(8),
      lightMealStop: formatHour(6),
      clearLiquidStop: formatHour(2),
      surgeryTime: `${h.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')} WITA`,
    };
  }, [fastingSurgeryHour]);

  // Category labels and stats
  const categoryStats = useMemo(() => {
    return {
      semua: educationArticles.length,
      sebelum_operasi: educationArticles.filter((a) => a.category === 'sebelum_operasi').length,
      setelah_operasi: educationArticles.filter((a) => a.category === 'setelah_operasi').length,
      perawatan_luka: educationArticles.filter((a) => a.category === 'perawatan_luka').length,
    };
  }, [educationArticles]);

  const handleToggleStepUnderstood = (stepKey: string) => {
    setUnderstoodSteps((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'sebelum_operasi':
        return {
          label: 'Pra-Bedah (Sebelum Operasi)',
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
          dotColor: 'bg-amber-500',
        };
      case 'setelah_operasi':
        return {
          label: 'Pasca-Bedah (Pemulihan RS)',
          badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
          dotColor: 'bg-blue-500',
        };
      case 'perawatan_luka':
        return {
          label: 'Perawatan Luka di Rumah',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dotColor: 'bg-emerald-500',
        };
      default:
        return {
          label: 'Panduan Kesehatan Umum',
          badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
          dotColor: 'bg-purple-500',
        };
    }
  };

  // WhatsApp Homecare Link
  const buildHomecareUrl = (articleTitle?: string) => {
    const rawNumber = (settings.homecareWhatsappNumber || '6281234567890').replace(/[^0-9]/g, '');
    const msg = articleTitle
      ? `Halo Tim Perawat Ruangan ${settings.wardName || 'Rawat Inap'}, saya pasien/keluarga ingin berkonsultasi mengenai materi edukasi: *${articleTitle}*.`
      : settings.homecareWhatsappMessage || 'Halo Tim Perawat Home Care, saya ingin bertanya tentang layanan perawatan luka pasca-operasi.';
    return `https://wa.me/${rawNumber}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. HERO HEADER - Clean High-Contrast Light Banner with Dark Crisp Text */}
      <div className="clay-card bg-white p-5 md:p-8 rounded-3xl relative overflow-hidden shadow-xl border-2 border-purple-200">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-purple-100/50 blur-3xl pointer-events-none" />
        <div className="absolute right-20 top-0 w-48 h-48 rounded-full bg-indigo-50/70 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 md:gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-950 text-xs font-black border border-purple-300 flex items-center gap-1.5 shadow-2xs">
                <BookOpen className="w-4 h-4 text-purple-700" />
                <span>Pusat Edukasi Pasien Bedah & Pemulihan</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-950 text-xs font-black shadow-2xs border border-amber-300">
                {educationArticles.length} Modul Terverifikasi
              </span>
              {isAdmin && onOpenAdminSettings && (
                <button
                  onClick={onOpenAdminSettings}
                  className="px-3 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold border border-purple-300 flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <PenLine className="w-3.5 h-3.5 text-purple-600" />
                  <span>Kelola Materi (Admin)</span>
                </button>
              )}
            </div>

            <h1 className="font-display font-black text-2xl md:text-3xl lg:text-4xl text-slate-900 tracking-tight leading-snug">
              Panduan Perawatan & Pemulihan Pasien Rawat Inap
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl font-medium">
              Informasi lengkap persiapan puasa pra-bedah, manajemen nyeri pasca-operasi, langkah mobilisasi bertahap, dan cara merawat luka steril saat kembali ke rumah.
            </p>
          </div>

          {/* Quick Access Action Badges */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
            <a
              href={buildHomecareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs md:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>Tanya Perawat Ruangan (WhatsApp)</span>
            </a>

            {onOpenPatientPortal && (
              <button
                onClick={onOpenPatientPortal}
                className="px-5 py-3 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white rounded-2xl text-xs md:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-purple-200" />
                <span>Cek Checklist Status Pasien Saya</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. CATEGORY TABS & FILTER BAR */}
      <div className="clay-card-flat bg-white p-4 md:p-5 border border-purple-100 rounded-3xl space-y-4">
        {/* Main Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('semua')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeCategory === 'semua'
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Semua Modul ({categoryStats.semua})</span>
          </button>

          <button
            onClick={() => setActiveCategory('sebelum_operasi')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeCategory === 'sebelum_operasi'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-200'
                : 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border-amber-200'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>1. Pra-Operasi / Puasa ({categoryStats.sebelum_operasi})</span>
          </button>

          <button
            onClick={() => setActiveCategory('setelah_operasi')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeCategory === 'setelah_operasi'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                : 'bg-blue-50/70 hover:bg-blue-100 text-blue-900 border-blue-200'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-blue-500" />
            <span>2. Pasca-Operasi & Nyeri ({categoryStats.setelah_operasi})</span>
          </button>

          <button
            onClick={() => setActiveCategory('perawatan_luka')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeCategory === 'perawatan_luka'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>3. Rawat Luka di Rumah ({categoryStats.perawatan_luka})</span>
          </button>

          <button
            onClick={() => setActiveCategory('kalkulator')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeCategory === 'kalkulator'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
            }`}
          >
            <Calculator className="w-4 h-4 text-indigo-500" />
            <span>4. Alat & Kalkulator Pasien</span>
          </button>
        </div>

        {/* Search Bar & Media Filter (Only shown when not on calculator tab) */}
        {activeCategory !== 'kalkulator' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari materi: puasa, ganti perban, skala nyeri, mandi..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Media Filter Pills */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-400 hidden md:inline-block mr-1">
                Format:
              </span>
              {[
                { id: 'semua', label: 'Semua Format' },
                { id: 'video', label: 'Video YouTube' },
                { id: 'gambar', label: 'Foto Ilustrasi' },
                { id: 'pedoman', label: 'Pedoman Resmi' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setMediaFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    mediaFilter === f.id
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. INTERACTIVE TOOLS TAB (When activeCategory === 'kalkulator' OR in preview) */}
      {(activeCategory === 'kalkulator' || activeCategory === 'sebelum_operasi') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* TOOL 1: FASTING CALCULATOR */}
          <div className="clay-card-flat bg-white p-5 md:p-6 border border-amber-200 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Kalkulator Puasa Pasien
                  </span>
                  <h3 className="font-display font-extrabold text-base text-slate-800">
                    Hitung Jam Mulai Puasa Operasi
                  </h3>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Masukkan jam rencana operasi pasien untuk mengetahui batas akhir makan dan minum sesuai standar anestesi keselamatan pra-bedah.
            </p>

            {/* Input Jam Operasi */}
            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-center justify-between gap-4">
              <label className="text-xs font-bold text-slate-700">
                Pukul Berapa Jadwal Operasi Anda?
              </label>
              <input
                type="time"
                value={fastingSurgeryHour}
                onChange={(e) => setFastingSurgeryHour(e.target.value)}
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Calculated Timeline */}
            <div className="space-y-2.5 pt-1">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Batas Akhir Makanan Berat (Nasi/Daging)</span>
                    <span className="text-xs font-bold text-rose-600 font-mono">{fastingSchedule.solidFoodStop}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Minimal 8 jam sebelum operasi. Setelah jam ini, tidak boleh mengonsumsi makanan padat apapun.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Batas Makanan Ringan / Biskuit</span>
                    <span className="text-xs font-bold text-amber-600 font-mono">{fastingSchedule.lightMealStop}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Minimal 6 jam sebelum operasi. Dilarang minum susu, kopi pekat, atau santan.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Batas Terakhir Minum Air Putih Jernih</span>
                    <span className="text-xs font-bold text-blue-600 font-mono">{fastingSchedule.clearLiquidStop}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Maksimal 2 jam sebelum operasi. Hanya air putih tanpa gula jika diizinkan dokter anestesi.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Catatan Medis:</strong> Selalu konfirmasi instruksi puasa akhir kepada perawat jaga ruangan saat visit malam.
              </span>
            </div>
          </div>

          {/* TOOL 2: INTERACTIVE PAIN SCALE GUIDE */}
          <div className="clay-card-flat bg-white p-5 md:p-6 border border-blue-200 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-200">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                    Panduan Klinis Pasien
                  </span>
                  <h3 className="font-display font-extrabold text-base text-slate-800">
                    Skala Nyeri Pasca-Operasi (Wong-Baker)
                  </h3>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pilih angka 0-10 untuk membantu Anda dan keluarga mendeskripsikan rasa sakit kepada perawat jaga.
            </p>

            {/* Pain Scale Selector */}
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {[
                { score: 0, label: '0: Nyaman', icon: Smile, color: 'text-emerald-500' },
                { score: 2, label: '2: Ringan', icon: Smile, color: 'text-lime-500' },
                { score: 4, label: '4: Sedang', icon: Meh, color: 'text-amber-500' },
                { score: 6, label: '6: Mengganggu', icon: Meh, color: 'text-orange-500' },
                { score: 8, label: '8: Sangat Nyeri', icon: Frown, color: 'text-rose-500' },
                { score: 10, label: '10: Tak Tertahan', icon: Frown, color: 'text-red-700' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = selectedPainScore === item.score;
                return (
                  <button
                    key={item.score}
                    type="button"
                    onClick={() => setSelectedPainScore(item.score)}
                    className={`p-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : item.color}`} />
                    <span className="text-xs font-black">{item.score}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Description */}
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">
                  Tingkat Nyeri: Skala {selectedPainScore} / 10
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                  {selectedPainScore === 0
                    ? 'Bebas Nyeri'
                    : selectedPainScore <= 3
                    ? 'Nyeri Ringan'
                    : selectedPainScore <= 6
                    ? 'Nyeri Sedang'
                    : 'Nyeri Hebat'}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {selectedPainScore === 0 &&
                  'Pasien merasa rileks dan nyaman. Lanjutkan latihan pernapasan dalam dan istirahat cukup.'}
                {selectedPainScore > 0 &&
                  selectedPainScore <= 3 &&
                  'Nyeri ringan terasa seperti pegal atau cubitan kecil. Lakukan relaksasi nafas dalam dan kompres hangat/dingin sesuai izin dokter.'}
                {selectedPainScore > 3 &&
                  selectedPainScore <= 6 &&
                  'Nyeri mulai mengganggu konsentrasi atau gerakan miring. Jangan ragu tekan tombol bel perawat (Nurse Call) agar diberikan pereda nyeri.'}
                {selectedPainScore > 6 &&
                  'Nyeri sangat mengganggu istirahat. Segera panggil perawat jaga ruangan untuk evaluasi dosis analgetik dokter spesialis.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-purple-600" />
                <span>Tekan tombol Bel (Nurse Call) di dinding bed jika nyeri bertambah.</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. ARTICLES GRID SECTION (When not solely in calculator) */}
      {activeCategory !== 'kalkulator' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-extrabold text-lg text-slate-800 flex items-center gap-2">
              <span>Materi & Panduan Klinis</span>
              <span className="text-xs font-normal text-slate-500">
                ({filteredArticles.length} modul ditemukan)
              </span>
            </h2>

            {searchQuery && (
              <span className="text-xs text-purple-700 font-semibold">
                Menampilkan hasil untuk: "{searchQuery}"
              </span>
            )}
          </div>

          {filteredArticles.length === 0 ? (
            <div className="clay-card-flat bg-white p-12 text-center rounded-3xl border border-purple-100 space-y-3">
              <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Tidak ada materi yang cocok</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Coba ubah kata kunci pencarian Anda atau reset filter untuk melihat semua modul edukasi.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setMediaFilter('semua');
                  setActiveCategory('semua');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-700 transition-all inline-block mt-2"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredArticles.map((article) => {
                const meta = getCategoryMeta(article.category);
                return (
                  <div
                    key={article.id}
                    className="clay-card-flat bg-white border border-purple-100 rounded-3xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-purple-300 transition-all group"
                  >
                    <div>
                      {/* Image Thumbnail Header */}
                      {article.imageUrl ? (
                        <div className="relative aspect-video w-full overflow-hidden bg-purple-50 border-b border-purple-100">
                          <ImageWithFallback
                            src={article.imageUrl}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            fallbackIcon={<BookOpen className="w-8 h-8 text-purple-300" />}
                          />
                          {article.videoUrl && (
                            <div className="absolute top-3 right-3 bg-red-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                              <Play className="w-3 h-3 fill-white" />
                              <span>Video</span>
                            </div>
                          )}
                          <div className="absolute bottom-3 left-3">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-xs backdrop-blur-md bg-white/95 ${meta.badgeColor}`}>
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 pb-0">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${meta.badgeColor}`}>
                            {meta.label}
                          </span>
                        </div>
                      )}

                      {/* Card Content */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {article.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <h3 className="font-display font-black text-base text-slate-800 leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors">
                          {article.title}
                        </h3>

                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                          {article.summary}
                        </p>

                        {/* Step preview snippet */}
                        {Array.isArray(article.content) && article.content.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                              Instruksi Ringkas:
                            </span>
                            <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                              "{article.content[0]}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-5 pt-0 border-t border-slate-50 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedArticle(article)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all flex items-center gap-1.5 flex-1 justify-center"
                      >
                        <span>Baca Panduan Lengkap</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {isAdmin && onOpenAdminSettings && (
                        <button
                          onClick={onOpenAdminSettings}
                          className="p-2 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded-xl transition-colors"
                          title="Edit Modul Ini di Admin"
                        >
                          <PenLine className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. ARTICLE DETAIL MODAL (FULL READER) */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="clay-card bg-white w-full max-w-3xl max-h-[92vh] flex flex-col justify-between rounded-3xl border border-purple-100 shadow-2xl relative overflow-hidden">
            {/* Header bar */}
            <div className="p-5 pb-3 border-b border-purple-100 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryMeta(selectedArticle.category).badgeColor}`}>
                  {getCategoryMeta(selectedArticle.category).label}
                </span>
                <span className="text-xs text-slate-400 font-medium">· Waktu Baca: ~3 Menit</span>
              </div>

              <button
                onClick={() => setSelectedArticle(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5">
              {/* Title & Summary */}
              <div>
                <h2 className="font-display font-black text-xl md:text-2xl text-slate-800 leading-snug">
                  {selectedArticle.title}
                </h2>
                <p className="text-xs md:text-sm text-slate-600 mt-2 font-medium leading-relaxed bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100">
                  {selectedArticle.summary}
                </p>
              </div>

              {/* YouTube Video Player (If Available) */}
              {selectedArticle.videoUrl && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-red-600" />
                    <span>Video Edukasi Klinis:</span>
                  </span>
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-purple-100 bg-black">
                    <iframe
                      src={selectedArticle.videoUrl}
                      title={selectedArticle.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Image Illustration (If Available) */}
              {selectedArticle.imageUrl && !selectedArticle.videoUrl && (
                <div className="rounded-2xl overflow-hidden shadow-md max-h-72 w-full border border-purple-100">
                  <ImageWithFallback
                    src={selectedArticle.imageUrl}
                    alt={selectedArticle.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Step-by-Step Instructions */}
              <div className="space-y-3">
                <h3 className="font-display font-black text-sm text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Petunjuk Langkah Demi Langkah:</span>
                </h3>

                <div className="space-y-2.5">
                  {selectedArticle.content.map((step, idx) => {
                    const stepKey = `${selectedArticle.id}-step-${idx}`;
                    const isChecked = !!understoodSteps[stepKey];
                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleStepUnderstood(stepKey)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 text-slate-800'
                            : 'bg-slate-50/80 hover:bg-purple-50/50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors mt-0.5 ${
                            isChecked
                              ? 'bg-emerald-600 text-white'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {isChecked ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </div>

                        <div className="flex-1 text-xs leading-relaxed">
                          <p className={isChecked ? 'font-medium' : ''}>{step}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {isChecked ? '✓ Ditandai telah dipahami' : 'Klik untuk menandai telah dipahami'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* External Link / Official Guideline */}
              {selectedArticle.externalLink && (
                <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                      Rujukan Resmi:
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      {selectedArticle.externalLink.title}
                    </p>
                  </div>
                  <a
                    href={selectedArticle.externalLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                  >
                    <span>Buka Rujukan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-purple-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <a
                href={buildHomecareUrl(selectedArticle.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Ada pertanyaan? Tanya Perawat via WhatsApp</span>
              </a>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="Cetak panduan ini untuk dibawa pulang"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cetak Panduan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Selesai Membaca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
