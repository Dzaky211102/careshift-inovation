import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Crop, Move } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  aspectRatio?: 'square' | 'wide';
  title?: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  aspectRatio = 'square',
  title = 'Edit Ukuran & Pangkas Foto',
  onCropComplete,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleCrop = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    const cropWidth = aspectRatio === 'square' ? 400 : 640;
    const cropHeight = aspectRatio === 'square' ? 400 : 360;

    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cropWidth, cropHeight);

    ctx.save();
    ctx.translate(cropWidth / 2, cropHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const baseDisplay = 280;
    const ratio = cropWidth / baseDisplay;
    const naturalRatio = baseDisplay / Math.max(img.naturalWidth, img.naturalHeight);
    const drawW = img.naturalWidth * (scale * ratio * naturalRatio);
    const drawH = img.naturalHeight * (scale * ratio * naturalRatio);

    ctx.drawImage(
      img,
      -drawW / 2 + position.x * ratio,
      -drawH / 2 + position.y * ratio,
      drawW,
      drawH
    );

    ctx.restore();
    onCropComplete(canvas.toDataURL('image/jpeg', 0.9));
    onClose();
  }, [aspectRatio, position, rotation, scale, onCropComplete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="clay-card bg-white w-full max-w-md p-5 border border-purple-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-slate-800 text-sm md:text-base">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400">
                Geser dan sesuaikan zoom untuk hasil terbaik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full h-72 bg-slate-900/90 rounded-2xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none shadow-inner"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop target"
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              maxWidth: '85%',
              maxHeight: '85%',
              objectFit: 'contain',
            }}
            className="pointer-events-none drop-shadow-lg"
          />

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] ${
                aspectRatio === 'square' ? 'w-56 h-56 rounded-3xl' : 'w-64 h-48 rounded-2xl'
              } relative overflow-hidden`}
            >
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 border border-white/20">
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-white/25" />
                <div className="border-r border-white/25" />
                <div />
              </div>
            </div>
          </div>

          <div className="absolute bottom-2 left-3 text-[10px] text-white/80 bg-slate-900/80 px-2.5 py-1 rounded-full pointer-events-none flex items-center gap-1">
            <Move className="w-3 h-3 text-purple-300" />
            <span>Tarik / Geser Foto</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
              className="w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 flex items-center justify-center shrink-0"
              title="Perkecil Foto"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-purple-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
            />
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.15))}
              className="w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 flex items-center justify-center shrink-0"
              title="Perbesar Foto"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs font-bold text-slate-600 w-10 text-right">
              {Math.round(scale * 100)}%
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Putar 90°</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setRotation(0);
                  setPosition({ x: 0, y: 0 });
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
              >
                Reset
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCrop}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 flex items-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Terapkan</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
