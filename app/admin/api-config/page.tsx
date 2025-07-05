'use client';

import { ApiConfigFields } from '@components/admin/api-config/api-config-fields';
import { CustomProviderSelector } from '@components/admin/api-config/custom-provider-selector';
import { DifyAppTypeSelector } from '@components/admin/api-config/dify-app-type-selector';
import DifyParametersPanel from '@components/admin/api-config/dify-parameters-panel';
import { EmptyState } from '@components/admin/api-config/empty-state';
import { FormActions } from '@components/admin/api-config/form-actions';
import { InstanceDetailHeader } from '@components/admin/api-config/instance-detail-header';
import { InstanceFormContainer } from '@components/admin/api-config/instance-form-container';
import {
  handleCreateInstance,
  handleUpdateInstance,
} from '@components/admin/api-config/instance-save-handlers';
import { ProviderManagementButton } from '@components/admin/api-config/provider-management-button';
import { ProviderManagementModal } from '@components/admin/api-config/provider-management-modal';
import { TagsSelector } from '@components/admin/api-config/tags-selector';
import { useApiConfigEvents } from '@components/admin/api-config/use-api-config-events';
import { useTheme } from '@lib/hooks/use-theme';
// import { getDifyAppParameters } from '@lib/services/dify/app-service'; // 移除直接导入，改为动态导入保持一致性
import type { DifyAppParametersResponse } from '@lib/services/dify/types';
import { validateDifyFormData } from '@lib/services/dify/validation';
import {
  ServiceInstance,
  useApiConfigStore,
} from '@lib/stores/api-config-store';
import type { DifyAppType } from '@lib/types/dify-app-types';
import type { DifyParametersSimplifiedConfig } from '@lib/types/dify-parameters';
import { cn } from '@lib/utils';
import {
  AlertCircle,
  CheckCircle,
  Database,
  Edit,
  FileText,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sliders,
  Star,
  Trash2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import React, { useEffect, useState } from 'react';

const InstanceForm = ({
  instance,
  isEditing,
  onSave,
  onCancel,
  isProcessing,
  defaultProviderId,
}: {
  instance: Partial<ServiceInstance> | null;
  isEditing: boolean;
  onSave: (data: any) => void;
  onCancel: () => void;
  isProcessing: boolean;
  defaultProviderId?: string | null;
}) => {
  const { isDark } = useTheme();
  const { serviceInstances, apiKeys, providers } = useApiConfigStore();

  // 新建模式下的提供商选择状态
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');

  // 监听提供商选择变化，自动更新API URL
  useEffect(() => {
    if (!isEditing && selectedProviderId) {
      const selectedProvider = providers.find(p => p.id === selectedProviderId);
      if (selectedProvider && selectedProvider.base_url) {
        setFormData(prev => ({
          ...prev,
          config: {
            ...prev.config,
            api_url: selectedProvider.base_url,
          },
        }));
      }
    }
  }, [selectedProviderId, providers, isEditing]);

  // --- 获取当前实例的最新状态 ---
  const currentInstance = instance
    ? serviceInstances.find(inst => inst.id === instance.id)
    : null;
  const isCurrentDefault = currentInstance?.is_default || false;

  // --- 检查当前实例是否已配置API密钥 ---
  const hasApiKey = instance
    ? apiKeys.some(key => key.service_instance_id === instance.id)
    : false;

  const [formData, setFormData] = useState({
    instance_id: instance?.instance_id || '',
    display_name: instance?.display_name || '',
    description: instance?.description || '',
    api_path: instance?.api_path || '',
    apiKey: '',
    config: {
      api_url: instance?.config?.api_url || '',
      app_metadata: {
        app_type:
          (instance?.config?.app_metadata?.app_type as
            | 'model'
            | 'marketplace') || 'model',
        dify_apptype:
          (instance?.config?.app_metadata?.dify_apptype as
            | 'chatbot'
            | 'agent'
            | 'chatflow'
            | 'workflow'
            | 'text-generation') || 'chatbot',
        tags: instance?.config?.app_metadata?.tags || [],
      },
      dify_parameters: instance?.config?.dify_parameters || {},
    },
  });

  // 🎯 新增：基准数据状态，用于正确判断是否有未保存的更改
  // 当同步参数或重置表单时，需要更新这个基准数据
  const [baselineData, setBaselineData] = useState({
    instance_id: instance?.instance_id || '',
    display_name: instance?.display_name || '',
    description: instance?.description || '',
    api_path: instance?.api_path || '',
    apiKey: '',
    config: {
      api_url: instance?.config?.api_url || '',
      app_metadata: {
        app_type:
          (instance?.config?.app_metadata?.app_type as
            | 'model'
            | 'marketplace') || 'model',
        dify_apptype:
          (instance?.config?.app_metadata?.dify_apptype as
            | 'chatbot'
            | 'agent'
            | 'chatflow'
            | 'workflow'
            | 'text-generation') || 'chatbot',
        tags: instance?.config?.app_metadata?.tags || [],
      },
      dify_parameters: instance?.config?.dify_parameters || {},
    },
  });

  const [showDifyPanel, setShowDifyPanel] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 🎯 新增：实时验证instance_id格式
  const [instanceIdError, setInstanceIdError] = useState<string>('');

  // 🎯 实时验证instance_id格式的函数
  const validateInstanceId = (value: string) => {
    if (!value.trim()) {
      setInstanceIdError('');
      return;
    }

    const instanceId = value.trim();

    // 检查是否包含空格
    if (instanceId.includes(' ')) {
      setInstanceIdError('不能包含空格（会影响URL路由）');
      return;
    }

    // 检查是否包含其他需要URL编码的特殊字符
    const urlUnsafeChars = /[^a-zA-Z0-9\-_\.]/;
    if (urlUnsafeChars.test(instanceId)) {
      setInstanceIdError('只能包含字母、数字、连字符(-)、下划线(_)和点(.)');
      return;
    }

    // 检查长度限制
    if (instanceId.length > 50) {
      setInstanceIdError('长度不能超过50个字符');
      return;
    }

    // 检查是否以字母或数字开头
    if (!/^[a-zA-Z0-9]/.test(instanceId)) {
      setInstanceIdError('必须以字母或数字开头');
      return;
    }

    // 所有验证通过
    setInstanceIdError('');
  };

  useEffect(() => {
    const newData = {
      instance_id: instance?.instance_id || '',
      display_name: instance?.display_name || '',
      description: instance?.description || '',
      api_path: instance?.api_path || '',
      apiKey: '',
      config: {
        api_url: instance?.config?.api_url || '',
        app_metadata: {
          app_type:
            (instance?.config?.app_metadata?.app_type as
              | 'model'
              | 'marketplace') || 'model',
          dify_apptype:
            (instance?.config?.app_metadata?.dify_apptype as
              | 'chatbot'
              | 'agent'
              | 'chatflow'
              | 'workflow'
              | 'text-generation') || 'chatbot',
          tags: instance?.config?.app_metadata?.tags || [],
        },
        dify_parameters: instance?.config?.dify_parameters || {},
      },
    };

    if (instance) {
      // 编辑模式：如果API URL为空，使用提供商的base_url
      if (!newData.config.api_url && instance.provider_id) {
        const currentProvider = providers.find(
          p => p.id === instance.provider_id
        );
        if (currentProvider && currentProvider.base_url) {
          newData.config.api_url = currentProvider.base_url;
        }
      }

      setFormData(newData);
      setBaselineData(newData);
      // 🎯 初始化时也验证instance_id格式
      validateInstanceId(newData.instance_id);
    } else {
      // 新建模式：初始化默认提供商选择
      // 优先使用筛选的提供商，其次是Dify，最后是第一个活跃的提供商
      const getInitialProviderId = () => {
        const activeProviders = providers.filter(p => p.is_active);
        if (activeProviders.length === 0) return '';

        // 如果有筛选的提供商且该提供商是活跃的，优先使用
        if (defaultProviderId) {
          const filteredProvider = activeProviders.find(
            p => p.id === defaultProviderId
          );
          if (filteredProvider) return filteredProvider.id;
        }

        if (activeProviders.length === 1) return activeProviders[0].id;
        const difyProvider = activeProviders.find(
          p => p.name.toLowerCase() === 'dify'
        );
        return difyProvider ? difyProvider.id : activeProviders[0].id;
      };

      const initialProviderId = getInitialProviderId();
      setSelectedProviderId(initialProviderId);

      const emptyData = {
        instance_id: '',
        display_name: '',
        description: '',
        api_path: '',
        apiKey: '',
        config: {
          api_url: '',
          app_metadata: {
            app_type: 'model' as const,
            dify_apptype: 'chatbot' as const,
            tags: [],
          },
          dify_parameters: {},
        },
      };
      setFormData(emptyData);
      setBaselineData(emptyData);
      // 🎯 新建时清空错误状态
      setInstanceIdError('');
    }
  }, [instance, providers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 🎯 检查实时验证错误
    if (instanceIdError) {
      toast.error('应用ID格式错误', { description: instanceIdError });
      return;
    }

    // 🎯 新增：表单验证，确保Dify应用类型必填
    const validationErrors = validateDifyFormData(formData);
    if (validationErrors.length > 0) {
      toast.error('表单验证失败', {
        description: validationErrors.join('\n'),
      });
      return;
    }

    // --- 自动设置 is_marketplace_app 字段与 app_type 保持一致 ---
    const dataToSave = {
      ...formData,
      // 🎯 确保instance_id去除首尾空格
      instance_id: formData.instance_id.trim(),
      config: {
        ...formData.config,
        app_metadata: {
          ...formData.config.app_metadata,
          // 🎯 确保dify_apptype字段被保存
          dify_apptype: formData.config.app_metadata.dify_apptype,
          is_marketplace_app:
            formData.config.app_metadata.app_type === 'marketplace',
        },
      },
      setAsDefault,
      // 新建模式下传递选择的提供商ID
      selectedProviderId: isEditing ? undefined : selectedProviderId,
    };

    onSave(dataToSave);
  };

  const handleDifyParametersSave = (difyConfig: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        dify_parameters: difyConfig,
      },
    }));

    // 🎯 修复：Dify参数保存后也更新基准数据
    setBaselineData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        dify_parameters: difyConfig,
      },
    }));

    setShowDifyPanel(false);
  };

  // 🎯 修复：智能同步参数逻辑
  // 编辑模式：优先使用数据库配置，失败时fallback到表单配置
  // 添加模式：直接使用表单配置
  const handleSyncFromDify = async () => {
    // 🎯 新建模式下需要API URL和API Key，编辑模式下需要instance_id
    if (!isEditing && (!formData.config.api_url || !formData.apiKey)) {
      toast.warning('请先填写API URL和API Key');
      return;
    }

    if (isEditing && !formData.instance_id) {
      toast.warning('请先填写应用ID');
      return;
    }

    setIsSyncing(true);
    try {
      // 🎯 新增：同步基本配置信息（name、description、tags）
      let appInfo: any = null;
      let difyParams: DifyAppParametersResponse | null = null;
      let actualInstanceId = formData.instance_id;
      let isAutoGenerated = false;

      if (isEditing) {
        // 编辑模式：优先使用数据库配置
        try {
          console.log('[同步配置] 编辑模式：尝试使用数据库配置');

          // 同时获取基本信息和参数
          const { getDifyAppInfo, getDifyAppParameters } = await import(
            '@lib/services/dify'
          );
          appInfo = await getDifyAppInfo(formData.instance_id);
          difyParams = await getDifyAppParameters(formData.instance_id);
        } catch (dbError) {
          console.log('[同步配置] 数据库配置失败，尝试使用表单配置:', dbError);

          // 🎯 改进：编辑模式下支持使用表单配置进行同步
          // 这样用户可以修改API Key后立即测试，无需先保存
          if (!formData.config.api_url) {
            throw new Error(
              'API URL为空，无法同步配置。请填写API URL或检查数据库配置。'
            );
          }

          if (!formData.apiKey) {
            throw new Error(
              'API Key为空，无法同步配置。请在API密钥字段中输入新的密钥进行测试。'
            );
          }

          // 使用表单配置作为fallback
          const { getDifyAppInfoWithConfig, getDifyAppParametersWithConfig } =
            await import('@lib/services/dify');

          // 同时获取基本信息和参数
          appInfo = await getDifyAppInfoWithConfig(formData.instance_id, {
            apiUrl: formData.config.api_url,
            apiKey: formData.apiKey,
          });
          difyParams = await getDifyAppParametersWithConfig(
            formData.instance_id,
            {
              apiUrl: formData.config.api_url,
              apiKey: formData.apiKey,
            }
          );
        }
      } else {
        // 添加模式：直接使用表单配置
        console.log('[同步配置] 添加模式：使用表单配置');

        // 检查表单配置是否完整
        if (!formData.config.api_url || !formData.apiKey) {
          toast.warning('请先填写API URL和API Key');
          return;
        }

        // 🎯 改进：如果应用ID为空，自动生成临时UUID进行测试
        // 这样用户可以先测试API配置，无需预先想应用ID
        if (!actualInstanceId) {
          actualInstanceId = uuidv4();
          isAutoGenerated = true;
          console.log(
            '[同步配置] 应用ID为空，自动生成临时ID:',
            actualInstanceId
          );
        }

        // 直接使用表单配置
        const { getDifyAppInfoWithConfig, getDifyAppParametersWithConfig } =
          await import('@lib/services/dify');

        // 同时获取基本信息和参数
        appInfo = await getDifyAppInfoWithConfig(actualInstanceId, {
          apiUrl: formData.config.api_url,
          apiKey: formData.apiKey,
        });
        difyParams = await getDifyAppParametersWithConfig(actualInstanceId, {
          apiUrl: formData.config.api_url,
          apiKey: formData.apiKey,
        });
      }

      // 🎯 处理基本信息同步 - 去掉确认对话框，直接同步
      const updatedFormData = { ...formData };

      if (appInfo) {
        // 🎯 改进：总是同步基本信息，但给用户选择权
        // 不再限制只有空字段才同步，提高同步功能的实用性
        // 同步display_name（如果有变化则询问用户）
        if (appInfo.name && appInfo.name !== formData.display_name) {
          if (
            !formData.display_name ||
            confirm(`是否将显示名称更新为："${appInfo.name}"？`)
          ) {
            updatedFormData.display_name = appInfo.name;
          }
        }

        // 同步description（如果有变化则询问用户）
        if (
          appInfo.description &&
          appInfo.description !== formData.description
        ) {
          if (
            !formData.description ||
            confirm(`是否将描述更新为："${appInfo.description}"？`)
          ) {
            updatedFormData.description = appInfo.description;
          }
        }

        // 🎯 同步tags（append模式，不替换现有tags）
        if (appInfo.tags && appInfo.tags.length > 0) {
          const currentTags = formData.config.app_metadata.tags || [];
          const newTags = appInfo.tags.filter(
            (tag: string) => !currentTags.includes(tag)
          );

          if (newTags.length > 0) {
            updatedFormData.config.app_metadata.tags = [
              ...currentTags,
              ...newTags,
            ];
          }
        }
      }

      // 🎯 处理参数同步（保持原有逻辑）
      if (difyParams) {
        const simplifiedParams: DifyParametersSimplifiedConfig = {
          opening_statement: difyParams.opening_statement || '',
          suggested_questions: difyParams.suggested_questions || [],
          suggested_questions_after_answer:
            difyParams.suggested_questions_after_answer || { enabled: false },
          speech_to_text: difyParams.speech_to_text || { enabled: false },
          text_to_speech: difyParams.text_to_speech || { enabled: false },
          retriever_resource: difyParams.retriever_resource || {
            enabled: false,
          },
          annotation_reply: difyParams.annotation_reply || { enabled: false },
          user_input_form: difyParams.user_input_form || [],
          file_upload: difyParams.file_upload || undefined,
          system_parameters: difyParams.system_parameters || {
            file_size_limit: 15,
            image_file_size_limit: 10,
            audio_file_size_limit: 50,
            video_file_size_limit: 100,
          },
        };

        updatedFormData.config.dify_parameters = simplifiedParams;
      }

      // 🎯 新增：如果是自动生成的ID，同步成功后自动填充到表单
      if (!isEditing && isAutoGenerated && actualInstanceId) {
        updatedFormData.instance_id = actualInstanceId;
        // 验证自动生成的ID
        validateInstanceId(actualInstanceId);
      }

      // 更新表单数据
      setFormData(updatedFormData);

      // 🎯 同步成功后更新基准数据
      setBaselineData(updatedFormData);

      // 🎯 添加数据验证，确保真正获取到数据才显示成功
      const syncedItems = [];
      if (appInfo) {
        syncedItems.push('基本信息');
      }
      if (difyParams) {
        syncedItems.push('参数配置');
      }

      if (syncedItems.length === 0) {
        throw new Error(
          '未能从 Dify API 获取到任何配置数据，请检查应用ID和API配置是否正确'
        );
      }

      // 🎯 改进：根据是否自动生成ID提供不同的成功提示
      let successMessage = `成功从 Dify API 同步${syncedItems.join('和')}！`;
      if (!isEditing && isAutoGenerated) {
        successMessage += ` 已自动生成应用ID：${actualInstanceId}`;
      }

      toast.success(successMessage);
    } catch (error) {
      console.error('[同步配置] 同步失败:', error);
      const errorMessage =
        error instanceof Error ? error.message : '同步配置失败';
      toast.error('同步失败', { description: errorMessage });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'mb-6 rounded-xl border p-6',
          isDark ? 'border-stone-600 bg-stone-800' : 'border-stone-200 bg-white'
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3
              className={cn(
                'font-serif text-lg font-bold',
                isDark ? 'text-stone-100' : 'text-stone-900'
              )}
            >
              {isEditing ? '编辑应用实例' : '添加应用实例'}
            </h3>

            {/* --- BEGIN COMMENT --- */}
            {/* 🎯 新增：未保存更改提示 */}
            {/* --- END COMMENT --- */}
            {(JSON.stringify(formData) !== JSON.stringify(baselineData) ||
              formData.apiKey) && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 font-serif text-xs font-medium',
                  'animate-pulse border border-dashed',
                  isDark
                    ? 'border-amber-700/40 bg-amber-900/20 text-amber-300'
                    : 'border-amber-300/60 bg-amber-50 text-amber-700'
                )}
              >
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isDark ? 'bg-amber-400' : 'bg-amber-500'
                  )}
                />
                有未保存的更改
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* 设为默认应用按钮 */}
            {isEditing ? (
              /* 编辑模式：显示当前状态并允许修改 */
              instance && (
                <button
                  type="button"
                  onClick={() => {
                    // --- 简化逻辑：直接使用实时状态 ---
                    if (isCurrentDefault) {
                      return; // 已经是默认应用，无需操作
                    }

                    if (
                      confirm(
                        `确定要将"${formData.display_name || '此应用'}"设置为默认应用吗？`
                      )
                    ) {
                      // 直接调用store的方法
                      if (instance.id) {
                        useApiConfigStore
                          .getState()
                          .setDefaultInstance(instance.id)
                          .then(() => {
                            toast.success('默认应用设置成功');
                          })
                          .catch(error => {
                            console.error('设置默认应用失败:', error);
                            toast.error('设置默认应用失败');
                          });
                      } else {
                        toast.error('实例ID不存在，无法设置为默认应用');
                      }
                    }
                  }}
                  disabled={isCurrentDefault}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 transition-all',
                    'border',
                    isCurrentDefault
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:scale-105',
                    isCurrentDefault
                      ? isDark
                        ? 'border-stone-600/50 bg-stone-700/30 text-stone-400'
                        : 'border-stone-300/50 bg-stone-100/50 text-stone-500'
                      : isDark
                        ? 'border-stone-600 bg-stone-700 text-stone-300 hover:bg-stone-600'
                        : 'border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200'
                  )}
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      isCurrentDefault && 'fill-current'
                    )}
                  />
                  <span className="font-serif text-sm font-medium">
                    {isCurrentDefault ? '默认应用' : '设为默认'}
                  </span>
                </button>
              )
            ) : (
              /* 添加模式：允许选择是否设为默认 */
              <button
                type="button"
                onClick={() => setSetAsDefault(!setAsDefault)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-all',
                  'border hover:scale-105',
                  setAsDefault
                    ? isDark
                      ? 'border-stone-500 bg-stone-600 text-stone-200'
                      : 'border-stone-400 bg-stone-200 text-stone-800'
                    : isDark
                      ? 'border-stone-600 bg-stone-700 text-stone-300 hover:bg-stone-600'
                      : 'border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200'
                )}
              >
                <Star
                  className={cn('h-4 w-4', setAsDefault && 'fill-current')}
                />
                <span className="font-serif text-sm font-medium">
                  {setAsDefault ? '将设为默认' : '设为默认'}
                </span>
              </button>
            )}

            {/* Dify参数配置按钮组 */}
            <div
              className={cn(
                'flex gap-2 rounded-lg p-2',
                isDark ? 'bg-stone-800/50' : 'bg-stone-100/50'
              )}
            >
              <button
                type="button"
                onClick={() => setShowDifyPanel(true)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 transition-all',
                  isDark
                    ? 'bg-stone-700/50 text-stone-300 hover:bg-stone-700 hover:text-stone-200'
                    : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-800'
                )}
              >
                <Sliders className="h-4 w-4" />
                <span className="font-serif text-sm font-medium">
                  Dify 参数配置
                </span>
              </button>

              {/* --- BEGIN COMMENT --- */}
              {/* 🎯 新增：从 Dify API 同步参数按钮 */}
              {/* --- END COMMENT --- */}
              <button
                type="button"
                onClick={handleSyncFromDify}
                disabled={
                  isSyncing ||
                  (!isEditing && (!formData.config.api_url || !formData.apiKey))
                }
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 transition-all',
                  isSyncing ||
                    (!isEditing &&
                      (!formData.config.api_url || !formData.apiKey))
                    ? isDark
                      ? 'cursor-not-allowed bg-stone-800/50 text-stone-500'
                      : 'cursor-not-allowed border border-stone-200 bg-stone-200/50 text-stone-400'
                    : isDark
                      ? 'bg-stone-700/50 text-stone-300 hover:bg-stone-700 hover:text-stone-200'
                      : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-800'
                )}
                title={
                  isEditing
                    ? '从 Dify API 同步配置'
                    : !formData.config.api_url || !formData.apiKey
                      ? '请先填写API URL和API Key'
                      : '从 Dify API 同步配置（应用ID为空时将自动生成）'
                }
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="font-serif text-sm font-medium">
                  {isSyncing ? '同步中...' : '同步配置'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* --- BEGIN COMMENT ---
        服务提供商选择/显示区域
        --- END COMMENT --- */}
        <div
          className={cn(
            'mb-6 rounded-lg border p-4',
            isDark
              ? 'border-stone-600 bg-stone-700/50'
              : 'border-stone-200 bg-stone-50'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3
                className={cn(
                  'font-serif text-sm font-medium',
                  isDark ? 'text-stone-200' : 'text-stone-800'
                )}
              >
                服务提供商
              </h3>
              <p
                className={cn(
                  'mt-1 font-serif text-xs',
                  isDark ? 'text-stone-400' : 'text-stone-600'
                )}
              >
                {isEditing
                  ? '当前应用的服务提供商（不可修改）'
                  : '选择服务提供商'}
              </p>
            </div>

            {isEditing ? (
              // 编辑模式：只显示，不可修改
              <div
                className={cn(
                  'rounded-md px-3 py-1.5 font-serif text-sm',
                  isDark
                    ? 'bg-stone-600 text-stone-200'
                    : 'bg-stone-200 text-stone-700'
                )}
              >
                {(() => {
                  const currentProvider = providers.find(
                    p => p.id === instance?.provider_id
                  );
                  return currentProvider ? currentProvider.name : '未知提供商';
                })()}
              </div>
            ) : (
              // 新建模式：可选择
              <div className="w-48">
                <CustomProviderSelector
                  providers={providers}
                  selectedProviderId={selectedProviderId}
                  onProviderChange={setSelectedProviderId}
                  placeholder="请选择提供商"
                />
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <label
                className={cn(
                  'mb-2 block font-serif text-sm font-medium',
                  isDark ? 'text-stone-300' : 'text-stone-700'
                )}
              >
                应用 ID (instance_id) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.instance_id}
                  onChange={e => {
                    setFormData(prev => ({
                      ...prev,
                      instance_id: e.target.value,
                    }));
                    validateInstanceId(e.target.value);
                  }}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 font-serif',
                    !isEditing && 'pr-20', // 新建模式下为按钮留空间
                    isDark
                      ? 'border-stone-600 bg-stone-700 text-stone-100 placeholder-stone-400'
                      : 'border-stone-300 bg-white text-stone-900 placeholder-stone-500',
                    isEditing &&
                      (isDark
                        ? 'cursor-not-allowed bg-stone-800'
                        : 'cursor-not-allowed bg-stone-100'),
                    instanceIdError && 'border-red-500'
                  )}
                  placeholder="输入应用 ID"
                  required
                  disabled={isEditing}
                />

                {/* --- BEGIN COMMENT --- */}
                {/* 🎯 新增：UUID生成按钮（仅在新建模式下显示） */}
                {/* --- END COMMENT --- */}
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      const uuid = uuidv4();
                      setFormData(prev => ({ ...prev, instance_id: uuid }));
                      validateInstanceId(uuid);
                    }}
                    className={cn(
                      'absolute top-1/2 right-2 -translate-y-1/2 transform',
                      'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all',
                      'border shadow-sm hover:scale-105 hover:shadow-md',
                      'font-serif font-medium',
                      isDark
                        ? 'border-stone-500 bg-gradient-to-r from-stone-600 to-stone-700 text-stone-200 hover:from-stone-500 hover:to-stone-600 hover:text-white'
                        : 'border-stone-300 bg-gradient-to-r from-stone-100 to-stone-200 text-stone-700 hover:from-stone-200 hover:to-stone-300 hover:text-stone-800'
                    )}
                    title="点击生成随机UUID作为应用ID"
                  >
                    <Lightbulb className="h-3 w-3" />
                    <span>生成ID</span>
                  </button>
                )}
              </div>
              {isEditing && (
                <p
                  className={cn(
                    'mt-1 font-serif text-xs',
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  )}
                >
                  应用 ID 创建后不可修改
                </p>
              )}

              {!isEditing && (
                <p
                  className={cn(
                    'mt-1 font-serif text-xs',
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  )}
                >
                  只能包含字母、数字、连字符(-)、下划线(_)和点(.)，不能包含空格。可先同步配置自动生成。
                </p>
              )}

              {/* --- BEGIN COMMENT --- */}
              {/* 🎯 新增：实时错误提示 */}
              {/* --- END COMMENT --- */}
              {instanceIdError && (
                <p
                  className={cn(
                    'mt-1 flex items-center gap-1 font-serif text-xs text-red-500'
                  )}
                >
                  <AlertCircle className="h-3 w-3" />
                  {instanceIdError}
                </p>
              )}
            </div>

            <div>
              <label
                className={cn(
                  'mb-2 block font-serif text-sm font-medium',
                  isDark ? 'text-stone-300' : 'text-stone-700'
                )}
              >
                显示名称 (display_name) *
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    display_name: e.target.value,
                  }))
                }
                className={cn(
                  'w-full rounded-lg border px-3 py-2 font-serif',
                  isDark
                    ? 'border-stone-600 bg-stone-700 text-stone-100 placeholder-stone-400'
                    : 'border-stone-300 bg-white text-stone-900 placeholder-stone-500'
                )}
                placeholder="输入显示名称"
                required
              />
            </div>
          </div>

          {/* --- API配置字段 --- */}
          <ApiConfigFields
            formData={formData}
            setFormData={setFormData}
            isEditing={isEditing}
            hasApiKey={hasApiKey}
            instance={instance}
            providers={providers}
            selectedProviderId={selectedProviderId}
          />

          {/* --- BEGIN COMMENT --- */}
          {/* 🎯 同步配置按钮 - 仅在新建模式下显示 */}
          {/* --- END COMMENT --- */}
          {!isEditing && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSyncFromDify}
                disabled={
                  isSyncing || !formData.config.api_url || !formData.apiKey
                }
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-serif font-medium transition-colors disabled:opacity-50',
                  isSyncing || !formData.config.api_url || !formData.apiKey
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer',
                  isDark
                    ? 'bg-stone-600 text-white hover:bg-stone-500'
                    : 'bg-stone-800 text-white hover:bg-stone-700'
                )}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isSyncing ? '同步中...' : '从Dify同步配置'}
              </button>
            </div>
          )}

          <div>
            <label
              className={cn(
                'mb-2 block font-serif text-sm font-medium',
                isDark ? 'text-stone-300' : 'text-stone-700'
              )}
            >
              描述 (description)
            </label>
            <textarea
              value={formData.description}
              onChange={e =>
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              className={cn(
                'w-full rounded-lg border px-3 py-2 font-serif',
                isDark
                  ? 'border-stone-600 bg-stone-700 text-stone-100 placeholder-stone-400'
                  : 'border-stone-300 bg-white text-stone-900 placeholder-stone-500'
              )}
              placeholder="输入应用描述"
              rows={3}
            />
          </div>

          <div>
            <label
              className={cn(
                'mb-3 block font-serif text-sm font-medium',
                isDark ? 'text-stone-300' : 'text-stone-700'
              )}
            >
              应用类型 (app_type) *
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() =>
                  setFormData(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      app_metadata: {
                        ...prev.config.app_metadata,
                        app_type: 'model',
                      },
                    },
                  }))
                }
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                  formData.config.app_metadata.app_type === 'model'
                    ? isDark
                      ? 'border-stone-500 bg-stone-700/50'
                      : 'border-stone-400 bg-stone-100'
                    : isDark
                      ? 'border-stone-600 hover:border-stone-500'
                      : 'border-stone-300 hover:border-stone-400'
                )}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border-2',
                    formData.config.app_metadata.app_type === 'model'
                      ? isDark
                        ? 'border-stone-400 bg-stone-400'
                        : 'border-stone-600 bg-stone-600'
                      : isDark
                        ? 'border-stone-500'
                        : 'border-stone-400'
                  )}
                >
                  {formData.config.app_metadata.app_type === 'model' && (
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        isDark ? 'bg-stone-800' : 'bg-white'
                      )}
                    />
                  )}
                </div>
                <div>
                  <div
                    className={cn(
                      'font-serif text-sm font-medium',
                      isDark ? 'text-stone-100' : 'text-stone-900'
                    )}
                  >
                    模型 (Model)
                  </div>
                  <div
                    className={cn(
                      'font-serif text-xs',
                      isDark ? 'text-stone-400' : 'text-stone-600'
                    )}
                  >
                    用于模型切换
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      app_metadata: {
                        ...prev.config.app_metadata,
                        app_type: 'marketplace',
                      },
                    },
                  }))
                }
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                  formData.config.app_metadata.app_type === 'marketplace'
                    ? isDark
                      ? 'border-stone-500 bg-stone-700/50'
                      : 'border-stone-400 bg-stone-100'
                    : isDark
                      ? 'border-stone-600 hover:border-stone-500'
                      : 'border-stone-300 hover:border-stone-400'
                )}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border-2',
                    formData.config.app_metadata.app_type === 'marketplace'
                      ? isDark
                        ? 'border-stone-400 bg-stone-400'
                        : 'border-stone-600 bg-stone-600'
                      : isDark
                        ? 'border-stone-500'
                        : 'border-stone-400'
                  )}
                >
                  {formData.config.app_metadata.app_type === 'marketplace' && (
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        isDark ? 'bg-stone-800' : 'bg-white'
                      )}
                    />
                  )}
                </div>
                <div>
                  <div
                    className={cn(
                      'font-serif text-sm font-medium',
                      isDark ? 'text-stone-100' : 'text-stone-900'
                    )}
                  >
                    应用市场 (Marketplace)
                  </div>
                  <div
                    className={cn(
                      'font-serif text-xs',
                      isDark ? 'text-stone-400' : 'text-stone-600'
                    )}
                  >
                    用于应用市场
                  </div>
                </div>
              </button>
            </div>
            <p
              className={cn(
                'mt-2 font-serif text-xs',
                isDark ? 'text-stone-400' : 'text-stone-500'
              )}
            >
              选择"模型"类型的应用会出现在聊天界面的模型选择器中
            </p>
          </div>

          {/* --- BEGIN COMMENT --- */}
          {/* 🎯 新增：Dify应用类型选择器 */}
          {/* 在现有app_type选择器下方添加，保持一致的设计风格 */}
          {/* --- END COMMENT --- */}
          <DifyAppTypeSelector
            value={formData.config.app_metadata.dify_apptype}
            onChange={(type: DifyAppType) => {
              setFormData(prev => ({
                ...prev,
                config: {
                  ...prev.config,
                  app_metadata: {
                    ...prev.config.app_metadata,
                    dify_apptype: type,
                  },
                },
              }));
            }}
          />

          {/* 应用标签配置 - 紧凑设计 */}
          <TagsSelector
            tags={formData.config.app_metadata.tags}
            onTagsChange={newTags => {
              setFormData(prev => ({
                ...prev,
                config: {
                  ...prev.config,
                  app_metadata: {
                    ...prev.config.app_metadata,
                    tags: newTags,
                  },
                },
              }));
            }}
          />

          <FormActions isProcessing={isProcessing} onCancel={onCancel} />
        </form>
      </div>

      {/* Dify参数配置面板 */}
      <DifyParametersPanel
        isOpen={showDifyPanel}
        onClose={() => setShowDifyPanel(false)}
        config={formData.config.dify_parameters || {}}
        onSave={handleDifyParametersSave}
        instanceName={formData.display_name || '应用实例'}
      />
    </>
  );
};

export default function ApiConfigPage() {
  const { isDark } = useTheme();

  const {
    serviceInstances: instances,
    providers,
    createAppInstance: addInstance,
    updateAppInstance: updateInstance,
  } = useApiConfigStore();

  const [selectedInstance, setSelectedInstance] =
    useState<ServiceInstance | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [currentFilterProviderId, setCurrentFilterProviderId] = useState<
    string | null
  >(null);

  // --- 使用自定义 Hook 管理事件监听器 ---
  useApiConfigEvents({
    showAddForm,
    selectedInstance,
    setSelectedInstance,
    setShowAddForm,
    setCurrentFilterProviderId,
  });

  const handleClearSelection = () => {
    setSelectedInstance(null);
    setShowAddForm(false);
    window.dispatchEvent(
      new CustomEvent('addFormToggled', {
        detail: {
          showAddForm: false,
          selectedInstance: null,
        },
      })
    );
  };

  // Provider管理相关处理函数
  const handleProviderChange = () => {
    // 重新加载providers数据
    window.dispatchEvent(new CustomEvent('reloadProviders'));
    toast.success('提供商配置已更新');
  };

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('addFormToggled', {
        detail: {
          showAddForm,
          selectedInstance,
        },
      })
    );
  }, [showAddForm, selectedInstance]);

  return (
    <div className="flex h-full flex-col">
      {/* --- 管理提供商按钮 --- */}
      <ProviderManagementButton onClick={() => setShowProviderModal(true)} />

      {showAddForm ? (
        <InstanceFormContainer>
          <InstanceForm
            instance={null}
            isEditing={false}
            defaultProviderId={currentFilterProviderId}
            onSave={data =>
              handleCreateInstance(
                data,
                providers,
                addInstance,
                setIsProcessing,
                handleClearSelection
              )
            }
            onCancel={handleClearSelection}
            isProcessing={isProcessing}
          />
        </InstanceFormContainer>
      ) : selectedInstance ? (
        <InstanceFormContainer>
          <InstanceDetailHeader
            instance={selectedInstance}
            onClose={handleClearSelection}
          />

          <InstanceForm
            instance={selectedInstance}
            isEditing={true}
            onSave={data =>
              handleUpdateInstance(
                selectedInstance,
                data,
                updateInstance,
                setIsProcessing,
                handleClearSelection
              )
            }
            onCancel={handleClearSelection}
            isProcessing={isProcessing}
          />
        </InstanceFormContainer>
      ) : (
        <EmptyState />
      )}

      {/* --- Provider管理模态框 --- */}
      <ProviderManagementModal
        open={showProviderModal}
        onOpenChange={setShowProviderModal}
        onProviderChange={handleProviderChange}
      />
    </div>
  );
}
