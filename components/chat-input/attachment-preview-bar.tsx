'use client';

import { useFileTypes } from '@lib/hooks/use-file-types';
import { useAttachmentStore } from '@lib/stores/attachment-store';
import { cn } from '@lib/utils';

import React, { useEffect, useRef } from 'react';

import { AttachmentPreviewItem } from './attachment-preview-item';

/**
 * Attachment preview bar component properties
 */
interface AttachmentPreviewBarProps {
  /** Dark mode flag */
  isDark?: boolean;
  /** Callback function to notify parent component of height changes */
  onHeightChange: (height: number) => void;
  /** Retry upload callback */
  onRetryUpload: (id: string) => void;
}

/**
 * Attachment preview bar component
 * @description Displays uploaded files with preview and manages height animations
 */
export const AttachmentPreviewBar: React.FC<AttachmentPreviewBarProps> = ({
  isDark = false,
  onHeightChange,
  onRetryUpload,
}) => {
  const files = useAttachmentStore(state => state.files);
  const { uploadConfig } = useFileTypes();
  const containerRef = useRef<HTMLDivElement>(null);

  // --- BEGIN MODIFICATION ---
  // 监听文件列表变化或窗口大小变化，动态计算并通知高度，并设置样式以实现动画
  useEffect(() => {
    let calculatedHeight = 0;
    const container = containerRef.current;

    const calculateAndApplyHeight = () => {
      if (container) {
        // --- BEGIN COMMENT ---
        // 先移除临时高度，计算实际内容高度
        // --- END COMMENT ---
        container.style.height = ''; // 清除旧高度
        calculatedHeight = files.length > 0 ? container.scrollHeight : 0;

        // --- BEGIN COMMENT ---
        // 应用计算出的高度到 style，触发 CSS transition
        // --- END COMMENT ---
        container.style.height = `${calculatedHeight}px`;

        // --- BEGIN COMMENT ---
        // 通知父组件高度变化
        // --- END COMMENT ---
        onHeightChange(calculatedHeight);
      }
    };

    // --- BEGIN COMMENT ---
    // 使用 requestAnimationFrame 确保在 DOM 更新后计算高度
    // --- END COMMENT ---
    const rafId = requestAnimationFrame(calculateAndApplyHeight);

    // 使用 ResizeObserver 监听容器内容尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculateAndApplyHeight);
    });
    if (container) {
      // 监听内部的 flex 容器，而不是带 overflow 的外部容器
      const innerFlexContainer = container.querySelector(':scope > div');
      if (innerFlexContainer) {
        resizeObserver.observe(innerFlexContainer);
      }
    }

    // 清理函数
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      // 清除高度样式，以便下次正确计算
      if (container) {
        container.style.height = '';
      }
    };
  }, [files.length, onHeightChange]); // 依赖文件数量变化
  // --- END MODIFICATION ---

  // --- BEGIN COMMENT ---
  // 如果没有文件，返回空的容器
  // --- END COMMENT ---
  if (files.length === 0) {
    return (
      <div
        ref={containerRef}
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
        style={{ height: 0 }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        isDark ? 'border-gray-700' : 'border-gray-200', // This class no longer has effect but kept for potential future use
        'overflow-hidden',
        'transition-[height] duration-300 ease-in-out'
      )}
      style={{ height: 0 }}
    >
      {/* --- BEGIN COMMENT ---
      // 内层容器用于 padding 和 flex 布局，ResizeObserver 监听这个元素
      // --- END COMMENT ---*/}
      <div className="px-3 pt-3 pb-2">
        {/* --- BEGIN COMMENT ---
        // 如果超出数量限制，显示警告信息
        // --- END COMMENT --- */}
        {uploadConfig.enabled &&
          uploadConfig.maxFiles > 0 &&
          files.length > uploadConfig.maxFiles && (
            <div
              className={cn(
                'mb-2 rounded-lg px-3 py-2 font-serif text-sm',
                isDark
                  ? 'border border-orange-500/30 bg-orange-900/30 text-orange-300'
                  : 'border border-orange-300 bg-orange-100 text-orange-700'
              )}
            >
              已超出文件数量限制 ({files.length}/{uploadConfig.maxFiles}
              )，请删除部分文件
            </div>
          )}

        {/* --- BEGIN COMMENT ---
        // 文件列表容器
        // --- END COMMENT --- */}
        <div className="flex flex-wrap gap-2">
          {files.map(file => (
            <AttachmentPreviewItem
              key={file.id}
              attachment={file}
              isDark={isDark}
              onRetry={onRetryUpload}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
