'use client';

import { Popover, PopoverItem } from '@components/ui/popover';
import { hideActiveTooltip } from '@components/ui/tooltip';
import { TooltipWrapper } from '@components/ui/tooltip-wrapper';
import { useFileTypes } from '@lib/hooks/use-file-types';
import { useMobile } from '@lib/hooks/use-mobile';
import { useTheme } from '@lib/hooks/use-theme';
import { useAttachmentStore } from '@lib/stores/attachment-store';
import { cn } from '@lib/utils';
import { Loader2, Paperclip } from 'lucide-react';

import { useCallback, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ChatButton } from './button';

// 定义文件选择回调类型
export type FileSelectCallback = (
  files: FileList | null,
  accept: string
) => void;

interface FileTypeSelectorProps {
  onFileSelect: FileSelectCallback;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export const FileTypeSelector = ({
  onFileSelect,
  disabled = false,
  ariaLabel = '添加附件',
  className,
}: FileTypeSelectorProps) => {
  const { fileTypes, uploadConfig, isLoading, error } = useFileTypes();
  const { isDark } = useTheme();
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(false);
  const attachmentFiles = useAttachmentStore(state => state.files);
  const t = useTranslations('pages.chat');

  // Logic to check if files can be uploaded
  // Considers admin interface configuration and current uploaded file count
  const canUpload = uploadConfig.enabled && uploadConfig.maxFiles > 0;
  const hasReachedLimit = attachmentFiles.length >= uploadConfig.maxFiles;
  const isDisabled = disabled || !canUpload || hasReachedLimit;

  // 生成tooltip内容
  const getTooltipContent = () => {
    if (!uploadConfig.enabled) {
      return t('fileTypeSelector.notSupported');
    }
    if (uploadConfig.maxFiles === 0) {
      return t('fileTypeSelector.noLimit');
    }
    if (!uploadConfig.hasFileTypes) {
      return t('fileTypeSelector.noTypesConfigured');
    }
    if (hasReachedLimit) {
      return t('fileTypeSelector.maxFilesReached', {
        maxFiles: uploadConfig.maxFiles,
      });
    }
    return t('fileTypeSelector.addAttachment', {
      currentFiles: attachmentFiles.length,
      maxFiles: uploadConfig.maxFiles,
    });
  };

  // 创建文件输入引用回调
  const fileInputCallback = useCallback(
    (fileInput: HTMLInputElement | null, accept: string) => {
      if (fileInput) {
        // 设置接受的文件类型
        fileInput.accept = accept;
        // 触发文件选择对话框
        fileInput.click();
        // 监听文件选择完成事件
        const handleChange = () => {
          onFileSelect(fileInput.files, accept);
          // 重置输入框，允许选择相同文件
          fileInput.value = '';
          // 移除事件监听器
          fileInput.removeEventListener('change', handleChange);
        };
        fileInput.addEventListener('change', handleChange);
      }
    },
    [onFileSelect]
  );

  // 处理文件类型选择
  const handleFileTypeSelect = (accept: string) => {
    // 再次检查是否可以上传
    if (isDisabled) {
      return;
    }

    // 创建临时文件输入框
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true; // 允许多选

    // 使用回调处理文件选择
    fileInputCallback(fileInput, accept);

    // 关闭弹出框
    setIsOpen(false);
  };

  // 创建触发器按钮，并用 Tooltip 包裹
  const triggerButton = (
    <TooltipWrapper
      content={getTooltipContent()}
      id="file-type-selector-tooltip"
      placement="top"
      size="sm"
      showArrow={false}
    >
      <ChatButton
        icon={
          !canUpload ? (
            <Paperclip className="h-4 w-4" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )
        }
        isDark={isDark}
        ariaLabel={ariaLabel}
        disabled={isDisabled}
        className={cn(
          className,
          !canUpload && 'opacity-50',
          hasReachedLimit && 'opacity-75'
        )}
      />
    </TooltipWrapper>
  );

  // 如果配置不允许上传，直接返回禁用按钮
  if (!canUpload) {
    return triggerButton;
  }

  return (
    <Popover
      trigger={triggerButton}
      placement="top"
      isOpen={isOpen}
      onOpenChange={open => {
        if (isDisabled) {
          return;
        }
        setIsOpen(open);
        if (open) {
          hideActiveTooltip();
        }
      }}
      minWidth={170} // 减小宽度从180到160
      offsetX={isMobile ? undefined : 105} // 相应调整偏移量
      offsetY={isMobile ? undefined : 42}
    >
      <div className="px-1 py-1">
        {isLoading ? (
          <div
            className={cn(
              'flex items-center justify-center py-4 font-serif',
              isDark ? 'text-gray-400' : 'text-gray-500'
            )}
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>{t('fileTypeSelector.loading')}</span>
          </div>
        ) : error ? (
          <div
            className={cn(
              'px-3 py-2 font-serif text-sm',
              isDark ? 'text-red-300' : 'text-red-500'
            )}
          >
            {t('fileTypeSelector.loadError')}
          </div>
        ) : fileTypes.length === 0 ? (
          <div
            className={cn(
              'px-3 py-2 text-center font-serif text-sm',
              isDark ? 'text-gray-400' : 'text-gray-500'
            )}
          >
            {t('fileTypeSelector.noTypesConfigured')}
          </div>
        ) : (
          <>
            {/* Display upload configuration information */}
            <div
              className={cn(
                'mb-1 border-b px-3 py-1 font-serif text-xs',
                isDark
                  ? 'border-gray-600 text-gray-400'
                  : 'border-gray-200 text-gray-500'
              )}
            >
              {uploadConfig.maxFiles > 0 ? (
                <>
                  {t('fileTypeSelector.maxUpload', {
                    maxFiles: uploadConfig.maxFiles,
                  })}
                </>
              ) : (
                <>{t('fileTypeSelector.noUploadLimit')}</>
              )}
              {hasReachedLimit && (
                <div
                  className={cn(
                    'mt-1 text-xs',
                    isDark ? 'text-orange-400' : 'text-orange-600'
                  )}
                >
                  {t('fileTypeSelector.reachedLimit', {
                    currentFiles: attachmentFiles.length,
                    maxFiles: uploadConfig.maxFiles,
                  })}
                </div>
              )}
            </div>

            {fileTypes.map(type => (
              <PopoverItem
                key={type.title}
                icon={type.icon}
                onClick={() => handleFileTypeSelect(type.acceptString)}
                disabled={hasReachedLimit}
                className={cn(
                  hasReachedLimit && 'cursor-not-allowed opacity-50'
                )}
              >
                <div className="flex flex-col">
                  <span>{type.title}</span>
                  <span
                    className={cn(
                      'font-serif text-xs',
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    )}
                  >
                    {type.maxSize}
                  </span>
                </div>
              </PopoverItem>
            ))}
          </>
        )}
      </div>
    </Popover>
  );
};
