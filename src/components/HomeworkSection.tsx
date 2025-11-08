'use client';

import { useState, useEffect } from 'react';
import HomeworkUpload from './HomeworkUpload';
import ImagePreviewModal from './ImagePreviewModal';
import MarkdownRenderer from './MarkdownRenderer';

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
  isAfterSettlement?: boolean; // 是否在结算后提交
  isHalved?: boolean; // 是否减半
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
                  <div className="flex items-center space-x-3">
                    {/* 头像 */}
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                      {homework.nickname.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {homework.nickname}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {homework.isAfterSettlement && (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded">
                            ⏰ 结算后提交 · 仅计入总榜
                          </span>
                        )}
                        {homework.isHalved && (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-300 bg-orange-500/20 px-2 py-0.5 rounded">
                            ⚡ 非首发作业 · 积分减半
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-white/50 text-sm">
                    {new Date(homework.createdAt).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })}
                  </span>
                </div>
                {homework.description && (
                  <div className="text-white/80 text-sm leading-relaxed ml-13">
                    <MarkdownRenderer content={homework.description} />
                  </div>
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

      {/* 图片预览模态框 */}
      {selectedImage && currentHomeworkImages.length > 0 && (
        <ImagePreviewModal
          images={currentHomeworkImages}
          currentIndex={currentImageIndex}
          onClose={() => {
            setSelectedImage(null);
            setCurrentHomeworkImages([]);
            setCurrentImageIndex(0);
          }}
          onIndexChange={(index) => {
            setCurrentImageIndex(index);
            setSelectedImage(currentHomeworkImages[index].url);
          }}
        />
      )}
    </div>
  );
} 