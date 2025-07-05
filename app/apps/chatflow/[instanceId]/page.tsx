'use client';

import {
  ChatInputBackdrop,
  ChatLoader,
  ScrollToBottomButton,
  WelcomeScreen,
} from '@components/chat';
import { ChatInput } from '@components/chat-input';
import { ChatflowFloatingController } from '@components/chatflow/chatflow-floating-controller';
import { ChatflowInputArea } from '@components/chatflow/chatflow-input-area';
import { ChatflowNodeTracker } from '@components/chatflow/chatflow-node-tracker';
// NavBar 已移至根布局，无需导入
import {
  useChatInterface,
  useChatScroll,
  useChatWidth,
  useMobile,
  useWelcomeScreen,
} from '@lib/hooks';
import { useChatflowInterface } from '@lib/hooks/use-chatflow-interface';
import { useChatflowState } from '@lib/hooks/use-chatflow-state';
import { useCurrentApp } from '@lib/hooks/use-current-app';
import { useProfile } from '@lib/hooks/use-profile';
import { useThemeColors } from '@lib/hooks/use-theme-colors';
import { useAppListStore } from '@lib/stores/app-list-store';
import { useChatInputStore } from '@lib/stores/chat-input-store';
import { useChatLayoutStore } from '@lib/stores/chat-layout-store';
import { useChatStore } from '@lib/stores/chat-store';
import { useChatflowExecutionStore } from '@lib/stores/chatflow-execution-store';
import { useSidebarStore } from '@lib/stores/sidebar-store';
import { cn } from '@lib/utils';
import { Blocks, Loader2 } from 'lucide-react';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useParams, usePathname, useRouter } from 'next/navigation';

export default function AppDetailPage() {
  const { colors, isDark } = useThemeColors();
  const isMobile = useMobile();
  const { widthClass, paddingClass } = useChatWidth();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const instanceId = params.instanceId as string;
  const t = useTranslations('pages.apps');

  // 获取用户资料，用于欢迎界面显示
  const { profile } = useProfile();

  // 🎯 获取chatflow执行状态清理方法
  const { resetExecution } = useChatflowExecutionStore();

  // 🎯 使用统一的chatflow状态管理，支持智能弹窗控制
  const {
    messages,
    handleSubmit: originalHandleSubmit,
    isProcessing,
    handleStopProcessing,
    sendDirectMessage,
    nodeTracker,
    showNodeTracker,
    setShowNodeTracker,
    showFloatingController,
  } = useChatflowState(true); // chatflow页面始终是chatflow应用

  // 获取chatflow特有的提交函数
  const { handleChatflowSubmit, isWaitingForResponse } = useChatflowInterface();

  // 使用统一的欢迎界面逻辑，现在支持应用详情页面
  const { isWelcomeScreen, setIsWelcomeScreen } = useWelcomeScreen();

  // 获取聊天布局状态，用于输入框高度管理
  const { inputHeight } = useChatLayoutStore();
  const chatInputHeightVar = `${inputHeight || 80}px`;

  // 本地状态管理
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🎯 移除重复的自动显示逻辑，现在由useChatflowState统一管理
  // 支持用户主动关闭后不再自动打开的智能行为
  // 添加滚动管理，确保消息列表能正确滚动
  const scrollRef = useChatScroll(messages);

  // Sidebar选中状态管理
  const { selectItem } = useSidebarStore();

  // 聊天状态管理
  const { clearMessages, setCurrentConversationId } = useChatStore();

  // 应用初始化状态
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [hasFormConfig, setHasFormConfig] = useState(false);

  // 🎯 新增：确保loader最少显示0.7秒，让布局有足够时间稳定
  const [hasMinimumLoadTime, setHasMinimumLoadTime] = useState(false);

  // 🎯 最小加载时间控制：确保loader至少显示0.7秒
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMinimumLoadTime(true);
    }, 700); // 0.7秒

    return () => clearTimeout(timer);
  }, []);

  // 应用相关状态
  const { apps, fetchApps } = useAppListStore();
  const {
    currentAppId,
    isValidating,
    isValidatingForMessage,
    switchToSpecificApp,
    error: appError,
  } = useCurrentApp();

  // 获取当前应用实例数据
  const currentApp = apps.find(app => app.instance_id === instanceId);

  // 主题同步：确保输入框样式跟随主题变化
  const setDarkMode = useChatInputStore(state => state.setDarkMode);
  useEffect(() => {
    setDarkMode(isDark);
  }, [isDark, setDarkMode]);

  // 🎯 关键修复：使用useLayoutEffect确保在路由切换时立即清理状态
  // 这比useEffect更早执行，能在渲染前清理状态，避免显示错误内容
  const { clearConversationState } = useChatInterface();

  useLayoutEffect(() => {
    // 🎯 修复：正确判断当前是否在chatflow页面
    if (pathname === `/apps/chatflow/${instanceId}`) {
      console.log('[AppDetail] 路由切换到应用详情页面，立即清理聊天状态');

      // 立即清除所有消息
      useChatStore.getState().clearMessages();
      clearMessages();

      // 设置当前对话 ID 为 null
      setCurrentConversationId(null);

      // 🎯 新增：清理use-chat-interface中的对话状态
      // 这确保difyConversationId、dbConversationUUID、conversationAppId都被正确清理
      clearConversationState();

      // 强制设置欢迎屏幕状态为 true
      setIsWelcomeScreen(true);

      // 重置提交状态
      setIsSubmitting(false);

      // 🎯 新增：清理chatflow执行状态，确保不会显示之前的节点数据
      resetExecution();

      console.log('[AppDetail] 聊天状态清理完成');
    }
  }, [
    pathname,
    instanceId,
    clearMessages,
    setCurrentConversationId,
    setIsWelcomeScreen,
    resetExecution,
    clearConversationState,
  ]);

  // 页面初始化：切换到目标应用并同步sidebar选中状态
  // 🎯 优化：简化初始化逻辑，避免验证反弹，改善用户体验
  useEffect(() => {
    const initializeApp = async () => {
      if (!instanceId) return;

      try {
        setInitError(null);

        console.log('[AppDetail] 开始初始化应用:', instanceId);

        // 🎯 优化：简化加载状态判断
        // 只有在真正需要等待时才显示加载状态
        const needsAppListFetch = apps.length === 0;
        const currentAppMatches = currentAppId === instanceId;

        // 如果应用列表为空，需要获取
        if (needsAppListFetch) {
          setIsInitializing(true);
          console.log('[AppDetail] 应用列表为空，开始获取');
          await fetchApps();
        }

        // 重新获取最新的应用列表
        const latestApps = useAppListStore.getState().apps;
        console.log('[AppDetail] 当前应用列表长度:', latestApps.length);

        // 检查应用是否存在
        const targetApp = latestApps.find(
          app => app.instance_id === instanceId
        );
        if (!targetApp) {
          console.error('[AppDetail] 应用不存在:', instanceId);
          setInitError(t('errors.appNotFound'));
          return;
        }

        console.log('[AppDetail] 找到目标应用:', targetApp.display_name);

        // 立即设置sidebar选中状态
        selectItem('app', instanceId);

        // 🎯 关键优化：简化应用切换逻辑
        // 只有在当前应用确实不匹配时才进行切换
        // 避免不必要的验证调用
        if (!currentAppMatches) {
          console.log(
            '[AppDetail] 需要切换应用，从',
            currentAppId,
            '到',
            instanceId
          );

          // 🎯 使用更简单的切换逻辑，避免复杂的验证
          try {
            await switchToSpecificApp(instanceId);
            console.log('[AppDetail] 应用切换成功');
          } catch (switchError) {
            console.warn(
              '[AppDetail] 应用切换失败，但继续加载页面:',
              switchError
            );
            // 🎯 即使切换失败也不阻塞页面加载
            // 页面可以正常显示，用户可以正常使用
          }
        } else {
          console.log('[AppDetail] 当前应用已匹配，无需切换');
        }

        console.log('[AppDetail] 应用初始化完成');
      } catch (error) {
        console.error('[AppDetail] 初始化失败:', error);
        setInitError(
          error instanceof Error
            ? error.message
            : t('errors.initializationFailed')
        );
      } finally {
        // 🎯 确保在所有情况下都清除初始化状态
        setIsInitializing(false);
      }
    };

    if (instanceId) {
      initializeApp();
    }
  }, [
    instanceId,
    apps.length,
    currentAppId,
    fetchApps,
    switchToSpecificApp,
    selectItem,
  ]);

  // 页面卸载时清除选中状态（当离开应用详情页面时）
  useEffect(() => {
    return () => {
      // 检查是否离开了应用详情页面
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/apps/')) {
        selectItem(null, null);
      }
    };
  }, [selectItem]);

  // 包装handleSubmit，实现UI切换逻辑
  const handleSubmit = useCallback(
    async (message: string, files?: any[]) => {
      try {
        // 🎯 简化UI切换逻辑：立即响应用户操作
        // 立即设置提交状态为 true
        setIsSubmitting(true);

        // 立即关闭欢迎界面
        setIsWelcomeScreen(false);

        console.log('[AppDetail] UI状态已更新，开始发送消息');

        // 调用原始的handleSubmit，它会创建对话并发送消息
        await originalHandleSubmit(message, files);

        console.log('[AppDetail] 消息发送成功，等待路由跳转');
      } catch (error) {
        console.error('[AppDetail] 发送消息失败:', error);

        // 发送失败时恢复UI状态
        setIsSubmitting(false);
        setIsWelcomeScreen(true);
      }
    },
    [originalHandleSubmit, setIsWelcomeScreen]
  );

  // 错误状态
  if (initError) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full flex-col',
          colors.mainBackground.tailwind,
          'items-center justify-center'
        )}
      >
        <div className="text-center">
          <Blocks
            className={cn(
              'mx-auto mb-4 h-16 w-16',
              isDark ? 'text-stone-400' : 'text-stone-500'
            )}
          />
          <h2
            className={cn(
              'mb-2 font-serif text-xl font-semibold',
              isDark ? 'text-stone-300' : 'text-stone-700'
            )}
          >
            {t('errors.appLoadFailed')}
          </h2>
          <p
            className={cn(
              'mb-4 font-serif',
              isDark ? 'text-stone-400' : 'text-stone-500'
            )}
          >
            {initError}
          </p>
          <button
            onClick={() => router.push('/apps')}
            className={cn(
              'rounded-lg px-4 py-2 font-serif transition-colors',
              isDark
                ? 'bg-stone-700 text-stone-200 hover:bg-stone-600'
                : 'bg-stone-200 text-stone-800 hover:bg-stone-300'
            )}
          >
            {t('buttons.backToMarket')}
          </button>
        </div>
      </div>
    );
  }

  // 加载状态 - 🎯 确保最少显示0.7秒
  if (
    !hasMinimumLoadTime ||
    isInitializing ||
    (isValidating && !isValidatingForMessage) ||
    !currentApp
  ) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full flex-col',
          colors.mainBackground.tailwind,
          'items-center justify-center'
        )}
      >
        <div className="text-center">
          <Loader2
            className={cn(
              'mx-auto mb-4 h-8 w-8 animate-spin',
              isDark ? 'text-stone-400' : 'text-stone-500'
            )}
          />
          <p
            className={cn(
              'font-serif',
              isDark ? 'text-stone-400' : 'text-stone-500'
            )}
          >
            {isInitializing
              ? t('status.loadingApp')
              : isValidating && !isValidatingForMessage
                ? t('status.validatingConfig')
                : t('status.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col',
        colors.mainBackground.tailwind,
        colors.mainText.tailwind
      )}
    >
      {/* 🎯 NavBar 已移至根布局，无需重复渲染 */}

      {/* --- BEGIN COMMENT ---
      主要内容区域 - 使用简化的布局结构
      --- END COMMENT --- */}
      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col overflow-hidden',
          'pt-10'
        )}
        style={
          { '--chat-input-height': chatInputHeightVar } as React.CSSProperties
        }
      >
        {/* 主要内容 */}
        <div className="min-h-0 flex-1">
          {/* --- BEGIN COMMENT ---
          简化显示逻辑：使用useWelcomeScreen统一判断
          --- END COMMENT --- */}
          {isWelcomeScreen && messages.length === 0 ? (
            <div
              className={cn(
                'h-full overflow-y-auto scroll-smooth',
                'mx-auto w-full'
              )}
            >
              <div className="py-8">
                {/* --- 移除重复的欢迎界面，避免与表单标题重合 --- */}

                {/* --- Chatflow 输入区域 --- */}
                <ChatflowInputArea
                  instanceId={instanceId}
                  onSubmit={handleChatflowSubmit}
                  isProcessing={isProcessing}
                  isWaiting={isWaitingForResponse}
                  onFormConfigChange={setHasFormConfig}
                />
              </div>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="chat-scroll-container h-full overflow-y-auto scroll-smooth"
            >
              <ChatLoader
                messages={messages}
                isWaitingForResponse={isWaitingForResponse}
                isLoadingInitial={false}
              />

              {/* --- Chatflow 节点跟踪器 --- */}
              <ChatflowNodeTracker
                isVisible={showNodeTracker}
                className={cn(
                  'fixed right-4 bottom-40 z-30 max-w-sm',
                  'transition-all duration-300'
                )}
              />
            </div>
          )}
        </div>

        {/* 滚动到底部按钮 */}
        <ScrollToBottomButton />

        {/* --- Chatflow 悬浮控制器 --- */}
        <ChatflowFloatingController
          isVisible={showFloatingController}
          isTrackerVisible={showNodeTracker}
          onToggleTracker={() => setShowNodeTracker(!showNodeTracker)}
          onClose={() => {
            // chatflow应用的悬浮球不能关闭，只能关闭跟踪器
            setShowNodeTracker(false);
          }}
        />

        {/* --- 对话模式下的输入框 --- */}
        {!isWelcomeScreen && (
          <>
            {/* 输入框背景 */}
            <ChatInputBackdrop />

            {/* --- BEGIN COMMENT ---
            聊天输入框 - 仅在对话模式下显示
            --- END COMMENT --- */}
            <ChatInput
              onSubmit={handleSubmit}
              placeholder={t('continueChatWith', {
                appName: currentApp.display_name || t('defaultApp'),
              })}
              isProcessing={isProcessing}
              isWaiting={isWaitingForResponse}
              onStop={handleStopProcessing}
              showModelSelector={false}
              requireModelValidation={false}
            />
          </>
        )}
      </div>
    </div>
  );
}
