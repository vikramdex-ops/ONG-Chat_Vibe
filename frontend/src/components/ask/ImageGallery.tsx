import React, { useEffect, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Download,
  X,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { ImageResult } from '../../types';

interface ImageGalleryProps {
  images: ImageResult[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!isZoomModalOpen) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isZoomModalOpen, currentIndex]);

  if (!images || images.length === 0) {
    return (
      <div className="panel p-5">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-line">
          <ImageIcon className="w-4 h-4 text-fg-muted" />
          <h3 className="font-semibold text-sm text-fg">Relevant Images</h3>
        </div>
        <div className="py-8 flex flex-col items-center justify-center text-center text-fg-muted text-xs">
          <ImageIcon className="w-8 h-8 text-fg-muted mb-2" />
          <span>No relevant images found for this query.</span>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const clampScale = (value: number) => Math.min(4, Math.max(1, value));

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = clampScale(scale + (e.deltaY < 0 ? 0.15 : -0.15));
    setScale(next);
    if (next === 1) setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.x),
      y: dragRef.current.oy + (e.clientY - dragRef.current.y),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-sm text-fg">Relevant Images</h3>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-700/40 text-indigo-700 dark:text-indigo-300">
            {images.length} found
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-fg-muted">
            Image <span className="text-fg font-semibold">{currentIndex + 1}</span> of {images.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={images.length <= 1}
              className="p-1 rounded-lg bg-surface-muted hover:bg-line disabled:opacity-40 disabled:hover:bg-surface-muted text-fg transition-colors"
              title="Previous Image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={images.length <= 1}
              className="p-1 rounded-lg bg-surface-muted hover:bg-line disabled:opacity-40 disabled:hover:bg-surface-muted text-fg transition-colors"
              title="Next Image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative group bg-surface-input border border-line rounded-xl overflow-hidden flex items-center justify-center min-h-[220px] max-h-[340px]">
        <img
          src={currentImage.url}
          alt={currentImage.filename}
          className="max-h-[320px] max-w-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.01]"
          onClick={() => setIsZoomModalOpen(true)}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-card/90 backdrop-blur-md p-1 rounded-lg border border-line">
          <button
            type="button"
            onClick={() => setIsZoomModalOpen(true)}
            className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors"
            title="Zoom / Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <a
            href={currentImage.url}
            download={currentImage.filename}
            className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors"
            title="Download Image"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-surface-card/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-line text-[11px] text-fg">
          <FileText className="w-3 h-3 text-fg-muted" />
          <span className="truncate max-w-[180px]">{currentImage.source}</span>
          <span className="text-fg-muted font-mono">• Page {currentImage.page}</span>
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                currentIndex === idx
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'border-line hover:border-blue-300 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {isZoomModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 dark:bg-black/85 backdrop-blur-sm"
          onClick={() => setIsZoomModalOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl max-h-[90vh] bg-surface-card border border-line rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 px-4 border-b border-line flex items-center justify-between bg-surface-muted/70 shrink-0">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-fg truncate">{currentImage.filename}</div>
                <div className="text-[10px] text-fg-muted font-mono truncate">
                  {currentImage.source} • Page {currentImage.page}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" className="p-1.5 rounded-lg hover:bg-surface-card text-fg" onClick={() => setScale((s) => clampScale(s - 0.25))} title="Zoom out">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono w-12 text-center text-fg">{Math.round(scale * 100)}%</span>
                <button type="button" className="p-1.5 rounded-lg hover:bg-surface-card text-fg" onClick={() => setScale((s) => clampScale(s + 0.25))} title="Zoom in">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-surface-card text-fg"
                  onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <a
                  href={currentImage.url}
                  download={currentImage.filename}
                  className="p-1.5 rounded-lg hover:bg-surface-card text-fg"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button type="button" className="p-1.5 rounded-lg hover:bg-surface-card text-fg" onClick={() => setIsZoomModalOpen(false)} title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className="flex-1 min-h-[50vh] max-h-[85vh] overflow-hidden flex items-center justify-center bg-surface-input cursor-grab active:cursor-grabbing"
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <img
                src={currentImage.url}
                alt={currentImage.filename}
                draggable={false}
                className="max-h-[85vh] max-w-full object-contain select-none"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center center' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
