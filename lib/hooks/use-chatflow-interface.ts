'use client';

import { useChatflowExecutionStore } from '@lib/stores/chatflow-execution-store';

import { useCallback, useEffect } from 'react';

import { useChatInterface } from './use-chat-interface';

/**
 * Chatflow 接口 Hook
 *
 * 功能特点：
 * - 扩展 useChatInterface 的功能
 * - 处理表单数据转换为聊天消息
 * - 保持与现有聊天逻辑的兼容性
 * - 支持表单数据的结构化处理
 * - 集成节点执行跟踪功能
 */
export function useChatflowInterface() {
  // 获取节点跟踪相关的方法
  const { startExecution, handleNodeEvent, resetExecution } =
    useChatflowExecutionStore();

  // 使用基础的聊天接口，传递节点事件处理器
  const chatInterface = useChatInterface(handleNodeEvent);

  /**
   * 处理 Chatflow 提交
   * 将查询和表单数据构建为正确的 chat-messages API payload
   */
  const handleChatflowSubmit = useCallback(
    async (query: string, inputs: Record<string, any>, files?: any[]) => {
      console.log('[useChatflowInterface] 处理 Chatflow 提交', {
        query,
        inputs,
        files,
      });

      try {
        // --- 步骤1: 启动节点跟踪 ---
        startExecution();

        // --- 步骤2: 构建用户消息内容 ---
        // 显示给用户看的消息内容，包含查询和表单数据摘要
        const userMessage = formatChatflowMessage(query, inputs);

        // --- 步骤3: 准备文件数据 ---
        const difyFiles = files ? formatFilesForDify(files) : undefined;

        // --- 步骤4: 使用修改后的handleSubmit传递inputs ---
        // 现在handleSubmit支持第三个参数inputs
        await chatInterface.handleSubmit(userMessage, difyFiles, inputs);

        console.log('[useChatflowInterface] Chatflow 数据已成功发送');
      } catch (error) {
        console.error('[useChatflowInterface] Chatflow 提交失败:', error);
        // 发生错误时停止执行跟踪
        useChatflowExecutionStore
          .getState()
          .setError(error instanceof Error ? error.message : '提交失败');
        throw error;
      }
    },
    [chatInterface, startExecution]
  );

  // --- 监听 SSE 事件并更新节点状态 ---
  useEffect(() => {
    const { isWaitingForResponse } = chatInterface;

    if (isWaitingForResponse) {
      // 开始执行时启动跟踪
      console.log('[ChatflowInterface] 开始等待响应，启动执行跟踪');
      startExecution();
    } else {
      // 修复：流式响应结束不等于节点执行完成
      // 不应该强制停止执行，让节点自然完成
      // 只在真正需要时（如用户手动停止）才调用stopExecution
      console.log('[ChatflowInterface] 流式响应完成，但节点可能仍在执行');

      // 不再自动调用stopExecution，让节点通过node_finished事件自然完成
      // 这样避免了将running节点错误标记为failed的问题
    }
  }, [chatInterface.isWaitingForResponse, startExecution]);

  /**
   * 重写停止处理方法，同时处理聊天停止和细粒度节点状态
   */
  const handleStopProcessing = useCallback(async () => {
    console.log('[useChatflowInterface] 开始停止处理：聊天 + 细粒度节点');

    try {
      // 1. 先调用原始的聊天停止方法
      await chatInterface.handleStopProcessing();
      console.log('[useChatflowInterface] 聊天停止完成');

      // 2. 处理细粒度节点状态停止
      const {
        stopExecution,
        nodes,
        updateNode,
        updateIteration,
        updateParallelBranch,
      } = useChatflowExecutionStore.getState();

      // 停止所有运行中的节点
      nodes.forEach(node => {
        if (node.status === 'running') {
          console.log('[useChatflowInterface] 停止运行中的节点:', node.id);
          updateNode(node.id, {
            status: 'failed',
            endTime: Date.now(),
            description: node.title + ' (已停止)',
          });
        }

        // 处理迭代中的运行节点
        if (node.iterations) {
          node.iterations.forEach(iteration => {
            if (iteration.status === 'running') {
              console.log(
                '[useChatflowInterface] 停止迭代中的节点:',
                node.id,
                iteration.id
              );
              updateIteration(node.id, iteration.id, {
                status: 'failed',
                endTime: Date.now(),
              });
            }
          });
        }

        // 处理并行分支中的运行节点
        if (node.parallelBranches) {
          node.parallelBranches.forEach(branch => {
            if (branch.status === 'running') {
              console.log(
                '[useChatflowInterface] 停止并行分支中的节点:',
                node.id,
                branch.id
              );
              updateParallelBranch(node.id, branch.id, {
                status: 'failed',
                endTime: Date.now(),
              });
            }
          });
        }
      });

      // 3. 停止执行状态
      stopExecution();
      console.log('[useChatflowInterface] 细粒度节点状态停止完成');
    } catch (error) {
      console.error('[useChatflowInterface] 停止处理失败:', error);
      // 即使出错也要尝试停止执行状态
      useChatflowExecutionStore.getState().stopExecution();
      throw error;
    }
  }, [chatInterface]);

  // 返回扩展的接口
  return {
    ...chatInterface,
    handleStopProcessing, // 使用重写的停止方法
    handleChatflowSubmit,
    // 暴露节点跟踪相关的状态和方法
    nodeTracker: {
      nodes: useChatflowExecutionStore(state => state.nodes),
      isExecuting: useChatflowExecutionStore(state => state.isExecuting),
      executionProgress: useChatflowExecutionStore(
        state => state.executionProgress
      ),
      error: useChatflowExecutionStore(state => state.error),
      resetExecution,
    },
  };
}

/**
 * 格式化 Chatflow 消息内容
 */
function formatChatflowMessage(
  query: string,
  inputs: Record<string, any>
): string {
  // 🎯 修复：只返回用户的原始问题，不添加表单摘要
  // 表单数据通过 inputs 字段传递给 Dify API，不应该污染 query 字段
  return query;
}

/**
 * 格式化文件为 Dify 格式
 */
function formatFilesForDify(files: any[]): any[] {
  return files.map(file => {
    if (file.upload_file_id) {
      return {
        type: file.type || 'document',
        transfer_method: 'local_file',
        upload_file_id: file.upload_file_id,
        name: file.name,
        size: file.size,
        mime_type: file.mime_type,
      };
    }
    return file;
  });
}

/**
 * 将表单数据格式化为用户友好的消息内容（保留用于兼容性）
 */
function formatFormDataToMessage(formData: Record<string, any>): string {
  const messageParts: string[] = [];

  // 遍历表单数据，构建结构化消息
  Object.entries(formData).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return; // 跳过空值
    }

    // 处理不同类型的值
    if (Array.isArray(value)) {
      // 文件数组或其他数组类型
      if (value.length > 0) {
        // 对于文件，我们只显示文件名，实际文件通过 files 参数传递
        if (value[0] && typeof value[0] === 'object' && value[0].name) {
          const fileNames = value.map(file => file.name).join(', ');
          messageParts.push(`**${key}**: ${fileNames}`);
        } else {
          messageParts.push(`**${key}**: ${value.join(', ')}`);
        }
      }
    } else if (typeof value === 'object') {
      // 对象类型（如文件对象）
      if (value.name) {
        messageParts.push(`**${key}**: ${value.name}`);
      } else {
        messageParts.push(`**${key}**: ${JSON.stringify(value)}`);
      }
    } else {
      // 基本类型
      messageParts.push(`**${key}**: ${value}`);
    }
  });

  // 如果没有有效数据，返回默认消息
  if (messageParts.length === 0) {
    return '开始对话';
  }

  // 构建最终消息
  const formattedMessage = [
    '我已填写了以下信息：',
    '',
    ...messageParts,
    '',
    '请基于这些信息为我提供帮助。',
  ].join('\n');

  return formattedMessage;
}

/**
 * 从表单数据中提取文件
 */
function extractFilesFromFormData(formData: Record<string, any>): any[] {
  const files: any[] = [];

  Object.values(formData).forEach(value => {
    if (Array.isArray(value)) {
      // 检查是否是文件数组
      value.forEach(item => {
        if (item && typeof item === 'object' && (item.file || item.name)) {
          files.push(item);
        }
      });
    } else if (
      value &&
      typeof value === 'object' &&
      (value.file || value.name)
    ) {
      // 单个文件对象
      files.push(value);
    }
  });

  return files;
}

/**
 * 检查表单数据是否包含文件
 */
export function hasFilesInFormData(formData: Record<string, any>): boolean {
  return extractFilesFromFormData(formData).length > 0;
}

/**
 * 获取表单数据的摘要信息
 */
export function getFormDataSummary(formData: Record<string, any>): {
  fieldCount: number;
  hasFiles: boolean;
  nonEmptyFields: string[];
} {
  const nonEmptyFields: string[] = [];
  let hasFiles = false;

  Object.entries(formData).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      nonEmptyFields.push(key);

      // 检查是否包含文件
      if (Array.isArray(value)) {
        if (
          value.some(
            item => item && typeof item === 'object' && (item.file || item.name)
          )
        ) {
          hasFiles = true;
        }
      } else if (
        value &&
        typeof value === 'object' &&
        (value.file || value.name)
      ) {
        hasFiles = true;
      }
    }
  });

  return {
    fieldCount: nonEmptyFields.length,
    hasFiles,
    nonEmptyFields,
  };
}
