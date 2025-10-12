"use client";

import { useState, useEffect } from "react";
import PointsSettlement from "@/components/PointsSettlement";

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

// 总积分排行项接口
interface TotalPointsRankItem {
  id: number; // 用户ID
  rank: number; // 排名
  nickname: string; // 用户名
  totalPoints: number; // 总积分
  homeworkCount: number; // 作业总数
  lastUpdated: string; // 最后更新时间
}

export default function AdminHomeworkPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "homework" | "points" | "totalRank"
  >("homework");

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
  const [selectedHomeworks, setSelectedHomeworks] = useState<Set<string>>(
    new Set()
  );
  const [batchLoading, setBatchLoading] = useState(false);

  // 总积分排行数据和分页状态
  const [searchTerm, setSearchTerm] = useState(""); // 添加搜索关键词状态
  const totalPointsRankData: TotalPointsRankItem[] = [
    {
      id: 1,
      rank: 1,
      nickname: "张三",
      totalPoints: 2850.5,
      homeworkCount: 42,
      lastUpdated: "2024-10-05 18:30:22",
    },
    {
      id: 2,
      rank: 2,
      nickname: "李四",
      totalPoints: 2530.2,
      homeworkCount: 38,
      lastUpdated: "2024-10-05 16:15:47",
    },
    {
      id: 3,
      rank: 3,
      nickname: "王五",
      totalPoints: 2180.8,
      homeworkCount: 35,
      lastUpdated: "2024-10-05 14:20:19",
    },
    {
      id: 4,
      rank: 4,
      nickname: "赵六",
      totalPoints: 1980.5,
      homeworkCount: 30,
      lastUpdated: "2024-10-05 12:10:05",
    },
    {
      id: 5,
      rank: 5,
      nickname: "孙七",
      totalPoints: 1780.5,
      homeworkCount: 25,
      lastUpdated: "2024-10-05 10:30:00",
    },
    {
      id: 6,
      rank: 6,
      nickname: "周八",
      totalPoints: 1580.5,
      homeworkCount: 20,
      lastUpdated: "2024-10-05 09:0 0:00",
    },
    {
      id: 7,
      rank: 7,
      nickname: "吴九",
      totalPoints: 1380.5,
      homeworkCount: 15,
      lastUpdated: "2024-10-05 07:45:30",
    },
    {
      id: 8,
      rank: 8,
      nickname: "郑十",
      totalPoints: 1280.5,
      homeworkCount: 10,
      lastUpdated: "2024-10-05 05:30:00",
    },
    {
      id: 9,
      rank: 9,
      nickname: "小十1",
      totalPoints: 1180.5,
      homeworkCount: 5,
      lastUpdated: "2024-10-05 03:30:00",
    },
    {
      id: 10,
      rank: 10,
      nickname: "小十2",
      totalPoints: 1180.5,
      homeworkCount: 5,
      lastUpdated: "2024-10-05 03:30:00",
    },
    {
      id: 11,
      rank: 11,
      nickname: "小十3",
      totalPoints: 1180.5,
      homeworkCount: 5,
      lastUpdated: "2024-10-05 03:30:00",
    },
    {
      id: 12,
      rank: 1,
      nickname: "张三",
      totalPoints: 1180.5,
      homeworkCount: 5,
      lastUpdated: "2025-10-05 03:30:00",
    },
  ];

  // 总积分排行分页状态
  const [rankPagination, setRankPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: totalPointsRankData.length,
    totalPages: Math.ceil(totalPointsRankData.length / 10),
  });
  const [currentRankList, setCurrentRankList] = useState<TotalPointsRankItem[]>(
    []
  );
  const [rankLoading, setRankLoading] = useState(false);

  // 计算当前页的排行数据
  useEffect(() => {
    setRankLoading(true);
    // 根据搜索关键词过滤数据
    const filteredData = searchTerm
      ? totalPointsRankData.filter((item) => item.nickname.includes(searchTerm))
      : totalPointsRankData;

    const { page, limit } = rankPagination;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    setCurrentRankList(filteredData.slice(startIndex, endIndex));
    setRankLoading(false);
  }, [rankPagination.page, rankPagination.limit, searchTerm]);

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
      const response = await fetch(
        `/api/admin/homework?status=${status}&page=${page}&limit=10`
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

  const handleStatusChange = async (homeworkId: string, newStatus: string) => {
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
        fetchHomeworks(selectedStatus, pagination.page);
        alert(`作业状态已更新为: ${getStatusText(newStatus)}`);
      } else {
        alert(result.error || "更新状态失败");
      }
    } catch (error) {
      alert("网络错误");
    }
  };

  const handleDelete = async (homeworkId: string) => {
    if (!confirm("确定要删除这个作业吗？此操作不可撤销。")) {
      return;
    }

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
        fetchHomeworks(selectedStatus, pagination.page);
        alert("作业删除成功");
      } else {
        alert(result.error || "删除失败");
      }
    } catch (error) {
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

    if (
      !confirm(
        `确定要将选中的 ${
          selectedHomeworks.size
        } 个作业状态更新为 ${getStatusText(newStatus)} 吗？`
      )
    ) {
      return;
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
          `更新完成：成功 ${successCount} 个，失败 ${
            selectedHomeworks.size - successCount
          } 个`
        );
      }

      setSelectedHomeworks(new Set());
      fetchHomeworks(selectedStatus, pagination.page);
    } catch (error) {
      alert("批量操作失败");
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
          `删除完成：成功 ${successCount} 个，失败 ${
            selectedHomeworks.size - successCount
          } 个`
        );
      }

      setSelectedHomeworks(new Set());
      fetchHomeworks(selectedStatus, pagination.page);
    } catch (error) {
      alert("批量删除失败");
    } finally {
      setBatchLoading(false);
    }
  };

  // 总积分排行分页切换
  const handleRankPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > rankPagination.totalPages) return;
    setRankPagination((prev) => ({ ...prev, page: newPage }));
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

          {/* 标签页切换 */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab("homework")}
              className={`px-6 py-3 rounded-lg transition-colors ${
                activeTab === "homework"
                  ? "bg-blue-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              📝 作业管理
            </button>
            <button
              onClick={() => setActiveTab("points")}
              className={`px-6 py-3 rounded-lg transition-colors ${
                activeTab === "points"
                  ? "bg-blue-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              💎 积分结算
            </button>
            <button
              onClick={() => setActiveTab("totalRank")}
              className={`px-6 py-3 rounded-lg transition-colors ${
                activeTab === "totalRank"
                  ? "bg-blue-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              📊 总积分排行
            </button>
          </div>

          {/* 作业管理的状态筛选 */}
          {activeTab === "homework" && (
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
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedStatus === option.value
                      ? "bg-blue-500 text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {option.label}
                </button>
              ))}
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
              /* 作业列表 */
              <div className="space-y-4">
                {homeworks.length === 0 ? (
                  <div className="text-center py-12 bg-black/20 backdrop-blur-sm rounded-xl border border-white/20">
                    <p className="text-white/70">暂无作业数据</p>
                  </div>
                ) : (
                  homeworks.map((homework) => (
                    <div
                      key={homework.id}
                      className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6"
                    >
                      {/* 复选框 */}
                      <div className="flex items-start justify-between mb-4">
                        <label className="flex items-center space-x-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedHomeworks.has(homework.id)}
                            onChange={() =>
                              toggleHomeworkSelection(homework.id)
                            }
                            className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-colors"
                          />
                          <span className="text-white/70 group-hover:text-white text-sm">
                            选择此作业
                          </span>
                        </label>
                      </div>

                      {/* 作业基本信息 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="text-white/60 text-sm">关卡</label>
                          <p className="text-white font-medium">
                            {homework.stageId}
                          </p>
                        </div>
                        <div>
                          <label className="text-white/60 text-sm">昵称</label>
                          <p className="text-white font-medium">
                            {homework.nickname}
                          </p>
                        </div>
                        <div>
                          <label className="text-white/60 text-sm">状态</label>
                          <p
                            className={`inline-block px-2 py-1 rounded text-xs border ${getStatusColor(
                              homework.status
                            )}`}
                          >
                            {getStatusText(homework.status)}
                          </p>
                        </div>
                        <div>
                          <label className="text-white/60 text-sm">
                            提交时间
                          </label>
                          <p className="text-white/80 text-sm">
                            {new Date(homework.createdAt).toLocaleString(
                              "zh-CN"
                            )}
                          </p>
                        </div>
                      </div>

                      {/* 作业描述 */}
                      {homework.description && (
                        <div className="mb-4">
                          <label className="text-white/60 text-sm">
                            作业说明
                          </label>
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
                          {homework.images.map((image, index) => (
                            <div key={image.id} className="relative group">
                              <img
                                src={image.url}
                                alt={`图片${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                                onClick={() => setSelectedImage(image.url)}
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
                              onClick={() =>
                                handleStatusChange(homework.id, "approved")
                              }
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                              ✓ 通过
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(homework.id, "rejected")
                              }
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                              ✗ 拒绝
                            </button>
                          </>
                        )}
                        {homework.status !== "pending" && (
                          <button
                            onClick={() =>
                              handleStatusChange(homework.id, "pending")
                            }
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
                  ))
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
          /* 总积分排行标签页 - 带分页功能 */
          <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-start mb-6">
              <h2 className="text-2xl font-bold text-white mb-4 md:mb-0">
                📊 总积分排行
              </h2>

              {/* 添加搜索框 */}
              <div className="w-full md:w-auto p-6">
                <input
                  type="text"
                  placeholder="搜索用户昵称..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setRankPagination((prev) => ({ ...prev, page: 1 })); // 重置到第一页
                  }}
                  className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full max-w-md"
                />
              </div>
            </div>

            {/* 总积分统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-500/30">
                <div className="text-white/70 text-sm mb-1">参与用户总数</div>
                <div className="text-2xl font-bold text-blue-300">
                  {totalPointsRankData.length} 人
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30">
                <div className="text-white/70 text-sm mb-1">总积分最高</div>
                <div className="text-2xl font-bold text-green-300">
                  {totalPointsRankData[0].totalPoints.toFixed(1)} 分
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30">
                <div className="text-white/70 text-sm mb-1">平均作业数</div>
                <div className="text-2xl font-bold text-yellow-300">
                  {Math.round(
                    totalPointsRankData.reduce(
                      (sum, item) => sum + item.homeworkCount,
                      0
                    ) / totalPointsRankData.length
                  )}{" "}
                  个
                </div>
              </div>
            </div>

            {/* 总积分排行列表 */}
            {rankLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-white/70">正在加载排行数据...</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {currentRankList.map((item) => {
                    let rankStyle = "bg-white/5";
                    let rankIcon = `#${item.rank}`;

                    if (item.rank === 1) {
                      rankStyle =
                        "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50";
                      rankIcon = "🥇";
                    } else if (item.rank === 2) {
                      rankStyle =
                        "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-2 border-gray-400/50";
                      rankIcon = "🥈";
                    } else if (item.rank === 3) {
                      rankStyle =
                        "bg-gradient-to-r from-orange-400/20 to-orange-600/20 border-2 border-orange-400/50";
                      rankIcon = "🥉";
                    }

                    return (
                      <div
                        // key={`${item.nickname}-${item.rank}`}
                        key={`${item.id}`}
                        className={`${rankStyle} backdrop-blur-sm rounded-xl p-4 border border-white/10 transition-transform hover:scale-[1.02]`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl font-bold text-white/80 w-12 text-center">
                              {rankIcon}
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-white">
                                {item.nickname}
                              </div>
                              <div className="text-sm text-white/60">
                                完成作业 {item.homeworkCount} 个 • 最后更新：
                                {item.lastUpdated}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xl font-bold text-blue-300">
                              {item.totalPoints.toFixed(1)} 总积分
                            </div>
                            <div className="text-sm text-white/50">
                              平均每作业{" "}
                              {(
                                item.totalPoints / item.homeworkCount || 0
                              ).toFixed(1)}{" "}
                              分
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 总积分排行分页控件 */}
                {rankPagination.totalPages > 1 && (
                  <div className="flex justify-center space-x-2 mt-4">
                    <button
                      onClick={() =>
                        handleRankPageChange(rankPagination.page - 1)
                      }
                      disabled={rankPagination.page === 1}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                    >
                      上一页
                    </button>
                    <span className="px-4 py-2 text-white">
                      第 {rankPagination.page} 页 / 共{" "}
                      {rankPagination.totalPages} 页
                    </span>
                    <button
                      onClick={() =>
                        handleRankPageChange(rankPagination.page + 1)
                      }
                      disabled={
                        rankPagination.page === rankPagination.totalPages
                      }
                      className="px-4 py-2 bg-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 图片预览模态框 */}
        {selectedImage && (
          <div
            className="fixed z-[999999]"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 999999,
              pointerEvents: "auto",
            }}
          >
            {/* 背景遮罩 */}
            <div
              className="fixed inset-0"
              style={{
                position: "fixed",
                top: "-50vh",
                left: "-50vw",
                width: "200vw",
                height: "200vh",
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                backdropFilter: "blur(4px)",
                zIndex: -1,
              }}
              onClick={() => setSelectedImage(null)}
            />

            <img
              src={selectedImage}
              alt="作业预览"
              className="rounded-xl shadow-2xl"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                display: "block",
              }}
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={() => setSelectedImage(null)}
              className="absolute bg-black/80 hover:bg-black/90 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 shadow-lg"
              style={{
                top: "-20px",
                right: "-20px",
              }}
            >
              <span className="text-xl font-bold">✕</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
