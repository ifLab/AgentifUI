'use client';

import { useTheme } from '@lib/hooks/use-theme';
import type {
  WorkflowIteration,
  WorkflowLoop,
  WorkflowNode,
  WorkflowParallelBranch,
} from '@lib/stores/workflow-execution-store';
import { useWorkflowExecutionStore } from '@lib/stores/workflow-execution-store';
import { cn } from '@lib/utils';
import { CheckCircle, Clock, Loader2, Search, XCircle } from 'lucide-react';

import React, { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

interface ExecutionBarProps {
  node: WorkflowNode;
  index: number;
  delay?: number;
}

/**
 * 工作流执行条组件 - 支持迭代和并行分支的细粒度显示
 *
 * 特点：
 * - fade-in动画进入
 * - 左侧节点类型图标
 * - 中间显示节点信息和状态
 * - 右侧显示计时信息
 * - 支持迭代展开/折叠
 * - 支持并行分支显示
 * - 悬停效果和交互
 */
export function ExecutionBar({ node, index, delay = 0 }: ExecutionBarProps) {
  const { isDark } = useTheme();
  const t = useTranslations('pages.workflow.nodeStatus');
  const tTypes = useTranslations('pages.workflow.nodeTypes');
  const [isVisible, setIsVisible] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 🎯 使用store中的展开状态和actions
  const {
    iterationExpandedStates,
    loopExpandedStates,
    toggleIterationExpanded,
    toggleLoopExpanded,
  } = useWorkflowExecutionStore();

  const isExpanded =
    (node.isIterationNode && iterationExpandedStates[node.id]) ||
    (node.isLoopNode && loopExpandedStates[node.id]) ||
    false;

  // 延迟显示动画
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  // 计时器
  useEffect(() => {
    if (node.status === 'running' && node.startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - node.startTime!);
      }, 100);

      return () => clearInterval(interval);
    } else if (node.status === 'completed' && node.startTime && node.endTime) {
      setElapsedTime(node.endTime - node.startTime);
    }
  }, [node.status, node.startTime, node.endTime]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const getStatusIcon = () => {
    // 🎯 保持workflow UI一致性：只使用两种图标 - 放大镜和spinner
    const getSimpleIcon = () => {
      if (node.status === 'running') {
        return <Loader2 className="h-4 w-4 animate-spin" />;
      }
      return <Search className="h-4 w-4" />;
    };

    const icon = getSimpleIcon();

    // 根据状态设置颜色
    const colorClass =
      node.status === 'running'
        ? isDark
          ? 'text-stone-400'
          : 'text-stone-600'
        : node.status === 'completed'
          ? isDark
            ? 'text-stone-400'
            : 'text-stone-600'
          : node.status === 'failed'
            ? 'text-red-500'
            : isDark
              ? 'text-stone-500'
              : 'text-stone-400';

    return <div className={cn(colorClass)}>{icon}</div>;
  };

  const getStatusText = () => {
    // 🎯 迭代节点显示特殊状态文本
    if (node.isIterationNode) {
      switch (node.status) {
        case 'running':
          return t('iterating');
        case 'completed':
          return t('iterationCompleted');
        case 'failed':
          return t('iterationFailed');
        default:
          return t('waitingIteration');
      }
    }

    // 🎯 循环节点显示特殊状态文本
    if (node.isLoopNode) {
      switch (node.status) {
        case 'running':
          return t('looping');
        case 'completed':
          return t('loopCompleted');
        case 'failed':
          return t('loopFailed');
        default:
          return t('waitingLoop');
      }
    }

    // 🎯 并行分支节点显示特殊状态文本
    if (node.isParallelNode) {
      switch (node.status) {
        case 'running':
          return t('parallelRunning');
        case 'completed':
          return t('parallelCompleted');
        case 'failed':
          return t('parallelFailed');
        default:
          return t('waitingParallel');
      }
    }

    switch (node.status) {
      case 'running':
        return node.description || t('executing');
      case 'completed':
        return t('nodeCompleted');
      case 'failed':
        return t('nodeFailed');
      case 'pending':
        return t('nodePending');
      default:
        return t('nodeUnknown');
    }
  };

  const getNodeTitle = () => {
    // 根据节点类型返回友好的中文名称
    switch (node.type) {
      case 'start':
        return tTypes('start');
      case 'llm':
        return tTypes('llm');
      case 'knowledge-retrieval':
        return tTypes('knowledgeRetrieval');
      case 'question-classifier':
        return tTypes('questionClassifier');
      case 'if-else':
        return tTypes('ifElse');
      case 'code':
        return tTypes('code');
      case 'template-transform':
        return tTypes('templateTransform');
      case 'variable-assigner':
        return tTypes('variableAssigner');
      case 'variable-aggregator':
        return tTypes('variableAggregator');
      case 'document-extractor':
        return tTypes('documentExtractor');
      case 'parameter-extractor':
        return tTypes('parameterExtractor');
      case 'http-request':
        return tTypes('httpRequest');
      case 'list-operator':
        return tTypes('listOperator');
      case 'iteration':
      case 'loop':
        return tTypes('iteration');
      case 'parallel':
        return tTypes('parallel');
      case 'end':
        return tTypes('end');
      default:
        return node.title || `节点 ${index + 1}`;
    }
  };

  const getBarStyles = () => {
    const baseStyles = cn(
      // 🎯 保持workflow原有样式：细bar样式 + 悬停效果
      'flex items-center gap-3 rounded-md border px-3 py-2 transition-all duration-300',
      'transform font-serif',
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
    );

    // 🎯 关键修复：迭代/循环中的节点使用左侧指示条+连接点设计，提供清晰的层级视觉指示
    const nestedStyles =
      node.isInIteration || node.isInLoop
        ? cn(
            'relative ml-6 pl-4',
            // 使用相应的指示条样式
            node.isInIteration ? 'iteration-node' : 'loop-node',
            // 轻微的背景色区分
            isDark ? 'bg-stone-800/20' : 'bg-stone-50/40'
          )
        : '';

    const combinedBaseStyles = cn(baseStyles, nestedStyles);

    switch (node.status) {
      case 'running':
        return cn(
          combinedBaseStyles,
          isDark
            ? 'border-stone-600 bg-stone-700/50 shadow-lg shadow-stone-900/30'
            : 'border-stone-300 bg-stone-200/50 shadow-lg shadow-stone-200/50'
        );
      case 'completed':
        return cn(
          combinedBaseStyles,
          isDark
            ? 'border-stone-500 bg-stone-600/30'
            : 'border-stone-300 bg-stone-100'
        );
      case 'failed':
        return cn(
          combinedBaseStyles,
          isDark
            ? 'border-red-700/50 bg-red-900/20'
            : 'border-red-200 bg-red-50'
        );
      case 'pending':
        return cn(
          combinedBaseStyles,
          isDark
            ? 'border-stone-700/50 bg-stone-800/50'
            : 'border-stone-200 bg-stone-50'
        );
      default:
        return cn(
          combinedBaseStyles,
          isDark
            ? 'border-stone-700/50 bg-stone-800/50'
            : 'border-stone-200 bg-stone-50'
        );
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={cn(
          getBarStyles(),
          // 🎯 所有bar都有悬停效果，只有迭代、循环和并行分支节点才有cursor pointer
          'transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
          (node.isIterationNode || node.isLoopNode || node.isParallelNode) &&
            'cursor-pointer'
        )}
        onClick={
          node.isIterationNode || node.isLoopNode || node.isParallelNode
            ? () => {
                if (node.isIterationNode) {
                  toggleIterationExpanded(node.id);
                } else if (node.isLoopNode) {
                  toggleLoopExpanded(node.id);
                } else if (node.isParallelNode) {
                  toggleIterationExpanded(node.id); // 并行分支暂时使用迭代展开状态
                }
              }
            : undefined
        }
      >
        {/* 左侧：状态图标 */}
        <div className="flex-shrink-0">{getStatusIcon()}</div>

        {/* 中间：节点信息 */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* 节点标题行 */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  'truncate font-serif text-sm font-medium',
                  isDark ? 'text-stone-200' : 'text-stone-800'
                )}
              >
                {getNodeTitle()}
              </span>
            </div>

            {/* 🎯 状态标签行 - 右移一些距离让"执行完成"对齐 */}
            <div className="ml-8 flex flex-shrink-0 items-center gap-2">
              {/* 迭代计数显示 - 显示时加1，从1开始计数 */}
              {node.isIterationNode && node.totalIterations && (
                <span
                  className={cn(
                    'rounded-full bg-stone-200 px-2 py-0.5 font-serif text-xs text-stone-700',
                    isDark && 'bg-stone-700/50 text-stone-300'
                  )}
                >
                  {(node.currentIteration || 0) + 1}/{node.totalIterations}
                </span>
              )}

              {/* 🎯 循环计数显示 - 显示时加1，从1开始计数 */}
              {node.isLoopNode && node.maxLoops && (
                <span
                  className={cn(
                    'rounded-full bg-stone-200 px-2 py-0.5 font-serif text-xs text-stone-700',
                    isDark && 'bg-stone-700/50 text-stone-300'
                  )}
                >
                  {(node.currentLoop || 0) + 1}/{node.maxLoops}
                </span>
              )}

              {/* 并行分支进度指示 */}
              {node.isParallelNode && node.totalBranches && (
                <span
                  className={cn(
                    'rounded-full bg-stone-200 px-2 py-0.5 font-serif text-xs text-stone-700',
                    isDark && 'bg-stone-700/50 text-stone-300'
                  )}
                >
                  {node.completedBranches || 0}/{node.totalBranches}
                </span>
              )}

              <span
                className={cn(
                  'rounded-full px-2 py-0.5 font-serif text-xs',
                  node.status === 'running'
                    ? isDark
                      ? 'bg-stone-600/40 text-stone-200'
                      : 'bg-stone-300/60 text-stone-700'
                    : node.status === 'completed'
                      ? isDark
                        ? 'bg-stone-500/40 text-stone-100'
                        : 'bg-stone-200 text-stone-800'
                      : node.status === 'failed'
                        ? isDark
                          ? 'bg-red-700/30 text-red-200'
                          : 'bg-red-100 text-red-700'
                        : isDark
                          ? 'bg-stone-700/50 text-stone-400'
                          : 'bg-stone-200/80 text-stone-600'
                )}
              >
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* 右侧：计时信息 */}
        <div className="w-16 flex-shrink-0 text-right">
          {(node.status === 'running' || node.status === 'completed') &&
            elapsedTime > 0 && (
              <div
                className={cn(
                  'font-serif text-xs',
                  isDark ? 'text-stone-400' : 'text-stone-500'
                )}
              >
                {formatTime(elapsedTime)}
              </div>
            )}
        </div>
      </div>

      {/* 🎯 迭代详情展开区域 */}
      {node.isIterationNode && node.iterations && isExpanded && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-250">
          {node.iterations.map((iteration, iterIndex) => (
            <div
              key={iteration.id}
              className={cn(
                'iteration-node relative ml-6 pl-4',
                isDark ? 'bg-stone-800/30' : 'bg-stone-50/30',
                'flex items-center gap-3 rounded-md border px-3 py-2 font-serif transition-all duration-300',
                iteration.status === 'running'
                  ? isDark
                    ? 'border-stone-600 bg-stone-700/50'
                    : 'border-stone-300 bg-stone-200/50'
                  : isDark
                    ? 'border-stone-500 bg-stone-600/30'
                    : 'border-stone-300 bg-stone-100'
              )}
            >
              <div className="flex-shrink-0">
                {iteration.status === 'running' ? (
                  <Loader2
                    className={cn(
                      'h-3 w-3 animate-spin',
                      isDark ? 'text-stone-400' : 'text-stone-600'
                    )}
                  />
                ) : iteration.status === 'completed' ? (
                  <CheckCircle
                    className={cn(
                      'h-3 w-3',
                      isDark ? 'text-stone-400' : 'text-stone-600'
                    )}
                  />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'font-serif text-sm',
                    isDark ? 'text-stone-200' : 'text-stone-800'
                  )}
                >
                  第 {iteration.index + 1} 轮迭代
                </span>
              </div>

              <div className="flex-shrink-0">
                {iteration.endTime && iteration.startTime && (
                  <span
                    className={cn(
                      'font-serif text-xs',
                      isDark ? 'text-stone-400' : 'text-stone-500'
                    )}
                  >
                    {formatTime(iteration.endTime - iteration.startTime)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🎯 循环详情展开区域 */}
      {node.isLoopNode && node.loops && isExpanded && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-250">
          {node.loops.map((loop, loopIndex) => (
            <div
              key={loop.id}
              className={cn(
                'loop-node relative ml-6 pl-4',
                isDark ? 'bg-stone-800/30' : 'bg-stone-50/30',
                'flex items-center gap-3 rounded-md border px-3 py-2 font-serif transition-all duration-300',
                loop.status === 'running'
                  ? isDark
                    ? 'border-stone-600 bg-stone-700/50'
                    : 'border-stone-300 bg-stone-200/50'
                  : isDark
                    ? 'border-stone-500 bg-stone-600/30'
                    : 'border-stone-300 bg-stone-100'
              )}
            >
              <div className="flex-shrink-0">
                {loop.status === 'running' ? (
                  <Loader2
                    className={cn(
                      'h-3 w-3 animate-spin',
                      isDark ? 'text-stone-400' : 'text-stone-600'
                    )}
                  />
                ) : loop.status === 'completed' ? (
                  <CheckCircle
                    className={cn(
                      'h-3 w-3',
                      isDark ? 'text-stone-400' : 'text-stone-600'
                    )}
                  />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'font-serif text-sm',
                    isDark ? 'text-stone-200' : 'text-stone-800'
                  )}
                >
                  第 {loop.index + 1} 轮循环
                </span>
              </div>

              <div className="flex-shrink-0">
                {loop.endTime && loop.startTime && (
                  <span
                    className={cn(
                      'font-serif text-xs',
                      isDark ? 'text-stone-400' : 'text-stone-500'
                    )}
                  >
                    {formatTime(loop.endTime - loop.startTime)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🎯 并行分支详情展开区域 */}
      {node.isParallelNode && node.parallelBranches && isExpanded && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-250">
          {node.parallelBranches.map((branch, branchIndex) => (
            <div
              key={branch.id}
              className={cn(
                'iteration-node relative ml-6 pl-4',
                isDark ? 'bg-stone-800/30' : 'bg-stone-50/30',
                'flex items-center gap-3 rounded-md border px-3 py-2 font-serif transition-all duration-300',
                branch.status === 'running'
                  ? isDark
                    ? 'border-stone-600 bg-stone-700/50'
                    : 'border-stone-300 bg-stone-200/50'
                  : isDark
                    ? 'border-stone-500 bg-stone-600/30'
                    : 'border-stone-300 bg-stone-100'
              )}
            >
              <div className="flex-shrink-0">
                {branch.status === 'running' ? (
                  <Loader2
                    className={cn(
                      'h-3 w-3 animate-spin',
                      isDark ? 'text-stone-400' : 'text-stone-600'
                    )}
                  />
                ) : branch.status === 'completed' ? (
                  <CheckCircle
                    className={cn(
                      'h-3 w-3',
                      isDark ? 'text-stone-400' : 'text-stone-600'
                    )}
                  />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'font-serif text-sm',
                    isDark ? 'text-stone-200' : 'text-stone-800'
                  )}
                >
                  {branch.name}
                </span>
              </div>

              <div className="flex-shrink-0">
                {branch.endTime && branch.startTime && (
                  <span
                    className={cn(
                      'font-serif text-xs',
                      isDark ? 'text-stone-400' : 'text-stone-500'
                    )}
                  >
                    {formatTime(branch.endTime - branch.startTime)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
