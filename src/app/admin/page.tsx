"use client";

import { useState, useEffect, useRef } from "react";
import PointsSettlement from "@/components/PointsSettlement";
import UserManagement from "@/components/UserManagement";

export default function AdminHomeworkPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "points">("users");
  const [cacheRefreshing, setCacheRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  // 检查认证状态
  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/auth");
      const result = await response.json();
      if (result.success) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("认证检查失败:", error);
      setIsAuthenticated(false);
    }
  };

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.success) {
        setIsAuthenticated(true);
        setPassword("");
      } else {
        setLoginError(result.message || "登录失败");
      }
    } catch (error) {
      console.error("登录失败:", error);
      setLoginError("网络错误，请重试");
    } finally {
      setLoginLoading(false);
    }
  };

  // 登出
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      setIsAuthenticated(false);
    } catch (error) {
      console.error("登出失败:", error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // 刷新游戏数据缓存
  const handleRefreshCache = async () => {
    if (isRefreshingRef.current) {
      return;
    }

    if (!confirm("确定要强制刷新游戏数据缓存吗？")) {
      return;
    }

    // 立即设置 ref 和 state
    isRefreshingRef.current = true;
    setCacheRefreshing(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

      const response = await fetch("/api/cache/cron", {
        method: "POST",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 403) {
        alert("❌ 权限不足，需要管理员权限");
        return;
      }

      const result = await response.json();
      alert(result.message || '刷新完成');
    } catch (error: any) {
      console.error("❌ [前端] 刷新缓存失败:", error);

      if (error.name === 'AbortError') {
        alert("❌ 请求超时");
      } else {
        alert(`❌ 刷新缓存失败\n\n错误信息: ${error.message || '网络错误'}`);
      }
    } finally {
      isRefreshingRef.current = false;
      setCacheRefreshing(false);
    }
  };

  // 未认证时显示登录表单
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            管理员登录
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent password-input"
                placeholder="以防你不知道，密码原本是一首歌的名字"
                autoComplete="off"
                required
                disabled={loginLoading}
              />
            </div>

            {loginError && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg p-3">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loginLoading ? "登录中..." : "登录"}
            </button>

            <a
              href="/"
              className="block w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              ← 返回主页
            </a>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white mb-4">管理后台</h1>
            <div className="flex items-center space-x-3">
              <a
                href="/"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                ← 返回主页
              </a>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                登出
              </button>
            </div>
          </div>

          {/* 标签页切换和工具按钮 */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("users")}
                className={`px-6 py-3 rounded-lg transition-colors ${activeTab === "users"
                  ? "bg-blue-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
              >
                👥 用户管理
              </button>
              <button
                onClick={() => setActiveTab("points")}
                className={`px-6 py-3 rounded-lg transition-colors ${activeTab === "points"
                  ? "bg-blue-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
              >
                💎 积分管理
              </button>
            </div>

            {/* 刷新缓存按钮 */}
            <button
              onClick={handleRefreshCache}
              disabled={cacheRefreshing}
              className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${cacheRefreshing
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
                } text-white font-medium shadow-lg`}
              title="刷新游戏数据缓存（游戏更新后使用）"
            >
              <svg
                className={`w-5 h-5 ${cacheRefreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{cacheRefreshing ? "刷新中..." : "刷新缓存"}</span>
            </button>
          </div>
        </div>

        {/* 根据活跃标签页显示内容 */}
        {activeTab === "users" ? (
          <UserManagement />
        ) : (
          <PointsSettlement />
        )}
      </div>
    </div>
  );
}
