const envApiBaseUrl =
  typeof globalThis !== 'undefined'
    ? ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.EXPO_PUBLIC_API_BASE_URL)
    : undefined;

export const API_BASE_URL = (envApiBaseUrl && envApiBaseUrl.trim())
  ? envApiBaseUrl.trim().replace(/\/$/, '')
  : 'https://api.aifmusic.top';

export const WEBSITE_URL = 'https://api.aifmusic.top';

export const QQ_GROUP_URL = 'https://qm.qq.com/q/86IlgPwgBq';

export const APP_COPY = {
  name: 'AIF Chat',
  tagline: '快速、轻量的移动对话助手',
  noTokenHint: 'App 内对话不扣除站内 Token',
  announcement: '想要使用 API 服务和更多模型？请访问网站',
  websiteLabel: '前往 AIF Music 网站',
  joinQQGroup: '加入官方 QQ 群',
  community: '提示词广场',
  allowedModelPrefixes: ['lite', 'pro', 'github'],
  version: '1.5.0',
};
