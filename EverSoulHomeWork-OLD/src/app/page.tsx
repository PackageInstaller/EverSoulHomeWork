'use client';

import { useState } from 'react';

type ActiveTab = 'stage' | 'guild' | 'arena' | 'strategy';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('stage');

  const menuItems = [
    {
      id: 'stage' as ActiveTab,
      name: '主线关卡',
      icon: '⚔️',
      description: '查看主线关卡详细信息',
      available: true,
      href: '/stage'
    },
    {
      id: 'guild' as ActiveTab,
      name: '会战攻略',
      icon: '🏰',
      description: '会战关卡攻略和推荐阵容',
      available: false,
      href: '#'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'stage':
        return (
          <div className="space-y-6">
            <div 
              className="bg-gradient-to-r from-blue-900/90 to-purple-900/90 rounded-lg p-8 text-white relative overflow-hidden"
              style={{
                backgroundImage: 'url(/images/bg_worldmap.webp)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* 半透明覆盖层 */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-purple-900/80 rounded-lg"></div>
              
              {/* 内容 */}
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4">主线关卡作业</h2>
                <p className="text-blue-100 mb-6">
                  查看详细的关卡信息，包括敌方阵容、战力要求、掉落物品概率等。支持正式服和测试服数据切换。
                </p>
                <a 
                  href="/stage"
                  className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
                >
                  🚀 开始查看关卡
                </a>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">功能开发中</h2>
            <p className="text-gray-600 mb-6">
              该功能正在开发中，敬请期待！
            </p>
            <button 
              onClick={() => setActiveTab('stage')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回主线关卡
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">EverSoul 作业站</h1>
            </div>
            <div className="text-sm text-gray-600">
              作业分享平台，一起逃课吧
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* 左侧导航 */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">功能导航</h2>
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.available ? setActiveTab(item.id) : null}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                      : item.available
                      ? 'hover:bg-gray-100 text-gray-700'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!item.available}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </div>
                  {!item.available && (
                    <div className="text-xs text-gray-400 mt-1">先摆烂了</div>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
} 