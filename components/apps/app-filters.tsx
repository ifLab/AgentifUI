'use client';

import { useThemeColors } from '@lib/hooks/use-theme-colors';
import { cn } from '@lib/utils';
import { ChevronLeft, ChevronRight, Grid3x3, List, Search } from 'lucide-react';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

interface AppFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function AppFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  viewMode,
  onViewModeChange,
}: AppFiltersProps) {
  const { colors, isDark } = useThemeColors();
  const t = useTranslations('pages.apps.market');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 🎯 监听滚动状态，控制左右滚动按钮的显示
  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      return () => container.removeEventListener('scroll', updateScrollButtons);
    }
  }, [categories]);

  // 🎯 滚动控制函数
  const scrollCategories = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const targetScroll =
        direction === 'left'
          ? currentScroll - scrollAmount
          : currentScroll + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
  };

  // 🎯 重构：基于用户友好的tag分类，而非技术性的Dify应用类型
  // 预定义常见标签的图标映射，提供更好的视觉体验
  const getCategoryDisplay = (category: string) => {
    if (category === t('categoryKeys.all')) {
      return { icon: '🏪', label: t('categories.all') };
    }
    if (category === t('categoryKeys.commonApps')) {
      return { icon: '⭐', label: t('categories.favorite') };
    }

    // 🎯 创建分类映射函数 - 避免使用中文作为对象键
    // 通过翻译键来匹配分类，确保代码的国际化友好性
    const getCategoryMapping = (cat: string) => {
      // 功能分类（核心应用场景）
      if (cat === t('categories.writing'))
        return { icon: '✍️', label: t('categories.writing') };
      if (cat === t('categories.translation'))
        return { icon: '🌐', label: t('categories.translation') };
      if (cat === t('categories.programming'))
        return { icon: '💻', label: t('categories.programming') };
      if (cat === t('categories.codeGeneration'))
        return { icon: '🔧', label: t('categories.codeGeneration') };
      if (cat === t('categories.analysis'))
        return { icon: '📊', label: t('categories.analysis') };
      if (cat === t('categories.summary'))
        return { icon: '📝', label: t('categories.summary') };
      if (cat === t('categories.conversation'))
        return { icon: '💬', label: t('categories.conversation') };
      if (cat === t('categories.assistant'))
        return { icon: '🤖', label: t('categories.assistant') };

      // 应用场景（admin配置中的应用场景分类）
      if (cat === t('categories.textGeneration'))
        return { icon: '📄', label: t('categories.textGeneration') };
      if (cat === t('categories.document'))
        return { icon: '📋', label: t('categories.document') };
      if (cat === t('categories.dataAnalysis'))
        return { icon: '📈', label: t('categories.dataAnalysis') };
      if (cat === t('categories.development'))
        return { icon: '⚙️', label: t('categories.development') };
      if (cat === t('categories.generation'))
        return { icon: '✨', label: t('categories.generation') };

      // 模型类型（admin配置中的模型类型分类）
      if (cat === t('categories.conversationModel'))
        return { icon: '💭', label: t('categories.conversationModel') };
      if (cat === t('categories.reasoningModel'))
        return { icon: '🧠', label: t('categories.reasoningModel') };
      if (cat === t('categories.documentModel'))
        return { icon: '📚', label: t('categories.documentModel') };
      if (cat === t('categories.multimodal'))
        return { icon: '🎨', label: t('categories.multimodal') };

      // 技术特性（admin配置中的技术特性分类）
      if (cat === t('categories.highPrecision'))
        return { icon: '🎯', label: t('categories.highPrecision') };
      if (cat === t('categories.fastResponse'))
        return { icon: '⚡', label: t('categories.fastResponse') };
      if (cat === t('categories.localDeployment'))
        return { icon: '🏠', label: t('categories.localDeployment') };
      if (cat === t('categories.enterprise'))
        return { icon: '🏢', label: t('categories.enterprise') };
      if (cat === t('categories.private'))
        return { icon: '🔒', label: t('categories.private') };

      // 通用标签
      if (cat === t('categories.tools'))
        return { icon: '🛠️', label: t('categories.tools') };
      if (cat === t('categories.general'))
        return { icon: '🔄', label: t('categories.general') };
      if (cat === t('categories.professional'))
        return { icon: '⭐', label: t('categories.professional') };

      // 默认情况
      return { icon: '🏷️', label: category };
    };

    return getCategoryMapping(category);
  };

  return (
    <div className="mb-6 space-y-4">
      {/* 搜索框 */}
      <div className="relative">
        <Search
          className={cn(
            'absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform',
            isDark ? 'text-stone-400' : 'text-stone-500'
          )}
        />
        <input
          type="text"
          placeholder={t('search.placeholder')}
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className={cn(
            'w-full rounded-lg border py-2.5 pr-4 pl-10 font-serif',
            'focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20 focus:outline-none',
            'transition-all duration-200',
            isDark
              ? [
                  'border-stone-700 bg-stone-800 text-stone-100',
                  'placeholder:text-stone-400',
                ]
              : [
                  'border-stone-200 bg-white text-stone-900',
                  'placeholder:text-stone-500',
                ]
          )}
        />
      </div>

      {/* Single-line category tags with horizontal scrolling and fixed view toggle */}
      {/* Ensures single line layout regardless of tag count, view toggle always visible */}
      <div className="flex items-center gap-3">
        {/* 左滚动按钮 */}
        {canScrollLeft && (
          <button
            onClick={() => scrollCategories('left')}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors',
              isDark
                ? [
                    'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300',
                    'border border-stone-700',
                  ]
                : [
                    'bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-700',
                    'border border-stone-200 shadow-sm',
                  ]
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* 分类标签容器 - 横向滚动 */}
        <div
          ref={scrollContainerRef}
          className="no-scrollbar flex-1 overflow-x-auto"
        >
          <div className="flex gap-2 pb-1">
            {' '}
            {/* pb-1 留出滚动条空间 */}
            {categories.map(category => {
              const { icon, label } = getCategoryDisplay(category);
              const isSelected = selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-serif text-sm font-medium transition-all duration-200',
                    'flex-shrink-0 whitespace-nowrap', // 防止收缩和换行
                    isSelected
                      ? [
                          isDark
                            ? [
                                'bg-stone-700 text-stone-100',
                                'ring-1 ring-stone-600',
                              ]
                            : [
                                'bg-stone-900 text-white',
                                'ring-1 ring-stone-300',
                              ],
                        ]
                      : [
                          isDark
                            ? [
                                'bg-stone-800 text-stone-300 hover:bg-stone-700',
                                'border border-stone-700 hover:border-stone-600',
                              ]
                            : [
                                'bg-stone-100 text-stone-700 hover:bg-stone-200',
                                'border border-stone-200 hover:border-stone-300',
                              ],
                        ]
                  )}
                >
                  <span className="text-sm">{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 右滚动按钮 */}
        {canScrollRight && (
          <button
            onClick={() => scrollCategories('right')}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors',
              isDark
                ? [
                    'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300',
                    'border border-stone-700',
                  ]
                : [
                    'bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-700',
                    'border border-stone-200 shadow-sm',
                  ]
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* 视图切换 - 固定在右侧 */}
        <div
          className={cn(
            'flex flex-shrink-0 rounded-lg border p-1',
            isDark
              ? 'border-stone-700 bg-stone-800'
              : 'border-stone-200 bg-stone-100'
          )}
        >
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-serif text-sm font-medium transition-all duration-200',
              viewMode === 'grid'
                ? [
                    isDark
                      ? 'bg-stone-700 text-stone-100'
                      : 'bg-white text-stone-900 shadow-sm',
                  ]
                : [
                    isDark
                      ? 'text-stone-400 hover:text-stone-300'
                      : 'text-stone-600 hover:text-stone-700',
                  ]
            )}
          >
            <Grid3x3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('viewMode.grid')}</span>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-serif text-sm font-medium transition-all duration-200',
              viewMode === 'list'
                ? [
                    isDark
                      ? 'bg-stone-700 text-stone-100'
                      : 'bg-white text-stone-900 shadow-sm',
                  ]
                : [
                    isDark
                      ? 'text-stone-400 hover:text-stone-300'
                      : 'text-stone-600 hover:text-stone-700',
                  ]
            )}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">{t('viewMode.list')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
