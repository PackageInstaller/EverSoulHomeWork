"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 定义用户类型
interface User {
  id: string;
  email: string;
  password: string;
  nickname: string;
}

// 静态用户数据模拟数据库
const userList: User[] = [
  {
    id: "1",
    email: "admin@example.com",
    password: "admin123",
    nickname: "管理员",
  },
  {
    id: "2",
    email: "user1@example.com",
    password: "user123",
    nickname: "用户一",
  },
  {
    id: "3",
    email: "user2@example.com",
    password: "user456",
    nickname: "用户二",
  },
];

// 模拟数据库操作
const userDatabase = {
  getUsers: () => userList,
  getUserById: (id: string) => userList.find((u) => u.id === id),
  getUserByEmail: (email: string) => userList.find((u) => u.email === email),
  addUser: (user: User) => {
    userList.push(user);
  },
  updateUser: (id: string, updates: Partial<User>) => {
    const index = userList.findIndex((u) => u.id === id);
    if (index !== -1) {
      userList[index] = { ...userList[index], ...updates };
      return true;
    }
    return false;
  },
};

export default function LoginRegisterPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState(""); // 新增昵称字段
  // 添加状态来控制加载和成功提示
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(""); // 添加错误提示
  // 添加密码可见性状态
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 清除之前的错误信息
    setError("");

    if (isLogin) {
      // 登录逻辑
      if (!email || !password) {
        setError("请输入邮箱和密码");
        return;
      }

      // 设置加载状态
      setLoading(true);

      // 模拟网络请求延迟
      setTimeout(() => {
        // 查找用户
        const user = userDatabase.getUserByEmail(email);
        if (user && user.password === password) {
          // 创建token（实际项目中应由后端返回）
          const token = btoa(
            encodeURIComponent(
              JSON.stringify({
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                timestamp: Date.now(),
              })
            )
          );

          // 将token存储到localStorage中
          localStorage.setItem("Token", token);

          // 设置成功状态
          setLoading(false);
          setSuccess(true);

          // 延迟跳转以显示成功提示
          setTimeout(() => {
            // 跳转到首页
            router.push("/");
          }, 500);
        } else {
          setLoading(false);
          setError("邮箱或密码错误");
        }
      }, 500);
    } else {
      // 注册逻辑
      if (!email || !password || !nickname) {
        setError("请填写所有必填字段");
        return;
      }

      // 添加昵称长度验证（最多16个字符，中文算2个字符，英文算1个字符）
      const getByteLength = (str: string) => {
        let byteLength = 0;
        for (let i = 0; i < str.length; i++) {
          const charCode = str.charCodeAt(i);
          if (charCode >= 0x4e00 && charCode <= 0x9fff) {
            // 中文字符范围
            byteLength += 2;
          } else {
            byteLength += 1;
          }
        }
        return byteLength;
      };

      const nicknameByteLength = getByteLength(nickname);
      if (nicknameByteLength > 16) {
        setError("昵称过长！最多16个字符（中文为2个字符）");
        return;
      }

      if (password !== confirmPassword) {
        setError("两次密码不一致！请重新输入");
        return;
      }

      // 检查邮箱是否已被注册
      if (userDatabase.getUserByEmail(email)) {
        setError("该邮箱已被注册");
        return;
      }

      // 设置加载状态
      setLoading(true);

      // 模拟网络请求延迟
      setTimeout(() => {
        // 模拟创建新用户
        const newUser: User = {
          id: `${userList.length + 1}`,
          email,
          password,
          nickname,
        };

        // 添加到用户列表（模拟数据库保存）
        userDatabase.addUser(newUser);

        // 注册成功后自动登录
        const token = btoa(
          encodeURIComponent(
            JSON.stringify({
              id: newUser.id,
              email: newUser.email,
              nickname: newUser.nickname,
              timestamp: Date.now(),
            })
          )
        );

        localStorage.setItem("Token", token);

        // 设置成功状态
        setLoading(false);
        setSuccess(true);

        // 延迟跳转以显示成功提示
        setTimeout(() => {
          router.push("/");
        }, 500);
      }, 500);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundImage: "url(/images/loginBg.webp)" }}
    >
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1
            className="text-center text-3xl font-extrabold"
            // 修改为给文字添加阴影效果，而不是给box
            style={{
              textShadow: "0px 7px 10px rgba(114, 118, 255, 1)",
            }}
          >
            EverSoul 作业站
          </h1>
          {/* <h2 className=" text-center text-2xl font-bold text-gray-900">
            {isLogin ? "登录您的账户" : "创建新账户"}
          </h2> */}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`flex-1 py-2 px-4 text-center font-medium ${
                isLogin
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => {
                setIsLogin(true);
                setError(""); // 切换标签时清除错误信息
              }}
            >
              登录
            </button>
            <button
              className={`flex-1 py-2 px-4 text-center font-medium ${
                !isLogin
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => {
                setIsLogin(false);
                setError(""); // 切换标签时清除错误信息
              }}
            >
              注册
            </button>
          </div>

          {/* 添加错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
              {error}
            </div>
          )}

          {/* 添加成功提示 */}
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-center">
              {isLogin ? "登录成功！正在跳转..." : "注册成功！正在跳转..."}
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                placeholder="请输入邮箱"
              />
            </div>

            {/* 注册时需要填写昵称 */}
            {!isLogin && (
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
                  required={!isLogin}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="mt-1 block w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                  placeholder="请输入昵称"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                密码
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                  placeholder="至少6位字符"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  确认密码
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                    placeholder="再次输入密码"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                {/* 根据状态显示不同内容 */}
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    处理中...
                  </span>
                ) : (
                  <span>{isLogin ? "登录" : "注册"}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
