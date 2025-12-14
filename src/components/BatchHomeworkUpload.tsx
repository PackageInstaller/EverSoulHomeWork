'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getTokenPayload } from '@/utils/jwtDecode';
import { compressImages } from '@/utils/imageCompression';
import { smartUpload } from '@/utils/uploadWithRetry';
import { generateUploadSignature, addSignatureToUrl } from '@/utils/signatureHelper';
import MarkdownEditor from './MarkdownEditor';

interface StageData {
  stageId: string;
  teamCount: number;
  areaNo: number;
  stageNo: number;
}

interface BatchHomeworkData {
  stageId: string;
  description: string;
  images: File[];
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  tempImageFilenames?: string[]; // 预上传的临时图片文件名
  tempImageUrls?: string[]; // 预上传的临时图片URL
}

interface BatchHomeworkUploadProps {
  areaNo: number;
  stages: StageData[];
  dataSource: 'live' | 'review';
}

export default function BatchHomeworkUpload({ areaNo, stages, dataSource }: BatchHomeworkUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [nickname, setNickname] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [homeworkData, setHomeworkData] = useState<Record<string, BatchHomeworkData>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingStages, setUploadingStages] = useState<Set<string>>(new Set()); // 正在预上传的关卡
  
  // 自动保存的key
  const autoSaveKey = `batch_homework_${areaNo}_${dataSource}`;
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 加载自动保存的数据
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('Token');
      if (!token) {
        alert('请先登录后再上传作业');
        setIsOpen(false);
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/loginResignter?returnUrl=${returnUrl}`;
        return;
      }

      const payload = getTokenPayload();
      if (payload?.nickname) {
        setNickname(payload.nickname);
      }

      // 加载自动保存的数据
      try {
        const saved = localStorage.getItem(autoSaveKey);
        if (saved) {
          const data = JSON.parse(saved);
          setSelectedStages(data.selectedStages || []);
          setCurrentStageId(data.currentStageId || null);
          
          // 恢复作业数据
          const restoredData: Record<string, BatchHomeworkData> = {};
          for (const [stageId, homework] of Object.entries(data.homeworkData || {})) {
            const hw = homework as any;
            restoredData[stageId] = {
              stageId: hw.stageId,
              description: hw.description || '',
              images: [], // File对象无法保存到localStorage
              status: hw.status || 'pending', // 恢复上传状态
              error: hw.error,
              tempImageFilenames: hw.tempImageFilenames, // 恢复临时图片文件名
              tempImageUrls: hw.tempImageUrls, // 恢复临时图片URL
            };
          }
          setHomeworkData(restoredData);
        }
      } catch (error) {
        console.error('加载自动保存数据失败:', error);
      }
    }
  }, [isOpen, autoSaveKey]);

  // 自动保存数据
  const autoSave = useCallback(() => {
    try {
      const dataToSave = {
        selectedStages,
        currentStageId,
        homeworkData: Object.entries(homeworkData).reduce((acc, [stageId, data]) => {
          acc[stageId] = {
            stageId: data.stageId,
            description: data.description,
            imageCount: data.images.length,
            status: data.status,
            error: data.error,
            tempImageFilenames: data.tempImageFilenames, // 保存临时图片文件名
            tempImageUrls: data.tempImageUrls, // 保存临时图片URL
          };
          return acc;
        }, {} as Record<string, any>),
      };
      localStorage.setItem(autoSaveKey, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }, [selectedStages, currentStageId, homeworkData, autoSaveKey]);

  // 监听数据变化，触发自动保存
  useEffect(() => {
    if (!isOpen) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 1000); // 1秒后保存

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [selectedStages, currentStageId, homeworkData, isOpen, autoSave]);

  // 阻止body滚动
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      };
    }
  }, [isOpen]);

  // 切换关卡选择
  const toggleStageSelection = (stageId: string) => {
    setSelectedStages(prev => {
      if (prev.includes(stageId)) {
        return prev.filter(id => id !== stageId);
      } else {
        return [...prev, stageId];
      }
    });
  };

  // 切换当前编辑的关卡
  const switchToStage = (stageId: string) => {
    setCurrentStageId(stageId);
    
    // 如果该关卡还没有数据，初始化
    if (!homeworkData[stageId]) {
      const stage = stages.find(s => s.stageId === stageId);
      if (stage) {
        setHomeworkData(prev => ({
          ...prev,
          [stageId]: {
            stageId,
            description: '',
            images: [],
            status: 'pending',
          },
        }));
      }
    }
  };

  // 自动勾选关卡（当有内容时）
  const autoSelectStage = (stageId: string) => {
    const data = homeworkData[stageId];
    const hasContent = data && (
      (data.description && data.description.trim().length > 0) ||
      (data.tempImageFilenames && data.tempImageFilenames.length > 0)
    );
    
    if (hasContent && !selectedStages.includes(stageId)) {
      setSelectedStages(prev => [...prev, stageId]);
    }
  };

  // 更新描述
  const updateDescription = (description: string) => {
    if (!currentStageId) return;
    
    setHomeworkData(prev => ({
      ...prev,
      [currentStageId]: {
        ...prev[currentStageId],
        description,
      },
    }));
    
    // 如果有内容，自动勾选
    autoSelectStage(currentStageId);
  };

  // 更新图片并预上传
  const updateImages = async (files: File[]) => {
    if (!currentStageId) return;
    
    const stage = stages.find(s => s.stageId === currentStageId);
    if (!stage) return;

    const minImages = stage.teamCount;
    const maxImages = (stage.teamCount * 2) + 10;

    if (files.length < minImages || files.length > maxImages) {
      alert(`请选择 ${minImages} 到 ${maxImages} 张图片`);
      return;
    }

    // 更新图片
    setHomeworkData(prev => ({
      ...prev,
      [currentStageId]: {
        ...prev[currentStageId],
        images: files,
        status: 'pending', // 重置状态
        tempImageFilenames: undefined,
        tempImageUrls: undefined,
      },
    }));

    // 预上传图片
    await preUploadImages(currentStageId, files);
  };

  // 预上传图片（只上传到临时目录，不创建作业记录）
  const preUploadImages = async (stageId: string, files: File[]) => {
    // 标记为正在上传
    setUploadingStages(prev => new Set(prev).add(stageId));
    
    try {
      // 更新状态为上传中
      setHomeworkData(prev => ({
        ...prev,
        [stageId]: { ...prev[stageId], status: 'uploading' },
      }));

      // 压缩图片
      const compressionResults = await compressImages(
        files,
        {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.75,
          targetSizeKB: 500,
          maxSizeKB: 5120,
          convertToWebP: true,
          webpQuality: 0.75,
        },
        (current, total) => {
          setUploadProgress(prev => ({
            ...prev,
            [stageId]: Math.floor((current / total) * 50), // 压缩占50%
          }));
        }
      );

      // 准备上传数据
      const formData = new FormData();
      formData.append('stageId', stageId);
      formData.append('nickname', nickname.trim());

      compressionResults.forEach((result) => {
        formData.append('images', result.file);
      });

      const imageNames = compressionResults.map(r => r.file.name);
      
      // 生成签名
      const { signature, timestamp, nonce, sessionId } = await generateUploadSignature(
        stageId,
        nickname.trim(),
        imageNames
      );

      const signedUrl = addSignatureToUrl(
        '/api/homework/pre-upload',
        signature,
        timestamp,
        nonce,
        sessionId
      );

      // 上传到临时目录
      const uploadResult = await smartUpload({
        url: signedUrl,
        data: formData,
        maxRetries: 3,
        retryDelay: 2000,
        timeout: 60000,
        onProgress: (percent) => {
          setUploadProgress(prev => ({
            ...prev,
            [stageId]: 50 + Math.floor(percent / 2), // 上传占50%
          }));
        },
        onRetry: () => {},
      });

      if (uploadResult.success && uploadResult.data?.success) {
        const images = uploadResult.data.images as Array<{
          filename: string;
          url: string;
        }>;
        
        setHomeworkData(prev => ({
          ...prev,
          [stageId]: {
            ...prev[stageId],
            status: 'pending',
            tempImageFilenames: images.map(img => img.filename),
            tempImageUrls: images.map(img => img.url),
          },
        }));
        setUploadProgress(prev => ({
          ...prev,
          [stageId]: 100,
        }));
        
        // 预上传成功后自动勾选
        autoSelectStage(stageId);
        
        console.log(`关卡 ${stageId} 图片预上传成功`);
      } else {
        throw new Error(uploadResult.error || '预上传失败');
      }
    } catch (error: any) {
      setHomeworkData(prev => ({
        ...prev,
        [stageId]: {
          ...prev[stageId],
          status: 'error',
          error: error.message || '预上传失败',
        },
      }));
      console.error(`关卡 ${stageId} 图片预上传失败:`, error.message);
      alert(`关卡 ${stageId} 图片预上传失败: ${error.message}`);
    } finally {
      // 移除上传中标记
      setUploadingStages(prev => {
        const newSet = new Set(prev);
        newSet.delete(stageId);
        return newSet;
      });
    }
  };

  // 上传单个关卡（已弃用，保留以防需要）
  const uploadSingleStage = async (stageId: string, files: File[]) => {
    const data = homeworkData[stageId];
    const stage = stages.find(s => s.stageId === stageId);
    if (!stage) return;

    try {
      // 更新状态为上传中
      setHomeworkData(prev => ({
        ...prev,
        [stageId]: { ...prev[stageId], status: 'uploading', images: files },
      }));

      // 压缩图片
      const compressionResults = await compressImages(
        files,
        {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.75,
          targetSizeKB: 500,
          maxSizeKB: 5120,
          convertToWebP: true,
          webpQuality: 0.75,
        },
        (current, total) => {
          setUploadProgress(prev => ({
            ...prev,
            [stageId]: Math.floor((current / total) * 50), // 压缩占50%
          }));
        }
      );

      // 准备上传数据
      const formData = new FormData();
      formData.append('stageId', stageId);
      formData.append('nickname', nickname.trim());
      formData.append('description', (data?.description || '').trim());
      formData.append('teamCount', stage.teamCount.toString());

      compressionResults.forEach((result) => {
        formData.append('images', result.file);
      });

      const imageNames = compressionResults.map(r => r.file.name);
      
      // 生成签名
      const { signature, timestamp, nonce, sessionId } = await generateUploadSignature(
        stageId,
        nickname.trim(),
        imageNames
      );

      const signedUrl = addSignatureToUrl(
        '/api/homework/upload',
        signature,
        timestamp,
        nonce,
        sessionId
      );

      // 上传
      const uploadResult = await smartUpload({
        url: signedUrl,
        data: formData,
        maxRetries: 3,
        retryDelay: 2000,
        timeout: 60000,
        onProgress: (percent) => {
          setUploadProgress(prev => ({
            ...prev,
            [stageId]: 50 + Math.floor(percent / 2), // 上传占50%
          }));
        },
        onRetry: () => {},
      });

      if (uploadResult.success && uploadResult.data?.success) {
        setHomeworkData(prev => ({
          ...prev,
          [stageId]: { ...prev[stageId], status: 'success' },
        }));
        setUploadProgress(prev => ({
          ...prev,
          [stageId]: 100,
        }));
        
        // 静默上传，不显示提示
      } else {
        throw new Error(uploadResult.error || '上传失败');
      }
    } catch (error: any) {
      setHomeworkData(prev => ({
        ...prev,
        [stageId]: {
          ...prev[stageId],
          status: 'error',
          error: error.message || '上传失败',
        },
      }));
      // 只在失败时显示提示
      console.error(`关卡 ${stageId} 上传失败:`, error.message);
    }
  };

  // 批量提交作业（将预上传的图片提交审核）
  const handleBatchUpload = async () => {
    if (selectedStages.length === 0) {
      alert('请至少选择一个关卡');
      return;
    }

    // 检查是否有正在预上传的关卡
    if (uploadingStages.size > 0) {
      const uploadingList = Array.from(uploadingStages).join(', ');
      alert(`请等待图片预上传完成：${uploadingList}`);
      return;
    }

    // 筛选出已预上传图片的关卡
    const readyStages = selectedStages.filter(stageId => {
      const data = homeworkData[stageId];
      return data && data.tempImageFilenames && data.tempImageFilenames.length > 0;
    });

    if (readyStages.length === 0) {
      alert('请先为选中的关卡上传图片');
      return;
    }

    // 准备批量提交的数据
    const homeworks = readyStages.map(stageId => {
      const data = homeworkData[stageId];
      const stage = stages.find(s => s.stageId === stageId);
      return {
        stageId,
        description: data.description || '',
        teamCount: stage?.teamCount || 1,
        tempImageFilenames: data.tempImageFilenames || [],
      };
    });

    setIsUploading(true);

    try {
      // 生成签名
      const stageIds = readyStages.join(',');
      const { signature, timestamp, nonce, sessionId } = await generateUploadSignature(
        stageIds,
        nickname.trim(),
        []
      );

      const signedUrl = addSignatureToUrl(
        '/api/homework/batch-submit',
        signature,
        timestamp,
        nonce,
        sessionId
      );

      // 批量提交
      const response = await fetch(signedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          homeworks,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 更新每个关卡的状态
        const newHomeworkData = { ...homeworkData };
        result.results.forEach((r: any) => {
          if (r.success) {
            newHomeworkData[r.stageId] = {
              ...newHomeworkData[r.stageId],
              status: 'success',
            };
          } else {
            newHomeworkData[r.stageId] = {
              ...newHomeworkData[r.stageId],
              status: 'error',
              error: r.error || '提交失败',
            };
          }
        });
        setHomeworkData(newHomeworkData);

        alert(result.message);
        
        // 清除自动保存的数据
        localStorage.removeItem(autoSaveKey);
        setIsOpen(false);
        window.location.reload();
      } else {
        throw new Error(result.error || '批量提交失败');
      }
    } catch (error: any) {
      console.error('批量提交失败:', error);
      alert(`批量提交失败: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const currentStage = stages.find(s => s.stageId === currentStageId);
  const currentData = currentStageId ? homeworkData[currentStageId] : null;

  const modalContent = mounted && isOpen ? (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 w-full max-w-7xl max-h-[90vh] overflow-hidden flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧关卡列表 */}
        <div className="w-80 bg-white/10 backdrop-blur-sm border-r border-white/20 overflow-y-auto">
          <div className="p-4 border-b border-white/20">
            <h3 className="text-white font-bold text-lg">选择关卡</h3>
            <p className="text-white/70 text-xs mt-1">
              已选择 {selectedStages.length} 个关卡
            </p>
          </div>
          
          <div className="p-3 grid grid-cols-3 gap-2">
            {stages.map((stage) => {
              const isSelected = selectedStages.includes(stage.stageId);
              const isCurrent = currentStageId === stage.stageId;
              const data = homeworkData[stage.stageId];
              const hasImages = data && data.images.length > 0;
              
              return (
                <div
                  key={stage.stageId}
                  className={`p-2 rounded-lg cursor-pointer transition-all relative ${
                    isCurrent
                      ? 'bg-blue-500/30 border-2 border-blue-400'
                      : isSelected
                      ? 'bg-white/20 border border-white/30'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => switchToStage(stage.stageId)}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleStageSelection(stage.stageId);
                        }}
                        className="w-3 h-3"
                      />
                      <span className="text-white font-medium text-sm">
                        {stage.stageId}
                      </span>
                    </div>
                    
                    {/* 状态图标 */}
                    <div className="flex items-center space-x-1">
                      {data?.status === 'success' && (
                        <span className="text-green-400 text-xs" title="已提交审核">✓</span>
                      )}
                      {data?.status === 'error' && (
                        <span className="text-red-400 text-xs" title="上传失败">✗</span>
                      )}
                      {data?.status === 'uploading' && (
                        <span className="text-yellow-400 text-xs" title="上传中">↑</span>
                      )}
                      {data?.tempImageFilenames && data.tempImageFilenames.length > 0 && data.status === 'pending' && (
                        <span className="text-blue-400 text-xs" title="已预上传，待提交">
                          {data.tempImageFilenames.length}📷
                        </span>
                      )}
                      {hasImages && !data?.tempImageFilenames && data?.status === 'pending' && (
                        <span className="text-white/50 text-xs" title="图片选择中">...</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧编辑区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 头部 */}
          <div className="p-4 border-b border-white/20 bg-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  批量上传作业 - 第 {areaNo} 章
                </h3>
                {currentStage && (
                  <p className="text-white/70 text-sm mt-1">
                    当前编辑: {currentStage.stageId} ({currentStage.teamCount} 队)
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                disabled={isUploading}
                className="text-white/80 hover:text-white transition-colors p-2 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 编辑表单 */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentStage && currentData ? (
              <div className="space-y-4 max-w-3xl mx-auto">
                {/* 自动保存提示 */}
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                  <p className="text-blue-300 text-sm">
                    💾 数据会自动保存，切换关卡或刷新页面不会丢失
                  </p>
                </div>

                {/* 作业说明 */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    作业说明 (可选)
                    <span className="text-white/50 text-xs ml-2 font-normal">
                      支持Markdown格式
                    </span>
                  </label>
                  <MarkdownEditor
                    value={currentData.description}
                    onChange={updateDescription}
                    maxLength={1024}
                    placeholder="请描述您的通关策略、队伍配置、角色站位等信息"
                  />
                </div>

                {/* 图片上传 */}
                <div key={currentStage.stageId}>
                  <label className="block text-white text-sm font-medium mb-2">
                    作业截图 <span className="text-red-400">*</span>
                  </label>
                  <div className="text-white/70 text-xs mb-2">
                    需要上传 {currentStage.teamCount} 到{' '}
                    {currentStage.teamCount * 2 + 10} 张图片
                  </div>
                  
                  {/* 已预上传的图片预览 */}
                  {currentData.tempImageFilenames && currentData.tempImageFilenames.length > 0 && currentData.tempImageUrls && (
                    <div className="mb-3">
                      <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-400 text-lg">📷</span>
                          <div>
                            <p className="text-blue-300 text-sm font-medium">
                              已预上传 {currentData.tempImageFilenames.length} 张图片
                            </p>
                            <p className="text-blue-300/70 text-xs mt-1">
                              点击"批量上传"按钮提交审核，或重新选择图片替换
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* 图片预览网格 */}
                      <div className="grid grid-cols-3 gap-2">
                        {currentData.tempImageUrls.map((url, index) => (
                          <div
                            key={index}
                            className="relative aspect-video bg-white/5 rounded-lg overflow-hidden border border-white/10 hover:border-blue-400/50 transition-colors group"
                          >
                            <img
                              src={url}
                              alt={`预览 ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white text-xs bg-blue-500 px-2 py-1 rounded"
                                onClick={(e) => e.stopPropagation()}
                              >
                                查看大图
                              </a>
                            </div>
                            <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 已提交审核的提示 */}
                  {currentData.status === 'success' && (
                    <div className="mb-3 bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400 text-lg">✓</span>
                        <div>
                          <p className="text-green-300 text-sm font-medium">
                            作业已提交审核
                          </p>
                          <p className="text-green-300/70 text-xs mt-1">
                            该关卡作业已成功提交
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <input
                    key={`file-input-${currentStage.stageId}`}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        updateImages(Array.from(e.target.files));
                      }
                    }}
                    disabled={isUploading || currentData.status === 'uploading'}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-500 file:text-white file:cursor-pointer hover:file:bg-blue-600 disabled:opacity-50"
                  />
                  {currentData.images.length > 0 && !currentData.tempImageFilenames && (
                    <div className="mt-2 text-yellow-300/70 text-sm">
                      已选择 {currentData.images.length} 张图片，正在预上传...
                    </div>
                  )}
                </div>

                {/* 上传进度 */}
                {isUploading && uploadProgress[currentStage.stageId] !== undefined && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-white/70">
                      <span>上传进度</span>
                      <span>{uploadProgress[currentStage.stageId]}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                        style={{ width: `${uploadProgress[currentStage.stageId]}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 错误信息 */}
                {currentData.status === 'error' && currentData.error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-300 text-sm">{currentData.error}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white/70">
                  <p className="text-lg mb-2">👈 请从左侧选择要编辑的关卡</p>
                  <p className="text-sm">选择关卡后可以填写作业说明和上传图片</p>
                </div>
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="p-4 border-t border-white/20 bg-white/10">
            <div className="flex items-center justify-between">
              <div className="text-white/70 text-sm">
                已选择 {selectedStages.length} 个关卡 •{' '}
                {selectedStages.filter(id => homeworkData[id]?.tempImageFilenames?.length).length}{' '}
                个已预上传
                {uploadingStages.size > 0 && (
                  <span className="text-yellow-300 ml-2">
                    • {uploadingStages.size} 个预上传中...
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isUploading}
                  className="bg-white/10 hover:bg-white/20 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors border border-white/20"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleBatchUpload}
                  disabled={isUploading || selectedStages.length === 0 || uploadingStages.size > 0}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
                  title={uploadingStages.size > 0 ? '请等待图片预上传完成' : ''}
                >
                  {isUploading ? '提交中...' : uploadingStages.size > 0 ? '预上传中...' : `批量上传 (${selectedStages.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
      >
        <span>📦</span>
        <span>批量上传</span>
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}

