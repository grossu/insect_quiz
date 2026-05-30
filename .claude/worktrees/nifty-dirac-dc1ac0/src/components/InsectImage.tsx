import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut, ExternalLink, AlertCircle } from 'lucide-react';
import { InsectObservation } from '../types/insect';
import { getImageUrl, getImageSrcSet, preloadImage } from '../utils/imageUtils';

interface InsectImageProps {
  insect: InsectObservation;
}

interface NavButtonProps {
  direction: 'prev' | 'next';
  onClick: (e: React.MouseEvent) => void;
  size?: 'sm' | 'lg';
}

function NavButton({ direction, onClick, size = 'sm' }: NavButtonProps) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  const posClass = direction === 'prev' ? 'left-4' : 'right-4';
  const iconSize = size === 'lg' ? 32 : 24;
  const padding = size === 'lg' ? 'p-3' : 'p-2';

  return (
    <button
      onClick={onClick}
      className={`absolute ${posClass} top-1/2 -translate-y-1/2 ${padding} bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10`}
    >
      <Icon size={iconSize} />
    </button>
  );
}

export function InsectImage({ insect }: InsectImageProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const photos = insect.photos || [];
  const currentPhoto = photos[currentPhotoIndex];

  useEffect(() => {
    setCurrentPhotoIndex(0);
    setZoom(1);
    setImageError(false);
  }, [insect.id]);

  useEffect(() => {
    if (!currentPhoto?.url) return;
    setIsLoading(true);
    setImageError(false);
    preloadImage(getImageUrl(currentPhoto.url, 'large'))
      .then(() => setIsLoading(false))
      .catch(() => { setImageError(true); setIsLoading(false); });
  }, [currentPhoto?.url]);

  useEffect(() => {
    if (!isFullscreen) setZoom(1);
  }, [isFullscreen]);

  const navigate = (delta: -1 | 1) => {
    setCurrentPhotoIndex(prev => (prev + delta + photos.length) % photos.length);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
      else if (e.key === 'ArrowLeft' && photos.length > 1) navigate(-1);
      else if (e.key === 'ArrowRight' && photos.length > 1) navigate(1);
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-') handleZoomOut();
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.deltaY < 0 ? handleZoomIn() : handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isFullscreen, photos.length]);

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="relative group bg-gray-100">
            {imageError ? (
              <div className="w-full h-96 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <AlertCircle size={48} className="mx-auto mb-2" />
                  <p>Изображение недоступно</p>
                </div>
              </div>
            ) : (
              <>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600" />
                  </div>
                )}
                <img
                  src={getImageUrl(currentPhoto?.url || '', 'large')}
                  srcSet={getImageSrcSet(currentPhoto?.url || '')}
                  sizes="(max-width: 768px) 100vw, 768px"
                  alt="Загадочное насекомое"
                  className="w-full h-96 object-cover cursor-pointer transition-opacity duration-300"
                  style={{ opacity: isLoading ? 0 : 1, imageRendering: 'crisp-edges' }}
                  onClick={() => setIsFullscreen(true)}
                  onError={() => setImageError(true)}
                  loading="eager"
                />
              </>
            )}

            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              disabled={imageError}
            >
              <Maximize2 size={20} />
            </button>

            {photos.length > 1 && (
              <>
                <NavButton direction="prev" onClick={(e) => { e.stopPropagation(); navigate(-1); }} />
                <NavButton direction="next" onClick={(e) => { e.stopPropagation(); navigate(1); }} />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {currentPhoto?.attribution && (
            <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Фото: {currentPhoto.attribution}</span>
                {insect.observed_on && (
                  <span className="text-gray-500">
                    Дата: {new Date(insect.observed_on).toLocaleDateString('ru-RU', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                )}
                {insect.place_guess && (
                  <span className="text-gray-500">Регион: {insect.place_guess}</span>
                )}
                {photos.length > 1 && (
                  <span className="text-gray-500">({currentPhotoIndex + 1} / {photos.length})</span>
                )}
                <a
                  href={`https://www.inaturalist.org/observations/${insect.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  Посмотреть наблюдение <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="absolute top-4 left-4 flex gap-2 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
              disabled={zoom >= 4}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomIn size={24} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
              disabled={zoom <= 1}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomOut size={24} />
            </button>
            <div className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm font-medium">
              {Math.round(zoom * 100)}%
            </div>
          </div>

          <img
            src={getImageUrl(currentPhoto?.url || '', 'original')}
            alt="Загадочное насекомое — полный экран"
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, imageRendering: zoom > 1 ? 'auto' : 'crisp-edges' }}
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getImageUrl(currentPhoto?.url || '', 'large');
            }}
          />

          {photos.length > 1 && (
            <>
              <NavButton direction="prev" size="lg" onClick={(e) => { e.stopPropagation(); navigate(-1); }} />
              <NavButton direction="next" size="lg" onClick={(e) => { e.stopPropagation(); navigate(1); }} />
            </>
          )}
        </div>
      )}
    </>
  );
}
