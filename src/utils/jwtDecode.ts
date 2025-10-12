/**
 * 客户端JWT解码工具
 * 注意：这只是解码payload，不验证签名
 * 用于在客户端快速获取token中的信息
 */

export interface JWTPayload {
  id: string;
  email: string;
  nickname: string;
  iat?: number;
  exp?: number;
}

/**
 * 解码JWT token的payload部分
 * 正确处理UTF-8编码的中文字符
 * 
 * @param token JWT token字符串
 * @returns 解码后的payload对象，失败返回null
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT格式: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    const base64Url = parts[1];
    
    // 将Base64URL转换为标准Base64
    // Base64URL使用 - 和 _ 代替 + 和 /，并且去掉了padding的 =
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // 添加padding
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const base64WithPadding = base64 + padding;
    
    // 使用atob解码Base64
    const binaryString = atob(base64WithPadding);
    
    // 将二进制字符串转换为UTF-8编码的字符串
    // 这一步很关键，因为atob返回的是Latin-1编码
    // 我们需要将其转换为UTF-8才能正确处理中文
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 使用TextDecoder将字节数组解码为UTF-8字符串
    const decodedString = new TextDecoder('utf-8').decode(bytes);
    
    // 解析JSON
    const payload = JSON.parse(decodedString) as JWTPayload;
    
    return payload;
  } catch (error) {
    console.error('JWT解码失败:', error);
    return null;
  }
}

/**
 * 从localStorage获取token并解码
 * 
 * @param key localStorage的key，默认为'Token'
 * @returns 解码后的payload对象，失败返回null
 */
export function getTokenPayload(key: string = 'Token'): JWTPayload | null {
  if (typeof window === 'undefined') {
    return null; // 服务端渲染时返回null
  }
  
  const token = localStorage.getItem(key);
  if (!token) {
    return null;
  }
  
  return decodeJWT(token);
}

