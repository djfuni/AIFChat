import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';
import type { ApiResult, AuthPayload, ChatMessage, ModelItem, User } from './types';

const ACCESS_TOKEN_KEY = 'aif_access_token';
const REFRESH_TOKEN_KEY = 'aif_refresh_token';

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function endpoint(action: string): string {
  return `${API_BASE_URL.replace(/\/$/, '')}/app_api.php?action=${encodeURIComponent(action)}`;
}

async function saveTokens(payload: AuthPayload): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, payload.access_token);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, payload.refresh_token);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('服务返回格式异常', response.status, text);
  }
}

async function rawRequest<T>(action: string, body?: Record<string, unknown>, token?: string | null): Promise<T> {
  const response = await fetch(endpoint(action), {
    method: body ? 'POST' : 'GET',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await parseJson<ApiResult<T>>(response);
  if (!response.ok || payload.ok === false) {
    throw new ApiError(payload.msg || '请求失败', response.status, payload);
  }
  return payload as T;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const result = await rawRequest<ApiResult<AuthPayload>>('refresh', { refresh_token: refreshToken }, null);
    if (result.data?.access_token) {
      await saveTokens(result.data);
      return result.data.access_token;
    }
  } catch {
    await clearTokens();
  }
  return null;
}

export async function authedRequest<T>(action: string, body?: Record<string, unknown>): Promise<ApiResult<T>> {
  let token = await getAccessToken();
  try {
    return await rawRequest<ApiResult<T>>(action, body, token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      token = await refreshAccessToken();
      if (token) return rawRequest<ApiResult<T>>(action, body, token);
    }
    throw error;
  }
}

export async function getCaptcha(): Promise<{ captcha_id: string; svg: string; expires_in: number }> {
  return rawRequest('captcha');
}

export async function sendEmailCode(email: string, captchaId: string, captchaCode: string): Promise<void> {
  await rawRequest('send_email_code', {
    email,
    captcha_id: captchaId,
    captcha_code: captchaCode,
  });
}

export async function register(input: {
  username: string;
  email: string;
  password: string;
  email_code: string;
  invite_code?: string;
}): Promise<AuthPayload> {
  const result = await rawRequest<ApiResult<AuthPayload>>('register', {
    ...input,
    device_name: 'AIF Chat Mobile',
  });
  if (!result.data) throw new ApiError('注册失败', 400, result);
  await saveTokens(result.data);
  return result.data;
}

export async function login(username: string, password: string): Promise<AuthPayload> {
  const result = await rawRequest<ApiResult<AuthPayload>>('login', {
    username,
    password,
    device_name: 'AIF Chat Mobile',
  });
  if (!result.data) throw new ApiError('登录失败', 400, result);
  await saveTokens(result.data);
  return result.data;
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    await authedRequest('logout', { refresh_token: refreshToken || '' });
  } finally {
    await clearTokens();
  }
}

export async function me(): Promise<{ user: User; default_model?: string }> {
  const result = await authedRequest<never>('me');
  if (!result.user) throw new ApiError('未登录', 401, result);
  return { user: result.user, default_model: result.default_model };
}

export async function models(): Promise<{ default_model: string; models: ModelItem[] }> {
  const result = await authedRequest<never>('models');
  return {
    default_model: result.default_model || 'lite',
    models: result.models || [],
  };
}

export async function chat(messages: ChatMessage[], model?: string): Promise<{ text: string; model?: string; usage?: Record<string, unknown> }> {
  const result = await authedRequest<never>('chat', {
    model,
    messages: messages.map((item) => ({ role: item.role, content: item.content })),
  });
  return {
    text: result.message || '',
    model: (result as { model?: string }).model,
    usage: result.usage,
  };
}
