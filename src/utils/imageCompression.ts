/**
 * 客户端图片压缩工具
 * 采用无损压缩策略，在不损失画质的前提下减小文件体积
 */

interface CompressionOptions {
  maxWidth?: number;        // 最大宽度（默认1920px）
  maxHeight?: number;       // 最大高度（默认1920px）
  quality?: number;         // 质量（0.9 = 90%，默认0.95，接近无损）
  targetSizeKB?: number;    // 目标大小KB（默认1024KB，超过则压缩）
  maxSizeKB?: number;       // 最大允许大小KB（默认3072KB）
}

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
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
    quality = 0.95,      // 95%质量，接近无损
    targetSizeKB = 1024, // 超过1MB才压缩
    maxSizeKB = 3072,    // 最大3MB
  } = options;

  const originalSize = file.size;
  const originalSizeKB = originalSize / 1024;

  // 如果文件小于目标大小，直接返回
  if (originalSizeKB <= targetSizeKB) {
    console.log(`图片 ${file.name} (${originalSizeKB.toFixed(2)}KB) 无需压缩`);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 100,
      wasCompressed: false,
    };
  }

  // 如果超过最大限制，提示错误
  if (originalSizeKB > maxSizeKB) {
    throw new Error(`图片 ${file.name} 大小为 ${originalSizeKB.toFixed(2)}KB，超过 ${maxSizeKB}KB 限制`);
  }

  console.log(`开始压缩图片 ${file.name} (${originalSizeKB.toFixed(2)}KB)...`);

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
            
            console.log(`尺寸调整: ${img.width}x${img.height} → ${width}x${height}`);
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

          // 转换为Blob（使用高质量）
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片压缩失败'));
                return;
              }

              const compressedSize = blob.size;
              const compressedSizeKB = compressedSize / 1024;
              const compressionRatio = (compressedSize / originalSize) * 100;

              console.log(`压缩完成: ${originalSizeKB.toFixed(2)}KB → ${compressedSizeKB.toFixed(2)}KB (${compressionRatio.toFixed(1)}%)`);

              // 如果压缩后反而更大，使用原图
              if (compressedSize >= originalSize) {
                console.log('压缩后体积更大，使用原图');
                resolve({
                  file,
                  originalSize,
                  compressedSize: originalSize,
                  compressionRatio: 100,
                  wasCompressed: false,
                });
                return;
              }

              // 创建新的File对象
              const compressedFile = new File(
                [blob],
                file.name,
                { type: blob.type, lastModified: Date.now() }
              );

              resolve({
                file: compressedFile,
                originalSize,
                compressedSize,
                compressionRatio,
                wasCompressed: true,
              });
            },
            file.type.startsWith('image/png') ? 'image/png' : 'image/jpeg',
            quality
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
  const totalRatio = (totalCompressed / totalOriginal) * 100;
  
  console.log(`批量压缩完成: ${(totalOriginal / 1024).toFixed(2)}KB → ${(totalCompressed / 1024).toFixed(2)}KB (${totalRatio.toFixed(1)}%)`);

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

