'use client';

import { useSmartShortcuts } from '@lib/hooks/use-smart-shortcuts';
import { cn } from '@lib/utils';

import React, { useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

interface ClientLayoutProps {
  children: React.ReactNode;
  fontClasses: string;
}

/**
 * 客户端布局组件
 * 负责根据当前路径应用适当的 CSS 类
 * 聊天页面使用固定高度和溢出滚动，其他页面使用自然高度
 */
export function ClientLayout({ children, fontClasses }: ClientLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isChatPage = pathname?.startsWith('/chat');

  // 🎯 启用智能快捷键：导航类快捷键即使在输入框中也可用
  // Cmd+K新对话、Cmd+Shift+A应用市场、Cmd+\切换侧栏
  useSmartShortcuts({
    enabled: mounted, // 只在客户端挂载后启用
  });

  useEffect(() => {
    setMounted(true);
    // 当客户端组件挂载后，给 body 添加 render-ready 类，使其可见
    document.body.classList.add('render-ready');

    // 🎯 全局设置 sidebar 挂载状态，避免每个布局重复调用导致的闪烁
    const { setMounted: setSidebarMounted } =
      require('@lib/stores/sidebar-store').useSidebarStore.getState();
    setSidebarMounted();

    // 清理函数：仅当 ClientLayout 自身卸载时才移除 render-ready
    return () => {
      document.body.classList.remove('render-ready');
    };
  }, []); // 空依赖数组，确保此 effect 只在挂载和卸载时运行一次

  useEffect(() => {
    if (!mounted) return;
    const bodyElement = document.body;
    if (isChatPage) {
      bodyElement.classList.add('chat-page');
      bodyElement.classList.remove('default-page');
    } else {
      bodyElement.classList.add('default-page');
      bodyElement.classList.remove('chat-page');
    }
    // 清理函数：只清理页面特定的类
    return () => {
      bodyElement.classList.remove('chat-page', 'default-page');
    };
  }, [pathname, isChatPage, mounted]); // 依赖项保持不变，用于页面特定类的切换

  const layoutClass = mounted
    ? cn(fontClasses, 'antialiased', isChatPage ? 'h-full' : 'min-h-screen')
    : cn(fontClasses, 'antialiased');

  return <div className={layoutClass}>{children}</div>;
}
