/**
 * 速率限制器
 * 基于 Redis 的分布式速率限制（自动回退到内存存储）
 */
import { getRedisClient } from './redis';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// 内存存储（Redis 不可用时的回退方案）
const memoryStore = new Map<string, RateLimitRecord>();

// 清理过期记录的定时器（仅用于内存存储）
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  memoryStore.forEach((record, key) => {
    if (now > record.resetTime) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => memoryStore.delete(key));
}, 60 * 1000); // 每分钟清理一次

export interface RateLimitConfig {
  /** 最大请求数 */
  maxRequests: number;
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 操作类型（用于区分不同的 API） */
  action: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * 从请求中提取 IP 地址
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();

  return 'unknown';
}

/**
 * 使用 Redis 检查速率限制
 */
async function checkRateLimitWithRedis(
  clientId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis not available');
  }

  const key = `ratelimit:${config.action}:${clientId}`;
  const now = Date.now();
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  try {
    // 使用 Redis 事务
    const pipeline = redis.pipeline();

    // 获取当前计数
    pipeline.get(key);
    // 增加计数
    pipeline.incr(key);
    // 获取 TTL
    pipeline.ttl(key);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Pipeline execution failed');
    }

    const currentCount = parseInt(results[0][1] as string || '0');
    const newCount = results[1][1] as number;
    const ttl = results[2][1] as number;

    // 如果是新键或已过期，设置过期时间
    if (ttl === -1 || currentCount === 0) {
      await redis.expire(key, windowSeconds);
    }

    // 计算重置时间
    const resetTime = ttl > 0 ? now + (ttl * 1000) : now + config.windowMs;

    // 检查是否超过限制
    if (newCount > config.maxRequests) {
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - newCount,
      resetTime
    };
  } catch (error) {
    console.error('Redis 速率限制检查失败:', error);
    throw error;
  }
}

/**
 * 使用内存检查速率限制（回退方案）
 */
function checkRateLimitWithMemory(
  clientId: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.action}:${clientId}`;
  const now = Date.now();

  let record = memoryStore.get(key);

  // 如果没有记录或记录已过期，创建新记录
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + config.windowMs
    };
    memoryStore.set(key, record);
  }

  // 增加计数
  record.count++;

  // 检查是否超过限制
  if (record.count > config.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime
  };
}

/**
 * 检查速率限制（自动选择 Redis 或内存）
 */
export async function checkRateLimit(
  clientId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  // 如果 Redis 可用，使用 Redis
  if (redis) {
    try {
      return await checkRateLimitWithRedis(clientId, config);
    } catch (error) {
      console.warn('⚠️  Redis 速率限制失败，回退到内存存储:', error);
      // Redis 失败，回退到内存存储
    }
  }

  // 使用内存存储（同步操作）
  return checkRateLimitWithMemory(clientId, config);
}

/**
 * 预定义的速率限制配置
 */
export const RateLimitPresets = {
  /** 注册：每个 IP 每 15 分钟最多 3 次 */
  REGISTER: {
    action: 'register',
    maxRequests: 3,
    windowMs: 15 * 60 * 1000
  },

  /** 登录：每个 IP 每 5 分钟最多 10 次 */
  LOGIN: {
    action: 'login',
    maxRequests: 10,
    windowMs: 5 * 60 * 1000
  },

  /** 作业上传：每个 IP 每分钟最多 10 次 */
  UPLOAD_HOMEWORK: {
    action: 'upload_homework',
    maxRequests: 10,
    windowMs: 60 * 1000
  },

  /** 发送消息：每个 IP 每分钟最多 5 次 */
  SEND_MESSAGE: {
    action: 'send_message',
    maxRequests: 5,
    windowMs: 60 * 1000
  }
} as const;
