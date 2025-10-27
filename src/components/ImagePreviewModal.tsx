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
    <div 
      className="fixed z-[999999]"
      style={{ 
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 999999,
        pointerEvents: 'auto'
      }}
    >
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0"
        style={{
          position: 'fixed',
          top: '-50vh',
          left: '-50vw',
          width: '200vw',
          height: '200vh',
          backgroundColor: 'transparent',
          zIndex: -1
        }}
        onClick={onClose}
      />

      {/* 主图片 - 使用transform居中 */}
      <img
        src={images[currentIndex].url}
        alt={`作业预览 ${currentIndex + 1}/${images.length}`}
        className="rounded-xl shadow-2xl"
        style={{ 
          maxWidth: '90vw', 
          maxHeight: '90vh',
          display: 'block'
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* 图片计数器 - 移到图片上方，避免手机端遮挡 */}
      {images.length > 1 && (
        <div 
          className="absolute bg-black/80 text-white px-4 py-2 rounded-lg text-sm shadow-lg"
          style={{
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* 缩略图导航 - 往下移动更多，避免手机端遮挡 */}
      {images.length > 1 && (
        <div 
          className="absolute flex space-x-2 bg-black/80 rounded-lg p-3 shadow-lg overflow-x-auto max-w-[90vw]"
          style={{
            bottom: '-90px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
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
                  ? 'border-white scale-110' 
                  : 'border-transparent hover:border-white/50'
              }`}
            >
              <img
                src={image.url}
                alt={`缩略图 ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

