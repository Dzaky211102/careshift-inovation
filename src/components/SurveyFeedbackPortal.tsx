import React, { useState } from 'react';
import {
  Star,
  MessageSquareHeart,
  ExternalLink,
  Send,
  CheckCircle2,
  Sparkles,
  HeartHandshake,
  User,
  Bed,
  ThumbsUp,
  Filter,
  Trash2,
  Share2,
  Copy,
  Check,
  Settings,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { SurveyFeedback, AppSettings } from '../types';
import { getWitaDateString, getWitaTimeString } from '../utils/witaTime';

interface SurveyFeedbackPortalProps {
  surveys: SurveyFeedback[];
  settings: AppSettings;
  isAdmin: boolean;
  onSubmitSurvey: (survey: SurveyFeedback) => void;
  onDeleteSurvey: (id: string) => void;
  onOpenAdminSettings?: () => void;
}

export const SurveyFeedbackPortal: React.FC<SurveyFeedbackPortalProps> = ({
  surveys,
  settings,
  isAdmin,
  onSubmitSurvey,
  onDeleteSurvey,
  onOpenAdminSettings,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [roleType, setRoleType] = useState<'pasien' | 'keluarga' | 'pengunjung'>('pasien');
  const [roomNumber, setRoomNumber] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<
    'pelayanan_perawat' | 'kebersihan' | 'komunikasi' | 'kecepatan_respon' | 'umum'
  >('pelayanan_perawat');
  const [comments, setComments] = useState('');

  // UI State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedFilterStar, setSelectedFilterStar] = useState<number | 'all'>('all');
  const [activeViewTab, setActiveViewTab] = useState<'form' | 'reviews'>('form');

  const ratingDescriptions: Record<number, { text: string; color: string; desc: string }> = {
    1: {
      text: 'Sangat Kurang Puas',
      color: 'text-rose-600',
      desc: 'Pelayanan belum memenuhi harapan dan memerlukan evaluasi menyeluruh.',
    },
    2: {
      text: 'Kurang Puas',
      color: 'text-orange-600',
      desc: 'Terdapat beberapa hal penting yang perlu segera diperbaiki.',
    },
    3: {
      text: 'Cukup / Standar',
      color: 'text-amber-600',
      desc: 'Pelayanan standar memadai, namun masih bisa ditingkatkan.',
    },
    4: {
      text: 'Puas & Nyaman',
      color: 'text-emerald-600',
      desc: 'Pelayanan baik, ramah, dan membuat perawatan terasa nyaman.',
    },
    5: {
      text: 'Sangat Puas & Terkesan',
      color: 'text-purple-700',
      desc: 'Pelayanan luar biasa, perawat sigap, ramah, dan sangat profesional!',
    },
  };

  const currentDisplayRating = hoverRating > 0 ? hoverRating : rating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg('Silakan tuliskan nama atau inisial Anda (misal: Bpk. Ahmad / Inisial A.H / Anonim).');
      return;
    }

    if (!comments.trim()) {
      setErrorMsg('Silakan tuliskan kritik, saran, atau pengalaman Anda selama dirawat.');
      return;
    }

    const now = new Date();
    const dateStr = getWitaDateString(now);
    const timeStr = getWitaTimeString(now, false);

    const newFeedback: SurveyFeedback = {
      id: `survey-${Date.now()}`,
      name: name.trim(),
      roleType,
      roomNumber: roomNumber.trim() || undefined,
      rating,
      category,
      comments: comments.trim(),
      createdAt: `${dateStr} ${timeStr} WITA`,
      status: 'pending',
    };

    onSubmitSurvey(newFeedback);
    setIsSubmitted(true);
    setErrorMsg('');

    // Reset fields
    setName('');
    setComments('');
    setRoomNumber('');
    setRating(5);
  };

  // Google Form link handling
  const googleFormUrl = settings.satisfactionSurveyGoogleFormUrl || '';
  const isGoogleFormEnabled = settings.satisfactionSurveyEnabled !== false && Boolean(googleFormUrl);

  const handleCopyGoogleFormLink = () => {
    if (!googleFormUrl) return;
    navigator.clipboard.writeText(googleFormUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Stats calculation
  const totalReviews = surveys.length;
  const avgRating = totalReviews > 0
    ? (surveys.reduce((sum, s) => sum + s.rating, 0) / totalReviews).toFixed(1)
    : '5.0';

  const starCounts = {
    5: surveys.filter((s) => s.rating === 5).length,
    4: surveys.filter((s) => s.rating === 4).length,
    3: surveys.filter((s) => s.rating === 3).length,
    2: surveys.filter((s) => s.rating === 2).length,
    1: surveys.filter((s) => s.rating === 1).length,
  };

  const filteredSurveys = surveys.filter((s) => {
    if (selectedFilterStar === 'all') return true;
    return s.rating === selectedFilterStar;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'pelayanan_perawat':
        return 'Keramahan & Kecekatan Perawat';
      case 'kebersihan':
        return 'Kebersihan & Kenyamanan Ruangan';
      case 'komunikasi':
        return 'Komunikasi Informasi & Edukasi';
      case 'kecepatan_respon':
        return 'Kecepatan Respon Bel Panggilan';
      default:
        return 'Pelayanan Keseluruhan';
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* 1. HERO HEADER */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#7B58C6] via-[#6844B5] to-[#5934A4] p-6 md:p-8 text-white shadow-xl overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute left-1/2 -top-20 w-48 h-48 rounded-full bg-purple-300/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black text-purple-100 mb-3 border border-white/25">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Suara Pasien & Keluarga · Terbuka & Terpercaya</span>
            </div>
            <h1 className="font-display font-black text-2xl md:text-3xl tracking-tight leading-tight">
              Survei Kepuasan & Kotak Saran Pasien
            </h1>
            <p className="mt-2 text-sm md:text-base text-purple-100/90 leading-relaxed font-medium">
              Bantu kami terus meningkatkan kenyamanan dan mutu asuhan keperawatan di{' '}
              <strong className="text-white font-extrabold">{settings.wardName}</strong> {settings.hospitalName}.
              Setiap penilaian dan kritik membangun dari Anda sangat berarti bagi kami.
            </p>
          </div>

          {/* Quick Rating Badge */}
          <div className="bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl p-4 text-center min-w-[170px] shadow-lg shrink-0">
            <div className="text-3xl md:text-4xl font-black font-display text-amber-300 flex items-center justify-center gap-1">
              <span>{avgRating}</span>
              <Star className="w-7 h-7 fill-amber-300 text-amber-300" />
            </div>
            <p className="text-xs font-bold text-white mt-1">Indeks Kepuasan</p>
            <p className="text-[11px] text-purple-200 mt-0.5">Dari {totalReviews} Masukan</p>
          </div>
        </div>
      </div>

      {/* 2. GOOGLE FORM INTEGRATION CARD */}
      {isGoogleFormEnabled && (
        <div className="clay-card-flat bg-gradient-to-br from-white via-purple-50/40 to-indigo-50/50 p-5 md:p-6 border-2 border-purple-200/80 shadow-md rounded-3xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-black text-base md:text-lg text-slate-900">
                    Tautan Survei Resmi Rumah Sakit (Google Form)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                    Tersambung
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-600 font-medium mt-1">
                  Anda juga dapat mengisi kuesioner evaluasi akreditasi dan kepuasan pelayanan langsung melalui formulir Google Form resmi ruangan kami.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap justify-end">
              <button
                type="button"
                onClick={handleCopyGoogleFormLink}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                title="Salin tautan Google Form"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>

              <a
                href={googleFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs md:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Google Form</span>
              </a>

              {isAdmin && onOpenAdminSettings && (
                <button
                  type="button"
                  onClick={onOpenAdminSettings}
                  className="px-3 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-xs flex items-center gap-1.5 transition-colors"
                  title="Ganti tautan Google Form di Pengaturan Admin"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Ubah Link</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. NAVIGATION VIEW TABS */}
      <div className="flex items-center justify-between gap-3 border-b border-purple-100 pb-3 flex-wrap">
        <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-purple-100 shadow-xs">
          <button
            onClick={() => setActiveViewTab('form')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-black transition-all flex items-center gap-2 ${
              activeViewTab === 'form'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>Isi Survei & Kritik Saran</span>
          </button>
          <button
            onClick={() => setActiveViewTab('reviews')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-black transition-all flex items-center gap-2 ${
              activeViewTab === 'reviews'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Lihat Ulasan & Masukan ({surveys.length})</span>
          </button>
        </div>

        {isAdmin && onOpenAdminSettings && (
          <button
            onClick={onOpenAdminSettings}
            className="text-xs font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Kelola Survei di Panel Admin</span>
          </button>
        )}
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {activeViewTab === 'form' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: INTERACTIVE FEEDBACK FORM */}
          <div className="lg:col-span-8 clay-card bg-white p-6 md:p-8 rounded-3xl border border-purple-100/80 shadow-md">
            {isSubmitted ? (
              <div className="text-center py-8 px-4 animate-fadeIn">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-display font-black text-2xl text-slate-900">
                  Terima Kasih Banyak!
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto mt-2 font-medium">
                  Penilaian bintang dan kritik/saran Anda telah berhasil dikirimkan. Masukan Anda menjadi motivasi besar bagi seluruh tim perawat kami.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="px-5 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-md transition-all active:scale-95"
                  >
                    Kirim Masukan Lain
                  </button>
                  <button
                    onClick={() => setActiveViewTab('reviews')}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors"
                  >
                    Lihat Daftar Ulasan
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="font-display font-black text-xl text-slate-900">
                    Formulir Evaluasi & Kritik Saran
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-1">
                    Isi dengan leluasa. Identitas nama dapat menggunakan nama lengkap, panggilan, inisial, ataupun anonim.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* 1. NAMA & INISIAL */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    Nama atau Inisial <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Bpk. Bambang / Inisial: B.S / Pasien Kamar 305"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-purple-600 focus:bg-white rounded-2xl text-xs md:text-sm text-slate-900 placeholder:text-slate-400 font-bold outline-none transition-all"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dapat menggunakan nama terang, inisial huruf, atau sebutan keluarga.
                  </p>
                </div>

                {/* 2. STATUS PENGISI & NOMOR KAMAR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Status Pengisi
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'pasien', label: 'Pasien' },
                          { id: 'keluarga', label: 'Keluarga' },
                          { id: 'pengunjung', label: 'Kerabat' },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRoleType(item.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-black transition-all border ${
                            roleType === item.id
                              ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Nomor Ruangan / Bed (Opsional)
                    </label>
                    <div className="relative">
                      <Bed className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        placeholder="Contoh: Teratai 302B"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-purple-600 focus:bg-white rounded-2xl text-xs md:text-sm text-slate-900 placeholder:text-slate-400 font-bold outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. STAR RATING (1-5 BINTANG) */}
                <div className="p-5 bg-gradient-to-br from-amber-50/60 via-purple-50/40 to-slate-50 rounded-2xl border-2 border-amber-200/60 space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                    Penilaian Bintang Kepuasan (1 - 5) <span className="text-rose-500">*</span>
                  </label>

                  <div className="flex items-center gap-2 md:gap-3">
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const isFilled = starValue <= currentDisplayRating;
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => setRating(starValue)}
                          onMouseEnter={() => setHoverRating(starValue)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 md:p-2 rounded-xl hover:scale-115 active:scale-95 transition-transform cursor-pointer focus:outline-none"
                          title={`${starValue} Bintang`}
                        >
                          <Star
                            className={`w-8 h-8 md:w-10 md:h-10 transition-colors ${
                              isFilled
                                ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                : 'text-slate-300 hover:text-amber-200'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1">
                    <p className={`text-sm md:text-base font-black ${ratingDescriptions[currentDisplayRating].color}`}>
                      ⭐ {currentDisplayRating} / 5 Bintang — {ratingDescriptions[currentDisplayRating].text}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ratingDescriptions[currentDisplayRating].desc}
                    </p>
                  </div>
                </div>

                {/* 4. KATEGORI ASPEK PELAYANAN */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    Fokus Aspek Yang Dinilai
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-purple-600 focus:bg-white rounded-2xl text-xs md:text-sm text-slate-900 font-bold outline-none transition-all cursor-pointer"
                  >
                    <option value="pelayanan_perawat">Keramahan & Kecekatan Perawat</option>
                    <option value="kebersihan">Kebersihan & Kenyamanan Ruangan</option>
                    <option value="komunikasi">Penjelasan Informasi & Edukasi Medis</option>
                    <option value="kecepatan_respon">Kecepatan Respon Bel Panggilan</option>
                    <option value="umum">Pelayanan Rawat Inap Keseluruhan</option>
                  </select>
                </div>

                {/* 5. KRITIK MAUPUN SARAN */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Kritik Maupun Saran <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-bold">
                      {comments.length} karakter
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Ceritakan pengalaman Anda selama dirawat. Hal apa yang sudah sangat baik dirasakan, serta apa yang perlu kami benahi demi kenyamanan Anda..."
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 focus:border-purple-600 focus:bg-white rounded-2xl text-xs md:text-sm text-slate-900 placeholder:text-slate-400 font-medium outline-none transition-all resize-y"
                    required
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-sm md:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.99] transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Penilaian & Saran</span>
                </button>
              </form>
            )}
          </div>

          {/* RIGHT: SUMMARY SIDEBAR & PRIVACY INFO */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Rating Distribution Card */}
            <div className="clay-card-flat bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-4">
              <h3 className="font-display font-black text-sm md:text-base text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Rangkuman Kepuasan Ruangan</span>
              </h3>

              <div className="flex items-center gap-4 py-2 border-b border-slate-100">
                <div className="text-4xl font-black font-display text-purple-900">
                  {avgRating}
                </div>
                <div>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= Math.round(Number(avgRating))
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 mt-1">
                    Berdasarkan {totalReviews} masukan masuk
                  </p>
                </div>
              </div>

              {/* Progress bars for stars */}
              <div className="space-y-2 text-xs">
                {[5, 4, 3, 2, 1].map((sNum) => {
                  const count = starCounts[sNum as keyof typeof starCounts];
                  const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={sNum} className="flex items-center gap-2">
                      <span className="w-12 font-bold text-slate-600 flex items-center gap-1">
                        {sNum} <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-7 text-right text-[11px] font-bold text-slate-500">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Privacy & Assurance Card */}
            <div className="p-5 rounded-3xl bg-purple-50/70 border border-purple-200/70 text-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-purple-900 font-black text-sm">
                <HeartHandshake className="w-4 h-4 text-purple-700" />
                <span>Komitmen Kerahasiaan & Mutu</span>
              </div>
              <ul className="text-xs space-y-2 font-medium text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                  <span>
                    Setiap saran tidak akan mempengaruhi kualitas maupun netralitas pelayanan medis kepada pasien.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                  <span>
                    Masukan Anda dibaca dan ditindaklanjuti secara berkala oleh Kepala Ruangan dan Tim Komite Mutu RS.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                  <span>
                    Terima kasih telah membantu kami menciptakan lingkungan rawat inap yang lebih sehat, ramah, dan manusiawi.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* REVIEWS LIST VIEW */
        <div className="space-y-5 animate-fadeIn">
          {/* Star Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-black text-slate-500 mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </span>

            <button
              onClick={() => setSelectedFilterStar('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                selectedFilterStar === 'all'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              Semua ({surveys.length})
            </button>

            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedFilterStar(star)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 shrink-0 ${
                  selectedFilterStar === star
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{star}</span>
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="text-[10px] opacity-80">
                  ({starCounts[star as keyof typeof starCounts]})
                </span>
              </button>
            ))}
          </div>

          {filteredSurveys.length === 0 ? (
            <div className="clay-card-flat bg-white p-8 text-center rounded-3xl border border-purple-100">
              <MessageSquareHeart className="w-12 h-12 text-purple-300 mx-auto mb-2" />
              <h4 className="font-display font-black text-base text-slate-800">
                Belum ada masukan untuk filter ini
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Jadilah yang pertama memberikan kritik atau saran berharga.
              </p>
              <button
                onClick={() => setActiveViewTab('form')}
                className="mt-4 px-4 py-2 rounded-xl bg-purple-700 text-white font-black text-xs"
              >
                Tulis Penilaian Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSurveys.map((item) => (
                <div
                  key={item.id}
                  className="clay-card-flat bg-white p-5 rounded-3xl border border-purple-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative"
                >
                  <div>
                    {/* Header: Name, Role, Stars */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-black text-sm text-slate-900 truncate">
                            {item.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                            {item.roleType}
                          </span>
                        </div>
                        {item.roomNumber && (
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                            <Bed className="w-3 h-3 text-slate-400" />
                            <span>{item.roomNumber}</span>
                          </p>
                        )}
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200/60 shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= item.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Category tag */}
                    <div className="mb-2.5">
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>

                    {/* Comments */}
                    <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
                      "{item.comments}"
                    </p>
                  </div>

                  {/* Footer: Date & Admin Delete */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>{item.createdAt}</span>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus ulasan dari "${item.name}"?`)) {
                            onDeleteSurvey(item.id);
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline"
                        title="Hapus masukan ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
