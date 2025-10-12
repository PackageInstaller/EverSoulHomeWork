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
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("Token");
      if (!token) {
        router.push("/loginResignter");
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

    // 如果要修改密码
    if (showPasswordFields) {
      if (!oldPassword) {
        setMessage({ type: "error", text: "请输入当前密码" });
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
      if (showPasswordFields && oldPassword && newPassword) {
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
        // 更新本地token
        localStorage.setItem("Token", data.token);
        setMessage({ type: "success", text: "资料更新成功" });

        // 重置密码字段
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordFields(false);

        // 延迟跳转
        setTimeout(() => {
          router.push("/");
        }, 1000);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            编辑个人资料
          </h1>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          {message && (
            <div
              className={`mb-4 p-3 rounded-md text-center ${
                message.type === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                id="change-password"
                name="change-password"
                type="checkbox"
                checked={showPasswordFields}
                onChange={(e) => setShowPasswordFields(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="change-password"
                className="ml-2 block text-sm text-gray-700"
              >
                修改密码
              </label>
            </div>

            {showPasswordFields && (
              <>
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="至少6位字符"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "保存中..." : "保存更改"}
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
