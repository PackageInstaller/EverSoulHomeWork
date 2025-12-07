'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [mounted, setMounted] = useState(false);

  // 客户端挂载检测
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 调试：组件渲染时输出信息
  useEffect(() => {
    console.log('ImagePreviewModal 渲染:', { 
      imagesCount: images.length, 
      currentIndex,
      currentImage: images[currentIndex],
      mounted
    });
  }, [images, currentIndex, mounted]);

  // 阻止body滚动并保持滚动位置
  useEffect(() => {
    // 保存当前滚动位置
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // 锁定body滚动
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`; // 防止页面跳动
    
    return () => {
      // 恢复body滚动
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // 恢复滚动位置（确保在下一帧执行）
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    };
  }, []);

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

  if (images.length === 0) {
    console.log('ImagePreviewModal: 图片数组为空，不渲染');
    return null;
  }

  if (!mounted) {
    console.log('ImagePreviewModal: 等待挂载到客户端');
    return null;
  }

  console.log('ImagePreviewModal: 准备渲染到 Portal，图片数量:', images.length);

  // 计算缩略图区域的高度
  const thumbnailHeight = images.length > 1 ? 86 : 0; // 56px(图片高度) + 24px(padding) + 12px(margin-top) = 92px，这里用86保守一点
  const maxImageHeight = `calc(95vh - ${thumbnailHeight}px - 40px)`; // 额外减40px留余量

  const modalContent = (
    <div 
      className="fixed inset-0 z-[999998] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      {/* 图片和缩略图的容器 - 整体居中 */}
      <div 
        className="flex flex-col items-center relative"
        style={{
          maxHeight: '95vh',
          maxWidth: '95vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
        onClick={onClose}
          className="absolute top-0 right-0 z-[1000000] bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 backdrop-blur-sm"
          style={{
            transform: 'translate(50%, -50%)'
          }}
          title="关闭 (ESC)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 图片容器 */}
        <div className="relative">
          {/* 主图片 */}
      <img
        src={images[currentIndex].url}
        alt={`作业预览 ${currentIndex + 1}/${images.length}`}
            className="rounded-xl shadow-2xl max-w-full"
        style={{ 
          maxWidth: '90vw', 
              maxHeight: maxImageHeight,
              width: 'auto',
              height: 'auto',
          display: 'block'
        }}
        onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              console.error('图片加载失败:', images[currentIndex].url);
              console.log('所有图片数据:', images);
            }}
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
    </div>
  );

  return createPortal(modalContent, document.body);
}

