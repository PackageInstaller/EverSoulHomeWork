import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EverSoul 攻略分享站',
  description: '分享和查看 EverSoul 游戏攻略',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  )
} 