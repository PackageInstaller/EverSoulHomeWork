/**
 * 客户端图片压缩工具
 * 支持WebP格式转换和高压缩比
 */

interface CompressionOptions {
  maxWidth?: number;        // 最大宽度（默认1920px）
  maxHeight?: number;       // 最大高度（默认1920px）
  quality?: number;         // 质量（0.75 = 75%，默认0.75，高压缩）
  targetSizeKB?: number;    // 目标大小KB（默认500KB，超过则压缩）
  maxSizeKB?: number;       // 最大允许大小KB（默认3072KB）
  convertToWebP?: boolean;  // 是否转换为WebP格式（默认true）
  webpQuality?: number;     // WebP质量（默认0.75，高压缩）
}

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
  format: string;  // 输出格式（webp/jpeg/png）
}

/**
 * 检查浏览器是否支持WebP
 */
function checkWebPSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch (e) {
    return false;
  }
}

/**
 * 压缩单张图片
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.75,        // 75%质量，高压缩
    targetSizeKB = 500,    // 超过500KB才压缩
    maxSizeKB = 5120,      // 最大5MB
    convertToWebP = true,  // 默认转换为WebP
    webpQuality = 0.75,    // WebP质量75%
  } = options;

  const originalSize = file.size;
  const originalSizeKB = originalSize / 1024;
  const supportsWebP = checkWebPSupport();

  // 如果超过最大限制，提示错误
  if (originalSizeKB > maxSizeKB) {
    throw new Error(`图片 ${file.name} 大小为 ${originalSizeKB.toFixed(2)}KB，超过 ${maxSizeKB}KB 限制`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('读取文件失败'));

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(new Error('图片加载失败'));

      img.onload = () => {
        try {
          // 计算压缩后的尺寸（保持宽高比）
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;

            if (width > height) {
              width = Math.min(width, maxWidth);
              height = Math.round(width / aspectRatio);
            } else {
              height = Math.min(height, maxHeight);
              width = Math.round(height * aspectRatio);
            }
          }

          // 创建Canvas进行压缩
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context创建失败'));
            return;
          }

          // 使用高质量缩放算法
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 确定输出格式和质量
          let outputFormat: string;
          let outputQuality: number;
          let fileExtension: string;

          if (convertToWebP && supportsWebP) {
            // 转换为WebP（最优压缩）
            outputFormat = 'image/webp';
            outputQuality = webpQuality;
            fileExtension = '.webp';
          } else if (file.type.startsWith('image/png')) {
            // PNG保持PNG（支持透明度）
            outputFormat = 'image/png';
            outputQuality = quality;
            fileExtension = '.png';
          } else {
            // 其他格式转为JPEG
            outputFormat = 'image/jpeg';
            outputQuality = quality;
            fileExtension = '.jpg';
          }

          // 转换为Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片压缩失败'));
                return;
              }

              const compressedSize = blob.size;
              const compressedSizeKB = compressedSize / 1024;
              const compressionRatio = (compressedSize / originalSize) * 100;
              const savedSize = originalSize - compressedSize;
              const savedPercent = ((savedSize / originalSize) * 100).toFixed(1);
              // 如果压缩后反而更大，使用原图
              if (compressedSize >= originalSize) {
                resolve({
                  file,
                  originalSize,
                  compressedSize: originalSize,
                  compressionRatio: 100,
                  wasCompressed: false,
                  format: file.type.split('/')[1] || 'unknown',
                });
                return;
              }

              // 生成新的文件名（保留原文件名，替换扩展名）
              const originalName = file.name;
              const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
              const newFileName = nameWithoutExt + fileExtension;

              // 创建新的File对象
              const compressedFile = new File(
                [blob],
                newFileName,
                { type: outputFormat, lastModified: Date.now() }
              );

              resolve({
                file: compressedFile,
                originalSize,
                compressedSize,
                compressionRatio,
                wasCompressed: true,
                format: outputFormat.split('/')[1] || 'unknown',
              });
            },
            outputFormat,
            outputQuality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 批量压缩图片
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (current: number, total: number, currentFile: string) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (onProgress) {
      onProgress(i + 1, files.length, file.name);
    }

    try {
      const result = await compressImage(file, options);
      results.push(result);
    } catch (error) {
      console.error(`压缩失败: ${file.name}`, error);
      throw error;
    }
  }

  // 计算总体压缩统计
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0);
  const savedSize = totalOriginal - totalCompressed;
  const savedPercent = ((savedSize / totalOriginal) * 100).toFixed(1);
  const webpCount = results.filter(r => r.format === 'webp').length;


  return results;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

