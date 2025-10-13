"use client";

import { useState, useEffect } from "react";
import TotalPointsRanking from "@/components/TotalPointsRanking";

type ActiveTab = "stage" | "guild" | "arena" | "strategy" | "totalRank";

// 定义用户类型
interface User {
  id: string;
  email: string;
  nickname: string;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("stage");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 页面加载时检查是否有登录用户
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("Token");
      if (!token) {
        return;
      }

      try {
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success && data.user) {
          setCurrentUser({
            id: data.user.id,
            email: data.user.email,
            nickname: data.user.nickname,
          });
        } else {
          // Token无效，清除本地存储
          localStorage.removeItem("Token");
        }
      } catch (error) {
        console.error("获取用户信息失败", error);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("Token");
    setCurrentUser(null);
    setShowUserMenu(false);
    // 如果需要跳转到登录页可以取消下面的注释
    // window.location.href = '/loginResignter';
  };

  const menuItems = [
    {
      id: "stage" as ActiveTab,
      name: "主线关卡",
      icon: "⚔️",
      description: "查看主线关卡详细信息",
      available: true,
      href: "/stage",
    },
    {
      id: "totalRank" as ActiveTab,
      name: "总积分排行",
      icon: "🏆",
      description: "查看所有用户的总积分排名",
      available: true,
      href: "#totalRank",
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "stage":
        return (
          <div className="space-y-6">
            <div
              className="bg-gradient-to-r from-blue-900/90 to-purple-900/90 rounded-lg p-6 sm:p-8 text-white relative overflow-hidden"
              style={{
                backgroundImage: "url(/images/bg_worldmap.webp)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              {/* 半透明覆盖层 */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-purple-900/80 rounded-lg"></div>

              {/* 内容 */}
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4">
                  主线关卡作业
                </h2>
                <p className="text-blue-100 mb-4 sm:mb-6">
                  查看详细的关卡信息，包括敌方阵容、战力要求、掉落物品概率等。支持正式服和测试服数据切换。
                </p>
                <a
                  href="/stage"
                  className="inline-block bg-white text-blue-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
                >
                  🚀 开始查看关卡
                </a>
              </div>
            </div>
          </div>
        );

      case "totalRank":
        return <TotalPointsRanking />;

      default:
        return (
          <div className="bg-white rounded-lg p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-2 sm:mb-4">🚧</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">
              功能开发中
            </h2>
            <p className="text-gray-600 mb-4 sm:mb-6">
              该功能正在开发中，敬请期待！
            </p>
            <button
              onClick={() => setActiveTab("stage")}
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors"
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
        <div className="mx-auto px-3 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-sm sm:text-base md:text-xl font-bold text-gray-900">
                EverSoul 作业站
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="text-xs sm:text-sm text-gray-600 hidden lg:block">
                作业分享平台，一起逃课吧
              </div>
              <a
                href="/leaderboard"
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors font-semibold whitespace-nowrap"
              >
                <span className="hidden sm:inline">🏆 月度奖励榜</span>
                <span className="sm:hidden">🏆</span>
              </a>
              <a
                href="/admin"
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap hidden sm:block"
              >
                <span className="hidden md:inline">🔐 管理后台</span>
                <span className="md:hidden">🔐</span>
              </a>
              {currentUser ? (
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowUserMenu(true)}
                    className="flex items-center gap-1.5 sm:gap-2 bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors duration-300"
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full flex items-center justify-center text-blue-500 font-bold text-xs sm:text-sm">
                      {currentUser.nickname.charAt(0)}
                    </div>
                    <span className="hidden sm:inline truncate max-w-[60px] md:max-w-[100px]">
                      {currentUser.nickname}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                      onMouseEnter={() => setShowUserMenu(true)}
                      onMouseLeave={() => setShowUserMenu(false)}
                    >
                      <a
                        href="/mailbox"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📬 我的邮箱
                      </a>
                      <a
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        ✏️ 编辑资料
                      </a>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        🚪 退出登录
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <a
                  href="/loginResignter"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors duration-300 whitespace-nowrap"
                >
                  登录
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row">
          {/* 左侧导航 */}
          <div className="w-full sm:w-64 bg-white border-b sm:border-b-0 sm:border-r border-gray-200 sm:min-h-screen p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">
              功能导航
            </h2>
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    item.available ? setActiveTab(item.id) : null
                  }
                  className={`w-full text-left p-2 sm:p-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-200"
                      : item.available
                      ? "hover:bg-gray-100 text-gray-700"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!item.available}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <span className="text-base sm:text-xl">{item.icon}</span>
                    <div>
                      <div className="font-medium text-sm sm:text-base">
                        {item.name}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {!item.available && (
                    <div className="text-xs text-gray-400 mt-1">先摆烂了</div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧内容区域 */}
          <div className={`flex-1 ${activeTab === "totalRank" ? "p-0" : "p-4 sm:p-6"}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
