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
  fileSize: number;
  url: string;
}

interface RejectedHomework {
  id: string;
  stageId: string;
  nickname: string;
  description: string;
  teamCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  images: HomeworkImage[];
}

export default function RejectedHomeworkList() {
  const [homeworks, setHomeworks] = useState<RejectedHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedHomework, setSelectedHomework] = useState<RejectedHomework | null>(null);
  const [previewImages, setPreviewImages] = useState<{ id: string; url: string }[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'rejected' | 'approved'>('all');

  useEffect(() => {
    fetchRejectedHomeworks();
  }, []);

  const fetchRejectedHomeworks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('Token');
      if (!token) {
        setError('请先登录');
        return;
      }

      const timestamp = Date.now();
      const response = await fetch(`/api/user/rejected-homeworks?_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const data = await response.json();

      if (data.success) {
        setHomeworks(data.homeworks);
      } else {
        setError(data.error || '获取作业列表失败');
      }
    } catch (error) {
      console.error('获取被拒绝作业失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewImages = (images: HomeworkImage[], startIndex: number = 0) => {
    console.log('点击预览图片:', { images, startIndex });
    const imageInfos = images.map(img => ({
      id: img.id,
      url: img.url
    }));
    console.log('转换后的图片信息:', imageInfos);
    setPreviewImages(imageInfos);
    setPreviewIndex(startIndex);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white"></div>
        <p className="text-white/60 mt-4">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  // 根据状态筛选作业
  const filteredHomeworks = statusFilter === 'all'
    ? homeworks
    : homeworks.filter(hw => hw.status === statusFilter);

  if (homeworks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-white/40 text-6xl mb-4">📝</div>
        <p className="text-white/60">您还没有提交过作业</p>
        <p className="text-white/40 text-sm mt-2">去关卡页面提交您的第一份作业吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">
          我的作业管理
        </h3>
        <span className="text-white/60 text-sm">
          共 {homeworks.length} 个
        </span>
      </div>

      {/* 状态筛选按钮 */}
      <div className="flex items-center space-x-2 mb-4">
        {[
          { value: 'all' as const, label: '全部', count: homeworks.length },
          { value: 'approved' as const, label: '已通过', count: homeworks.filter(hw => hw.status === 'approved').length },
          { value: 'rejected' as const, label: '被拒绝', count: homeworks.filter(hw => hw.status === 'rejected').length },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`px-3 py-1.5 rounded-lg transition-colors text-sm ${statusFilter === option.value
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
          >
            {option.label} ({option.count})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredHomeworks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/60">暂无{statusFilter === 'rejected' ? '被拒绝' : statusFilter === 'approved' ? '已通过' : ''}的作业</p>
          </div>
        ) : (
          filteredHomeworks.map((homework) => (
            <div
              key={homework.id}
              className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
            >
              {/* 头部信息 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-white font-medium">{homework.stageId}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${homework.status === 'approved'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                      {homework.status === 'approved' ? '已通过' : '被拒绝'}
                    </span>
                    <span className="text-white/40 text-xs">
                      队伍数: {homework.teamCount}
                    </span>
                  </div>
                  <div className="text-white/50 text-xs space-y-0.5">
                    <div>提交时间: {formatDate(homework.createdAt)}</div>
                    <div>更新时间: {formatDate(homework.updatedAt)}</div>
                  </div>
                </div>

                {/* 重新编辑按钮（仅被拒绝的作业显示） */}
                {homework.status === 'rejected' && (
                  <HomeworkUpload
                    stageId={homework.stageId}
                    teamCount={homework.teamCount}
                    onUploadSuccess={() => {
                      // 刷新列表
                      fetchRejectedHomeworks();
                    }}
                    editMode={true}
                    existingHomework={homework}
                  />
                )}
              </div>

              {/* 提示信息 - 仅被拒绝的作业显示 */}
              {homework.status === 'rejected' && (
                <div className="mb-3 bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-blue-200 text-sm">
                        此作业已被管理员拒绝，您可以点击"重新编辑"按钮修改后重新提交。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 作业描述 */}
              {homework.description && (
                <div className="mb-3">
                  <p className="text-white/50 text-xs mb-1">作业说明：</p>
                  <div className="text-white/80 text-sm bg-white/5 rounded-lg p-2">
                    <MarkdownRenderer content={homework.description} />
                  </div>
                </div>
              )}

              {/* 图片预览 */}
              {homework.images.length > 0 && (
                <div>
                  <p className="text-white/50 text-xs mb-2">
                    作业截图 ({homework.images.length} 张)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {homework.images.map((image, index) => (
                      <div
                        key={image.id}
                        className="relative aspect-square bg-white/5 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all group"
                        onClick={() => handlePreviewImages(homework.images, index)}
                      >
                        <img
                          src={image.url}
                          alt={`${homework.nickname}的作业 - 图片${index + 1}`}
                          title={`点击查看 ${homework.nickname}的作业 - 图片${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 图片预览模态框 */}
      {(() => {
        if (previewImages.length > 0) {
          console.log('渲染 ImagePreviewModal, previewImages:', previewImages);
          return (
            <ImagePreviewModal
              images={previewImages}
              currentIndex={previewIndex}
              onClose={() => {
                console.log('关闭模态框');
                setPreviewImages([]);
              }}
              onIndexChange={setPreviewIndex}
            />
          );
        } else {
          console.log('previewImages 为空，不渲染模态框');
          return null;
        }
      })()}
    </div>
  );
}

