import type { Metadata } from 'next'
import './globals.css'
import StartupMigrationCheck from '@/components/StartupMigrationCheck'
import CacheRefreshTimer from '@/components/CacheRefreshTimer'

export const metadata: Metadata = {
  title: 'EverSoul 作业站',
  description: '分享和查看 EverSoul 游戏攻略',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50">
        <StartupMigrationCheck />
        <CacheRefreshTimer intervalMinutes={10} enabled={true} />
        {children}
      </body>
    </html>
  )
} 