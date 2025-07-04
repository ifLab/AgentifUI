'use client';

// --- 引入工作流Markdown组件 ---
import {
  CodeBlock,
  InlineCode,
  MarkdownBlockquote,
  MarkdownTableContainer,
} from '@components/chat/markdown-block';
import { ThinkBlockContent } from '@components/chat/markdown-block/think-block-content';
// --- 引入ThinkBlock组件 ---
import { ThinkBlockHeader } from '@components/chat/markdown-block/think-block-header';
import { useMobile } from '@lib/hooks/use-mobile';
import { useTheme } from '@lib/hooks/use-theme';
import { cn } from '@lib/utils';
import 'katex/dist/katex.min.css';
import { Copy, Download, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { useCallback, useEffect, useMemo } from 'react';
// --- 引入React Hook ---
import React, { useState } from 'react';

import { useTranslations } from 'next-intl';

interface ResultViewerProps {
  result: any;
  execution: any;
  onClose: () => void;
}

/**
 * 解析工作流结果中的think标签内容
 * @param content 原始内容字符串
 * @returns 解析结果包含think内容和主内容
 */
const parseThinkContent = (
  content: string
): {
  hasThinkBlock: boolean;
  thinkContent: string;
  mainContent: string;
  isThinkComplete: boolean;
} => {
  const thinkStartTag = '<think>';
  const thinkEndTag = '</think>';

  // 检查是否包含think标签
  if (content.includes(thinkStartTag)) {
    const startIndex = content.indexOf(thinkStartTag);
    const endIndex = content.indexOf(thinkEndTag, startIndex);

    if (endIndex !== -1) {
      // Think块完整
      const thinkContent = content.substring(
        startIndex + thinkStartTag.length,
        endIndex
      );
      const mainContent = content
        .substring(endIndex + thinkEndTag.length)
        .trim();

      return {
        hasThinkBlock: true,
        thinkContent: thinkContent.trim(),
        mainContent,
        isThinkComplete: true,
      };
    } else {
      // Think块未完成（理论上在结果查看器中不应该出现）
      const thinkContent = content.substring(startIndex + thinkStartTag.length);
      return {
        hasThinkBlock: true,
        thinkContent: thinkContent.trim(),
        mainContent: '',
        isThinkComplete: false,
      };
    }
  }

  // 没有think标签
  return {
    hasThinkBlock: false,
    thinkContent: '',
    mainContent: content,
    isThinkComplete: true,
  };
};

export function ResultViewer({
  result,
  execution,
  onClose,
}: ResultViewerProps) {
  const { isDark } = useTheme();
  const isMobile = useMobile();
  const t = useTranslations('pages.workflow.resultViewer');

  // --- ThinkBlock状态管理 ---
  const [isThinkOpen, setIsThinkOpen] = useState(false); // 默认折叠

  const formatResult = (
    data: any
  ): {
    content: string;
    isMarkdown: boolean;
    hasThinkBlock: boolean;
    thinkContent: string;
    mainContent: string;
  } => {
    try {
      if (!data || typeof data !== 'object') {
        const content = String(data || '');
        const parsed = parseThinkContent(content);
        return {
          content,
          isMarkdown: false,
          hasThinkBlock: parsed.hasThinkBlock,
          thinkContent: parsed.thinkContent,
          mainContent: parsed.mainContent,
        };
      }

      // 检查是否有result1、result2等字段（工作流结果模式）
      const resultKeys = Object.keys(data).filter(key =>
        key.startsWith('result')
      );
      if (resultKeys.length > 0) {
        // 优先使用第一个result字段
        const firstResultKey = resultKeys[0];
        const resultContent = data[firstResultKey];

        if (typeof resultContent === 'string') {
          // 🎯 关键修改：不再删除think块，而是解析它们
          const parsed = parseThinkContent(resultContent);

          // 检查主内容是否包含markdown
          const markdownContent = parsed.mainContent || parsed.thinkContent;
          const isMarkdown =
            markdownContent.includes('```') ||
            markdownContent.includes('#') ||
            markdownContent.includes('**');

          return {
            content: resultContent,
            isMarkdown,
            hasThinkBlock: parsed.hasThinkBlock,
            thinkContent: parsed.thinkContent,
            mainContent: parsed.mainContent,
          };
        }
      }

      // 如果有text字段，优先显示text内容
      if (data.text && typeof data.text === 'string') {
        const parsed = parseThinkContent(data.text);
        const isMarkdown = data.text.includes('```');

        return {
          content: data.text,
          isMarkdown,
          hasThinkBlock: parsed.hasThinkBlock,
          thinkContent: parsed.thinkContent,
          mainContent: parsed.mainContent,
        };
      }

      // 如果有outputs字段，优先显示outputs
      if (data.outputs && typeof data.outputs === 'object') {
        const content = JSON.stringify(data.outputs, null, 2);
        return {
          content,
          isMarkdown: false,
          hasThinkBlock: false,
          thinkContent: '',
          mainContent: content,
        };
      }

      // 否则显示完整数据
      const content = JSON.stringify(data, null, 2);
      return {
        content,
        isMarkdown: false,
        hasThinkBlock: false,
        thinkContent: '',
        mainContent: content,
      };
    } catch (error) {
      console.error('[结果查看器] 数据格式化失败:', error);
      const content = String(data);
      const parsed = parseThinkContent(content);
      return {
        content,
        isMarkdown: false,
        hasThinkBlock: parsed.hasThinkBlock,
        thinkContent: parsed.thinkContent,
        mainContent: parsed.mainContent,
      };
    }
  };

  const {
    content: formattedContent,
    isMarkdown,
    hasThinkBlock,
    thinkContent,
    mainContent,
  } = formatResult(result);

  // --- Markdown组件配置 ---
  const markdownComponents: any = {
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : null;

      if (language) {
        // 代码块
        return (
          <CodeBlock
            language={language}
            className={className}
            isStreaming={false}
          >
            {String(children).replace(/\n$/, '')}
          </CodeBlock>
        );
      } else {
        // 内联代码
        return (
          <InlineCode className={className} {...props}>
            {children}
          </InlineCode>
        );
      }
    },
    table({ children, ...props }: any) {
      return <MarkdownTableContainer>{children}</MarkdownTableContainer>;
    },
    blockquote({ children, ...props }: any) {
      return <MarkdownBlockquote>{children}</MarkdownBlockquote>;
    },
    p({ children, ...props }: any) {
      return (
        <p className="my-2 font-serif" {...props}>
          {children}
        </p>
      );
    },
    ul({ children, ...props }: any) {
      return (
        <ul className="my-2.5 ml-6 list-disc space-y-1 font-serif" {...props}>
          {children}
        </ul>
      );
    },
    ol({ children, ...props }: any) {
      return (
        <ol
          className="my-2.5 ml-6 list-decimal space-y-1 font-serif"
          {...props}
        >
          {children}
        </ol>
      );
    },
    li({ children, ...props }: any) {
      return (
        <li className="pb-0.5" {...props}>
          {children}
        </li>
      );
    },
    h1({ children, ...props }: any) {
      return (
        <h1
          className={cn(
            'mt-4 mb-2 border-b pb-1 font-serif text-2xl font-semibold',
            isDark ? 'border-gray-700' : 'border-gray-300'
          )}
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2({ children, ...props }: any) {
      return (
        <h2
          className={cn(
            'mt-3.5 mb-1.5 border-b pb-1 font-serif text-xl font-semibold',
            isDark ? 'border-gray-700' : 'border-gray-300'
          )}
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3({ children, ...props }: any) {
      return (
        <h3 className="mt-3 mb-1 font-serif text-lg font-semibold" {...props}>
          {children}
        </h3>
      );
    },
    h4({ children, ...props }: any) {
      return (
        <h4
          className="mt-2.5 mb-0.5 font-serif text-base font-semibold"
          {...props}
        >
          {children}
        </h4>
      );
    },
    a({ children, href, ...props }: any) {
      return (
        <a
          href={href}
          className={cn(
            'font-serif underline',
            isDark
              ? 'text-sky-400 hover:text-sky-300'
              : 'text-sky-600 hover:text-sky-700'
          )}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },
    hr({ ...props }: any) {
      return (
        <hr
          className={cn(
            'my-4 border-t',
            isDark ? 'border-gray-700' : 'border-gray-300'
          )}
          {...props}
        />
      );
    },
  };

  const handleCopy = async () => {
    try {
      // 复制时只复制主内容，不包含think块
      const copyContent = hasThinkBlock ? mainContent : formattedContent;
      await navigator.clipboard.writeText(copyContent);
      // 这里可以添加成功提示
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const copyContent = hasThinkBlock ? mainContent : formattedContent;
    const file = new Blob([copyContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = isMarkdown ? 'md' : 'json';
    element.download = `workflow-result-${timestamp}.${extension}`;

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          'relative mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border shadow-2xl',
          isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
        )}
      >
        {/* 头部区域 */}
        <div
          className={cn(
            'flex items-center justify-between border-b px-6 py-4',
            isDark ? 'border-gray-700' : 'border-gray-200'
          )}
        >
          <h2
            className={cn(
              'text-lg font-semibold',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            {t('title')}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className={cn(
                'rounded-md p-2 transition-colors',
                isDark
                  ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
              title={t('copyButton')}
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={handleDownload}
              className={cn(
                'rounded-md p-2 transition-colors',
                isDark
                  ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
              title={t('downloadButton')}
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className={cn(
                'rounded-md p-2 transition-colors',
                isDark
                  ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
              title={t('closeButton')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-6',
            isDark ? 'bg-gray-900' : 'bg-white'
          )}
        >
          {/* 🎯 Think Block 区域 */}
          {hasThinkBlock && thinkContent && (
            <div className="mb-4">
              <ThinkBlockHeader
                status="completed"
                isOpen={isThinkOpen}
                onToggle={() => setIsThinkOpen(!isThinkOpen)}
              />
              {isThinkOpen && (
                <ThinkBlockContent
                  markdownContent={thinkContent}
                  isOpen={isThinkOpen}
                />
              )}
            </div>
          )}

          {/* 主内容区域 */}
          {(mainContent || (!hasThinkBlock && formattedContent)) && (
            <div
              className={cn(
                'markdown-body w-full',
                isDark ? 'text-gray-100' : 'text-gray-900'
              )}
            >
              {isMarkdown ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={markdownComponents}
                >
                  {hasThinkBlock ? mainContent : formattedContent}
                </ReactMarkdown>
              ) : (
                <pre
                  className={cn(
                    'font-mono text-sm break-words whitespace-pre-wrap',
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  )}
                >
                  {hasThinkBlock ? mainContent : formattedContent}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
