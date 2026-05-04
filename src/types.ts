export type User = {
  id: number;
  username: string;
  nickname: string;
  email?: string;
  avatar_url?: string;
  role?: string;
  status?: string;
  points?: number;
  tokens_used?: number;
  tokens_limit?: number;
  tokens_remaining?: number;
};

export type AuthPayload = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: User;
};

export type ModelItem = {
  id: string;
  label: string;
  type: 'chat' | 'reasoning' | string;
  provider?: string;
  supports_image_input?: boolean;
  is_free?: boolean;
  price_label?: string;
};

export type ChatMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: number;
  /** base64 encoded image data (user messages only) */
  imageData?: string;
  /** MIME type of the image, e.g. 'image/jpeg' */
  imageMimeType?: string;
  /** Whether this assistant message is an error placeholder */
  isError?: boolean;
};

export type ApiResult<T = unknown> = {
  ok: boolean;
  msg?: string;
  data?: T;
  user?: User;
  default_model?: string;
  models?: ModelItem[];
  message?: string;
  usage?: Record<string, unknown>;
  // 验证码字段（顶级）
  captcha_id?: string;
  svg?: string;
  expires_in?: number;
};
