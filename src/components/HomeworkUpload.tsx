'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getTokenPayload } from '@/utils/jwtDecode';
import { compressImages, formatFileSize } from '@/utils/imageCompression';
import { smartUpload } from '@/utils/uploadWithRetry';
import { generateUploadSignature, addSignatureToUrl } from '@/utils/signatureHelper';
import MarkdownEditor from './MarkdownEditor';

interface HomeworkImage {
  id: string;
  filename: string;
  originalName: string;
  order: number;
  fileSize: number;
  url?: string;
}

interface ExistingHomework {
  id: string;
  stageId: string;
  description: string;
  teamCount: number;
  images: HomeworkImage[];
}

interface HomeworkUploadProps {
  stageId: string;
  teamCount: number;
  onUploadSuccess: () => void;
  editMode?: boolean; // 是否为编辑模式
  existingHomework?: ExistingHomework; // 编辑时的现有作业数据
}

export default function HomeworkUpload({
  stageId,
  teamCount,
  onUploadSuccess,
  editMode = false,
  existingHomework
}: HomeworkUploadProps) {
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
  const [mounted, setMounted] = useState(false); // 客户端挂载状态

  const minImages = teamCount;
  const maxImages = (teamCount * 2) + 10;

  // 客户端挂载检测
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 阻止body滚动并保持滚动位置
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  // 当弹窗打开时，检查登录状态并自动填充昵称和描述（编辑模式）
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

      const payload = getTokenPayload();
      if (payload?.nickname) {
        // 编辑模式：预填充现有数据
        if (editMode && existingHomework) {
          setFormData({
            nickname: payload.nickname,
            description: existingHomework.description || '',
            images: [] // 编辑模式下需要重新选择图片
          });
        } else if (!formData.nickname) {
          // 新建模式：只填充昵称
          setFormData(prev => ({ ...prev, nickname: payload.nickname }));
        }
      }
    }
  }, [isOpen, editMode, existingHomework]);

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
          maxSizeKB: 5120,      // 最大5MB
          convertToWebP: true,  // 转换为WebP格式
          webpQuality: 0.75,    // WebP质量75%
        },
        (current, total, fileName) => {
          setCompressionStatus(`正在处理图片 ${current}/${total}: ${fileName}`);
        }
      );

      const data = new FormData();
      data.append('stageId', stageId);
      data.append('nickname', formData.nickname.trim());
      data.append('description', formData.description.trim());
      data.append('teamCount', teamCount.toString());

      // 如果是编辑模式，附加旧作业ID，上传成功后自动删除旧作业
      if (editMode && existingHomework) {
        data.append('oldHomeworkId', existingHomework.id);
      }

      compressionResults.forEach((result) => {
        data.append('images', result.file);
      });

      const imageNames = compressionResults.map(r => r.file.name);
      
      // 统一使用上传 API（编辑模式下会自动删除旧作业）
      const apiPath = '/api/homework/upload';

      setCompressionStatus('');
      
      // 为了支持重试，定义一个生成签名URL的函数
      const generateSignedUrl = async () => {
        const { signature, timestamp, nonce, sessionId } = await generateUploadSignature(
          stageId,
          formData.nickname.trim(),
          imageNames
        );
        
        return addSignatureToUrl(
          apiPath,
          signature,
          timestamp,
          nonce,
          sessionId
        );
      };

      // 每次上传尝试都生成新的签名（避免nonce重用）
      let currentAttempt = 0;
      const maxRetries = 3;
      let lastError: string = '';
      
      for (currentAttempt = 1; currentAttempt <= maxRetries; currentAttempt++) {
        try {
          // 每次重试都生成新的签名
          const signedUrl = await generateSignedUrl();
          
          const uploadResult = await smartUpload({
            url: signedUrl,
            data,
            maxRetries: 1, // 单次尝试，外层循环控制重试
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
            const successMessage = editMode
              ? '作业更新成功！已重新提交审核，等待管理员审核后将显示在页面中。'
              : '作业上传成功！等待管理员审核后将显示在页面中。';
            alert(successMessage);
            return; // 上传成功，退出循环
          } else {
            lastError = uploadResult.error || uploadResult.data?.error || '上传失败';
            throw new Error(lastError);
          }
        } catch (error: any) {
          lastError = error.message || '上传失败';
          console.error(`上传尝试 ${currentAttempt}/${maxRetries} 失败:`, lastError);
          
          // 如果不是最后一次尝试，等待后重试
          if (currentAttempt < maxRetries) {
            setRetryStatus(`上传失败，正在重试 (${currentAttempt}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * currentAttempt)); // 指数退避
          }
        }
      }
      
      // 所有尝试都失败
      throw new Error(lastError || '上传失败');

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

  // 模态框内容
  const modalContent = mounted && isOpen ? (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onClick={(e) => {
        // 点击背景关闭
        if (e.target === e.currentTarget) {
          setIsOpen(false);
        }
      }}
    >
      <div
        className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              {editMode ? '重新编辑作业' : '上传作业'} - {stageId}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </div>
          {editMode && (
            <div className="mt-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-2">
              <p className="text-yellow-300 text-xs">
                <span className="font-medium">⚠️ 编辑模式：</span>
                此作业之前被拒绝，您可以修改后重新提交审核
              </p>
            </div>
          )}
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
              <span className="text-white/50 text-xs ml-2 font-normal">支持Markdown格式 · 点击展开大编辑器</span>
            </label>
            <MarkdownEditor
              value={formData.description}
              onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              maxLength={1024}
              placeholder="请描述您的通关策略、队伍配置、角色站位等信息"
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
            {editMode && (
              <div className="mb-2 text-yellow-300 text-xs">
                ⚠️ 编辑模式下需要重新选择所有图片（旧图片将被替换）
              </div>
            )}
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
              className={`flex-1 ${editMode
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-green-500 hover:bg-green-600'
                } disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors`}
            >
              {isUploading ? (editMode ? '更新中...' : '上传中...') : (editMode ? '更新作业' : '提交作业')}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`${editMode
            ? 'bg-yellow-500 hover:bg-yellow-600'
            : 'bg-green-500 hover:bg-green-600'
          } text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2`}
      >
        <span>{editMode ? '✏️' : '📤'}</span>
        <span>{editMode ? '重新编辑' : '上传作业'}</span>
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
} 