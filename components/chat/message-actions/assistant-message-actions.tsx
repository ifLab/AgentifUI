'use client';

import { MessageActionsContainer } from '@components/ui/message-actions-container';
import { useTheme } from '@lib/hooks/use-theme';
import { cn } from '@lib/utils';

import React from 'react';

import { CopyButton } from './buttons/copy-button';
import { FeedbackButton } from './buttons/feedback-button';
import { RegenerateButton } from './buttons/regenerate-button';
import { useFeedbackManager } from './hooks/use-feedback-manager';

interface AssistantMessageActionsProps {
  messageId: string;
  content?: string;
  onRegenerate: () => void;
  onFeedback: (isPositive: boolean) => void;
  isRegenerating?: boolean;
  className?: string;
  // tooltip配置
  tooltipSize?: 'sm' | 'md';
  showTooltipArrow?: boolean;
}

/**
 * 助手消息操作按钮组件
 *
 * 组合了复制、重新生成和反馈按钮，用于助手消息下方的操作区域
 *
 * 🎯 思维链支持：
 * - 对于包含思维链的消息，只复制主要内容部分，不包含 <think> 和 <details> 标签内的推理过程
 * - 当思维链未完成时，复制按钮会被隐藏，避免复制不完整的内容
 */
export const AssistantMessageActions: React.FC<
  AssistantMessageActionsProps
> = ({
  content,
  onRegenerate,
  onFeedback,
  isRegenerating = false,
  className,
  tooltipSize = 'sm',
  showTooltipArrow = false,
}) => {
  const { isDark } = useTheme();

  // 使用反馈管理hook，实现排他性
  const { selectedFeedback, handleFeedback, shouldShowButton } =
    useFeedbackManager(onFeedback);

  // --- 检查是否有可复制的内容 ---
  const hasContentToCopy = content && content.trim().length > 0;

  return (
    <MessageActionsContainer
      align="left"
      isAssistantMessage={true}
      className={className}
    >
      {/* 复制按钮 - 始终显示，但根据内容条件禁用 */}
      <CopyButton
        content={content}
        disabled={!hasContentToCopy}
        tooltipSize={tooltipSize}
        showTooltipArrow={showTooltipArrow}
      />
      <RegenerateButton
        onRegenerate={onRegenerate}
        isRegenerating={isRegenerating}
        tooltipSize={tooltipSize}
        showTooltipArrow={showTooltipArrow}
      />

      {/* 分隔线 - 使用更深的颜色，在深色模式下不那么显眼 */}
      <div
        className={cn(
          'mx-1 self-stretch border-r',
          isDark ? 'border-gray-800/50' : 'border-gray-200/50'
        )}
      />

      {/* 反馈按钮 - 实现排他性，点击一个时另一个消失 */}
      {shouldShowButton(true) && (
        <FeedbackButton
          onFeedback={() => handleFeedback(true)}
          isPositive={true}
          active={selectedFeedback === true}
          tooltipSize={tooltipSize}
          showTooltipArrow={showTooltipArrow}
        />
      )}
      {shouldShowButton(false) && (
        <FeedbackButton
          onFeedback={() => handleFeedback(false)}
          isPositive={false}
          active={selectedFeedback === false}
          tooltipSize={tooltipSize}
          showTooltipArrow={showTooltipArrow}
        />
      )}
    </MessageActionsContainer>
  );
};
