/**
 * 自定义 API 配置存储
 * 用户可配置自己的 OpenAI 兼容 API 端点
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'aif_custom_api_config';

export type CustomApiConfig = {
  enabled: boolean;
  baseUrl: string;    // e.g. https://api.openai.com/v1
  apiKey: string;
  model: string;      // e.g. gpt-4o-mini
  maxTokens: number;
};

export const DEFAULT_CUSTOM_API_CONFIG: CustomApiConfig = {
  enabled: false,
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  maxTokens: 2048,
};

/**
 * 保存自定义 API 配置
 */
export async function saveCustomApiConfig(config: CustomApiConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * 读取自定义 API 配置，若不存在则返回默认值
 */
export async function loadCustomApiConfig(): Promise<CustomApiConfig> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_CUSTOM_API_CONFIG;
  try {
    return JSON.parse(raw) as CustomApiConfig;
  } catch {
    return DEFAULT_CUSTOM_API_CONFIG;
  }
}

/**
 * 清除自定义 API 配置
 */
export async function clearCustomApiConfig(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
