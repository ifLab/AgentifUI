'use client';

import { useTheme } from '@lib/hooks/use-theme';
import { useSidebarStore } from '@lib/stores/sidebar-store';
import { cn } from '@lib/utils';
import { Menu } from 'lucide-react';

import { useTranslations } from 'next-intl';

export function MobileNavButton() {
  const { isExpanded, showMobileNav } = useSidebarStore();
  const { isDark } = useTheme();
  const t = useTranslations('mobile.navigation');

  // 如果侧边栏已展开，直接返回null，不渲染按钮
  if (isExpanded) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label={t('openMenu')}
      onClick={showMobileNav}
      className={cn(
        'fixed top-4 left-4 z-50 md:hidden', // 仅在移动设备上显示，固定在左上角
        'flex items-center justify-center',
        'h-10 w-10 rounded-full',
        'select-none', // 防止文字选中

        // 去掉transition效果

        // 亮色模式样式
        !isDark && [
          'bg-stone-100 text-stone-900 hover:bg-stone-300',
          'shadow-primary/5 shadow-lg',
        ],

        // 暗色模式样式
        isDark && [
          'bg-stone-700 text-gray-100 hover:bg-stone-600',
          'shadow-[0_0_10px_rgba(0,0,0,0.4)]',
        ]
      )}
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}
