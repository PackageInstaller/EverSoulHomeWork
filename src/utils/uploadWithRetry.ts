/**
 * 带重试机制的上传工具
 * 自动重试失败的上传，不显示提示，后台静默执行
 */

interface UploadOptions {
  url: string;
  data: FormData;
  maxRetries?: number;           // 最大重试次数（默认3次）
  retryDelay?: number;            // 重试延迟ms（默认2000ms）
  timeout?: number;               // 超时时间ms（默认60000ms = 1分钟）
  onProgress?: (percent: number) => void;
  onRetry?: (attempt: number, maxRetries: number, error: string) => void;
}

interface UploadResult {
  success: boolean;
  data?: any;
  error?: string;
  attempts: number;
}

/**
 * 带重试的上传函数
 */
export async function uploadWithRetry(options: UploadOptions): Promise<UploadResult> {
  const {
    url,
    data,
    maxRetries = 3,
    retryDelay = 2000,
    timeout = 60000,
    onProgress,
    onRetry,
  } = options;

  let lastError: string = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`上传尝试 ${attempt}/${maxRetries}...`);

      const result = await uploadWithTimeout(url, data, timeout, onProgress);
      
      console.log(`✅ 上传成功 (第${attempt}次尝试)`);
      
      return {
        success: true,
        data: result,
        attempts: attempt,
      };
    } catch (error: any) {
      lastError = error.message || '未知错误';
      console.error(`❌ 上传失败 (第${attempt}次尝试):`, lastError);

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt, maxRetries, lastError);
        }

        // 指数退避策略：每次重试延迟时间增加
        const delay = retryDelay * attempt;
        console.log(`等待 ${delay}ms 后重试...`);
        await sleep(delay);
      }
    }
  }

  // 所有尝试都失败
  console.error(`❌ 上传彻底失败，已尝试 ${maxRetries} 次`);
  
  return {
    success: false,
    error: lastError,
    attempts: maxRetries,
  };
}

/**
 * 带超时的上传
 */
function uploadWithTimeout(
  url: string,
  data: FormData,
  timeout: number,
  onProgress?: (percent: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let timeoutId: NodeJS.Timeout;

    // 设置超时
    timeoutId = setTimeout(() => {
      xhr.abort();
      reject(new Error(`上传超时 (${timeout / 1000}秒)`));
    }, timeout);

    // 监听上传进度
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        if (onProgress) {
          onProgress(percent);
        }
      }
    });

    // 监听完成
    xhr.addEventListener('load', () => {
      clearTimeout(timeoutId);
      
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch (error) {
          reject(new Error('响应解析失败'));
        }
      } else if (xhr.status === 0) {
        reject(new Error('网络连接失败'));
      } else if (xhr.status >= 500) {
        reject(new Error(`服务器错误 (${xhr.status})`));
      } else if (xhr.status === 408 || xhr.status === 504) {
        reject(new Error('请求超时'));
      } else {
        reject(new Error(`HTTP错误 ${xhr.status}`));
      }
    });

    // 监听错误
    xhr.addEventListener('error', () => {
      clearTimeout(timeoutId);
      reject(new Error('网络连接失败'));
    });

    // 监听中止
    xhr.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new Error('上传已取消'));
    });

    // 发送请求
    xhr.open('POST', url);
    xhr.send(data);
  });
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检测网络状态
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * 等待网络恢复
 */
export async function waitForOnline(maxWaitTime: number = 30000): Promise<boolean> {
  if (isOnline()) {
    return true;
  }

  console.log('检测到网络离线，等待恢复...');

  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkInterval = setInterval(() => {
      if (isOnline()) {
        clearInterval(checkInterval);
        console.log('✅ 网络已恢复');
        resolve(true);
      } else if (Date.now() - startTime > maxWaitTime) {
        clearInterval(checkInterval);
        console.log('❌ 网络恢复超时');
        resolve(false);
      }
    }, 1000);
  });
}

/**
 * 智能上传（带网络检测和重试）
 */
export async function smartUpload(options: UploadOptions): Promise<UploadResult> {
  // 检查网络状态
  if (!isOnline()) {
    console.log('⚠️ 网络离线，等待恢复...');
    const online = await waitForOnline();
    
    if (!online) {
      return {
        success: false,
        error: '网络连接失败，请检查网络后重试',
        attempts: 0,
      };
    }
  }

  // 执行上传
  return uploadWithRetry(options);
}

