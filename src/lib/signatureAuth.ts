/**
 * 请求签名验证系统
 * 基于 SHA-512 和时间戳的请求签名机制，防止脚本批量调用API
 * 
 * 安全改进：
 * - 使用派生密钥（Derived Key）而不是直接暴露主密钥
 * - 支持基于用户上下文的密钥派生
 */

import * as crypto from 'crypto';
import { getAppKey, deriveKey } from './config';

interface SignatureValidationResult {
  valid: boolean;
  error?: string;
}

// 存储已使用的nonce，防止重放攻击
const usedNonces = new Map<string, number>();

// 定期清理过期的nonce（每5分钟）
setInterval(() => {
  const now = Date.now();
  const CLEANUP_THRESHOLD = 15 * 60 * 1000; // 15分钟

  const entries = Array.from(usedNonces.entries());
  for (const [nonce, timestamp] of entries) {
    if (now - timestamp > CLEANUP_THRESHOLD) {
      usedNonces.delete(nonce);
    }
  }
}, 5 * 60 * 1000);

/**
 * 生成签名
 * @param source 原始数据源（如：email + nickname + password）
 * @param timestamp 时间戳
 * @param nonce 随机值（防重放攻击）
 * @param customKey 自定义密钥（如派生密钥），不提供则使用主密钥
 */
export function generateSignature(
  source: string, 
  timestamp: number, 
  nonce: string,
  customKey?: string
): string {
  const appKey = customKey || getAppKey();
  
  // 复杂的时间戳算法：基础时间戳 + (nonce的前8位转为数字)
  const nonceNum = parseInt(nonce.substring(0, 8), 16) % 3600000; // 限制在1小时内
  const complexTimestamp = timestamp + nonceNum;
  
  // 拼接: AppKey + source + complexTimestamp + nonce
  const payload = `${appKey}${source}${complexTimestamp}${nonce}`;
  
  // SHA-512 哈希
  const hash = crypto.createHash('sha512').update(payload).digest();
  
  // Base64 URL-safe 编码，去除尾部 =
  return hash.toString('base64url').replace(/=/g, '');
}

/**
 * 验证签名
 * @param signature 客户端提供的签名
 * @param source 原始数据源
 * @param timestamp 时间戳
 * @param nonce 随机值
 * @param windowMs 时间窗口（毫秒），默认5分钟
 * @param sessionId 会话ID（用于重建派生密钥）
 * @param userAgent 用户代理（用于重建派生密钥）
 */
export function verifySignature(
  signature: string,
  source: string,
  timestamp: number,
  nonce: string,
  windowMs: number = 5 * 60 * 1000,
  sessionId?: string,
  userAgent?: string
): SignatureValidationResult {
  const now = Date.now();
  
  // 1. 检查时间戳是否在有效窗口内
  if (Math.abs(now - timestamp) > windowMs) {
    return {
      valid: false,
      error: '请求已过期，请刷新页面重试'
    };
  }
  
  // 2. 检查nonce是否已被使用（防重放攻击）
  if (usedNonces.has(nonce)) {
    return {
      valid: false,
      error: '请求已被使用，请勿重复提交'
    };
  }
  
  // 3. 如果提供了 sessionId 和 userAgent，重建派生密钥
  let keyToUse: string | undefined;
  if (sessionId && userAgent) {
    const masterKey = getAppKey();
    const userAgentHash = crypto.createHash('sha256').update(userAgent).digest('hex').slice(0, 16);
    const context = `${sessionId}:${nonce}:${timestamp}:${userAgentHash}`;
    keyToUse = deriveKey(masterKey, context);
  }
  
  // 4. 生成预期的签名
  const expectedSignature = generateSignature(source, timestamp, nonce, keyToUse);
  
  // 5. 对比签名
  if (signature !== expectedSignature) {
    return {
      valid: false,
      error: '签名验证失败'
    };
  }
  
  // 6. 标记nonce为已使用
  usedNonces.set(nonce, now);
  
  return { valid: true };
}

/**
 * 生成注册请求的签名源
 */
export function generateRegisterSource(email: string, nickname: string, password: string): string {
  return `${email}${nickname}${password}`;
}

/**
 * 生成上传请求的签名源
 */
export function generateUploadSource(stageId: string, nickname: string, imageNames: string[]): string {
  // 图片名称按顺序拼接
  const imageNamesStr = imageNames.sort().join('');
  return `${stageId}${nickname}${imageNamesStr}`;
}

/**
 * 从请求中提取签名信息
 */
export interface SignatureData {
  signature: string;
  timestamp: number;
  nonce: string;
  sessionId?: string; // 会话ID（用于派生密钥）
}

export function extractSignatureFromRequest(request: Request): SignatureData | null {
  const url = new URL(request.url);
  const signature = url.searchParams.get('s');
  const timestampStr = url.searchParams.get('t');
  const nonce = url.searchParams.get('n');
  const sessionId = url.searchParams.get('sid'); // 会话ID参数
  
  if (!signature || !timestampStr || !nonce) {
    return null;
  }
  
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return null;
  }
  
  return { 
    signature, 
    timestamp, 
    nonce,
    sessionId: sessionId || undefined
  };
}

/**
 * 生成客户端需要的Challenge数据
 * 客户端使用这个数据来生成签名
 */
export interface ChallengeData {
  timestamp: number;
  nonce: string;
  windowMs: number; // 告诉客户端有效期
}

export function generateChallenge(): ChallengeData {
  return {
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'), // 32位十六进制字符串
    windowMs: 5 * 60 * 1000 // 5分钟有效期
  };
}

