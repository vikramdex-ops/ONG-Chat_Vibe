import React, { useState } from 'react';
import {
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Download,
  X,
  FileText
} from 'lucide-react';
import { ImageResult } from '../../types';

interface ImageGalleryProps {
  images: ImageResult[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800/80">
          <ImageIcon className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-sm text-white">Relevant Images</h3>
        </div>
        <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
          <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
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

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/40 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-sm text-white">Relevant Images</h3>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-700/40 text-indigo-300">
            {images.length} found
          </span>
        </div>

        {/* Image Counter & Nav */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            Image <span className="text-white font-semibold">{currentIndex + 1}</span> of {images.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={images.length <= 1}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
              title="Previous Image (< Prev)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={images.length <= 1}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
              title="Next Image (Next >)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Image Frame */}
      <div className="relative group bg-slate-950/80 border border-slate-800/80 rounded-xl overflow-hidden flex items-center justify-center min-h-[220px] max-h-[340px]">
        <img
          src={currentImage.url}
          alt={currentImage.filename}
          className="max-h-[320px] max-w-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
          onClick={() => setIsZoomModalOpen(true)}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Hover Overlay Controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setIsZoomModalOpen(true)}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom / Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <a
            href={currentImage.url}
            download={currentImage.filename}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Download Image"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Source metadata bottom pill */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-slate-300">
          <FileText className="w-3 h-3 text-slate-400" />
          <span className="truncate max-w-[180px]">{currentImage.source}</span>
          <span className="text-slate-400 font-mono">• Page {currentImage.page}</span>
        </div>
      </div>

      {/* Thumbnails Row */}
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
                  : 'border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Zoom Modal */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setIsZoomModalOpen(false)}
              className="absolute -top-10 right-0 p-1.5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={currentImage.url}
              alt={currentImage.filename}
              className="max-w-full max-h-[80vh] object-contain rounded-lg border border-slate-800"
            />

            <div className="mt-3 flex items-center justify-between w-full text-xs text-slate-400 px-2 font-mono">
              <span>{currentImage.filename}</span>
              <span>{currentImage.source} (Page {currentImage.page})</span>
              <a
                href={currentImage.url}
                download={currentImage.filename}
                className="text-blue-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download Original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
