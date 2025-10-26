/**
 * 客户端签名生成工具
 * 用于生成请求签名，防止API被脚本批量调用
 * 
 * 安全改进：
 * - 使用派生密钥（derivedKey）而不是主密钥（appKey）
 * - 派生密钥基于用户会话生成，即使泄露也无法推导出主密钥
 */

interface ChallengeData {
  timestamp: number;
  nonce: string;
  windowMs: number;
  sessionId: string;    // 会话ID
  derivedKey: string;   // 派生密钥（取代之前的 appKey）
}

/**
 * 从服务器获取Challenge数据
 */
export async function fetchChallenge(): Promise<ChallengeData> {
  const response = await fetch('/api/auth/challenge');
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || '获取Challenge失败');
  }
  
  return result.data;
}

/**
 * 生成签名（客户端版本）
 * @param source 原始数据源
 * @param timestamp 时间戳
 * @param nonce 随机值
 * @param derivedKey 派生密钥（由服务器生成的会话专属密钥）
 */
async function generateSignature(
  source: string,
  timestamp: number,
  nonce: string,
  derivedKey: string
): Promise<string> {
  // 复杂的时间戳算法：基础时间戳 + (nonce的前8位转为数字)
  const nonceNum = parseInt(nonce.substring(0, 8), 16) % 3600000;
  const complexTimestamp = timestamp + nonceNum;
  
  // 拼接: DerivedKey + source + complexTimestamp + nonce
  const payload = `${derivedKey}${source}${complexTimestamp}${nonce}`;
  
  // SHA-512 哈希
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  
  // Base64 URL-safe 编码，去除尾部 =
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return hashBase64;
}

/**
 * 生成注册请求的签名
 */
export async function generateRegisterSignature(
  email: string,
  nickname: string,
  password: string
): Promise<{ signature: string; timestamp: number; nonce: string; sessionId: string }> {
  const challenge = await fetchChallenge();
  const source = `${email}${nickname}${password}`;
  const signature = await generateSignature(source, challenge.timestamp, challenge.nonce, challenge.derivedKey);
  
  return {
    signature,
    timestamp: challenge.timestamp,
    nonce: challenge.nonce,
    sessionId: challenge.sessionId
  };
}

/**
 * 生成上传请求的签名
 */
export async function generateUploadSignature(
  stageId: string,
  nickname: string,
  imageNames: string[]
): Promise<{ signature: string; timestamp: number; nonce: string; sessionId: string }> {
  const challenge = await fetchChallenge();
  
  // 图片名称按顺序拼接
  const imageNamesStr = imageNames.sort().join('');
  const source = `${stageId}${nickname}${imageNamesStr}`;
  const signature = await generateSignature(source, challenge.timestamp, challenge.nonce, challenge.derivedKey);
  
  return {
    signature,
    timestamp: challenge.timestamp,
    nonce: challenge.nonce,
    sessionId: challenge.sessionId
  };
}

/**
 * 将签名添加到URL的查询参数中
 */
export function addSignatureToUrl(
  url: string,
  signature: string,
  timestamp: number,
  nonce: string,
  sessionId?: string
): string {
  const urlObj = new URL(url, window.location.origin);
  urlObj.searchParams.set('s', signature);
  urlObj.searchParams.set('t', timestamp.toString());
  urlObj.searchParams.set('n', nonce);
  if (sessionId) {
    urlObj.searchParams.set('sid', sessionId);
  }
  return urlObj.toString();
}

