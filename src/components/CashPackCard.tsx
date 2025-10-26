'use client';

interface CashPackCardProps {
  packInfo: string;
}

export default function CashPackCard({ packInfo }: CashPackCardProps) {
  // 解析礼包信息字符串
  const lines = packInfo.split('\n').filter(line => line.trim() !== '');

  // 查找各个部分的索引
  let titleLine = '';
  let basicInfo: string[] = [];
  let contentLines: string[] = [];
  let priceLines: string[] = [];
  let currentSection = 'title';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('▼【') && trimmed.endsWith('】')) {
      titleLine = trimmed;
      currentSection = 'basic';
    } else if (trimmed === '礼包内容：') {
      currentSection = 'content';
    } else if (trimmed === '价格信息：') {
      currentSection = 'price';
    } else if (trimmed.startsWith('---')) {
      // 跳过分隔线
      continue;
    } else {
      if (currentSection === 'basic') {
        basicInfo.push(trimmed);
      } else if (currentSection === 'content' && trimmed.startsWith('・')) {
        contentLines.push(trimmed);
      } else if (currentSection === 'price' && trimmed.startsWith('・')) {
        priceLines.push(trimmed);
      }
    }
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-4 space-y-4">
      {/* 礼包标题 */}
      {titleLine && (
        <div className="border-b border-white/20 pb-2">
          <h3 className="text-lg font-bold text-yellow-300">{titleLine}</h3>
        </div>
      )}

      {/* 基本信息 */}
      {basicInfo.length > 0 && (
        <div className="space-y-2">
          {basicInfo.map((info, index) => (
            <div key={index} className="text-white text-sm">
              {info}
            </div>
          ))}
        </div>
      )}

      {/* 礼包内容 */}
      {contentLines.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-green-300">礼包内容：</h4>
          <div className="bg-white/5 rounded-lg p-3 space-y-1">
            {contentLines.map((item, index) => (
              <div key={index} className="text-green-200 text-sm flex items-center">
                <span className="mr-2">🎁</span>
                {item.replace('・', '')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 价格信息 */}
      {priceLines.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-blue-300">价格信息：</h4>
          <div className="bg-white/5 rounded-lg p-3 space-y-1">
            {priceLines.map((price, index) => (
              <div key={index} className="text-blue-200 text-sm flex items-center">
                <span className="mr-2">💰</span>
                {price.replace('・', '')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 