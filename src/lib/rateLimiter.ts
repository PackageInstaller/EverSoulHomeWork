/**
 * 速率限制器 - 防止恶意批量调用API
 * 使用滑动窗口算法跟踪请求频率
 */

interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 时间窗口内允许的最大请求数 */
  maxRequests: number;
  /** 限制描述（用于错误消息） */
  message?: string;
}

interface RequestRecord {
  /** 请求时间戳数组 */
  timestamps: number[];
  /** 最后一次清理时间 */
  lastCleanup: number;
}

// 内存存储：IP -> 请求记录
const requestStore = new Map<string, RequestRecord>();

// 定期清理过期数据（每5分钟）
setInterval(() => {
  const now = Date.now();
  const CLEANUP_THRESHOLD = 10 * 60 * 1000; // 10分钟

  const entries = Array.from(requestStore.entries());
  for (const [ip, record] of entries) {
    if (now - record.lastCleanup > CLEANUP_THRESHOLD) {
      requestStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * 从 Next.js Request 中提取客户端 IP 地址
 */
function getClientIp(request: Request): string {
  const headers = request.headers;
  
  // 尝试从多个可能的 header 中获取 IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  // 如果都没有，返回一个默认值
  return 'unknown';
}

/**
 * 检查是否超过速率限制
 * @param request Next.js Request 对象
 * @param config 速率限制配置
 * @returns { limited: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): {
  /** 是否被限制 */
  limited: boolean;
  /** 剩余请求次数 */
  remaining: number;
  /** 限制重置时间（Unix时间戳） */
  resetTime: number;
  /** 错误消息 */
  message?: string;
} {
  const ip = getClientIp(request);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // 获取或创建该 IP 的请求记录
  let record = requestStore.get(ip);
  if (!record) {
    record = {
      timestamps: [],
      lastCleanup: now
    };
    requestStore.set(ip, record);
  }

  // 清理过期的时间戳（滑动窗口）
  record.timestamps = record.timestamps.filter(ts => ts > windowStart);
  record.lastCleanup = now;

  // 检查是否超过限制
  const currentCount = record.timestamps.length;
  const limited = currentCount >= config.maxRequests;

  if (!limited) {
    // 记录本次请求
    record.timestamps.push(now);
  }

  // 计算下次重置时间（最早的请求时间戳 + 窗口时间）
  const oldestTimestamp = record.timestamps[0] || now;
  const resetTime = oldestTimestamp + config.windowMs;

  return {
    limited,
    remaining: Math.max(0, config.maxRequests - currentCount - (limited ? 0 : 1)),
    resetTime,
    message: config.message
  };
}

/**
 * 预定义的速率限制配置
 */
export const RateLimitPresets = {
  /** 注册接口：每15分钟最多3次 */
  REGISTER: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 3,
    message: '注册请求过于频繁，请15分钟后再试'
  } as RateLimitConfig,

  /** 上传接口：每分钟最多5次 */
  UPLOAD: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 5,
    message: '上传请求过于频繁，请稍后再试'
  } as RateLimitConfig,

  /** 登录接口：每5分钟最多10次 */
  LOGIN: {
    windowMs: 5 * 60 * 1000, // 5分钟
    maxRequests: 10,
    message: '登录尝试次数过多，请稍后再试'
  } as RateLimitConfig,

  /** 严格模式：每小时最多1次 */
  STRICT: {
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 1,
    message: '操作过于频繁，请1小时后再试'
  } as RateLimitConfig
};

/**
 * 格式化重置时间为可读字符串
 */
export function formatResetTime(resetTime: number): string {
  const now = Date.now();
  const diff = Math.max(0, resetTime - now);
  const minutes = Math.ceil(diff / 60000);
  
  if (minutes < 1) {
    return '不到1分钟';
  } else if (minutes < 60) {
    return `${minutes}分钟`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours}小时${remainingMinutes}分钟`
      : `${hours}小时`;
  }
}

