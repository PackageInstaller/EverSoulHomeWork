'use client';

import { useEffect } from 'react';

interface ImageInfo {
  id: string;
  url: string;
}

interface ImagePreviewModalProps {
  images: ImageInfo[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export default function ImagePreviewModal({
  images,
  currentIndex,
  onClose,
  onIndexChange,
}: ImagePreviewModalProps) {
  // 键盘导航支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (images.length > 1 && currentIndex > 0) {
            onIndexChange(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (images.length > 1 && currentIndex < images.length - 1) {
            onIndexChange(currentIndex + 1);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentIndex, images, onIndexChange, onClose]);

  if (images.length === 0) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 z-[999998]"
        style={{
          backgroundColor: 'transparent',
        }}
        onClick={onClose}
      />

      {/* 图片和缩略图的容器 - 整体居中 */}
      <div 
        className="fixed z-[999999] flex flex-col items-center"
        style={{ 
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxHeight: '95vh',
          maxWidth: '95vw',
          pointerEvents: 'auto'
        }}
      >
        {/* 图片容器 */}
        <div className="relative">
          {/* 主图片 */}
          <img
            src={images[currentIndex].url}
            alt={`作业预览 ${currentIndex + 1}/${images.length}`}
            className="rounded-xl shadow-2xl"
            style={{ 
              maxWidth: '90vw', 
              maxHeight: images.length > 1 ? 'calc(90vh - 90px)' : '90vh',
              display: 'block'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* 图片计数器 - 位于图片内部上方 */}
          {images.length > 1 && (
            <div 
              className="absolute bg-black/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm shadow-lg font-medium"
              style={{
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            >
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* 缩略图导航 - 在图片下方，完全不遮挡 */}
        {images.length > 1 && (
          <div 
            className="flex space-x-2 bg-black/30 backdrop-blur-sm rounded-lg p-3 shadow-lg overflow-x-auto max-w-[90vw] mt-3"
          >
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange(index);
                }}
                className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                  index === currentIndex 
                    ? 'border-white/80 scale-110 shadow-md' 
                    : 'border-white/30 hover:border-white/60'
                }`}
              >
                <img
                  src={image.url}
                  alt={`缩略图 ${index + 1}`}
                  className={`w-full h-full object-cover transition-opacity duration-200 ${
                    index === currentIndex ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

