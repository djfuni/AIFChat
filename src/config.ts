const envApiBaseUrl =
  typeof globalThis !== 'undefined'
    ? ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.EXPO_PUBLIC_API_BASE_URL)
    : undefined;

export const API_BASE_URL = (envApiBaseUrl && envApiBaseUrl.trim())
  ? envApiBaseUrl.trim().replace(/\/$/, '')
  : 'https://api.aifmusic.top';

export const APP_COPY = {
  name: 'AIF Chat',
  tagline: '快速、轻量的移动对话助手',
  noTokenHint: 'App 内对话不扣除站内 Token',
};
