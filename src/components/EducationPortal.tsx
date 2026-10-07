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
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Film,
  ZoomIn,
  Sliders,
  Sparkle,
} from 'lucide-react';
import {
  EducationArticle,
  EducationMediaItem,
  MediaAspectRatio,
  MediaDisplaySize,
  MediaPlacement,
  MediaResolution,
  MediaType,
  AppSettings,
} from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { StorageService } from '../services/storage';

interface EducationPortalProps {
  educationArticles: EducationArticle[];
  settings: AppSettings;
  isAdmin: boolean;
  onUpdateEducation?: (articles: EducationArticle[]) => void;
  onOpenAdminSettings?: () => void;
  onOpenPatientPortal?: () => void;
}

// Helper to convert YouTube watch/short URLs into standard embed URLs
function formatVideoEmbedUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('youtube.com/embed/')) return trimmed;

  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  return trimmed;
}

export const EducationPortal: React.FC<EducationPortalProps> = ({
  educationArticles,
  settings,
  isAdmin,
  onUpdateEducation,
  onOpenAdminSettings,
  onOpenPatientPortal,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mediaFilter, setMediaFilter] = useState<'semua' | 'video' | 'gambar' | 'gif' | 'pedoman'>('semua');
  const [selectedArticle, setSelectedArticle] = useState<EducationArticle | null>(null);
  const [understoodSteps, setUnderstoodSteps] = useState<Record<string, boolean>>({});

  // Lightbox modal for zooming images & GIFs
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; title: string; caption?: string } | null>(null);

  // Fasting Calculator State
  const [fastingSurgeryHour, setFastingSurgeryHour] = useState<string>('08:00');

  // Pain Scale Interactive State
  const [selectedPainScore, setSelectedPainScore] = useState<number>(2);

  // --- MODAL EDITOR STATE FOR ARTICLES & MEDIA ---
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [editorForm, setEditorForm] = useState<{
    category: EducationArticle['category'];
    title: string;
    summary: string;
    content: string;
    mediaItems: EducationMediaItem[];
    externalTitle: string;
    externalUrl: string;
    tags: string;
  }>({
    category: 'sebelum_operasi',
    title: '',
    summary: '',
    content: '',
    mediaItems: [],
    externalTitle: '',
    externalUrl: '',
    tags: '',
  });

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return educationArticles.filter((article) => {
      // Category filter
      if (activeCategory !== 'semua' && article.category !== activeCategory) {
        return false;
      }

      // Media filter
      if (mediaFilter === 'video') {
        const hasVid =
          !!article.videoUrl ||
          (article.mediaItems && article.mediaItems.some((m) => m.type === 'video'));
        if (!hasVid) return false;
      }
      if (mediaFilter === 'gambar') {
        const hasImg =
          !!article.imageUrl ||
          (article.mediaItems && article.mediaItems.some((m) => m.type === 'image'));
        if (!hasImg) return false;
      }
      if (mediaFilter === 'gif') {
        const hasGif =
          article.mediaItems && article.mediaItems.some((m) => m.type === 'gif');
        if (!hasGif) return false;
      }
      if (mediaFilter === 'pedoman' && !article.externalLink) {
        return false;
      }

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
          badgeColor: 'bg-amber-100 text-amber-950 border-amber-300 font-black',
          dotColor: 'bg-amber-600',
        };
      case 'setelah_operasi':
        return {
          label: 'Pasca-Bedah (Pemulihan RS)',
          badgeColor: 'bg-blue-100 text-blue-950 border-blue-300 font-black',
          dotColor: 'bg-blue-600',
        };
      case 'perawatan_luka':
        return {
          label: 'Perawatan Luka di Rumah',
          badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black',
          dotColor: 'bg-emerald-600',
        };
      default:
        return {
          label: 'Panduan Kesehatan Umum',
          badgeColor: 'bg-purple-100 text-purple-950 border-purple-300 font-black',
          dotColor: 'bg-purple-600',
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

  // --- MEDIA EDITOR HANDLERS ---
  const handleOpenAddModal = () => {
    setEditingArticleId(null);
    setEditorForm({
      category: 'sebelum_operasi',
      title: '',
      summary: '',
      content: '',
      mediaItems: [],
      externalTitle: '',
      externalUrl: '',
      tags: 'Edukasi, Pasien',
    });
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (article: EducationArticle) => {
    setEditingArticleId(article.id);
    setEditorForm({
      category: article.category,
      title: article.title,
      summary: article.summary,
      content: Array.isArray(article.content) ? article.content.join('\n') : '',
      mediaItems: article.mediaItems ? [...article.mediaItems] : [],
      externalTitle: article.externalLink?.title || '',
      externalUrl: article.externalLink?.url || '',
      tags: article.tags ? article.tags.join(', ') : '',
    });
    setIsEditorOpen(true);
  };

  const handleAddMediaItem = (type: MediaType) => {
    const newItem: EducationMediaItem = {
      id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      url: '',
      caption: '',
      aspectRatio: type === 'video' ? '16:9' : '4:3',
      size: 'full',
      resolution: 'fhd_1080p',
      placement: 'top',
      stepIndex: 0,
      alignment: 'center',
    };
    setEditorForm((prev) => ({
      ...prev,
      mediaItems: [...prev.mediaItems, newItem],
    }));
  };

  const handleUpdateMediaItem = (id: string, field: keyof EducationMediaItem, value: any) => {
    setEditorForm((prev) => ({
      ...prev,
      mediaItems: prev.mediaItems.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    }));
  };

  const handleRemoveMediaItem = (id: string) => {
    setEditorForm((prev) => ({
      ...prev,
      mediaItems: prev.mediaItems.filter((m) => m.id !== id),
    }));
  };

  const handleMediaFileUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleUpdateMediaItem(id, 'url', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorForm.title.trim()) return;

    const lines = editorForm.content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const tagArray = editorForm.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const validMedia = editorForm.mediaItems.filter((m) => m.url && m.url.trim().length > 0);

    // Pick a primary imageUrl or videoUrl for legacy cards if available
    const primaryImg = validMedia.find((m) => m.type === 'image' || m.type === 'gif')?.url;
    const primaryVid = validMedia.find((m) => m.type === 'video')?.url;

    const payload: EducationArticle = {
      id: editingArticleId || `edu-${Date.now()}`,
      category: editorForm.category,
      title: editorForm.title.trim(),
      summary: editorForm.summary.trim(),
      content: lines.length > 0 ? lines : ['Instruksi materi edukasi perawat ruangan.'],
      imageUrl: primaryImg,
      videoUrl: primaryVid ? formatVideoEmbedUrl(primaryVid) : undefined,
      mediaItems: validMedia.map((m) => ({
        ...m,
        url: m.type === 'video' ? formatVideoEmbedUrl(m.url) : m.url,
      })),
      externalLink: editorForm.externalUrl.trim()
        ? {
            title: editorForm.externalTitle.trim() || 'Pedoman Medis Resmi',
            url: editorForm.externalUrl.trim(),
          }
        : undefined,
      tags: tagArray.length > 0 ? tagArray : ['Edukasi'],
    };

    let updatedArticles: EducationArticle[];
    if (editingArticleId) {
      updatedArticles = educationArticles.map((a) => (a.id === editingArticleId ? payload : a));
    } else {
      updatedArticles = [payload, ...educationArticles];
    }

    StorageService.saveEducationArticles(updatedArticles);
    if (onUpdateEducation) {
      onUpdateEducation(updatedArticles);
    }

    // If currently viewing this article, refresh it
    if (selectedArticle && selectedArticle.id === payload.id) {
      setSelectedArticle(payload);
    }

    setIsEditorOpen(false);
    setEditingArticleId(null);
  };

  // Helper to render media item with exact aspect ratio, resolution, and placement classes
  const renderSingleMediaItem = (item: EducationMediaItem, key: string | number) => {
    // Aspect Ratio Tailwind classes
    const getAspectClass = (ratio: MediaAspectRatio) => {
      switch (ratio) {
        case '16:9':
          return 'aspect-video';
        case '4:3':
          return 'aspect-4/3';
        case '1:1':
          return 'aspect-square';
        case '9:16':
          return 'aspect-[9/16] max-w-[280px] mx-auto';
        case '21:9':
          return 'aspect-[21/9]';
        case 'auto':
        default:
          return 'aspect-auto max-h-[500px]';
      }
    };

    // Display Size Tailwind classes
    const getSizeClass = (size: MediaDisplaySize) => {
      switch (size) {
        case 'small':
          return 'max-w-xs md:max-w-sm';
        case 'medium':
          return 'max-w-md md:max-w-lg';
        case 'large':
          return 'max-w-2xl';
        case 'full':
        default:
          return 'w-full';
      }
    };

    // Alignment classes
    const getAlignClass = (align?: 'center' | 'left' | 'right') => {
      switch (align) {
        case 'left':
          return 'mr-auto text-left';
        case 'right':
          return 'ml-auto text-right';
        case 'center':
        default:
          return 'mx-auto text-center';
      }
    };

    // Resolution badge label
    const getResolutionLabel = (res?: MediaResolution) => {
      switch (res) {
        case '4k_2160p':
          return '4K Ultra HD';
        case 'fhd_1080p':
          return '1080p Full HD';
        case 'hd_720p':
          return '720p HD';
        case 'sd_480p':
          return '480p SD';
        default:
          return 'Resolusi Asli';
      }
    };

    const isVideo = item.type === 'video';
    const isGif = item.type === 'gif';
    const embedUrl = isVideo ? formatVideoEmbedUrl(item.url) : '';
    const isDirectVideo = isVideo && (item.url.endsWith('.mp4') || item.url.endsWith('.webm'));

    return (
      <div
        key={key}
        className={`my-3.5 ${getSizeClass(item.size)} ${getAlignClass(item.alignment)} animate-fadeIn`}
      >
        <div className="clay-card-flat bg-slate-900 rounded-3xl overflow-hidden border-2 border-purple-200/80 shadow-xl relative group">
          {/* Top Pill Bar for Media Type & Resolution */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 flex-wrap pointer-events-none">
            <span
              className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase shadow-md backdrop-blur-md ${
                isVideo
                  ? 'bg-rose-600 text-white border border-rose-300'
                  : isGif
                  ? 'bg-amber-500 text-white border border-amber-300'
                  : 'bg-indigo-600 text-white border border-indigo-300'
              }`}
            >
              {isVideo ? '🎬 Video Tutorial' : isGif ? '🎞️ Animasi GIF' : '🖼️ Foto Medis'}
            </span>

            {item.resolution && item.resolution !== 'auto' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/85 text-emerald-300 border border-emerald-400/50 shadow-md backdrop-blur-md">
                {getResolutionLabel(item.resolution)}
              </span>
            )}

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/85 text-purple-200 border border-purple-300/40 shadow-md backdrop-blur-md">
              Rasio {item.aspectRatio}
            </span>
          </div>

          {/* Media Player or Image Container */}
          <div className={`relative w-full overflow-hidden flex items-center justify-center bg-black ${getAspectClass(item.aspectRatio)}`}>
            {isVideo ? (
              isDirectVideo ? (
                <video
                  src={item.url}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={embedUrl}
                  title={item.caption || 'Video Edukasi Klinis'}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            ) : (
              <div
                className="relative w-full h-full cursor-zoom-in group/img"
                onClick={() =>
                  setLightboxMedia({
                    url: item.url,
                    title: selectedArticle?.title || 'Foto Edukasi',
                    caption: item.caption,
                  })
                }
              >
                <ImageWithFallback
                  src={item.url}
                  alt={item.caption || 'Foto Edukasi'}
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                  fallbackIcon={<BookOpen className="w-10 h-10 text-purple-300" />}
                />
                <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="px-3 py-1.5 rounded-full bg-white/90 text-slate-950 text-xs font-black shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Klik Perbesar</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Caption text bar underneath */}
          {item.caption && (
            <div className="p-3 bg-slate-900 border-t border-slate-800 text-left">
              <p className="text-xs font-semibold text-slate-100 leading-snug flex items-start gap-1.5">
                <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{item.caption}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. HERO HEADER - High Contrast, Deep Crisp Typography */}
      <div className="clay-card bg-white p-5 md:p-8 rounded-3xl relative overflow-hidden shadow-xl border-2 border-purple-200">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-purple-100/50 blur-3xl pointer-events-none" />
        <div className="absolute right-20 top-0 w-48 h-48 rounded-full bg-indigo-50/70 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 md:gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-950 text-xs font-black border border-purple-300 flex items-center gap-1.5 shadow-2xs">
                <BookOpen className="w-4 h-4 text-purple-800" />
                <span>Pusat Edukasi Pasien Bedah & Pemulihan</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-950 text-xs font-black shadow-2xs border border-amber-300">
                {educationArticles.length} Modul Terverifikasi
              </span>

              {/* Direct Add/Edit Education Button directly on this page */}
              <button
                onClick={handleOpenAddModal}
                className="px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                title="Tambah materi edukasi baru lengkap dengan gambar, video, dan gif"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Materi Edukasi</span>
              </button>
            </div>

            <h1 className="font-display font-black text-2xl md:text-3xl lg:text-4xl text-slate-950 tracking-tight leading-snug">
              Panduan Perawatan & Pemulihan Pasien Rawat Inap
            </h1>
            <p className="text-slate-800 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl font-semibold">
              Informasi lengkap persiapan puasa pra-bedah, manajemen nyeri pasca-operasi, langkah mobilisasi bertahap, dan panduan merawat luka steril dengan foto, animasi GIF, dan video tutorial.
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
      <div className="clay-card-flat bg-white p-4 md:p-5 border-2 border-purple-200 rounded-3xl space-y-4 shadow-sm">
        {/* Main Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('semua')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeCategory === 'semua'
                ? 'bg-purple-700 text-white border-purple-700 shadow-md shadow-purple-300'
                : 'bg-slate-50 hover:bg-purple-50 text-slate-800 border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Semua Modul ({categoryStats.semua})</span>
          </button>

          <button
            onClick={() => setActiveCategory('sebelum_operasi')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeCategory === 'sebelum_operasi'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-300'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>1. Pra-Operasi / Puasa ({categoryStats.sebelum_operasi})</span>
          </button>

          <button
            onClick={() => setActiveCategory('setelah_operasi')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeCategory === 'setelah_operasi'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-300'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-950 border-blue-300'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-blue-600" />
            <span>2. Pasca-Operasi & Nyeri ({categoryStats.setelah_operasi})</span>
          </button>

          <button
            onClick={() => setActiveCategory('perawatan_luka')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeCategory === 'perawatan_luka'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-300'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>3. Rawat Luka di Rumah ({categoryStats.perawatan_luka})</span>
          </button>

          <button
            onClick={() => setActiveCategory('kalkulator')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeCategory === 'kalkulator'
                ? 'bg-indigo-700 text-white border-indigo-700 shadow-md shadow-indigo-300'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border-indigo-300'
            }`}
          >
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span>4. Alat & Kalkulator Pasien</span>
          </button>
        </div>

        {/* Search Bar & Media Filter */}
        {activeCategory !== 'kalkulator' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari materi: puasa, ganti perban, skala nyeri, ERACS..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs md:text-sm text-slate-950 font-bold placeholder:text-slate-500 focus:outline-none focus:border-purple-600 focus:bg-white transition-all shadow-inner"
              />
            </div>

            {/* Media Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto justify-start sm:justify-end pb-1 sm:pb-0">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1 mr-1 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>Media:</span>
              </span>

              <button
                onClick={() => setMediaFilter('semua')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors shrink-0 ${
                  mediaFilter === 'semua'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>

              <button
                onClick={() => setMediaFilter('gambar')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors shrink-0 flex items-center gap-1 ${
                  mediaFilter === 'gambar'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-950 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Foto</span>
              </button>

              <button
                onClick={() => setMediaFilter('gif')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors shrink-0 flex items-center gap-1 ${
                  mediaFilter === 'gif'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-950 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>GIF</span>
              </button>

              <button
                onClick={() => setMediaFilter('video')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors shrink-0 flex items-center gap-1 ${
                  mediaFilter === 'video'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-950 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. CALCULATOR TAB (Fast & Pain Scale) */}
      {activeCategory === 'kalkulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {/* Fasting Calculator */}
          <div className="clay-card-flat bg-white p-5 md:p-6 rounded-3xl border-2 border-amber-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-slate-950">
                    Kalkulator Jam Batas Puasa Pra-Bedah
                  </h3>
                  <p className="text-[11px] font-bold text-slate-700">
                    Hitung otomatis waktu stop makan & minum berdasarkan jam rencana operasi
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 block mb-1.5">
                Masukkan Rencana Jam Operasi Pasien (WITA):
              </label>
              <input
                type="time"
                value={fastingSurgeryHour}
                onChange={(e) => setFastingSurgeryHour(e.target.value)}
                className="w-full max-w-xs px-4 py-2.5 bg-amber-50/50 border-2 border-amber-300 rounded-2xl text-sm font-black text-slate-950 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-rose-50 rounded-2xl border-2 border-rose-200">
                <span className="text-[10px] font-black uppercase text-rose-950 block">
                  Stop Makanan Padat (8 Jam)
                </span>
                <span className="text-lg font-black text-rose-800 font-display block mt-1">
                  {fastingSchedule.solidFoodStop}
                </span>
                <p className="text-[10px] font-bold text-slate-700 mt-1">
                  Nasi, lauk pauk, susu, dan gorengan.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border-2 border-amber-200">
                <span className="text-[10px] font-black uppercase text-amber-950 block">
                  Stop Makanan Ringan (6 Jam)
                </span>
                <span className="text-lg font-black text-amber-800 font-display block mt-1">
                  {fastingSchedule.lightMealStop}
                </span>
                <p className="text-[10px] font-bold text-slate-700 mt-1">
                  Biskuit kering atau bubur saring.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
                <span className="text-[10px] font-black uppercase text-emerald-950 block">
                  Stop Air Putih (2 Jam)
                </span>
                <span className="text-lg font-black text-emerald-800 font-display block mt-1">
                  {fastingSchedule.clearLiquidStop}
                </span>
                <p className="text-[10px] font-bold text-slate-700 mt-1">
                  Air putih jernih (maksimal 1 gelas kecil).
                </p>
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-700 shrink-0" />
              <span>
                Catatan: Pasien darurat/cito mengikuti instruksi lisan dari dokter anestesi dan perawat jaga ruangan.
              </span>
            </div>
          </div>

          {/* Pain Scale Visual */}
          <div className="clay-card-flat bg-white p-5 md:p-6 rounded-3xl border-2 border-blue-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-slate-950">
                    Panduan Skala Nyeri 0 - 10 (NRS)
                  </h3>
                  <p className="text-[11px] font-bold text-slate-700">
                    Klik skor nyeri di bawah untuk melihat rekomendasi tindakan perawat
                  </p>
                </div>
              </div>
            </div>

            {/* Pain Scale Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-950">
                <span>Skala Terpilih: {selectedPainScore} / 10</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    selectedPainScore === 0
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : selectedPainScore <= 3
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : selectedPainScore <= 6
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  {selectedPainScore === 0
                    ? 'Bebas Nyeri'
                    : selectedPainScore <= 3
                    ? 'Nyeri Ringan'
                    : selectedPainScore <= 6
                    ? 'Nyeri Sedang'
                    : 'Nyeri Hebat'}
                </span>
              </div>

              <div className="grid grid-cols-11 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setSelectedPainScore(score)}
                    className={`py-2 rounded-xl text-xs font-black transition-all ${
                      selectedPainScore === score
                        ? 'bg-purple-700 text-white shadow-md scale-105 border-2 border-purple-900'
                        : score === 0
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200'
                        : score <= 3
                        ? 'bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200'
                        : score <= 6
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-950 border border-rose-200'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                {selectedPainScore === 0 &&
                  'Pasien merasa rileks dan nyaman. Lanjutkan latihan pernapasan dalam dan istirahat cukup.'}
                {selectedPainScore > 0 &&
                  selectedPainScore <= 3 &&
                  'Nyeri ringan terasa seperti pegal atau cubitan kecil. Lakukan relaksasi nafas dalam dan kompres hangat/dingin sesuai instruksi perawat.'}
                {selectedPainScore > 3 &&
                  selectedPainScore <= 6 &&
                  'Nyeri mulai mengganggu istirahat atau miring kanan-kiri. Segera pencet tombol Bel Perawat (Nurse Call) agar diberikan pereda nyeri.'}
                {selectedPainScore > 6 &&
                  'Nyeri hebat mengganggu tidur dan konsentrasi. Perawat ruangan akan segera mengevaluasi dan berkoordinasi dengan dokter spesialis anestesi/bedah.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. ARTICLES GRID SECTION */}
      {activeCategory !== 'kalkulator' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-lg md:text-xl text-slate-950 flex items-center gap-2">
              <span>Materi & Panduan Klinis</span>
              <span className="text-xs font-bold text-slate-700">
                ({filteredArticles.length} modul ditemukan)
              </span>
            </h2>

            {searchQuery && (
              <span className="text-xs text-purple-900 font-black">
                Hasil pencarian: "{searchQuery}"
              </span>
            )}
          </div>

          {filteredArticles.length === 0 ? (
            <div className="clay-card-flat bg-white p-12 text-center rounded-3xl border-2 border-purple-200 space-y-3">
              <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-700 mx-auto flex items-center justify-center font-bold">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="font-black text-slate-950 text-base">Tidak ada materi yang cocok</h3>
              <p className="text-xs text-slate-700 max-w-md mx-auto font-medium">
                Coba ubah kata kunci pencarian Anda atau reset filter untuk melihat semua modul edukasi.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setMediaFilter('semua');
                  setActiveCategory('semua');
                }}
                className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-800 transition-all inline-block mt-2"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredArticles.map((article) => {
                const meta = getCategoryMeta(article.category);
                const hasMedia = article.mediaItems && article.mediaItems.length > 0;
                const topMedia = article.mediaItems?.[0];
                const previewImg = topMedia?.type === 'image' || topMedia?.type === 'gif' ? topMedia.url : article.imageUrl;
                const hasVid = !!article.videoUrl || article.mediaItems?.some((m) => m.type === 'video');
                const hasGif = article.mediaItems?.some((m) => m.type === 'gif');

                return (
                  <div
                    key={article.id}
                    className="clay-card-flat bg-white border-2 border-purple-200 rounded-3xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-purple-400 transition-all group"
                  >
                    <div>
                      {/* Thumbnail Header */}
                      {previewImg ? (
                        <div className="relative aspect-video w-full overflow-hidden bg-purple-50 border-b border-purple-100">
                          <ImageWithFallback
                            src={previewImg}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            fallbackIcon={<BookOpen className="w-8 h-8 text-purple-300" />}
                          />
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap">
                            {hasVid && (
                              <div className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                                <Play className="w-3 h-3 fill-white" />
                                <span>Video</span>
                              </div>
                            )}
                            {hasGif && (
                              <div className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                                <Film className="w-3 h-3 text-white" />
                                <span>GIF</span>
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-3 left-3">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md bg-white/95 ${meta.badgeColor}`}>
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 pb-0 flex items-center justify-between">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full border ${meta.badgeColor}`}>
                            {meta.label}
                          </span>
                          {hasVid && (
                            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Ada Video
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Content */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {article.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <h3 className="font-display font-black text-base text-slate-950 leading-snug line-clamp-2 group-hover:text-purple-800 transition-colors">
                          {article.title}
                        </h3>

                        <p className="text-xs text-slate-800 font-semibold line-clamp-3 leading-relaxed">
                          {article.summary}
                        </p>

                        {/* Step preview snippet */}
                        {Array.isArray(article.content) && article.content.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1">
                            <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">
                              Instruksi Ringkas:
                            </span>
                            <p className="text-[11px] text-slate-900 line-clamp-2 italic font-medium">
                              "{article.content[0]}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedArticle(article)}
                        className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md shadow-purple-300 transition-all flex items-center gap-1.5 flex-1 justify-center"
                      >
                        <span>Baca Panduan Lengkap</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(article)}
                        className="p-2.5 bg-slate-100 hover:bg-purple-100 text-slate-800 hover:text-purple-900 rounded-xl transition-colors font-bold"
                        title="Edit Modul & Media Edukasi Ini"
                      >
                        <PenLine className="w-4 h-4 text-purple-700" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. ARTICLE DETAIL MODAL (FULL READER WITH FREE MEDIA PLACEMENT) */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="clay-card bg-white w-full max-w-4xl max-h-[94vh] flex flex-col justify-between rounded-3xl border-2 border-purple-200 shadow-2xl relative overflow-hidden">
            {/* Header bar */}
            <div className="p-4 md:p-5 pb-3 border-b border-purple-200 flex items-center justify-between gap-4 shrink-0 bg-slate-50/90">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${getCategoryMeta(selectedArticle.category).badgeColor}`}>
                  {getCategoryMeta(selectedArticle.category).label}
                </span>
                <span className="text-xs text-slate-700 font-bold">· Waktu Baca: ~3 Menit</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(selectedArticle)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors"
                  title="Edit materi atau kelola gambar/video/gif"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  <span>Edit Media / Materi</span>
                </button>

                <button
                  onClick={() => setSelectedArticle(null)}
                  className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6">
              {/* Title & Summary */}
              <div>
                <h2 className="font-display font-black text-2xl md:text-3xl text-slate-950 leading-snug">
                  {selectedArticle.title}
                </h2>
                <div className="text-xs md:text-sm text-slate-900 mt-2.5 font-semibold leading-relaxed bg-purple-50 p-4 rounded-2xl border-2 border-purple-200">
                  {selectedArticle.summary}
                </div>
              </div>

              {/* MEDIA PLACEMENT: TOP (Banner Awal) */}
              {selectedArticle.mediaItems &&
                selectedArticle.mediaItems
                  .filter((m) => m.placement === 'top')
                  .map((item, idx) => renderSingleMediaItem(item, `top-${idx}`))}

              {/* Legacy Fallback if no mediaItems but has imageUrl or videoUrl */}
              {(!selectedArticle.mediaItems || selectedArticle.mediaItems.length === 0) && selectedArticle.videoUrl && (
                <div className="space-y-1.5 my-3">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-rose-600" />
                    <span>Video Edukasi Klinis:</span>
                  </span>
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-purple-200 bg-black">
                    <iframe
                      src={formatVideoEmbedUrl(selectedArticle.videoUrl)}
                      title={selectedArticle.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {(!selectedArticle.mediaItems || selectedArticle.mediaItems.length === 0) &&
                selectedArticle.imageUrl &&
                !selectedArticle.videoUrl && (
                  <div className="rounded-2xl overflow-hidden shadow-md max-h-80 w-full border border-purple-200">
                    <ImageWithFallback
                      src={selectedArticle.imageUrl}
                      alt={selectedArticle.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

              {/* MEDIA PLACEMENT: MIDDLE (Di Antara Paragraf) */}
              {selectedArticle.mediaItems &&
                selectedArticle.mediaItems
                  .filter((m) => m.placement === 'middle')
                  .map((item, idx) => renderSingleMediaItem(item, `mid-${idx}`))}

              {/* Step-by-Step Instructions with STEP MEDIA PLACEMENT */}
              <div className="space-y-3.5">
                <h3 className="font-display font-black text-base text-slate-950 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-700" />
                  <span>Petunjuk Langkah Demi Langkah:</span>
                </h3>

                <div className="space-y-3">
                  {selectedArticle.content.map((step, idx) => {
                    const stepKey = `${selectedArticle.id}-step-${idx}`;
                    const isChecked = !!understoodSteps[stepKey];
                    const stepMedia = selectedArticle.mediaItems?.filter(
                      (m) => m.placement === 'step' && m.stepIndex === idx
                    );

                    return (
                      <div key={idx} className="space-y-2">
                        <div
                          onClick={() => handleToggleStepUnderstood(stepKey)}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-400 text-slate-950'
                              : 'bg-slate-50 hover:bg-purple-50 border-slate-200 text-slate-950'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-colors mt-0.5 ${
                              isChecked
                                ? 'bg-emerald-600 text-white'
                                : 'bg-purple-200 text-purple-900'
                            }`}
                          >
                            {isChecked ? <Check className="w-4 h-4" /> : idx + 1}
                          </div>

                          <div className="flex-1 text-xs md:text-sm leading-relaxed">
                            <p className="font-bold text-slate-950">{step}</p>
                            <span className="text-[11px] text-slate-600 font-bold mt-1.5 block">
                              {isChecked ? '✓ Ditandai telah dipahami oleh pasien/keluarga' : 'Klik untuk menandai telah dipahami'}
                            </span>
                          </div>
                        </div>

                        {/* RENDER STEP-SPECIFIC MEDIA (Gambar / GIF / Video khusus langkah ini) */}
                        {stepMedia && stepMedia.length > 0 && (
                          <div className="pl-6 md:pl-10 space-y-2">
                            {stepMedia.map((mediaItem, mIdx) =>
                              renderSingleMediaItem(mediaItem, `step-${idx}-${mIdx}`)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MEDIA PLACEMENT: BOTTOM (Penutup Materi) */}
              {selectedArticle.mediaItems &&
                selectedArticle.mediaItems
                  .filter((m) => m.placement === 'bottom')
                  .map((item, idx) => renderSingleMediaItem(item, `bot-${idx}`))}

              {/* External Link / Official Guideline */}
              {selectedArticle.externalLink && (
                <div className="p-4 bg-purple-50 rounded-2xl border-2 border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black text-purple-950 uppercase tracking-wider block">
                      Rujukan Resmi:
                    </span>
                    <p className="text-xs md:text-sm font-black text-slate-950">
                      {selectedArticle.externalLink.title}
                    </p>
                  </div>
                  <a
                    href={selectedArticle.externalLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
                  >
                    <span>Buka Rujukan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-purple-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <a
                href={buildHomecareUrl(selectedArticle.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-black text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>Ada pertanyaan? Tanya Perawat via WhatsApp</span>
              </a>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5"
                  title="Cetak panduan ini untuk dibawa pulang"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                  <span>Cetak Panduan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black transition-colors shadow-sm"
                >
                  Selesai Membaca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL EDITOR: TAMBAH / EDIT MATERI & MEDIA EDUKASI LENGKAP */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="clay-card bg-white w-full max-w-4xl max-h-[94vh] flex flex-col justify-between rounded-3xl border-2 border-purple-300 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-purple-200 flex items-center justify-between gap-4 bg-purple-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <PenLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-slate-950">
                    {editingArticleId ? 'Edit Modul & Media Edukasi' : 'Tambah Modul Edukasi Baru'}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-700">
                    Atur teks instruksi, tambah gambar, animasi GIF, dan video dengan bebas penempatan & rasio resolusi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="edu-editor-form" onSubmit={handleSaveEditor} className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-900 block mb-1">
                    Kategori Edukasi: *
                  </label>
                  <select
                    value={editorForm.category}
                    onChange={(e) =>
                      setEditorForm((p) => ({
                        ...p,
                        category: e.target.value as EducationArticle['category'],
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:border-purple-600"
                  >
                    <option value="sebelum_operasi">1. Sebelum Operasi (Pra-Bedah & Puasa)</option>
                    <option value="setelah_operasi">2. Setelah Operasi (Pemulihan & Nyeri)</option>
                    <option value="perawatan_luka">3. Perawatan Luka di Rumah</option>
                    <option value="umum">4. Umum & Tata Tertib Ruangan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 block mb-1">
                    Judul Materi Edukasi: *
                  </label>
                  <input
                    type="text"
                    required
                    value={editorForm.title}
                    onChange={(e) => setEditorForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Contoh: Cara Mengganti Perban Kassa Luka Steril"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-slate-900 block mb-1">
                    Ringkasan Singkat (Muncul di kartu utama):
                  </label>
                  <input
                    type="text"
                    value={editorForm.summary}
                    onChange={(e) => setEditorForm((p) => ({ ...p, summary: e.target.value }))}
                    placeholder="Penjelasan ringkas poin utama materi untuk pasien..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-slate-900 block mb-1">
                    Instruksi Langkah Demi Langkah (Tulis 1 baris untuk tiap langkah):
                  </label>
                  <textarea
                    rows={4}
                    value={editorForm.content}
                    onChange={(e) => setEditorForm((p) => ({ ...p, content: e.target.value }))}
                    placeholder="Langkah 1: Cuci tangan dengan sabun air mengalir&#10;Langkah 2: Buka kemasan kassa steril tanpa menyentuh bagian tengah&#10;Langkah 3: Tempelkan plester secara rapi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:border-purple-600 leading-relaxed"
                  />
                </div>
              </div>

              {/* MEDIA MANAGER: GAMBAR, VIDEO, GIF DENGAN PENEMPATAN, RASIO, & RESOLUSI */}
              <div className="p-4 md:p-5 bg-purple-50/70 rounded-3xl border-2 border-purple-300 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-200">
                  <div>
                    <h4 className="font-display font-black text-sm text-slate-950 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-700" />
                      <span>Media Edukasi (Gambar, GIF, & Video Tutorial)</span>
                    </h4>
                    <p className="text-[11px] font-bold text-slate-700">
                      Bebas tempatkan di Atas, Tengah, Langkah Tertentu, atau Bawah. Atur juga rasio aspek dan ukuran resolusi.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAddMediaItem('image')}
                      className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-black border-2 border-purple-300 transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-purple-700" />
                      <span>+ Gambar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddMediaItem('gif')}
                      className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-950 rounded-xl text-xs font-black border-2 border-amber-300 transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Film className="w-3.5 h-3.5 text-amber-700" />
                      <span>+ Animasi GIF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddMediaItem('video')}
                      className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-950 rounded-xl text-xs font-black border-2 border-rose-300 transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Video className="w-3.5 h-3.5 text-rose-700" />
                      <span>+ Video (YouTube)</span>
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                {editorForm.mediaItems.length === 0 && (
                  <div className="p-6 text-center border-2 border-dashed border-purple-300 rounded-2xl bg-white/60">
                    <ImageIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">
                      Belum ada media yang ditambahkan. Klik tombol di atas untuk menyisipkan Foto penjelasan, Animasi GIF gerak, atau Video tutorial.
                    </p>
                  </div>
                )}

                {/* Media Items List */}
                <div className="space-y-4">
                  {editorForm.mediaItems.map((m, mIdx) => (
                    <div
                      key={m.id}
                      className="p-4 bg-white rounded-2xl border-2 border-purple-200 shadow-sm space-y-3 relative"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-purple-700 text-white font-black text-xs flex items-center justify-center">
                            {mIdx + 1}
                          </span>
                          <span className="text-xs font-black text-slate-950">
                            Media #{mIdx + 1}:
                          </span>
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                              m.type === 'video'
                                ? 'bg-rose-100 text-rose-950 border border-rose-300'
                                : m.type === 'gif'
                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                : 'bg-indigo-100 text-indigo-950 border border-indigo-300'
                            }`}
                          >
                            {m.type === 'video' ? '🎬 Video' : m.type === 'gif' ? '🎞️ Animasi GIF' : '🖼️ Gambar'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveMediaItem(m.id)}
                          className="p-1.5 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-lg transition-colors font-bold"
                          title="Hapus media ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Row 1: Type & Source URL / Upload */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-black text-slate-800 block mb-1">
                            Tipe Media:
                          </label>
                          <select
                            value={m.type}
                            onChange={(e) => handleUpdateMediaItem(m.id, 'type', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-950"
                          >
                            <option value="image">🖼️ Gambar (JPG/PNG/WebP)</option>
                            <option value="gif">🎞️ Animasi GIF (Tutorial Gerak)</option>
                            <option value="video">🎬 Video (YouTube / MP4)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-black text-slate-800 block mb-1">
                            Sumber Berkas (Unggah dari HP/PC atau Tempel URL):
                          </label>
                          <div className="flex items-center gap-2">
                            {m.type !== 'video' && (
                              <label className="px-3 py-2 bg-purple-100 hover:bg-purple-200 border-2 border-purple-300 text-purple-950 rounded-xl text-xs font-black cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Unggah Berkas</span>
                                <input
                                  type="file"
                                  accept={m.type === 'gif' ? 'image/gif' : 'image/*'}
                                  onChange={(e) => handleMediaFileUpload(e, m.id)}
                                  className="hidden"
                                />
                              </label>
                            )}
                            <input
                              type="url"
                              value={m.url}
                              onChange={(e) => handleUpdateMediaItem(m.id, 'url', e.target.value)}
                              placeholder={
                                m.type === 'video'
                                  ? 'Link YouTube: https://www.youtube.com/watch?v=... atau https://youtu.be/...'
                                  : 'Atau tempel URL gambar / GIF online (https://...)'
                              }
                              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-950"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Penempatan Bebas, Rasio Aspek, dan Pilihan Ukuran / Resolusi */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                        {/* Placement */}
                        <div>
                          <label className="text-[11px] font-black text-slate-900 block mb-1">
                            Posisi Penempatan di Materi:
                          </label>
                          <select
                            value={m.placement}
                            onChange={(e) => handleUpdateMediaItem(m.id, 'placement', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-black text-slate-950"
                          >
                            <option value="top">⬆️ Atas (Header / Banner Awal)</option>
                            <option value="middle">↕️ Tengah (Di Antara Paragraf)</option>
                            <option value="step">🔢 Pada Langkah Tertentu</option>
                            <option value="bottom">⬇️ Bawah (Penutup Materi)</option>
                          </select>
                        </div>

                        {/* Aspect Ratio */}
                        <div>
                          <label className="text-[11px] font-black text-slate-900 block mb-1">
                            Pilihan Rasio Ukuran (Aspect Ratio):
                          </label>
                          <select
                            value={m.aspectRatio}
                            onChange={(e) => handleUpdateMediaItem(m.id, 'aspectRatio', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-black text-slate-950"
                          >
                            <option value="16:9">16:9 (Widescreen / Video Standar)</option>
                            <option value="4:3">4:3 (Foto Medis Klasik)</option>
                            <option value="1:1">1:1 (Persegi / Square Prosedur)</option>
                            <option value="9:16">9:16 (Vertikal / Story Mobile)</option>
                            <option value="21:9">21:9 (Sinematik Ultra-Wide)</option>
                            <option value="auto">auto (Proporsi Asli Berkas)</option>
                          </select>
                        </div>

                        {/* Resolution & Size */}
                        <div>
                          <label className="text-[11px] font-black text-slate-900 block mb-1">
                            Pilihan Resolusi / Ukuran:
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              value={m.size}
                              onChange={(e) => handleUpdateMediaItem(m.id, 'size', e.target.value)}
                              className="w-full px-2 py-2 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-black text-slate-950"
                              title="Ukuran lebar tampilan"
                            >
                              <option value="small">Kecil (~320px)</option>
                              <option value="medium">Sedang (~520px)</option>
                              <option value="large">Besar (~768px)</option>
                              <option value="full">Penuh (100%)</option>
                            </select>

                            <select
                              value={m.resolution || 'fhd_1080p'}
                              onChange={(e) => handleUpdateMediaItem(m.id, 'resolution', e.target.value)}
                              className="w-full px-2 py-2 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-black text-slate-950"
                              title="Label ketajaman resolusi"
                            >
                              <option value="auto">Auto</option>
                              <option value="sd_480p">SD (480p)</option>
                              <option value="hd_720p">HD (720p)</option>
                              <option value="fhd_1080p">FHD (1080p)</option>
                              <option value="4k_2160p">4K UHD</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Step Index Selector if placement === 'step' */}
                      {m.placement === 'step' && (
                        <div className="p-3 bg-purple-100 rounded-xl border border-purple-300 flex items-center justify-between gap-3">
                          <span className="text-xs font-black text-purple-950">
                            Tampilkan tepat di bawah petunjuk nomor:
                          </span>
                          <select
                            value={m.stepIndex || 0}
                            onChange={(e) => handleUpdateMediaItem(m.id, 'stepIndex', parseInt(e.target.value, 10))}
                            className="px-3 py-1.5 bg-white border-2 border-purple-400 rounded-lg text-xs font-black text-purple-950"
                          >
                            {editorForm.content
                              .split('\n')
                              .filter((l) => l.trim().length > 0)
                              .map((_, sIdx) => (
                                <option key={sIdx} value={sIdx}>
                                  Langkah {sIdx + 1}
                                </option>
                              ))}
                            {editorForm.content.split('\n').filter((l) => l.trim().length > 0).length === 0 && (
                              <option value={0}>Langkah 1 (Ketik instruksi di atas dulu)</option>
                            )}
                          </select>
                        </div>
                      )}

                      {/* Caption Input */}
                      <div>
                        <label className="text-[11px] font-black text-slate-800 block mb-1">
                          Keterangan / Deskripsi Media (Caption di bawah gambar/video):
                        </label>
                        <input
                          type="text"
                          value={m.caption || ''}
                          onChange={(e) => handleUpdateMediaItem(m.id, 'caption', e.target.value)}
                          placeholder="Contoh: Ilustrasi sudut insisi steril pada luka operasi..."
                          className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-950"
                        />
                      </div>

                      {/* Live Thumbnail Preview if URL is present */}
                      {m.url && (
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-600 uppercase">Pratinjau:</span>
                          <div className="w-16 h-12 rounded-lg bg-black overflow-hidden relative border border-slate-300 shrink-0">
                            {m.type === 'video' ? (
                              <div className="w-full h-full flex items-center justify-center text-white bg-rose-900 text-[10px] font-black">
                                🎬 Video
                              </div>
                            ) : (
                              <img src={m.url} alt="Preview" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <span className="text-[11px] text-emerald-800 font-bold truncate">
                            ✓ Berkas siap ditampilkan ({m.placement.toUpperCase()}, Rasio {m.aspectRatio})
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* External References & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-900 block mb-1">
                    Judul Rujukan Resmi (Opsional):
                  </label>
                  <input
                    type="text"
                    value={editorForm.externalTitle}
                    onChange={(e) => setEditorForm((p) => ({ ...p, externalTitle: e.target.value }))}
                    placeholder="Contoh: Pedoman Standar PPNI / Kemenkes"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-bold text-slate-950"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 block mb-1">
                    URL Rujukan Resmi (Link web):
                  </label>
                  <input
                    type="url"
                    value={editorForm.externalUrl}
                    onChange={(e) => setEditorForm((p) => ({ ...p, externalUrl: e.target.value }))}
                    placeholder="https://kemkes.go.id/..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-bold text-slate-950"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-slate-900 block mb-1">
                    Tag / Label (Pisahkan dengan koma):
                  </label>
                  <input
                    type="text"
                    value={editorForm.tags}
                    onChange={(e) => setEditorForm((p) => ({ ...p, tags: e.target.value }))}
                    placeholder="Puasa, Bedah, Luka, Anestesi, ERACS"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-purple-200 rounded-xl text-xs font-bold text-slate-950"
                  />
                </div>
              </div>
            </form>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-purple-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl text-xs font-black transition-colors"
              >
                Batal
              </button>

              <button
                type="submit"
                form="edu-editor-form"
                className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md shadow-purple-300 transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Modul Edukasi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. LIGHTBOX MODAL (Full Resolution Image / GIF Viewer) */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-fadeIn"
          onClick={() => setLightboxMedia(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxMedia(null)}
              className="absolute -top-12 right-0 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black flex items-center gap-1 transition-colors backdrop-blur-xs"
            >
              <X className="w-4 h-4" />
              <span>Tutup Pratinjau</span>
            </button>

            <img
              src={lightboxMedia.url}
              alt={lightboxMedia.title}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border-2 border-white/20"
            />

            {lightboxMedia.caption && (
              <div className="mt-3 p-3 bg-slate-900/90 text-white text-xs font-bold rounded-xl border border-slate-700 text-center max-w-2xl">
                {lightboxMedia.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
