import { getSettingsColors } from '@lib/theme/settings-colors';

import { useTheme } from './use-theme';

// 设置页面颜色 Hook
// 提供设置页面所需的所有颜色，根据当前主题自动切换
export function useSettingsColors() {
  const { isDark } = useTheme();
  const colors = getSettingsColors(isDark);

  return {
    colors,
    isDark,
  };
}
