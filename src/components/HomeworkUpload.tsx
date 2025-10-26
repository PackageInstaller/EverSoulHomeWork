'use client';

import { useState, useEffect } from 'react';
import { getTokenPayload } from '@/utils/jwtDecode';
import { compressImages, formatFileSize } from '@/utils/imageCompression';
import { smartUpload } from '@/utils/uploadWithRetry';

interface HomeworkUploadProps {
  stageId: string;
  teamCount: number;
  onUploadSuccess: () => void;
}

export default function HomeworkUpload({ stageId, teamCount, onUploadSuccess }: HomeworkUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    nickname: '',
    description: '',
    images: [] as File[]
  });
  const [error, setError] = useState('');
  const [compressionStatus, setCompressionStatus] = useState('');
  const [retryStatus, setRetryStatus] = useState('');

  const minImages = teamCount;
  const maxImages = (teamCount * 2) + 5;

  // 当弹窗打开时，检查登录状态并自动填充昵称
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('Token');
      if (!token) {
        alert('请先登录后再上传作业');
        setIsOpen(false);
        // 保存当前页面URL，登录后返回
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/loginResignter?returnUrl=${returnUrl}`;
        return;
      }

      if (!formData.nickname) {
        const payload = getTokenPayload();
        if (payload?.nickname) {
          setFormData(prev => ({ ...prev, nickname: payload.nickname }));
        }
      }
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      // 验证文件数量
      if (files.length < minImages || files.length > maxImages) {
        setError(`请选择 ${minImages} 到 ${maxImages} 张图片`);
        return;
      }

      // 验证文件大小和类型
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setError('只允许上传图片文件');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError(`图片 ${file.name} 超过5MB限制`);
          return;
        }
      }

      setFormData(prev => ({ ...prev, images: files }));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    setCompressionStatus('');
    setRetryStatus('');

    try {
      setCompressionStatus('正在压缩图片并转换为WebP格式...');

      const compressionResults = await compressImages(
        formData.images,
        {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.75,        // 75%质量，高压缩
          targetSizeKB: 500,    // 超过500KB就压缩
          maxSizeKB: 3072,      // 最大3MB
          convertToWebP: true,  // 转换为WebP格式
          webpQuality: 0.75,    // WebP质量75%
        },
        (current, total, fileName) => {
          setCompressionStatus(`正在处理图片 ${current}/${total}: ${fileName}`);
        }
      );

      // 计算压缩统计
      const totalOriginal = compressionResults.reduce((sum, r) => sum + r.originalSize, 0);
      const totalCompressed = compressionResults.reduce((sum, r) => sum + r.compressedSize, 0);
      const savedSize = totalOriginal - totalCompressed;
      const savedPercent = ((savedSize / totalOriginal) * 100).toFixed(1);
      const webpCount = compressionResults.filter(r => r.format === 'webp').length;

      let statusMessage = `处理完成：节省 ${formatFileSize(savedSize)} (${savedPercent}%)`;
      if (webpCount > 0) {
        statusMessage += ` - ${webpCount}张转为WebP`;
      }
      setCompressionStatus(statusMessage);

      const data = new FormData();
      data.append('stageId', stageId);
      data.append('nickname', formData.nickname.trim());
      data.append('description', formData.description.trim());
      data.append('teamCount', teamCount.toString());

      compressionResults.forEach((result) => {
        data.append('images', result.file);
      });

      setCompressionStatus('');
      const uploadResult = await smartUpload({
        url: '/api/homework/upload',
        data,
        maxRetries: 3,
        retryDelay: 2000,
        timeout: 60000,
        onProgress: (percent) => {
          setUploadProgress(percent);
        },
        onRetry: (attempt, maxRetries, error) => {
          setRetryStatus(`网络不稳定，正在重试 (${attempt}/${maxRetries})...`);
        },
      });

      if (uploadResult.success && uploadResult.data?.success) {
        setIsOpen(false);
        setFormData({ nickname: '', description: '', images: [] });
        setUploadProgress(0);
        setCompressionStatus('');
        setRetryStatus('');
        onUploadSuccess();
        alert('作业上传成功！等待管理员审核后将显示在页面中。');
      } else {
        setError(uploadResult.error || uploadResult.data?.error || '上传失败');
      }

    } catch (error: any) {
      setError(error.message || '上传失败，请稍后重试');
      console.error('上传失败:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCompressionStatus('');
      setRetryStatus('');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
      >
        <span>📤</span>
        <span>上传作业</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* 头部 */}
            <div className="p-4 border-b border-white/20">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">上传作业 - {stageId}</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* 昵称 */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  昵称 <span className="text-red-400">*</span>
                  {formData.nickname && (
                    <span className="text-white/50 text-xs ml-2">（自动填充，不可修改）</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  readOnly
                  placeholder="请输入您的昵称"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 cursor-not-allowed"
                  maxLength={20}
                  required
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  作业说明 (可选)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="请描述您的通关策略、队伍配置、角色站位等信息"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* 友好提示 */}
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-sm mb-1.5">💡 温馨提示</h4>
                    <div className="text-white/80 text-xs space-y-1">
                      <p>• 作业需要包含<span className="text-yellow-300 font-medium">胜利截图</span></p>
                      <p>• 建议提供<span className="text-green-300 font-medium">角色站位截图/说明</span>，帮助其他玩家更好地参考</p>
                      <p className="text-white/60">（站位信息不是必须的，但会让你的作业更有价值哦~）</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 图片上传 */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  作业截图 <span className="text-red-400">*</span>
                </label>
                <div className="text-white/70 text-xs mb-2">
                  需要上传 {minImages} 到 {maxImages} 张图片，每张不超过5MB
                  <span className="text-blue-300 ml-2">（建议包含：胜利截图 + 站位截图）</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-500 file:text-white file:cursor-pointer hover:file:bg-blue-600"
                  required
                />
                {formData.images.length > 0 && (
                  <div className="mt-2 text-white/70 text-sm">
                    已选择 {formData.images.length} 张图片
                  </div>
                )}
              </div>

              {/* 错误信息 */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* 压缩状态 */}
              {compressionStatus && (
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-blue-300 text-sm">{compressionStatus}</span>
                  </div>
                </div>
              )}

              {/* 重试状态 */}
              {retryStatus && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-yellow-300 text-sm">{retryStatus}</span>
                  </div>
                </div>
              )}

              {/* 上传进度条 */}
              {isUploading && !compressionStatus && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-white/70">
                    <span>上传进度</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-white/60 text-xs text-center">
                    {retryStatus || '正在上传，请勿关闭页面...'}
                  </p>
                </div>
              )}

              {/* 按钮 */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isUploading}
                  className="flex-1 bg-white/10 hover:bg-white/20 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !formData.nickname.trim() || formData.images.length === 0}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {isUploading ? '上传中...' : '提交作业'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 