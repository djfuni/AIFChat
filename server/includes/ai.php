<?php
/**
 * AIF Chat - AI API 代理模块
 * 
 * 将移动端的聊天请求转发到 OpenAI 兼容 API
 * 支持流式（SSE）和非流式响应
 */

declare(strict_types=1);

/**
 * 获取可用模型列表
 *
 * @return array{default_model: string, models: array}
 */
function getModelList(): array
{
    $models = [
        [
            'id' => 'lite',
            'label' => '轻量快速',
            'type' => 'chat',
            'provider' => 'OpenAI',
            'supports_image_input' => true,
            'is_free' => true,
            'price_label' => '免费',
        ],
        [
            'id' => 'pro',
            'label' => '专业均衡',
            'type' => 'chat',
            'provider' => 'OpenAI',
            'supports_image_input' => true,
            'is_free' => false,
            'price_label' => '按量计费',
        ],
        [
            'id' => 'reasoning',
            'label' => '深度推理',
            'type' => 'reasoning',
            'provider' => 'OpenAI',
            'supports_image_input' => false,
            'is_free' => false,
            'price_label' => '按量计费',
        ],
        [
            'id' => 'github',
            'label' => 'GitHub Models',
            'type' => 'chat',
            'provider' => 'GitHub',
            'supports_image_input' => true,
            'is_free' => true,
            'price_label' => '免费',
        ],
    ];

    return [
        'default_model' => 'lite',
        'models' => $models,
    ];
}

/**
 * 构建上游 API 的请求消息体
 */
function buildUpstreamMessages(array $messages): array
{
    $result = [];
    foreach ($messages as $msg) {
        $role = $msg['role'] ?? 'user';
        $content = $msg['content'] ?? '';

        // 如果是数组格式（多模态）
        if (is_array($content)) {
            $result[] = ['role' => $role, 'content' => $content];
        } else {
            $result[] = ['role' => $role, 'content' => $content];
        }
    }
    return $result;
}

/**
 * 映射模型 ID 到上游 API 模型名
 */
function resolveUpstreamModel(string $modelId): string
{
    $map = [
        'lite' => config('AI_DEFAULT_MODEL', 'gpt-4o-mini'),
        'pro' => 'gpt-4o',
        'reasoning' => 'o1-mini',
        'github' => 'gpt-4o-mini',
    ];
    return $map[$modelId] ?? config('AI_DEFAULT_MODEL', 'gpt-4o-mini');
}

/**
 * 处理非流式聊天请求
 *
 * @return array{message: string, model?: string, usage?: array}
 */
function handleChat(array $messages, string $modelId, bool $deepThinking = false, ?string $systemPrompt = null): array
{
    $apiBase = rtrim(config('AI_API_BASE', 'https://api.openai.com/v1'), '/');
    $apiKey = config('AI_API_KEY', '');
    $upstreamModel = resolveUpstreamModel($modelId);

    $upstreamMessages = buildUpstreamMessages($messages);

    // 插入 system prompt
    if ($systemPrompt) {
        array_unshift($upstreamMessages, ['role' => 'system', 'content' => $systemPrompt]);
    }

    $url = $apiBase . '/chat/completions';

    $payload = [
        'model' => $upstreamModel,
        'messages' => $upstreamMessages,
        'stream' => false,
    ];

    // 深度思考模式（仅对支持推理的模型）
    if ($deepThinking && $modelId === 'reasoning') {
        $payload['reasoning_effort'] = 'high';
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new \RuntimeException('AI 服务请求失败: ' . $error);
    }

    if ($httpCode !== 200) {
        $body = json_decode($response, true);
        $errorMsg = $body['error']['message'] ?? 'AI 服务返回错误 (' . $httpCode . ')';
        throw new \RuntimeException($errorMsg);
    }

    $data = json_decode($response, true);

    return [
        'message' => $data['choices'][0]['message']['content'] ?? '',
        'model' => $data['model'] ?? $upstreamModel,
        'usage' => $data['usage'] ?? null,
    ];
}

/**
 * 处理流式聊天请求（SSE）
 * 直接输出 SSE 响应流
 */
function handleChatStream(array $messages, string $modelId, bool $deepThinking = false, ?string $systemPrompt = null): void
{
    $apiBase = rtrim(config('AI_API_BASE', 'https://api.openai.com/v1'), '/');
    $apiKey = config('AI_API_KEY', '');
    $upstreamModel = resolveUpstreamModel($modelId);

    $upstreamMessages = buildUpstreamMessages($messages);

    if ($systemPrompt) {
        array_unshift($upstreamMessages, ['role' => 'system', 'content' => $systemPrompt]);
    }

    $url = $apiBase . '/chat/completions';

    $payload = [
        'model' => $upstreamModel,
        'messages' => $upstreamMessages,
        'stream' => true,
        'stream_options' => ['include_usage' => true],
    ];

    if ($deepThinking && $modelId === 'reasoning') {
        $payload['reasoning_effort'] = 'high';
    }

    // 设置 SSE 响应头
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no');

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_WRITEFUNCTION => function ($ch, $data) {
            // 转发上游 SSE 数据到客户端
            echo $data;
            ob_flush();
            flush();
            return strlen($data);
        },
    ]);

    curl_exec($ch);

    if (curl_error($ch)) {
        // 流式出错时输出错误事件
        echo "data: " . json_encode([
            'error' => true,
            'message' => 'AI 服务流式请求失败: ' . curl_error($ch),
        ]) . "\n\n";
        ob_flush();
        flush();
    }

    // 发送结束标记
    echo "data: [DONE]\n\n";
    ob_flush();
    flush();

    curl_close($ch);
}
