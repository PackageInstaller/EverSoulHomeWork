"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  nickname: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(
    null
  );

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("Token");
      if (!token) {
        router.push("/loginResignter");
        return;
      }

      try {
        const timestamp = Date.now();
        const response = await fetch(`/api/user/profile?_t=${timestamp}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        const data = await response.json();

        if (data.success && data.user) {
          setCurrentUser(data.user);
          setNickname(data.user.nickname);
          setEmail(data.user.email);
        } else {
          router.push("/loginResignter");
        }
      } catch (error) {
        console.error('获取用户信息失败', error);
        router.push("/loginResignter");
      }
    };

    fetchUserProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // 验证输入
    if (!nickname.trim()) {
      setMessage({ type: "error", text: "昵称不能为空" });
      setLoading(false);
      return;
    }

    // 如果要修改密码（填写了任一密码字段）
    const isChangingPassword = oldPassword || newPassword || confirmPassword;

    if (isChangingPassword) {
      if (!oldPassword) {
        setMessage({ type: "error", text: "请输入当前密码" });
        setLoading(false);
        return;
      }

      if (!newPassword) {
        setMessage({ type: "error", text: "请输入新密码" });
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage({ type: "error", text: "新密码与确认密码不一致" });
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        setMessage({ type: "error", text: "新密码长度不能少于6位" });
        setLoading(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem("Token");
      if (!token) {
        router.push("/loginResignter");
        return;
      }

      const requestBody: any = { nickname };
      if (isChangingPassword && oldPassword && newPassword) {
        requestBody.oldPassword = oldPassword;
        requestBody.newPassword = newPassword;
      }

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // 如果修改了密码，需要强制退出重新登录
        if (isChangingPassword) {
          setMessage({ type: "success", text: "密码修改成功，请重新登录" });

          // 清除token并跳转到登录页
          setTimeout(() => {
            localStorage.removeItem("Token");
            router.push("/loginResignter");
          }, 1500);
        } else {
          // 只修改了昵称，更新本地token和用户信息
          localStorage.setItem("Token", data.token);

          // 更新 localStorage 中的用户信息（如果存在）
          try {
            const userInfo = JSON.parse(atob(data.token.split('.')[1]));
            localStorage.setItem("UserInfo", JSON.stringify({
              id: userInfo.id,
              email: userInfo.email,
              nickname: userInfo.nickname
            }));
          } catch (e) {
            console.error('解析用户信息失败', e);
          }

          setMessage({ type: "success", text: "资料更新成功，即将刷新页面..." });
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        }

        // 重置密码字段
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data.message || "更新失败" });
      }
    } catch (error) {
      console.error('更新用户信息失败', error);
      setMessage({ type: "error", text: "网络错误，请稍后重试" });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-700 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            编辑个人资料
          </h1>
          <button
            onClick={() => router.push('/')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors shadow-md hover:shadow-lg border border-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回主页
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
          {message && (
            <div
              className={`mb-4 p-3 rounded-md text-center ${message.type === "error"
                  ? "bg-red-100 text-red-700 border border-red-300"
                  : "bg-green-100 text-green-700 border border-green-300"
                }`}
            >
              {message.text}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                邮箱地址
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled
              />
              <p className="mt-1 text-sm text-gray-500">邮箱地址不可更改</p>
            </div>

            <div>
              <label
                htmlFor="nickname"
                className="block text-sm font-medium text-gray-700"
              >
                昵称
              </label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入昵称"
                autoComplete="nickname"
              />
            </div>

            <div className="border-t border-gray-200 pt-6 mt-2">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                修改密码（可选）
              </h3>
              <div>
                <label
                  htmlFor="old-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  当前密码
                </label>
                <input
                  id="old-password"
                  name="old-password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入当前密码"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  新密码
                </label>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="至少6位字符"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  确认新密码
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请再次输入新密码"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                disabled={loading}
              >
                {loading ? "保存中..." : "保存更改"}
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                返回
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
