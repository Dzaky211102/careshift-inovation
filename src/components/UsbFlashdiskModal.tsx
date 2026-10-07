import React, { useState, useEffect } from 'react';
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

/**
 * Generate a high-resolution healthcare nurse SVG avatar as Data URL
 * used when a nurse photo cannot be loaded or is unavailable.
 */
function createMedicalAvatarSvgDataUrl(name: string, role: string): string {
  const initial = (name || 'N').trim().charAt(0).toUpperCase();
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4F46E5" />
        <stop offset="100%" stop-color="#7C3AED" />
      </linearGradient>
      <linearGradient id="scrubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#059669" />
        <stop offset="100%" stop-color="#047857" />
      </linearGradient>
      <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FCD34D" />
        <stop offset="100%" stop-color="#F59E0B" />
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#bgGrad)" />
    <!-- Ambient glow circle -->
    <circle cx="300" cy="300" r="240" fill="rgba(255,255,255,0.08)" />
    
    <!-- Body / Scrubs -->
    <path d="M 170 540 Q 300 450 430 540 L 430 600 L 170 600 Z" fill="url(#scrubGrad)" />
    <!-- V-neck of scrubs -->
    <path d="M 260 480 L 300 530 L 340 480 Z" fill="#FCD34D" />
    <!-- Medical Stethoscope on shoulders -->
    <path d="M 230 490 Q 300 580 370 490" fill="none" stroke="#E2E8F0" stroke-width="14" stroke-linecap="round" />
    <circle cx="300" cy="570" r="16" fill="#CBD5E1" stroke="#475569" stroke-width="4" />
    
    <!-- Neck -->
    <rect x="270" y="380" width="60" height="110" rx="10" fill="url(#skinGrad)" />
    
    <!-- Head / Face -->
    <ellipse cx="300" cy="300" rx="110" ry="130" fill="url(#skinGrad)" />
    
    <!-- Hair / Medical Cap -->
    <path d="M 185 270 Q 300 130 415 270 Q 400 170 300 170 Q 200 170 185 270 Z" fill="#1E293B" />
    
    <!-- Eyes -->
    <circle cx="260" cy="290" r="10" fill="#1E293B" />
    <circle cx="340" cy="290" r="10" fill="#1E293B" />
    <!-- Smile -->
    <path d="M 270 340 Q 300 375 330 340" fill="none" stroke="#B45309" stroke-width="6" stroke-linecap="round" />
    
    <!-- Cross Symbol Badge -->
    <circle cx="300" cy="110" r="34" fill="#EF4444" />
    <rect x="294" y="90" width="12" height="40" fill="#FFFFFF" rx="2" />
    <rect x="280" y="104" width="40" height="12" fill="#FFFFFF" rx="2" />
    
    <!-- Initials Badge -->
    <rect x="230" y="420" width="140" height="40" rx="12" fill="rgba(255,255,255,0.9)" />
    <text x="300" y="446" font-family="Arial, sans-serif" font-weight="bold" font-size="20" fill="#1E1B4B" text-anchor="middle">${initial} · PERAWAT</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Safely loads any image URL (data, blob, or external HTTP)
 * converting it to a reliable HTMLImageElement without CORS tainting.
 */
async function loadNursePhotoSafely(
  photoUrl: string | undefined,
  nurseName: string,
  nurseRole: string
): Promise<HTMLImageElement> {
  // Helper to construct HTMLImageElement from a URL
  const createImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  // 1. If no URL provided, return medical avatar
  if (!photoUrl || photoUrl.trim().length === 0) {
    const avatarUrl = createMedicalAvatarSvgDataUrl(nurseName, nurseRole);
    return createImageElement(avatarUrl);
  }

  const cleanUrl = photoUrl.trim();

  // 2. If already a Base64 data URL or blob URL, load directly
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
    try {
      return await createImageElement(cleanUrl);
    } catch {
      // fallback
    }
  }

  // 3. Strategy A: Fetch image as Blob with cache-buster, then convert to Base64 Data URL
  try {
    const cacheBusted = cleanUrl.includes('?')
      ? `${cleanUrl}&cors_bypass=${Date.now()}`
      : `${cleanUrl}?cors_bypass=${Date.now()}`;
    const res = await fetch(cacheBusted, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return await createImageElement(base64Data);
    }
  } catch (err) {
    // console.warn('Direct CORS blob fetch failed, trying proxy...', cleanUrl);
  }

  // 4. Strategy B: High-availability image proxy (weserv.nl) which attaches Access-Control-Allow-Origin: *
  try {
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=800&h=800&fit=cover&output=jpg`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return await createImageElement(base64Data);
    }
  } catch (err) {
    // console.warn('Proxy fetch failed, trying standard image load...', err);
  }

  // 5. Strategy C: Standard Image with crossOrigin = 'anonymous'
  try {
    const testImg = new Image();
    testImg.crossOrigin = 'anonymous';
    const loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      testImg.onload = () => resolve(testImg);
      testImg.onerror = reject;
      testImg.src = cleanUrl.includes('?') ? `${cleanUrl}&t=${Date.now()}` : `${cleanUrl}?t=${Date.now()}`;
    });

    // Test if canvas is taint-free
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 10;
    testCanvas.height = 10;
    const testCtx = testCanvas.getContext('2d');
    if (testCtx) {
      testCtx.drawImage(loadedImg, 0, 0, 10, 10);
      testCanvas.toDataURL(); // Will throw SecurityError if tainted
      return loadedImg;
    }
  } catch (err) {
    // Canvas tainted or image failed
  }

  // 6. Strategy D: Fallback to high-res medical vector avatar
  const fallbackSvgUrl = createMedicalAvatarSvgDataUrl(nurseName, nurseRole);
  return await createImageElement(fallbackSvgUrl);
}

/**
 * Draws an image with object-fit: cover and optional rounded corners on Canvas.
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 0
) {
  const nw = img.naturalWidth || img.width || 500;
  const nh = img.naturalHeight || img.height || 500;
  if (!nw || !nh) return;

  const imgRatio = nw / nh;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = nw;
  let sh = nh;

  if (imgRatio > targetRatio) {
    sw = nh * targetRatio;
    sx = (nw - sw) / 2;
  } else {
    sh = nw / targetRatio;
    sy = (nh - sh) / 2;
  }

  ctx.save();
  ctx.beginPath();
  if (radius > 0 && typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
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
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [generatedSlides, setGeneratedSlides] = useState<GeneratedSlide[]>([]);
  const [previewSlideIdx, setPreviewSlideIdx] = useState<number>(0);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

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

  // Draw bottom footer
  const drawSlideFooter = (ctx: CanvasRenderingContext2D, st: AppSettings) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(60, 960, 1800, 70, 18);
      ctx.fill();
    } else {
      ctx.fillRect(60, 960, 1800, 70);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `CareShift TV Display System · ${st.hospitalName || 'Rumah Sakit'} · ${st.wardName || 'Ruang Rawat Inap'}`,
      100,
      1004
    );

    ctx.fillStyle = '#A5B4FC';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Tayangan USB Flashdisk 16:9 Full HD 1080p', 1820, 1004);
    ctx.textAlign = 'left';
  };

  // Render Slide 1: Overview
  const renderOverviewSlide = (
    loadedPhotosMap: Map<string, HTMLImageElement>
  ): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Gradient background
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

    // Decorative circles
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.arc(200, 200, 350, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1750, 850, 450, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Top Header Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(60, 50, 1800, 120, 24);
      ctx.fill();
    } else {
      ctx.fillRect(60, 50, 1800, 120);
    }
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
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(1400, 75, 420, 70, 20);
      ctx.fill();
    } else {
      ctx.fillRect(1400, 75, 420, 70);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentConfig.name.toUpperCase()} (${startDot} - ${endDot} WITA)`, 1610, 120);
    ctx.textAlign = 'left';

    // Title Section
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

    // Grid cards with Nurse Photo and Info
    const cols = activeNursesList.length > 3 ? 3 : activeNursesList.length || 1;
    const cardW = (1800 - (cols - 1) * 30) / cols;
    const cardH = activeNursesList.length > 3 ? 280 : 360;

    activeNursesList.slice(0, 6).forEach((n, idx) => {
      const colIdx = idx % cols;
      const rowIdx = Math.floor(idx / cols);
      const x = 60 + colIdx * (cardW + 30);
      const y = 370 + rowIdx * (cardH + 30);

      // Card Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, cardW, cardH, 20);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, cardW, cardH);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Nurse Photo on the Card (Left side of card)
      const photoSize = cardH > 300 ? 140 : 110;
      const photoX = x + 24;
      const photoY = y + (cardH - photoSize) / 2;

      const nurseImg = loadedPhotosMap.get(n.id);
      if (nurseImg) {
        drawImageCover(ctx, nurseImg, photoX, photoY, photoSize, photoSize, 20);

        // Photo border ring
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(photoX, photoY, photoSize, photoSize, 20);
          ctx.stroke();
        }
      }

      // Details to the right of photo
      const textLeft = photoX + photoSize + 20;
      const availableTextWidth = cardW - (photoSize + 60);

      // Role Badge
      ctx.fillStyle = badgeBg;
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(textLeft, y + 30, Math.min(availableTextWidth, 230), 36, 12);
        ctx.fill();
      } else {
        ctx.fillRect(textLeft, y + 30, Math.min(availableTextWidth, 230), 36);
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(n.role || 'Perawat Jaga', textLeft + 16, y + 54);

      // Nurse Name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(n.name, textLeft, y + 105);

      // NIP
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '500 18px monospace';
      ctx.fillText(n.nip || 'NIP Terdaftar', textLeft, y + 138);

      // Status Pill
      ctx.fillStyle = '#34D399';
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('● Siaga di Ruangan', textLeft, y + 180);
    });

    drawSlideFooter(ctx, settings);
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  // Render Slide 2+: Individual Nurse Slide
  const renderIndividualNurseSlide = (
    nurse: Nurse,
    loadedImg: HTMLImageElement
  ): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Shift Color Themes
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

    // Decorative circles
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.arc(250, 300, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1700, 800, 500, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Top Header Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(60, 50, 1800, 120, 24);
      ctx.fill();
    } else {
      ctx.fillRect(60, 50, 1800, 120);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(settings.hospitalName || 'RS Citra Sehat Care', 100, 105);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(settings.wardName || 'Ruang Rawat Inap Teratai', 100, 142);

    // Shift Badge
    ctx.fillStyle = badgeBg;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(1400, 75, 420, 70, 20);
      ctx.fill();
    } else {
      ctx.fillRect(1400, 75, 420, 70);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentConfig.name.toUpperCase()} (${startDot} - ${endDot} WITA)`, 1610, 120);
    ctx.textAlign = 'left';

    // LEFT: PROMINENT NURSE PHOTO (580 x 580 px)
    const photoX = 140;
    const photoY = 260;
    const photoSize = 580;

    // Draw the actual photo with cover fit
    drawImageCover(ctx, loadedImg, photoX, photoY, photoSize, photoSize, 40);

    // Photo Border Frame
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 10;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(photoX, photoY, photoSize, photoSize, 40);
      ctx.stroke();
    }

    // Role Badge Under Photo
    ctx.fillStyle = badgeBg;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(photoX + 50, photoY + photoSize - 35, photoSize - 100, 70, 35);
      ctx.fill();
    } else {
      ctx.fillRect(photoX + 50, photoY + photoSize - 35, photoSize - 100, 70);
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(photoX + 50, photoY + photoSize - 35, photoSize - 100, 70, 35);
      ctx.stroke();
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(nurse.role, photoX + photoSize / 2, photoY + photoSize + 10);
    ctx.textAlign = 'left';

    // RIGHT: NURSE DETAILS & DUTIES
    const textX = 800;

    // Status Pill
    ctx.fillStyle = 'rgba(52, 211, 153, 0.2)';
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(textX, 260, 480, 50, 16);
      ctx.fill();
    } else {
      ctx.fillRect(textX, 260, 480, 50);
    }
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
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(textX, 425, 340, 50, 14);
      ctx.fill();
    } else {
      ctx.fillRect(textX, 425, 340, 50);
    }
    ctx.fillStyle = '#E0E7FF';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(nurse.nip, textX + 20, 458);

    ctx.fillStyle = 'rgba(129, 140, 248, 0.25)';
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(textX + 360, 425, 360, 50, 14);
      ctx.fill();
    } else {
      ctx.fillRect(textX + 360, 425, 360, 50);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(settings.wardName || 'Ruang Rawat Inap', textX + 380, 458);

    // Duty Focus Box
    const boxY = 515;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(textX, boxY, 960, 310, 24);
      ctx.fill();
    } else {
      ctx.fillRect(textX, boxY, 960, 310);
    }
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

    drawSlideFooter(ctx, settings);
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  // Generate All Slides when modal opens or shift changes
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    const generateAll = async () => {
      setIsGenerating(true);
      setGenerationStatus('Memuat foto perawat beresolusi tinggi...');

      // 1. PRELOAD ALL ON-DUTY NURSE PHOTOS FIRST
      const loadedPhotosMap = new Map<string, HTMLImageElement>();
      for (let i = 0; i < activeNursesList.length; i++) {
        const nurse = activeNursesList[i];
        setGenerationStatus(`Memuat foto perawat (${i + 1}/${activeNursesList.length}): ${nurse.name}...`);
        const img = await loadNursePhotoSafely(nurse.photoUrl, nurse.name, nurse.role);
        if (isCancelled) return;
        loadedPhotosMap.set(nurse.id, img);
      }

      setGenerationStatus('Menyusun tata letak slide TV 1080p...');
      const slides: GeneratedSlide[] = [];

      // 2. Overview Slide with nurse photo thumbnails
      const overviewDataUrl = renderOverviewSlide(loadedPhotosMap);
      if (isCancelled) return;
      slides.push({
        filename: `01_Tampilan_Utama_${selectedShiftId.toUpperCase()}.jpg`,
        title: `Slide 1: Ringkasan Sif ${currentConfig.name}`,
        dataUrl: overviewDataUrl,
        type: 'overview',
      });

      // 3. Individual Nurse Slides with large nurse photos
      for (let i = 0; i < activeNursesList.length; i++) {
        const nurse = activeNursesList[i];
        setGenerationStatus(`Membuat slide ${i + 2}: ${nurse.name}...`);
        const nurseImg = loadedPhotosMap.get(nurse.id)!;
        const nurseDataUrl = renderIndividualNurseSlide(nurse, nurseImg);
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
      setGenerationStatus('');
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

      // 1. Add all Full HD JPG images with actual nurse photos
      generatedSlides.forEach((slide) => {
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
     "${folderName}" atau semua foto (.jpg) ke dalam Flashdisk Anda.

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
     Dengan begini, slide perawat akan berputar bergantian secara otomatis tanpa henti.

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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Foto Perawat Otomatis Tersinkron
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Format TV 16:9 Full HD 1080p
              </span>
            </div>
            <h3 className="font-display font-black text-xl text-slate-800 leading-tight mt-0.5">
              Paket Slide Show Flashdisk USB untuk TV
            </h3>
            <p className="text-xs text-slate-500">
              Foto perawat otomatis disematkan dalam resolusi tinggi 1920x1080 untuk diputar berulang di TV LED/LCD via port USB.
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
                Paket ZIP Flashdisk berhasil diunduh lengkap dengan foto seluruh perawat! Silakan ekstrak dan salin ke Flashdisk USB Anda.
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
                  {generationStatus || 'Memproses foto perawat Full HD 1920x1080...'}
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
                  Unduh paket ZIP di bawah, ekstrak filenya, lalu salin folder foto perawat ke Flashdisk USB Anda.
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
            <span>Foto perawat otomatis disematkan langsung ke dalam file JPEG 1920x1080 Full HD (tanpa risiko CORS/foto kosong).</span>
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
