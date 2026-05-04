/**
 * OpenAI 兼容 API 流式调用
 * 支持 OpenAI、DeepSeek、硅基流动、Azure OpenAI 等兼容接口
 */
import type { ChatMessage } from './types';
import type { CustomApiConfig } from './customApi';

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

function buildMessages(messages: ChatMessage[]): ApiMessage[] {
  return messages.map((item) => {
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
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: Error) => void,
): { abort: () => void } {
  const controller = new AbortController();

  const run = async () => {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    const url = baseUrl.includes('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    try {
      const payloadMessages = buildMessages(messages);

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
