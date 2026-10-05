import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  Usb,
  Download,
  X,
  Tv,
  CheckCircle2,
  FileArchive,
  Image as ImageIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  SunMedium,
  Moon,
  Info,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Nurse, AppSettings, ShiftDuty, ShiftConfig } from '../types';
import { normalizeTimeToDot } from '../utils/witaTime';

interface UsbFlashdiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  nurses: Nurse[];
  schedules: ShiftDuty[];
  settings: AppSettings;
  currentShift: string;
}

interface GeneratedSlide {
  filename: string;
  title: string;
  dataUrl: string;
  type: 'overview' | 'nurse';
}

export const UsbFlashdiskModal: React.FC<UsbFlashdiskModalProps> = ({
  isOpen,
  onClose,
  nurses,
  schedules,
  settings,
  currentShift,
}) => {
  const [selectedShiftId, setSelectedShiftId] = useState<string>(currentShift || 'pagi');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedSlides, setGeneratedSlides] = useState<GeneratedSlide[]>([]);
  const [previewSlideIdx, setPreviewSlideIdx] = useState<number>(0);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const shiftConfigs = settings.shiftConfigs || [
    { id: 'pagi', name: 'Sif Pagi', startTime: '07:00', endTime: '14:00', colorTheme: 'amber' },
    { id: 'siang', name: 'Sif Siang', startTime: '14:00', endTime: '21:00', colorTheme: 'orange' },
    { id: 'malam', name: 'Sif Malam', startTime: '21:00', endTime: '07:00', colorTheme: 'indigo' },
  ];

  const currentConfig = shiftConfigs.find((c) => c.id === selectedShiftId) || shiftConfigs[0];
  const startDot = normalizeTimeToDot(currentConfig.startTime);
  const endDot = normalizeTimeToDot(currentConfig.endTime);

  // Today's schedule date (or most recent duty)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const shiftDuty =
    schedules.find((s) => s.date === todayDateStr && s.shift === selectedShiftId) ||
    schedules.find((s) => s.shift === selectedShiftId);
  const assignedNurseIds = shiftDuty?.nurseIds || [];
  const assignedNurses = nurses.filter((n) => assignedNurseIds.includes(n.id));
  const activeNursesList = assignedNurses.length > 0 ? assignedNurses : nurses.slice(0, 4);

  // Generate 1920x1080 Full HD slide image using HTML5 Canvas
  const renderSlideToCanvas = async (
    type: 'overview' | 'nurse',
    nurse?: Nurse
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // Background Gradient based on shift
      let gradStart = '#1E1B4B';
      let gradMid = '#312E81';
      let gradEnd = '#0F172A';
      let accentHex = '#818CF8';
      let badgeBg = '#4F46E5';

      if (selectedShiftId === 'pagi') {
        gradStart = '#451A03';
        gradMid = '#78350F';
        gradEnd = '#1E1B4B';
        accentHex = '#FBBF24';
        badgeBg = '#D97706';
      } else if (selectedShiftId === 'siang') {
        gradStart = '#4C0519';
        gradMid = '#831843';
        gradEnd = '#1E1B4B';
        accentHex = '#FB7185';
        badgeBg = '#E11D48';
      }

      const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
      bgGrad.addColorStop(0, gradStart);
      bgGrad.addColorStop(0.5, gradMid);
      bgGrad.addColorStop(1, gradEnd);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1920, 1080);

      // Subtle decorative ambient circles
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.arc(200, 200, 350, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(1750, 850, 450, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Top Header Bar Container
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.roundRect?.(60, 50, 1800, 120, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Header Text: Hospital & Ward Name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(settings.hospitalName || 'RS Citra Sehat Care', 100, 105);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(settings.wardName || 'Ruang Rawat Inap Teratai', 100, 142);

      // Shift Badge Top Right
      ctx.fillStyle = badgeBg;
      ctx.roundRect?.(1400, 75, 420, 70, 20);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentConfig.name.toUpperCase()} (${startDot} - ${endDot} WITA)`, 1610, 120);
      ctx.textAlign = 'left';

      if (type === 'overview') {
        // OVERVIEW SLIDE: Lists all nurses on duty
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 48px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`TIM PERAWAT JAGA HARI INI`, 100, 260);

        ctx.fillStyle = accentHex;
        ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(
          `Standar Pelayanan Prima & Siaga Ruangan · ${activeNursesList.length} Perawat Bertugas`,
          100,
          310
        );

        // Grid cards of nurses (up to 6)
        const cols = activeNursesList.length > 3 ? 3 : activeNursesList.length || 1;
        const cardW = (1800 - (cols - 1) * 30) / cols;
        const cardH = activeNursesList.length > 3 ? 280 : 420;

        activeNursesList.slice(0, 6).forEach((n, idx) => {
          const colIdx = idx % cols;
          const rowIdx = Math.floor(idx / cols);
          const x = 60 + colIdx * (cardW + 30);
          const y = 370 + rowIdx * (cardH + 30);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.roundRect?.(x, y, cardW, cardH, 20);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Role Badge
          ctx.fillStyle = badgeBg;
          ctx.roundRect?.(x + 24, y + 24, Math.min(cardW - 48, 220), 40, 12);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(n.role || 'Perawat Jaga', x + 38, y + 50);

          // Nurse Name
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(n.name, x + 24, y + 110);

          // NIP
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = '500 20px monospace';
          ctx.fillText(n.nip || 'NIP Terdaftar', x + 24, y + 145);

          // Status Siaga
          ctx.fillStyle = '#34D399';
          ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
          ctx.fillText('● Siaga di Ruangan', x + 24, y + 190);
        });

        // Footer Bar
        drawSlideFooter(ctx, settings);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } else if (nurse) {
        // INDIVIDUAL NURSE SLIDE
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const proceedDrawNurse = () => {
          // Left: Nurse Photo Container (Square with rounded corners & ring)
          const photoX = 140;
          const photoY = 260;
          const photoSize = 580;

          ctx.save();
          ctx.beginPath();
          ctx.roundRect?.(photoX, photoY, photoSize, photoSize, 40);
          ctx.clip();

          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
          } else {
            // Gradient avatar placeholder
            const avGrad = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
            avGrad.addColorStop(0, '#A855F7');
            avGrad.addColorStop(1, '#6366F1');
            ctx.fillStyle = avGrad;
            ctx.fillRect(photoX, photoY, photoSize, photoSize);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 180px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(nurse.name.charAt(0), photoX + photoSize / 2, photoY + photoSize / 2 + 60);
            ctx.textAlign = 'left';
          }
          ctx.restore();

          // Photo Frame Border
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 10;
          ctx.roundRect?.(photoX, photoY, photoSize, photoSize, 40);
          ctx.stroke();

          // Role Badge Under Photo
          ctx.fillStyle = badgeBg;
          ctx.roundRect?.(photoX + 50, photoY + photoSize - 35, photoSize - 100, 70, 35);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(nurse.role, photoX + photoSize / 2, photoY + photoSize + 10);
          ctx.textAlign = 'left';

          // Right Details Panel
          const textX = 800;

          // Status Pill
          ctx.fillStyle = 'rgba(52, 211, 153, 0.2)';
          ctx.roundRect?.(textX, 260, 480, 50, 16);
          ctx.fill();
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#6EE7B7';
          ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(`● PERAWAT JAGA ${currentConfig.name.toUpperCase()} (${startDot} - ${endDot})`, textX + 25, 294);

          // Nurse Name
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 56px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(nurse.name, textX, 390);

          // NIP & Unit info tags
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.roundRect?.(textX, 425, 340, 50, 14);
          ctx.fill();
          ctx.fillStyle = '#E0E7FF';
          ctx.font = 'bold 22px monospace';
          ctx.fillText(nurse.nip, textX + 20, 458);

          ctx.fillStyle = 'rgba(129, 140, 248, 0.25)';
          ctx.roundRect?.(textX + 360, 425, 360, 50, 14);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
          ctx.fillText('Ruang Rawat Inap Bedah', textX + 380, 458);

          // Duty Focus Box
          const boxY = 515;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.roundRect?.(textX, boxY, 960, 310, 24);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = accentHex;
          ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
          ctx.fillText('★ FOKUS TUGAS & KESIAPSIAGAAN PELAYANAN', textX + 35, boxY + 55);

          const duties =
            selectedShiftId === 'pagi'
              ? [
                  'Pendampingan Visit Dokter Spesialis & Evaluasi Pasca-Tindakan',
                  'Pemberian Terapi Obat Pagi & Persiapan Pasien Jadwal Operasi',
                  'Edukasi Pasien & Keluarga Terkait Tata Tertib Ruangan',
                ]
              : selectedShiftId === 'siang'
              ? [
                  'Observasi & Pemulihan Pasien Pasca-Operasi (Post-Op di Ruangan)',
                  'Pendampingan Mobilisasi Dini & Perawatan Luka Steril',
                  'Edukasi Pasien dan Keluarga pada Jam Kunjungan Siang/Sore',
                ]
              : [
                  'Menciptakan Suasana Tenang & Nyaman untuk Istirahat Pasien',
                  'Ronda Malam Berkala, Pemantauan Tanda Vital & Cairan Infus',
                  'Kesiapsiagaan Cepat Merespons Panggilan Bel (Nurse Call) 24 Jam',
                ];

          ctx.fillStyle = '#F1F5F9';
          ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
          duties.forEach((d, dIdx) => {
            ctx.fillText(`✓  ${d}`, textX + 35, boxY + 115 + dIdx * 55);
          });

          // Slogan / Motto
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = 'italic 24px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(
            `"Melayani dengan kehangatan, profesionalisme, dan komitmen kesembuhan pasien."`,
            textX,
            880
          );

          // Slide Footer
          drawSlideFooter(ctx, settings);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        };

        if (nurse.photoUrl) {
          img.src = nurse.photoUrl;
          img.onload = proceedDrawNurse;
          img.onerror = proceedDrawNurse;
        } else {
          proceedDrawNurse();
        }
      }
    });
  };

  const drawSlideFooter = (ctx: CanvasRenderingContext2D, st: AppSettings) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.roundRect?.(60, 960, 1800, 70, 18);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `CareShift TV Display System · ${st.hospitalName || 'Rumah Sakit'} · ${st.wardName || 'Ruangan'}`,
      100,
      1004
    );

    ctx.fillStyle = '#A5B4FC';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Tayangan USB Flashdisk 16:9 Full HD 1080p', 1820, 1004);
    ctx.textAlign = 'left';
  };

  // Generate All Slides when modal opens or shift changes
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    const generateAll = async () => {
      setIsGenerating(true);
      const slides: GeneratedSlide[] = [];

      // 1. Overview Slide
      const overviewDataUrl = await renderSlideToCanvas('overview');
      if (isCancelled) return;
      slides.push({
        filename: `01_Tampilan_Utama_${selectedShiftId.toUpperCase()}.jpg`,
        title: `Slide 1: Ringkasan Sif ${currentConfig.name}`,
        dataUrl: overviewDataUrl,
        type: 'overview',
      });

      // 2. Individual Nurse Slides
      for (let i = 0; i < activeNursesList.length; i++) {
        const nurse = activeNursesList[i];
        const nurseDataUrl = await renderSlideToCanvas('nurse', nurse);
        if (isCancelled) return;
        const cleanName = nurse.name.replace(/[^a-zA-Z0-9]/g, '_');
        slides.push({
          filename: `0${i + 2}_Perawat_${cleanName}.jpg`,
          title: `Slide ${i + 2}: ${nurse.name}`,
          dataUrl: nurseDataUrl,
          type: 'nurse',
        });
      }

      setGeneratedSlides(slides);
      setPreviewSlideIdx(0);
      setIsGenerating(false);
    };

    generateAll();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, selectedShiftId, nurses, schedules, settings]);

  // Build and Download ZIP for USB Flashdisk
  const handleDownloadZip = async () => {
    if (generatedSlides.length === 0) return;
    setIsDownloadingZip(true);

    try {
      const zip = new JSZip();
      const folderName = `CareShift_TV_${selectedShiftId.toUpperCase()}`;
      const folder = zip.folder(folderName) || zip;

      // 1. Add all Full HD JPG images
      generatedSlides.forEach((slide) => {
        // Strip data:image/jpeg;base64,
        const base64Data = slide.dataUrl.split(',')[1];
        if (base64Data) {
          folder.file(slide.filename, base64Data, { base64: true });
        }
      });

      // 2. Add instruction file TXT for hospital staff
      const instructionText = `========================================================================
PANDUAN MENAYANGKAN SLIDESHOW PERAWAT DI TV BIASA (NON-SMART TV) VIA USB
CareShift Display System · ${settings.hospitalName} · ${settings.wardName}
Sif: ${currentConfig.name.toUpperCase()} (${startDot} - ${endDot} WITA)
========================================================================

PETUNJUK PENGGUNAAN CEPAT:

1. PINDAHKAN FILE KE FLASHDISK USB:
   - Ekstrak seluruh file foto (.jpg) yang ada di dalam folder ini.
   - Colok Flashdisk USB ke laptop/komputer, lalu Salin (Copy) folder 
     "${folderName}" atau semua foto ke dalam Flashdisk Anda.

2. COLOK KE TV BIASA:
   - Tancapkan Flashdisk USB ke port USB yang ada di samping atau belakang TV.
   - Ambil Remote TV Anda.
   - Tekan tombol "SOURCE", "INPUT", atau "MEDIA" pada remote TV.
   - Pilih menu "USB" atau "FOTO / GAMBAR" (Photo / Picture).
   - Masuk ke folder foto CareShift.
   - Tekan tombol "PLAY" atau "SLIDESHOW" di remote TV.

3. PENGATURAN AGAR MENYALA 24 JAM TANPA HENTI (NON-STOP):
   - Buka menu "Pengaturan Slideshow" di TV Anda (biasanya tombol Option/Tools).
   - Durasi Slide: Atur ke 5 detik atau 10 detik per foto.
   - Efek Transisi: Pilih Fade / Acak / Normal.
   - Pengulangan (Repeat): Pastikan pilih "REPEAT ALL" / "ULANGI SEMUA".
     Dengan begini, slide akan berputar bergantian secara otomatis tanpa henti.

4. MENAMPILKAN MENGGUNAKAN LAPTOP / TV BOX (ALTERNATIF):
   - Jika memiliki laptop atau Android Box yang terhubung HDMI ke TV,
     Anda juga bisa membuka file "CareShift_TV_Offline_Player.html" 
     di browser tanpa perlu internet, lalu tekan F11 untuk layar penuh.

========================================================================
Dibuat otomatis oleh CareShift · Sistem Roster Perawat Terpadu
`;
      folder.file('PANDUAN_PUTAR_DI_TV_USB.txt', instructionText);

      // 3. Add standalone offline autoplay HTML file (runs in any browser without internet)
      const offlineHtmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>CareShift TV Offline Slideshow</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; }
    #slide-img { max-width: 100vw; max-height: 100vh; object-fit: contain; transition: opacity 0.6s ease-in-out; }
    #controls { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.6); padding: 8px 16px; border-radius: 20px; display: flex; gap: 10px; color: #fff; opacity: 0; transition: opacity 0.3s; }
    body:hover #controls { opacity: 1; }
    button { background: #6366F1; border: none; color: #fff; padding: 6px 14px; border-radius: 12px; cursor: pointer; font-weight: bold; }
  </style>
</head>
<body>
  <img id="slide-img" src="${generatedSlides[0]?.filename || ''}" alt="Slide">
  <div id="controls">
    <button onclick="prev()">❮ Sebelumnya</button>
    <button onclick="togglePlay()" id="playBtn">Pause</button>
    <button onclick="next()">Berikutnya ❯</button>
    <button onclick="toggleFull()">Layar Penuh (F11)</button>
  </div>
  <script>
    const slides = ${JSON.stringify(generatedSlides.map((s) => s.filename))};
    let idx = 0;
    let playing = true;
    let timer = null;
    const imgEl = document.getElementById('slide-img');
    const playBtn = document.getElementById('playBtn');

    function show(n) {
      idx = (n + slides.length) % slides.length;
      imgEl.style.opacity = 0;
      setTimeout(() => {
        imgEl.src = slides[idx];
        imgEl.style.opacity = 1;
      }, 300);
    }
    function next() { show(idx + 1); }
    function prev() { show(idx - 1); }
    function togglePlay() {
      playing = !playing;
      playBtn.innerText = playing ? 'Pause' : 'Play';
      if (playing) startTimer(); else clearInterval(timer);
    }
    function startTimer() {
      clearInterval(timer);
      timer = setInterval(next, 8000);
    }
    function toggleFull() {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }
    startTimer();
  </script>
</body>
</html>`;
      folder.file('CareShift_TV_Offline_Player.html', offlineHtmlContent);

      // 4. Download the generated ZIP package
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Paket_Slide_TV_Flashdisk_${selectedShiftId.toUpperCase()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating flashdisk zip:', err);
      alert('Terjadi kesalahan saat membuat paket ZIP flashdisk.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Download single image directly
  const handleDownloadSingleSlide = (slide: GeneratedSlide) => {
    const link = document.createElement('a');
    link.href = slide.dataUrl;
    link.download = slide.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const currentPreviewSlide = generatedSlides[previewSlideIdx] || generatedSlides[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-5 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="clay-card bg-white w-full max-w-4xl p-5 md:p-6 border border-purple-100 shadow-2xl relative rounded-3xl max-h-[92vh] flex flex-col justify-between overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-purple-100 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-300 shrink-0">
            <Usb className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Solusi TV Biasa (Bukan Smart TV)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Format TV 16:9 Full HD 1080p
              </span>
            </div>
            <h3 className="font-display font-black text-xl text-slate-800 leading-tight mt-0.5">
              Paket Slide Show Flashdisk USB untuk TV
            </h3>
            <p className="text-xs text-slate-500">
              Ubah jadwal perawat menjadi foto beresolusi tinggi 1920x1080 yang bisa diputar di TV LED/LCD biasa menggunakan flashdisk.
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Success Banner */}
          {downloadSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-2.5 shadow-sm animate-bounce">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs font-semibold">
                Paket ZIP Flashdisk berhasil diunduh! Silakan ekstrak dan salin file foto ke Flashdisk USB Anda.
              </div>
            </div>
          )}

          {/* Shift Selection Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-purple-50/60 rounded-2xl border border-purple-200">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Tv className="w-4 h-4 text-purple-600" />
              <span>Pilih Sif untuk Ditampilkan di TV:</span>
            </span>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {shiftConfigs.map((cfg) => {
                const isSelected = selectedShiftId === cfg.id;
                const ShiftIcon = cfg.id === 'pagi' ? Sun : cfg.id === 'siang' ? SunMedium : Moon;
                return (
                  <button
                    key={cfg.id}
                    onClick={() => setSelectedShiftId(cfg.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <ShiftIcon className="w-3.5 h-3.5" />
                    <span>{cfg.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 16:9 Slide Preview Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>
                  Pratinjau Layar TV 16:9 ({generatedSlides.length} Slide Terbuat)
                </span>
              </span>

              {generatedSlides.length > 0 && (
                <span className="text-[11px] font-mono text-purple-700 font-bold">
                  Slide {previewSlideIdx + 1} dari {generatedSlides.length}
                </span>
              )}
            </div>

            {isGenerating ? (
              <div className="aspect-video w-full rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-white gap-3 border border-slate-800">
                <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-xs font-semibold">
                  Membuat slide resolusi tinggi Full HD 1920x1080...
                </p>
              </div>
            ) : currentPreviewSlide ? (
              <div className="relative group rounded-2xl overflow-hidden shadow-lg border border-slate-300 bg-slate-950 aspect-video flex items-center justify-center">
                <img
                  src={currentPreviewSlide.dataUrl}
                  alt={currentPreviewSlide.title}
                  className="w-full h-full object-contain"
                />

                {/* Left/Right Navigation on hover */}
                {generatedSlides.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setPreviewSlideIdx((prev) =>
                          prev > 0 ? prev - 1 : generatedSlides.length - 1
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-opacity opacity-80 group-hover:opacity-100"
                      title="Slide Sebelumnya"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setPreviewSlideIdx((prev) => (prev + 1) % generatedSlides.length)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-opacity opacity-80 group-hover:opacity-100"
                      title="Slide Berikutnya"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Badge title overlay */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20">
                  {currentPreviewSlide.title}
                </div>

                {/* Single Image Download shortcut */}
                <button
                  onClick={() => handleDownloadSingleSlide(currentPreviewSlide)}
                  className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                  title="Unduh foto slide ini saja"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Foto Ini (.jpg)</span>
                </button>
              </div>
            ) : null}

            {/* Thumbnail Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
              {generatedSlides.map((slide, idx) => (
                <button
                  key={idx}
                  onClick={() => setPreviewSlideIdx(idx)}
                  className={`w-24 md:w-32 aspect-video rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    idx === previewSlideIdx
                      ? 'border-purple-600 ring-2 ring-purple-400 scale-102 shadow-md'
                      : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                  title={slide.title}
                >
                  <img
                    src={slide.dataUrl}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Simple Step-by-Step Instructions for Non-Smart TV */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>Cara Menjalankan di TV Biasa (Langkah demi Langkah):</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-purple-700 block">Langkah 1: Salin ke Flashdisk</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Unduh paket ZIP di bawah, ekstrak filenya, lalu salin folder foto ke Flashdisk USB Anda.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-purple-700 block">Langkah 2: Colok ke TV</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tancapkan Flashdisk ke lubang USB di samping/belakang TV. Tekan tombol <strong>SOURCE / INPUT</strong> di remote TV lalu pilih <strong>USB</strong>.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-purple-700 block">Langkah 3: Putar Slideshow</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Pilih menu <strong>Foto / Gambar</strong>, buka folder CareShift lalu tekan tombol <strong>PLAY</strong>. Aktifkan *Repeat All* agar berputar 24 jam!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Format foto standar JPEG 1920x1080 didukung oleh semua merk TV LED/LCD (Samsung, LG, Sharp, Polytron, dll).</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Tutup
            </button>

            <button
              type="button"
              disabled={isGenerating || isDownloadingZip || generatedSlides.length === 0}
              onClick={handleDownloadZip}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                !isGenerating && !isDownloadingZip && generatedSlides.length > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-300'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isDownloadingZip ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Membuat File ZIP...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh Paket Slide Flashdisk (.ZIP)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
