// 导入动态标题组件
import { StagewiseToolbarWrapper } from '@components/dev/stagewise-toolbar';
import { ConditionalNavBar } from '@components/nav-bar';
import { ConditionalSidebar } from '@components/sidebar/conditional-sidebar';
// 确保导入 Providers 组件
import { DynamicTitle } from '@components/ui/dynamic-title';
// 导入自定义Prism样式
import { NotificationBar } from '@components/ui/notification-bar';
import { TooltipContainer } from '@components/ui/tooltip';
import { cn } from '@lib/utils';
import { Toaster } from 'sonner';

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import {
  Crimson_Pro,
  Inter,
  Noto_Sans_SC,
  Noto_Serif_SC,
  Playfair_Display,
} from 'next/font/google';

import { ClientLayout } from '../components/layouts/client-layout';
import '../styles/markdown-variables.css';
import '../styles/markdown.css';
import '../styles/prism-custom.css';
import './globals.css';
import { Providers } from './providers';

// 🎯 新增：条件渲染Sidebar

// --- BEGIN COMMENT ---
// 🎯 Claude 风格的中英文字体配置
// Inter + 思源黑体：现代简洁的界面字体
// Crimson Pro + 思源宋体：优雅易读的阅读字体
// Playfair Display：装饰性标题字体
// --- END COMMENT ---
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
});

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-crimson',
  display: 'swap',
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-serif',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AgentifUI',
  description: '企业级大模型应用',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // --- BEGIN COMMENT ---
  // 获取当前语言环境和翻译消息
  // --- END COMMENT ---
  const locale = await getLocale();
  const messages = await getMessages();
  // --- BEGIN COMMENT ---
  // 🎯 组合所有字体变量类名，确保在整个应用中可用
  // --- END COMMENT ---
  const fontClasses = cn(
    inter.variable,
    notoSansSC.variable,
    crimsonPro.variable,
    notoSerifSC.variable,
    playfair.variable
  );

  return (
    <html lang={locale} className={fontClasses} suppressHydrationWarning>
      <head>
        {/* Removed the manually added theme initialization script */}
        {/* Let next-themes handle the initial theme setting */}
      </head>
      <body>
        <Providers>
          {' '}
          {/* 使用 Providers 包裹 */}
          <NextIntlClientProvider messages={messages}>
            {/* 添加 DynamicTitle 组件，确保它能在所有页面中生效 */}
            <DynamicTitle />
            <ClientLayout fontClasses={fontClasses}>
              {/* 🎯 条件渲染 Sidebar - 根据路由决定是否显示，避免路由切换时重新挂载 */}
              <ConditionalSidebar />
              {/* 🎯 条件渲染 NavBar - 根据路由决定是否显示，避免路由切换时重新挂载导致的闪烁 */}
              <ConditionalNavBar />
              {children}
              <TooltipContainer />
              <NotificationBar />
              <Toaster
                position="top-center"
                richColors
                theme="system"
                className="font-serif"
              />
            </ClientLayout>
          </NextIntlClientProvider>
        </Providers>
        {process.env.ENABLE_STAGEWISE_TOOLBAR === 'true' &&
          process.env.NODE_ENV === 'development' && <StagewiseToolbarWrapper />}
      </body>
    </html>
  );
}
