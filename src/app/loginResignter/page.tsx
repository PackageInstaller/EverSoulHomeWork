"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateRegisterSignature, addSignatureToUrl } from "@/utils/signatureHelper";

// 分离出使用 useSearchParams 的组件
function LoginRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  // 获取返回URL参数
  useEffect(() => {
    const url = searchParams.get('returnUrl');
    if (url) {
      setReturnUrl(decodeURIComponent(url));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // 登录逻辑
        if (!email || !password) {
          setError("请输入邮箱和密码");
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError("密码长度至少6位");
          setLoading(false);
          return;
        }

        const response = await fetch('/api/user/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem("Token", data.token);
          setSuccess(true);
          setTimeout(() => {
            // 如果有返回URL，跳转回去；否则跳转到主页
            router.push(returnUrl || "/");
          }, 500);
        } else {
          setError(data.message || "登录失败");
        }
      } else {
        // 注册逻辑
        if (!email || !password || !nickname) {
          setError("请填写所有必填字段");
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError("两次密码不一致！请重新输入");
          setLoading(false);
          return;
        }

        // 生成请求签名
        const { signature, timestamp, nonce, sessionId } = await generateRegisterSignature(
          email,
          nickname,
          password
        );

        // 添加签名参数到URL
        const signedUrl = addSignatureToUrl(
          '/api/user/register',
          signature,
          timestamp,
          nonce,
          sessionId
        );

        const response = await fetch(signedUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, nickname }),
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem("Token", data.token);
          setSuccess(true);
          setTimeout(() => {
            // 如果有返回URL，跳转回去；否则跳转到主页
            router.push(returnUrl || "/");
          }, 500);
        } else {
          setError(data.message || "注册失败");
        }
      }
    } catch (error) {
      console.error('请求失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: "url(/background/loginBg.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1
            className="text-3xl font-extrabold"
            style={{
              textShadow: "0px 7px 10px rgba(114, 118, 255, 1)",
            }}
          >
            EverSoul 作业站
          </h1>
          <button
            onClick={() => router.push('/')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回主页
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`flex-1 py-2 px-4 text-center font-medium ${isLogin
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
                }`}
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
            >
              登录
            </button>
            <button
              className={`flex-1 py-2 px-4 text-center font-medium ${!isLogin
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
                }`}
              onClick={() => {
                setIsLogin(false);
                setError("");
              }}
            >
              注册
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
              {error}
            </div>
          )}

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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                disabled={loading}
                placeholder="请输入邮箱"
                autoComplete="email"
              />
            </div>

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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  disabled={loading}
                  placeholder="请输入昵称"
                  autoComplete="nickname"
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
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  disabled={loading}
                  placeholder="至少6位字符"
                  autoComplete="current-password"
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
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    disabled={loading}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
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

// 主导出组件，用 Suspense 包裹
export default function LoginRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </div>
    }>
      <LoginRegisterForm />
    </Suspense>
  );
}
