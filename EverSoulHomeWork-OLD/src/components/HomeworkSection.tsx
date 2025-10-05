'use client';

import { useState, useEffect } from 'react';
import HomeworkUpload from './HomeworkUpload';

interface HomeworkImage {
  id: string;
  filename: string;
  originalName: string;
  order: number;
  url: string;
}

interface Homework {
  id: string;
  nickname: string;
  description: string;
  teamCount: number;
  createdAt: string;
  images: HomeworkImage[];
}

interface HomeworkSectionProps {
  stageId: string;
  teamCount: number;
}

export default function HomeworkSection({ stageId, teamCount }: HomeworkSectionProps) {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentHomeworkImages, setCurrentHomeworkImages] = useState<HomeworkImage[]>([]);



  const fetchHomeworks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/homework/${stageId}`);
      const result = await response.json();

      if (result.success) {
        setHomeworks(result.homeworks);
      } else {
        setError('获取作业失败');
      }
    } catch (error) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeworks();
  }, [stageId]);

  // 键盘导航支持
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentHomeworkImages.length > 1 && currentImageIndex > 0) {
            const newIndex = currentImageIndex - 1;
            setCurrentImageIndex(newIndex);
            setSelectedImage(currentHomeworkImages[newIndex].url);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentHomeworkImages.length > 1 && currentImageIndex < currentHomeworkImages.length - 1) {
            const newIndex = currentImageIndex + 1;
            setCurrentImageIndex(newIndex);
            setSelectedImage(currentHomeworkImages[newIndex].url);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedImage(null);
          setCurrentHomeworkImages([]);
          setCurrentImageIndex(0);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [selectedImage, currentImageIndex, currentHomeworkImages]);

  const handleUploadSuccess = () => {
    fetchHomeworks();
  };

  if (loading) {
    return (
      <div className="stage-card">
        <h2 className="text-xl font-bold text-white mb-4">玩家作业分享</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-white/70">正在加载作业...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">玩家作业分享</h2>
        <HomeworkUpload 
          stageId={stageId} 
          teamCount={teamCount} 
          onUploadSuccess={handleUploadSuccess}
        />
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {homeworks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/70 mb-2">暂无玩家分享的作业</p>
          <p className="text-white/50 text-sm">成为第一个分享通关作业的玩家吧！</p>
        </div>
      ) : (
        <div className="space-y-6">
          {homeworks.map((homework) => (
            <div key={homework.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              {/* 作业信息 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">
                    👤 {homework.nickname}
                  </h3>
                  <span className="text-white/50 text-sm">
                    {new Date(homework.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {homework.description && (
                  <p className="text-white/80 text-sm leading-relaxed">
                    {homework.description}
                  </p>
                )}
              </div>

              {/* 作业图片 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {homework.images.map((image, index) => (
                  <div 
                    key={image.id} 
                    className="relative group cursor-pointer"
                    onClick={() => {
                      setSelectedImage(image.url);
                      setCurrentHomeworkImages(homework.images);
                      setCurrentImageIndex(index);
                    }}
                  >
                    <img
                      src={image.url}
                      alt={`${homework.nickname}的作业 - 图片${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg transition-transform hover:scale-105"
                      onError={(e) => {
                        console.error('图片加载失败:', image.url);
                        e.currentTarget.style.border = '2px solid red';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center pointer-events-none">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                        🔍 点击查看
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 使用 React Portal 将模态框渲染到 body 中，避免层级干扰 */}
      {selectedImage && currentHomeworkImages.length > 0 && (
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
            onClick={() => {
              setSelectedImage(null);
              setCurrentHomeworkImages([]);
              setCurrentImageIndex(0);
            }}
          />

          {/* 主图片 - 使用transform居中 */}
          <img
            src={selectedImage}
            alt={`作业预览 ${currentImageIndex + 1}/${currentHomeworkImages.length}`}
            className="rounded-xl shadow-2xl"
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '90vh',
              display: 'block'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* 关闭按钮 - 相对于图片定位 */}
          <button
            onClick={() => {
              setSelectedImage(null);
              setCurrentHomeworkImages([]);
              setCurrentImageIndex(0);
            }}
            className="absolute bg-black/80 hover:bg-black/90 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 shadow-lg"
            style={{
              top: '-20px',
              right: '-20px'
            }}
          >
            <span className="text-xl font-bold">✕</span>
          </button>

          {/* 图片计数器 - 相对于图片定位 */}
          {currentHomeworkImages.length > 1 && (
            <div 
              className="absolute bg-black/80 text-white px-4 py-2 rounded-lg text-sm shadow-lg"
              style={{
                top: '-20px',
                left: '0px'
              }}
            >
              {currentImageIndex + 1} / {currentHomeworkImages.length}
            </div>
          )}

          {/* 缩略图导航 - 相对于图片定位 */}
          {currentHomeworkImages.length > 1 && (
            <div 
              className="absolute flex space-x-2 bg-black/80 rounded-lg p-3 shadow-lg"
              style={{
                bottom: '-60px',
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            >
              {currentHomeworkImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                    setSelectedImage(image.url);
                  }}
                  className={`w-14 h-14 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                    index === currentImageIndex 
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
      )}
    </div>
  );
} 