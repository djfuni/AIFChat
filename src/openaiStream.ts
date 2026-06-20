/**
 * OpenAI 兼容 API 流式调用
 * 支持 OpenAI、DeepSeek、硅基流动、Azure OpenAI 等兼容接口
 */
import type { ChatMessage } from './types';
import type { CustomApiConfig } from './customApi';

export type TranscribeResult = { text: string };

const DEFAULT_TIMEOUT_MS = 120_000;

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

type ApiMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

function buildMessages(messages: ChatMessage[], systemPrompt?: string): ApiMessage[] {
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
  if (systemPrompt?.trim()) {
    msgs.unshift({ role: 'system', content: systemPrompt.trim() });
  }
  return msgs;
}

/**
 * OpenAI 兼容流式聊天
 *
 * @param messages 消息列表
 * @param config 自定义 API 配置
 * @param onChunk 每段文本回调
 * @param onDone  完成回调
 * @param onError 错误回调
 * @returns abort 函数
 */
export function openaiChatStream(
  messages: ChatMessage[],
  config: CustomApiConfig,
  systemPrompt: string | undefined,
  deepThinking: boolean,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: Error) => void,
): { abort: () => void } {
  const controller = new AbortController();

  const run = async () => {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    const url = baseUrl.includes('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    try {
      const payloadMessages = buildMessages(messages, systemPrompt);

      // 先尝试流式请求
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: payloadMessages,
            stream: true,
            max_tokens: config.maxTokens,
            ...(deepThinking ? { deep_thinking: true } : {}),
          }),
        },
        DEFAULT_TIMEOUT_MS,
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`API 错误 (${response.status}): ${errorText || response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        // SSE 流式解析
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
          const lines = chunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const content = json.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullText += content;
                  onChunk(content);
                }
              } catch {
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

      // 非流式回退
      const json = await response.json();
      const text = json.choices?.[0]?.message?.content || json.message || json.text || '';
      if (text) {
        onChunk(text);
      }
      onDone(text);
    } catch (error) {
      if (controller.signal.aborted) return;
      onError(
        error instanceof Error ? error : new Error('自定义 API 请求失败'),
      );
    }
  };

  run();

  return {
    abort: () => controller.abort(),
  };
}

/**
 * 获取 OpenAI 兼容接口的模型列表
 */
export async function fetchOpenAIModels(config: CustomApiConfig): Promise<{ id: string }[]> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/models`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    },
    15_000,
  );

  if (!response.ok) {
    throw new Error(`获取模型列表失败 (${response.status})`);
  }

  const json = await response.json();
  const data = json.data || [];
  return data.filter((m: { id?: string }) => typeof m.id === 'string');
}

/**
 * 直接调用 OpenAI 兼容接口的 Whisper 语音识别
 */
export async function transcribeWithCustomApi(
  uri: string,
  mimeType: string,
  config: CustomApiConfig,
): Promise<TranscribeResult> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/audio/transcriptions`;

  const form = new FormData();
  form.append('file', { uri, type: mimeType, name: `audio.${mimeType.split('/').pop() || 'm4a'}` } as unknown as Blob);
  form.append('model', 'whisper-1');

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        // Fetch 在 React Native 中发送 FormData 时会自动设置 Content-Type 并附带 boundary，
        // 手动设置反而可能导致 boundary 错误，因此这里不设置 Content-Type。
      },
      body: form,
    },
    DEFAULT_TIMEOUT_MS,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`语音识别失败 (${response.status}): ${errorText || response.statusText}`);
  }

  const json = await response.json();
  return { text: json.text || '' };
}

/**
 * 快速测试 API 连接
 */
export async function testApiConnection(config: CustomApiConfig): Promise<{ ok: boolean; message: string }> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const url = baseUrl.includes('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
          stream: false,
        }),
      },
      15_000,
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return { ok: false, message: `连接失败 (${response.status}): ${errorText.slice(0, 100)}` };
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || '';
    return {
      ok: true,
      message: content ? `连接成功！模型回应: "${content.slice(0, 30)}..."` : '连接成功！',
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '未知错误',
    };
  }
}
