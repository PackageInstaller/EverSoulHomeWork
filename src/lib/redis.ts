/**
 * Redis 客户端配置
 */
import Redis from 'ioredis';

let redisClient: Redis | null = null;

/**
 * 获取 Redis 客户端实例（单例模式）
 */
export function getRedisClient(): Redis | null {
    if (redisClient) {
        return redisClient;
    }

    try {
        // 本地 Redis
        const redisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB || '0'),
            // 连接超时
            connectTimeout: 5000,
            // 重试策略
            retryStrategy(times: number) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            // 最大重试次数
            maxRetriesPerRequest: 3,
        };

        redisClient = new Redis(redisConfig);

        // 连接成功事件
        redisClient.on('connect', () => {
            console.log('✅ Redis 连接成功');
        });

        // 错误事件
        redisClient.on('error', (err) => {
            console.error('❌ Redis 连接错误:', err.message);
        });

        // 断开连接事件
        redisClient.on('close', () => {
            console.log('⚠️  Redis 连接已关闭');
        });

        return redisClient;
    } catch (error) {
        console.error('❌ 创建 Redis 客户端失败:', error);
        return null;
    }
}

/**
 * 关闭 Redis 连接
 */
export async function closeRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        console.log('Redis 连接已关闭');
    }
}

/**
 * 检查 Redis 是否可用
 */
export async function isRedisAvailable(): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
        await client.ping();
        return true;
    } catch {
        return false;
    }
}

