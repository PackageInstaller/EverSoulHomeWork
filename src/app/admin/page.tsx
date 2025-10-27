"use client";

import { useState, useEffect, useRef } from "react";
import PointsSettlement from "@/components/PointsSettlement";
import MessageSender from "@/components/MessageSender";
import ImagePreviewModal from "@/components/ImagePreviewModal";

interface HomeworkImage {
  id: string;
  filename: string;
  originalName: string;
  order: number;
  fileSize: number;
  url: string;
}

interface Homework {
  id: string;
  stageId: string;
  nickname: string;
  description: string;
  teamCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  images: HomeworkImage[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminHomeworkPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"homework" | "points" | "messages">("homework");
  
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentHomeworkImages, setCurrentHomeworkImages] = useState<HomeworkImage[]>([]);
  const [selectedHomeworks, setSelectedHomeworks] = useState<Set<string>>(
    new Set()
  );
  const [batchLoading, setBatchLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectHomeworkId, setRejectHomeworkId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isBatchReject, setIsBatchReject] = useState(false);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);
  const isRefreshingRef = useRef(false); // 用于立即防止重复点击
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null); // 自动刷新定时器

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
        fetchHomeworks();
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
      setHomeworks([]);
    } catch (error) {
      console.error("登出失败:", error);
    }
  };

  const fetchHomeworks = async (status = selectedStatus, page = 1) => {
    try {
      setLoading(true);
      // 添加时间戳防止CDN缓存
      const timestamp = Date.now();
      const response = await fetch(
        `/api/admin/homework?status=${status}&page=${page}&limit=10&_t=${timestamp}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      
      const result = await response.json();

      if (result.success) {
        setHomeworks(result.homeworks);
        setPagination(result.pagination);
      } else {
        setError("获取作业列表失败");
      }
    } catch (error) {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHomeworks();
    }
  }, [selectedStatus, isAuthenticated]);

  useEffect(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }

    const shouldEnableAutoRefresh =
      isAuthenticated &&
      activeTab === 'homework' &&
      selectedStatus === 'pending' &&
      homeworks.length === 0;

    if (!shouldEnableAutoRefresh) {
      if (homeworks.length > 0 && selectedStatus === 'pending') {
      }
      return;
    }

    const startAutoRefresh = () => {
      autoRefreshIntervalRef.current = setInterval(() => {
        if (!document.hidden && isAuthenticated && activeTab === 'homework' && selectedStatus === 'pending') {
          fetchHomeworks(selectedStatus, pagination.page);
        }
      }, 15000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (autoRefreshIntervalRef.current) {
          clearInterval(autoRefreshIntervalRef.current);
          autoRefreshIntervalRef.current = null;
        }
      } else {
        const shouldResume =
          !autoRefreshIntervalRef.current &&
          isAuthenticated &&
          activeTab === 'homework' &&
          selectedStatus === 'pending' &&
          homeworks.length === 0;

        if (shouldResume) {
          startAutoRefresh();
        }
      }
    };
    startAutoRefresh();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, activeTab, selectedStatus, homeworks.length, pagination.page]);

  const handleStatusChange = async (homeworkId: string, newStatus: string) => {
    if (newStatus === "rejected") {
      setRejectHomeworkId(homeworkId);
      setRejectModalOpen(true);
      return;
    }

    const shouldRemoveFromList = 
      (selectedStatus === 'pending' && newStatus !== 'pending') ||
      (selectedStatus === 'approved' && newStatus !== 'approved') ||
      (selectedStatus === 'rejected' && newStatus !== 'rejected');

    if (shouldRemoveFromList) {
      setHomeworks(prev => prev.filter(hw => hw.id !== homeworkId));
    }

    try {
      const response = await fetch(`/api/admin/homework/${homeworkId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        // 刷新列表以确保数据同步
        fetchHomeworks(selectedStatus, pagination.page);
        alert(`作业状态已更新为: ${getStatusText(newStatus)}`);
      } else {
        fetchHomeworks(selectedStatus, pagination.page);
        alert(result.error || "更新状态失败");
      }
    } catch (error) {
      fetchHomeworks(selectedStatus, pagination.page);
      alert("网络错误");
    }
  };

  const handleRejectConfirm = async () => {
    // 批量拒绝
    if (isBatchReject) {
      if (selectedHomeworks.size === 0) return;
      if (selectedStatus !== 'rejected') {
        setHomeworks(prev => prev.filter(hw => !selectedHomeworks.has(hw.id)));
      }

      setBatchLoading(true);
      try {
        const promises = Array.from(selectedHomeworks).map((homeworkId) =>
          fetch(`/api/admin/homework/${homeworkId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              status: "rejected",
              rejectReason: rejectReason.trim() || undefined
            }),
          })
        );

        const results = await Promise.all(promises);
        const successCount = results.filter((r) => r.ok).length;

        if (successCount === selectedHomeworks.size) {
          alert(`成功拒绝 ${successCount} 个作业` + (rejectReason.trim() ? "，已发送拒绝原因通知" : ""));
        } else {
          alert(
            `操作完成：成功 ${successCount} 个，失败 ${selectedHomeworks.size - successCount
            } 个`
          );
        }

        setSelectedHomeworks(new Set());
        fetchHomeworks(selectedStatus, pagination.page);
        setRejectModalOpen(false);
        setRejectReason("");
        setIsBatchReject(false);
      } catch (error) {
        alert("批量拒绝失败");
        fetchHomeworks(selectedStatus, pagination.page);
      } finally {
        setBatchLoading(false);
      }
      return;
    }

    // 单个拒绝
    if (!rejectHomeworkId) return;

    if (selectedStatus !== 'rejected') {
      setHomeworks(prev => prev.filter(hw => hw.id !== rejectHomeworkId));
    }

    try {
      const response = await fetch(`/api/admin/homework/${rejectHomeworkId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: "rejected",
          rejectReason: rejectReason.trim() || undefined
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        fetchHomeworks(selectedStatus, pagination.page);
        alert("作业已拒绝" + (rejectReason.trim() ? "，已发送拒绝原因通知" : ""));
        setRejectModalOpen(false);
        setRejectHomeworkId(null);
        setRejectReason("");
      } else {
        fetchHomeworks(selectedStatus, pagination.page);
        alert(result.error || "更新状态失败");
      }
    } catch (error) {
      fetchHomeworks(selectedStatus, pagination.page);
      alert("网络错误");
    }
  };

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

  const handleDelete = async (homeworkId: string) => {
    if (!confirm("确定要删除这个作业吗？此操作不可撤销。")) {
      return;
    }

    setHomeworks(prev => prev.filter(hw => hw.id !== homeworkId));

    try {
      const response = await fetch(`/api/admin/homework/${homeworkId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        // 刷新列表以确保数据同步和分页准确
        fetchHomeworks(selectedStatus, pagination.page);
        alert("作业删除成功");
      } else {
        fetchHomeworks(selectedStatus, pagination.page);
        alert(result.error || "删除失败");
      }
    } catch (error) {
      fetchHomeworks(selectedStatus, pagination.page);
      alert("网络错误");
    }
  };

  // 切换作业选中状态
  const toggleHomeworkSelection = (homeworkId: string) => {
    setSelectedHomeworks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(homeworkId)) {
        newSet.delete(homeworkId);
      } else {
        newSet.add(homeworkId);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedHomeworks.size === homeworks.length) {
      setSelectedHomeworks(new Set());
    } else {
      setSelectedHomeworks(new Set(homeworks.map((hw) => hw.id)));
    }
  };

  // 批量更新状态
  const handleBatchUpdate = async (newStatus: string) => {
    if (selectedHomeworks.size === 0) {
      alert("请先选择要操作的作业");
      return;
    }

    // 如果是批量拒绝，打开拒绝原因弹窗
    if (newStatus === "rejected") {
      setIsBatchReject(true);
      setRejectModalOpen(true);
      return;
    }

    if (
      !confirm(
        `确定要将选中的 ${selectedHomeworks.size
        } 个作业状态更新为 ${getStatusText(newStatus)} 吗？`
      )
    ) {
      return;
    }

    const shouldRemoveFromList = 
      (selectedStatus === 'pending' && newStatus !== 'pending') ||
      (selectedStatus === 'approved' && newStatus !== 'approved') ||
      (selectedStatus === 'rejected' && newStatus !== 'rejected');

    if (shouldRemoveFromList) {
      setHomeworks(prev => prev.filter(hw => !selectedHomeworks.has(hw.id)));
    }

    setBatchLoading(true);
    try {
      const promises = Array.from(selectedHomeworks).map((homeworkId) =>
        fetch(`/api/admin/homework/${homeworkId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.ok).length;

      if (successCount === selectedHomeworks.size) {
        alert(`成功更新 ${successCount} 个作业`);
      } else {
        alert(
          `更新完成：成功 ${successCount} 个，失败 ${selectedHomeworks.size - successCount
          } 个`
        );
      }

      setSelectedHomeworks(new Set());
      fetchHomeworks(selectedStatus, pagination.page);
    } catch (error) {
      alert("批量操作失败");
      // 失败时恢复列表
      fetchHomeworks(selectedStatus, pagination.page);
    } finally {
      setBatchLoading(false);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedHomeworks.size === 0) {
      alert("请先选择要删除的作业");
      return;
    }

    if (
      !confirm(
        `确定要删除选中的 ${selectedHomeworks.size} 个作业吗？此操作不可撤销！`
      )
    ) {
      return;
    }

    setHomeworks(prev => prev.filter(hw => !selectedHomeworks.has(hw.id)));

    setBatchLoading(true);
    try {
      const promises = Array.from(selectedHomeworks).map((homeworkId) =>
        fetch(`/api/admin/homework/${homeworkId}`, {
          method: "DELETE",
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.ok).length;

      if (successCount === selectedHomeworks.size) {
        alert(`成功删除 ${successCount} 个作业`);
      } else {
        alert(
          `删除完成：成功 ${successCount} 个，失败 ${selectedHomeworks.size - successCount
          } 个`
        );
      }

      setSelectedHomeworks(new Set());
      fetchHomeworks(selectedStatus, pagination.page);
    } catch (error) {
      alert("批量删除失败");
      // 失败时恢复列表
      fetchHomeworks(selectedStatus, pagination.page);
    } finally {
      setBatchLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "待审核";
      case "approved":
        return "已通过";
      case "rejected":
        return "已拒绝";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "approved":
        return "bg-green-500/20 text-green-300 border-green-500/50";
      case "rejected":
        return "bg-red-500/20 text-red-300 border-red-500/50";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + "MB";
  };

  // 按用户分组作业
  const groupHomeworksByUser = () => {
    const grouped = new Map<string, Homework[]>();
    homeworks.forEach(homework => {
      const nickname = homework.nickname;
      if (!grouped.has(nickname)) {
        grouped.set(nickname, []);
      }
      grouped.get(nickname)!.push(homework);
    });
    return grouped;
  };

  // 切换用户展开状态
  const toggleUserExpanded = (nickname: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nickname)) {
        newSet.delete(nickname);
      } else {
        newSet.add(nickname);
      }
      return newSet;
    });
  };

  // 全部展开/收起
  const toggleExpandAll = () => {
    const groupedHomeworks = groupHomeworksByUser();
    if (expandedUsers.size === groupedHomeworks.size) {
      setExpandedUsers(new Set());
    } else {
      setExpandedUsers(new Set(groupedHomeworks.keys()));
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
                placeholder="给我一首歌的时间"
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
                onClick={() => setActiveTab("homework")}
                className={`px-6 py-3 rounded-lg transition-colors ${activeTab === "homework"
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                📝 作业管理
              </button>
              <button
                onClick={() => setActiveTab("points")}
                className={`px-6 py-3 rounded-lg transition-colors ${activeTab === "points"
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                💎 积分结算
              </button>
              <button
                onClick={() => setActiveTab("messages")}
                className={`px-6 py-3 rounded-lg transition-colors ${activeTab === "messages"
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                📬 消息发送
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
          
          {/* 作业管理的状态筛选 */}
          {activeTab === "homework" && (
            <div className="flex items-center space-x-4">
            <div className="flex space-x-4">
              {[
                { value: "pending", label: "待审核" },
                { value: "approved", label: "已通过" },
                { value: "rejected", label: "已拒绝" },
                { value: "all", label: "全部" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                    className={`px-4 py-2 rounded-lg transition-colors ${selectedStatus === option.value
                      ? "bg-blue-500 text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {option.label}
                </button>
              ))}
              </div>

              {/* 自动刷新指示器（仅在待审核且列表为空时显示） */}
              {selectedStatus === 'pending' && homeworks.length === 0 && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-300">等待新作业提交...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 根据活跃标签页显示内容 */}
        {activeTab === "homework" ? (
          <>
            {/* 统计信息和批量操作 */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-4 mb-6">
              <div className="flex items-center justify-between">
              <div className="text-white text-sm">
                  共 {pagination.total} 个作业 • 第 {pagination.page} 页，共{" "}
                  {pagination.totalPages} 页
                  {selectedHomeworks.size > 0 && (
                    <span className="ml-4 text-blue-300">
                      已选择 {selectedHomeworks.size} 个作业
                    </span>
                  )}
                </div>

                {/* 批量操作按钮 */}
                {homeworks.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleSelectAll}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                    >
                      {selectedHomeworks.size === homeworks.length
                        ? "取消全选"
                        : "全选"}
                    </button>

                    {selectedHomeworks.size > 0 && (
                      <>
                        {selectedStatus === "pending" && (
                          <>
                            <button
                              onClick={() => handleBatchUpdate("approved")}
                              disabled={batchLoading}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm rounded-lg transition-colors"
                            >
                              批量通过
                            </button>
                            <button
                              onClick={() => handleBatchUpdate("rejected")}
                              disabled={batchLoading}
                              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white text-sm rounded-lg transition-colors"
                            >
                              批量拒绝
                            </button>
                          </>
                        )}

                        {selectedStatus === "approved" && (
                          <button
                            onClick={() => handleBatchUpdate("pending")}
                            disabled={batchLoading}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white text-sm rounded-lg transition-colors"
                          >
                            批量取消通过
                          </button>
                        )}

                        {selectedStatus === "rejected" && (
                          <button
                            onClick={() => handleBatchUpdate("pending")}
                            disabled={batchLoading}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm rounded-lg transition-colors"
                          >
                            批量重新审核
                          </button>
                        )}

                        {selectedStatus === "all" && (
                          <>
                            <button
                              onClick={() => handleBatchUpdate("approved")}
                              disabled={batchLoading}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm rounded-lg transition-colors"
                            >
                              批量通过
                            </button>
                            <button
                              onClick={() => handleBatchUpdate("rejected")}
                              disabled={batchLoading}
                              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white text-sm rounded-lg transition-colors"
                            >
                              批量拒绝
                            </button>
                            <button
                              onClick={() => handleBatchUpdate("pending")}
                              disabled={batchLoading}
                              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white text-sm rounded-lg transition-colors"
                            >
                              批量改为待审核
                            </button>
                          </>
                        )}

                        <button
                          onClick={handleBatchDelete}
                          disabled={batchLoading}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm rounded-lg transition-colors"
                        >
                          批量删除
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 错误信息 */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {/* 加载状态 */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-white/70">正在加载...</p>
              </div>
            ) : (
              /* 作业列表 - 按用户分组 */
              <div className="space-y-4">
            {homeworks.length === 0 ? (
              <div className="text-center py-12 bg-black/20 backdrop-blur-sm rounded-xl border border-white/20">
                <p className="text-white/70">暂无作业数据</p>
              </div>
            ) : (
                  <>
                    {/* 全部展开/收起按钮 */}
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={toggleExpandAll}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                      >
                        {expandedUsers.size === groupHomeworksByUser().size ? "全部收起" : "全部展开"}
                      </button>
                    </div>

                    {/* 按用户分组显示 */}
                    {Array.from(groupHomeworksByUser().entries()).map(([nickname, userHomeworks]) => {
                      const isExpanded = expandedUsers.has(nickname);
                      const userHomeworkIds = userHomeworks.map(hw => hw.id);
                      const allUserHomeworksSelected = userHomeworkIds.every(id => selectedHomeworks.has(id));
                      const someUserHomeworksSelected = userHomeworkIds.some(id => selectedHomeworks.has(id));

                      return (
                        <div
                          key={nickname}
                          className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden"
                        >
                          {/* 用户头部 - 可点击展开/收起 */}
                          <div
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => toggleUserExpanded(nickname)}
                          >
                            <div className="flex items-center space-x-4">
                              {/* 展开/收起图标 */}
                              <div className="text-white text-xl transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                ▶
                              </div>

                              {/* 头像 */}
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                                {nickname.charAt(0)}
                              </div>

                              {/* 用户信息 */}
                              <div>
                                <h3 className="text-white font-bold text-lg">{nickname}</h3>
                                <p className="text-white/60 text-sm">
                                  共提交 {userHomeworks.length} 个作业
                                  {userHomeworks.filter(hw => hw.status === 'pending').length > 0 && (
                                    <span className="ml-2 text-yellow-300">
                                      • {userHomeworks.filter(hw => hw.status === 'pending').length} 个待审核
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* 用户级别的选择框和快捷操作 */}
                            <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                              <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={allUserHomeworksSelected}
                                  ref={input => {
                                    if (input) {
                                      input.indeterminate = someUserHomeworksSelected && !allUserHomeworksSelected;
                                    }
                                  }}
                                  onChange={() => {
                                    if (allUserHomeworksSelected) {
                                      setSelectedHomeworks(prev => {
                                        const newSet = new Set(prev);
                                        userHomeworkIds.forEach(id => newSet.delete(id));
                                        return newSet;
                                      });
                                    } else {
                                      setSelectedHomeworks(prev => {
                                        const newSet = new Set(prev);
                                        userHomeworkIds.forEach(id => newSet.add(id));
                                        return newSet;
                                      });
                                    }
                                  }}
                                  className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-colors"
                                />
                                <span className="text-white/70 group-hover:text-white text-sm">
                                  选择全部
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* 展开的作业列表 */}
                          {isExpanded && (
                            <div className="border-t border-white/10">
                              {userHomeworks.map((homework, index) => (
                    <div
                      key={homework.id}
                                  className={`p-6 ${index > 0 ? 'border-t border-white/10' : ''}`}
                    >
                                  {/* 复选框和作业编号 */}
                      <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                        <label className="flex items-center space-x-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedHomeworks.has(homework.id)}
                                          onChange={() => toggleHomeworkSelection(homework.id)}
                            className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-colors"
                          />
                          <span className="text-white/70 group-hover:text-white text-sm">
                                          作业 #{index + 1}
                          </span>
                        </label>
                                    </div>
                      </div>

                  {/* 作业基本信息 */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-white/60 text-sm">关卡</label>
                                      <p className="text-white font-medium">{homework.stageId}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">状态</label>
                                      <p className={`inline-block px-2 py-1 rounded text-xs border ${getStatusColor(homework.status)}`}>
                        {getStatusText(homework.status)}
                      </p>
                    </div>
                    <div>
                                      <label className="text-white/60 text-sm">提交时间</label>
                          <p className="text-white/80 text-sm">
                                        {new Date(homework.createdAt).toLocaleString("zh-CN")}
                          </p>
                    </div>
                  </div>

                  {/* 作业描述 */}
                  {homework.description && (
                    <div className="mb-4">
                                      <label className="text-white/60 text-sm">作业说明</label>
                          <p className="text-white/80 text-sm mt-1 leading-relaxed">
                            {homework.description}
                          </p>
                    </div>
                  )}

                  {/* 图片列表 */}
                  <div className="mb-4">
                        <label className="text-white/60 text-sm mb-2 block">
                          作业图片 ({homework.images.length}张)
                        </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                      {homework.images.map((image, imgIndex) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.url}
                                            alt={`图片${imgIndex + 1}`}
                            className="w-full h-20 object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                            onClick={() => {
                              setCurrentHomeworkImages(homework.images);
                                              setCurrentImageIndex(imgIndex);
                              setSelectedImage(image.url);
                            }}
                          />
                          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
                            {formatFileSize(image.fileSize)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex space-x-3">
                        {homework.status === "pending" && (
                      <>
                        <button
                                          onClick={() => handleStatusChange(homework.id, "approved")}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          ✓ 通过
                        </button>
                        <button
                                          onClick={() => handleStatusChange(homework.id, "rejected")}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          ✗ 拒绝
                        </button>
                      </>
                    )}
                        {homework.status !== "pending" && (
                      <button
                                        onClick={() => handleStatusChange(homework.id, "pending")}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        恢复待审核
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(homework.id)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      🗑️ 删除
                    </button>
                  </div>
                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
              )}
            </div>
          )}

          {/* 分页 */}
          {!loading && pagination.totalPages > 1 && (
          <div className="flex justify-center space-x-2 mt-6">
            <button
                  onClick={() =>
                    fetchHomeworks(selectedStatus, pagination.page - 1)
                  }
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-white">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
                  onClick={() =>
                    fetchHomeworks(selectedStatus, pagination.page + 1)
                  }
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
            >
              下一页
            </button>
          </div>
          )}
        </>
        ) : activeTab === "points" ? (
          <PointsSettlement />
        ) : (
          <MessageSender />
        )}

        {/* 图片预览模态框 */}
        {selectedImage && currentHomeworkImages.length > 0 && (
          <ImagePreviewModal
            images={currentHomeworkImages}
            currentIndex={currentImageIndex}
            onClose={() => {
              setSelectedImage(null);
              setCurrentHomeworkImages([]);
              setCurrentImageIndex(0);
            }}
            onIndexChange={(index) => {
              setCurrentImageIndex(index);
              setSelectedImage(currentHomeworkImages[index].url);
            }}
          />
        )}

        {/* 拒绝原因模态框 */}
        {rejectModalOpen && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center">
            {/* 背景遮罩 */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectHomeworkId(null);
                setRejectReason("");
                setIsBatchReject(false);
              }}
            />
            
            {/* 模态框内容 */}
            <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {isBatchReject ? `批量拒绝作业（${selectedHomeworks.size}个）` : "拒绝作业"}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  拒绝原因（可选）
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="请输入拒绝原因，如不填写则只拒绝不发送通知"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-gray-900 placeholder-gray-400"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  填写拒绝原因后，系统将发送邮件通知用户
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectHomeworkId(null);
                    setRejectReason("");
                    setIsBatchReject(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={batchLoading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors font-medium"
                >
                  {batchLoading ? "处理中..." : "确认拒绝"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
