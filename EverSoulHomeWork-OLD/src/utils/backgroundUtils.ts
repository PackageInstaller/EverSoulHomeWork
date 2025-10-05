// 主线剧情背景图片列表
const MAIN_STORY_BACKGROUNDS = [
  'MS06_ApollyonClose.webp'
];

/**
 * 获取随机主线剧情背景图片
 * @returns 背景图片的URL路径
 */
export function getRandomMainStoryBackground(): string {
  const randomIndex = Math.floor(Math.random() * MAIN_STORY_BACKGROUNDS.length);
  const selectedBackground = MAIN_STORY_BACKGROUNDS[randomIndex];
  return `/images/main_story/${selectedBackground}`;
}

/**
 * 根据关卡ID获取一致的背景图片（同一关卡总是显示相同背景）
 * @param stageId 关卡ID（如 "1-1", "2-5"）
 * @returns 背景图片的URL路径
 */
export function getConsistentMainStoryBackground(stageId: string): string {
  // 使用简单的哈希算法确保同一关卡总是得到相同的背景
  let hash = 0;
  for (let i = 0; i < stageId.length; i++) {
    const char = stageId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  const index = Math.abs(hash) % MAIN_STORY_BACKGROUNDS.length;
  const selectedBackground = MAIN_STORY_BACKGROUNDS[index];
  return `/images/main_story/${selectedBackground}`;
}

/**
 * 获取背景样式对象
 * @param backgroundUrl 背景图片URL
 * @returns React样式对象
 */
export function getBackgroundStyle(backgroundUrl: string) {
  return {
    backgroundImage: `url(${backgroundUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    // 使用 fixed 确保背景固定，但在移动端可能有兼容性问题
    // 如果遇到问题，可以尝试使用 absolute 定位的方案
    backgroundAttachment: 'fixed'
  };
}

/**
 * 获取移动端兼容的背景样式
 * @param backgroundUrl 背景图片URL  
 * @returns React样式对象
 */
export function getMobileCompatibleBackgroundStyle(backgroundUrl: string) {
  return {
    backgroundImage: `url(${backgroundUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    width: '100vw',
    height: '100vh',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    zIndex: 0
  };
} 