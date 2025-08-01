'use client';

import { useState } from 'react';

interface HomeworkUploadProps {
  stageId: string;
  teamCount: number;
  onUploadSuccess: () => void;
}

export default function HomeworkUpload({ stageId, teamCount, onUploadSuccess }: HomeworkUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    description: '',
    images: [] as File[]
  });
  const [error, setError] = useState('');

  const minImages = teamCount;
  const maxImages = teamCount * 2;

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
        if (file.size > 3 * 1024 * 1024) {
          setError(`图片 ${file.name} 超过3MB限制`);
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
    setError('');

    try {
      const data = new FormData();
      data.append('stageId', stageId);
      data.append('nickname', formData.nickname.trim());
      data.append('description', formData.description.trim());
      data.append('teamCount', teamCount.toString());
      
      formData.images.forEach((image, index) => {
        data.append('images', image);
      });

      const response = await fetch('/api/homework/upload', {
        method: 'POST',
        body: data
      });

      const result = await response.json();

      if (result.success) {
        setIsOpen(false);
        setFormData({ nickname: '', description: '', images: [] });
        onUploadSuccess();
        alert('作业上传成功！等待管理员审核后将显示在页面中。');
      } else {
        setError(result.error || '上传失败');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsUploading(false);
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
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="请输入您的昵称"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  placeholder="请描述您的通关策略、队伍配置等"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* 图片上传 */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  作业截图 <span className="text-red-400">*</span>
                </label>
                <div className="text-white/70 text-xs mb-2">
                  需要上传 {minImages} 到 {maxImages} 张图片，每张不超过3MB
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

              {/* 按钮 */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
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