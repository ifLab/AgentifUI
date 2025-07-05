'use client';

import { AppFilters, AppHeader, AppList, AppLoading } from '@components/apps';
// 🎯 多提供商支持：应用市场现在支持来自不同提供商的应用
// 过滤逻辑基于 app_type === 'marketplace'，不再限制特定提供商
// 这样可以显示来自不同提供商的应用市场应用
import type { AppInstance } from '@components/apps/types';
// NavBar 已移至根布局，无需导入
import { useMobile } from '@lib/hooks';
import { useThemeColors } from '@lib/hooks/use-theme-colors';
import { useAppListStore } from '@lib/stores/app-list-store';
import { useFavoriteAppsStore } from '@lib/stores/favorite-apps-store';
import { useSidebarStore } from '@lib/stores/sidebar-store';
import { cn } from '@lib/utils';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AppsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { colors } = useThemeColors();
  const isMobile = useMobile();
  const { addFavoriteApp, favoriteApps } = useFavoriteAppsStore();
  const { selectItem } = useSidebarStore();
  const t = useTranslations('pages.apps.market');
  // 🎯 使用真实的应用列表数据，替代硬编码
  const { apps: rawApps, fetchApps, isLoading } = useAppListStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    t('categoryKeys.all')
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 🎯 效仿模型选择器：简洁的应用获取逻辑
  // 只需要一行代码，无需复杂的用户状态判断
  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // 🎯 在组件挂载时清除sidebar选中状态
  useEffect(() => {
    selectItem(null, null);
  }, [selectItem]);

  // 🎯 处理URL查询参数，支持直接跳转到特定筛选
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');

    if (categoryParam) {
      setSelectedCategory(decodeURIComponent(categoryParam));
    }

    if (searchParam) {
      setSearchTerm(decodeURIComponent(searchParam));
    }
  }, [searchParams]);

  // 🎯 更新URL查询参数的函数
  const updateURLParams = (category?: string, search?: string) => {
    const params = new URLSearchParams();

    if (category && category !== t('categoryKeys.all')) {
      params.set('category', encodeURIComponent(category));
    }

    if (search && search.trim()) {
      params.set('search', encodeURIComponent(search.trim()));
    }

    const queryString = params.toString();
    const newURL = queryString ? `/apps?${queryString}` : '/apps';

    router.replace(newURL, { scroll: false });
  };

  // 🎯 分类选择处理函数
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    updateURLParams(category, searchTerm);
  };

  // 🎯 搜索处理函数
  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
    updateURLParams(selectedCategory, search);
  };

  // 🎯 将原始应用数据转换为应用市场格式
  // 🎯 多提供商支持：过滤出应用市场类型的应用，支持所有提供商
  // 过滤逻辑不再限制特定提供商，只要是 marketplace 类型就显示
  const apps: AppInstance[] = rawApps
    .filter(app => {
      const metadata = app.config?.app_metadata;

      // 🎯 支持多提供商：只要 app_type === 'marketplace' 就显示
      if (metadata) {
        return (
          metadata.app_type === 'marketplace' ||
          metadata.is_marketplace_app === true
        );
      }

      // 如果没有元数据配置，则不显示
      return false;
    })
    .map(app => {
      const metadata = app.config?.app_metadata;
      const difyParams = app.config?.dify_parameters;

      const difyAppType = metadata?.dify_apptype;

      // 🎯 简化描述生成逻辑
      let description =
        metadata?.brief_description ||
        app.description ||
        difyParams?.opening_statement;

      if (!description) {
        description = t('appCard.noDescription');
      }

      return {
        instanceId: app.instance_id,
        displayName: app.display_name || app.instance_id,
        description,
        appType: 'marketplace' as const,
        iconUrl: metadata?.icon_url,
        difyAppType: difyAppType,
        tags: metadata?.tags || [],
        isPopular: metadata?.is_common_model || false,
        lastUsed: new Date().toISOString().split('T')[0],
        config: app.config,
      };
    });

  // 🎯 动态分类逻辑：从应用 tags 中提取分类 + 常用应用分类
  const hasCommonApps = apps.some(app => {
    const isFavorite = favoriteApps.some(
      fav => fav.instanceId === app.instanceId
    );
    return app.isPopular || isFavorite;
  });

  // 🎯 新增：动态提取所有应用的 tags 作为分类
  // 从应用市场的所有应用中提取唯一的 tags，并按使用频率排序
  const extractTagCategories = (apps: AppInstance[]): string[] => {
    const tagCounts = new Map<string, number>();

    // 统计每个 tag 的使用频率
    apps.forEach(app => {
      if (app.tags && app.tags.length > 0) {
        app.tags.forEach(tag => {
          if (tag && tag.trim()) {
            const normalizedTag = tag.trim();
            tagCounts.set(
              normalizedTag,
              (tagCounts.get(normalizedTag) || 0) + 1
            );
          }
        });
      }
    });

    // 按使用频率降序排序，如果频率相同则按字母顺序排序
    return Array.from(tagCounts.entries())
      .sort(([tagA, countA], [tagB, countB]) => {
        if (countA !== countB) {
          return countB - countA; // 按频率降序
        }
        return tagA.localeCompare(tagB); // 按字母顺序
      })
      .map(([tag]) => tag);
  };

  // 提取 tag 分类
  const tagCategories = extractTagCategories(apps);

  // 构建完整的分类列表
  const categories = [
    t('categoryKeys.all'), // "全部" 分类
    ...(hasCommonApps ? [t('categoryKeys.commonApps')] : []), // "常用应用" 分类（如果有的话）
    ...tagCategories, // 动态 tag 分类
  ];

  // 🎯 应用过滤逻辑（保持原有逻辑）
  const filteredApps = apps.filter(app => {
    const matchesSearch =
      app.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.tags?.some(tag =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    let matchesCategory = false;

    if (selectedCategory === t('categoryKeys.all')) {
      matchesCategory = true;
    } else if (selectedCategory === t('categoryKeys.commonApps')) {
      // 🎯 常用应用过滤逻辑：基于isPopular标记或收藏状态
      const isFavorite = favoriteApps.some(
        fav => fav.instanceId === app.instanceId
      );
      matchesCategory = app.isPopular || isFavorite;
    } else {
      const appTags = app.tags || [];
      matchesCategory = appTags.includes(selectedCategory);
    }

    return matchesSearch && matchesCategory;
  });

  // 🎯 应用排序逻辑（保持原有逻辑）
  const sortedApps = [...filteredApps].sort((a, b) => {
    const aIsFavorite = favoriteApps.some(
      fav => fav.instanceId === a.instanceId
    );
    const bIsFavorite = favoriteApps.some(
      fav => fav.instanceId === b.instanceId
    );

    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;

    // 移除硬编码的标签优先级逻辑

    return a.displayName.localeCompare(b.displayName);
  });

  // 🎯 打开应用详情
  const handleOpenApp = async (app: AppInstance) => {
    try {
      const difyAppType = app.config?.app_metadata?.dify_apptype;

      let routePath: string;

      switch (difyAppType) {
        case 'chatbot':
          routePath = `/apps/chatbot/${app.instanceId}`;
          break;
        case 'agent':
          routePath = `/apps/agent/${app.instanceId}`;
          break;
        case 'chatflow':
          routePath = `/apps/chatflow/${app.instanceId}`;
          break;
        case 'workflow':
          routePath = `/apps/workflow/${app.instanceId}`;
          break;
        case 'text-generation':
          routePath = `/apps/text-generation/${app.instanceId}`;
          break;
        default:
          console.warn(
            `${t('unknownAppType')}: ${difyAppType}，${t('useDefaultRoute')}`
          );
          routePath = `/apps/chatbot/${app.instanceId}`;
      }

      console.log(
        `[${t('routeJump')}] ${t('app')}: ${app.displayName}, ${t('type')}: ${difyAppType}, ${t('path')}: ${routePath}`
      );

      router.push(routePath);
    } catch (error) {
      console.error(`${t('openAppFailed')}:`, error);
    }
  };

  // 🎯 效仿模型选择器：简化加载状态判断
  // 只需要判断isLoading，无需复杂的用户状态加载逻辑
  if (isLoading && rawApps.length === 0) {
    return <AppLoading />;
  }

  return (
    <>
      {/* 🎯 NavBar 已移至根布局，无需重复渲染 */}

      <div
        className={cn(
          colors.mainBackground.tailwind,
          'min-h-screen',
          'pt-16 md:pt-12'
        )}
      >
        <div className="mx-auto max-w-6xl px-4 py-8">
          <AppHeader
            totalApps={apps.length}
            filteredApps={sortedApps.length}
            selectedCategory={selectedCategory}
          />

          <AppFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            categories={categories}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          <AppList
            apps={sortedApps}
            viewMode={viewMode}
            onAppClick={handleOpenApp}
          />
        </div>
      </div>
    </>
  );
}
