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

const DEFAULT_TIMEOUT_MS = 15_000;
const CHAT_TIMEOUT_MS = 120_000;

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * 发起 HTTP 请求并返回完整 ApiResult 对象。
 * 如果响应不成功或 payload.ok === false，抛出 ApiError。
 */
async function rawRequest<T = unknown>(action: string, body?: Record<string, unknown>, token?: string | null, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetchWithTimeout(endpoint(action), {
      method: body ? 'POST' : 'GET',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }, timeoutMs);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请检查网络连接后重试', 0);
    }
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      throw new ApiError('网络连接失败，请检查网络设置', 0);
    }
    throw error;
  }
  const payload = await parseJson<ApiResult<T>>(response);
  if (!response.ok || payload.ok === false) {
    throw new ApiError(payload.msg || '请求失败', response.status, payload);
  }
  return payload;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const result = await rawRequest<AuthPayload>('refresh', { refresh_token: refreshToken }, null);
    if (result.data?.access_token) {
      await saveTokens(result.data);
      return result.data.access_token;
    }
  } catch {
    await clearTokens();
  }
  return null;
}

export async function authedRequest<T = unknown>(action: string, body?: Record<string, unknown>, timeoutMs?: number): Promise<ApiResult<T>> {
  let token = await getAccessToken();
  try {
    return await rawRequest<T>(action, body, token, timeoutMs);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      token = await refreshAccessToken();
      if (token) return rawRequest<T>(action, body, token, timeoutMs);
    }
    throw error;
  }
}

export async function getCaptcha(): Promise<{ captcha_id: string; svg: string; expires_in: number }> {
  const result = await rawRequest<never>('captcha');
  // 验证码字段是顶级字段，不在 data 里
  const captchaId = result.captcha_id;
  const svg = result.svg;
  const expiresIn = result.expires_in;
  if (!captchaId || !svg) {
    // 尝试从 data 取（兼容不同后端版本）
    const data = result.data as { captcha_id?: string; svg?: string; expires_in?: number } | undefined;
    if (data?.captcha_id && data?.svg) {
      return { captcha_id: data.captcha_id, svg: data.svg, expires_in: data.expires_in || 300 };
    }
    throw new ApiError('获取验证码失败', 400, result);
  }
  return { captcha_id: captchaId, svg, expires_in: expiresIn || 300 };
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
  captcha_id: string;
  captcha_code: string;
  invite_code?: string;
}): Promise<AuthPayload> {
  const result = await rawRequest<AuthPayload>('register', {
    ...input,
    device_name: 'AIF Chat Mobile',
  });
  if (!result.data) throw new ApiError('注册失败', 400, result);
  await saveTokens(result.data);
  return result.data;
}

export async function login(username: string, password: string): Promise<AuthPayload> {
  const result = await rawRequest<AuthPayload>('login', {
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

type ApiMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

function buildMessagesWithSystem(
  messages: ChatMessage[],
  systemPrompt?: string,
): ApiMessage[] {
  const msgs: ApiMessage[] = messages.map((item) => {
    if (item.role === 'user' && item.imageData) {
      return {
        role: 'user',
        content: [
          { type: 'text', text: item.content },
          {
            type: 'image_url',
            image_url: { url: `data:${item.imageMimeType || 'image/jpeg'};base64,${item.imageData}` },
          },
        ],
      };
    }
    return { role: item.role, content: item.content };
  });
  if (systemPrompt) {
    msgs.unshift({ role: 'system', content: systemPrompt });
  }
  return msgs;
}

export async function chat(messages: ChatMessage[], model?: string, systemPrompt?: string): Promise<{ text: string; model?: string; usage?: Record<string, unknown> }> {
  const result = await authedRequest<never>('chat', {
    model,
    messages: buildMessagesWithSystem(messages, systemPrompt),
  }, CHAT_TIMEOUT_MS);
  return {
    text: result.message || '',
    model: (result as { model?: string }).model,
    usage: result.usage,
  };
}

/**
 * 流式聊天：尝试使用 SSE 逐步接收 AI 回复。
 * 如果后端不支持流式，自动回退到普通 chat()。
 *
 * @param onChunk 每收到一段文本时的回调
 * @param onDone  流式完成时的回调
 * @returns 一个 abort 函数，调用可中断流
 */
export function chatStream(
  messages: ChatMessage[],
  model: string | undefined,
  deepThinking: boolean,
  systemPrompt: string | undefined,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: Error) => void,
): { abort: () => void } {
  const controller = new AbortController();

  const run = async () => {
    const token = await getAccessToken();
    const payloadMessages = buildMessagesWithSystem(messages, systemPrompt);

    // 先尝试流式请求（带 stream: true 参数）
    try {
      const response = await fetchWithTimeout(endpoint('chat'), {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          stream: true,
          ...(deepThinking ? { deep_thinking: true } : {}),
        }),
      }, CHAT_TIMEOUT_MS);

      // 如果后端返回 JSON 而非 SSE，说明不支持流式
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        // 流式解析
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取流式响应');
        }

        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (controller.signal.aborted) {
            reader.cancel();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          // 解析 SSE 格式: "data: ..." 行
          const lines = chunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const content = json.choices?.[0]?.delta?.content || json.text || '';
                if (content) {
                  fullText += content;
                  onChunk(content);
                }
              } catch {
                // 非 JSON 格式的 data 行，当作纯文本
                const text = trimmed.slice(6);
                if (text && text !== '[DONE]') {
                  fullText += text;
                  onChunk(text);
                }
              }
            }
          }
        }

        onDone(fullText);
        return;
      }

      // 后端返回了 JSON，说明不支持流式，走回退
      controller.abort();
    } catch (error) {
      if (controller.signal.aborted) return;
      // 流式失败，回退到普通请求
    }

    // 回退到普通非流式请求
    try {
      const result = await chat(messages, model, systemPrompt);
      onChunk(result.text);
      onDone(result.text);
    } catch (error) {
      onError(error instanceof Error ? error : new Error('请求失败'));
    }
  };

  run();

  return {
    abort: () => controller.abort(),
  };
}
