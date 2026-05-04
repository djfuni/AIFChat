import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from './types';
import type { RoleplayConfig } from './roleplay';
import { DEFAULT_ROLEPLAY_CONFIG } from './roleplay';

const MESSAGES_KEY_PREFIX = 'aif_chat_messages_';
const CURRENT_CONVO_KEY = 'aif_chat_current_convo';
const CONVO_LIST_KEY = 'aif_chat_convo_list';

export type ConversationMeta = {
  id: string;
  title: string;
  updatedAt: number;
  model: string;
};

/**
 * 生成新对话 ID
 */
export function newConvoId(): string {
  return `convo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * 获取所有对话列表（按更新时间倒序）
 */
export async function getConvoList(): Promise<ConversationMeta[]> {
  const raw = await AsyncStorage.getItem(CONVO_LIST_KEY);
  if (!raw) return [];
  try {
    const list: ConversationMeta[] = JSON.parse(raw);
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

async function saveConvoList(list: ConversationMeta[]): Promise<void> {
  await AsyncStorage.setItem(CONVO_LIST_KEY, JSON.stringify(list));
}

/**
 * 获取当前激活的对话 ID
 */
export async function getCurrentConvoId(): Promise<string | null> {
  return AsyncStorage.getItem(CURRENT_CONVO_KEY);
}

/**
 * 设置当前激活的对话 ID
 */
export async function setCurrentConvoId(id: string): Promise<void> {
  await AsyncStorage.setItem(CURRENT_CONVO_KEY, id);
}

/**
 * 获取指定对话的消息列表
 */
export async function getMessages(convoId: string): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(`${MESSAGES_KEY_PREFIX}${convoId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * 保存指定对话的消息列表，并更新对话元数据
 */
export async function saveMessages(convoId: string, messages: ChatMessage[], model: string): Promise<void> {
  await AsyncStorage.setItem(`${MESSAGES_KEY_PREFIX}${convoId}`, JSON.stringify(messages));

  // 更新对话列表元数据
  const list = await getConvoList();
  const existing = list.find((item) => item.id === convoId);
  const firstUserMsg = messages.find((m) => m.role === 'user');
  const title = existing?.title || firstUserMsg?.content.slice(0, 30) || '新对话';

  const updated = list.filter((item) => item.id !== convoId);
  updated.unshift({
    id: convoId,
    title,
    updatedAt: Date.now(),
    model,
  });
  await saveConvoList(updated);
}

/**
 * 创建新对话
 */
export async function createConversation(model: string): Promise<string> {
  const id = newConvoId();
  const list = await getConvoList();
  list.unshift({ id, title: '新对话', updatedAt: Date.now(), model });
  await saveConvoList(list);
  await setCurrentConvoId(id);
  return id;
}

/**
 * 删除对话
 */
export async function deleteConversation(convoId: string): Promise<void> {
  await AsyncStorage.removeItem(`${MESSAGES_KEY_PREFIX}${convoId}`);
  const list = await getConvoList();
  await saveConvoList(list.filter((item) => item.id !== convoId));

  const currentId = await getCurrentConvoId();
  if (currentId === convoId) {
    await AsyncStorage.removeItem(CURRENT_CONVO_KEY);
  }
}

/**
 * 更新对话标题
 */
export async function updateConvoTitle(convoId: string, title: string): Promise<void> {
  const list = await getConvoList();
  const item = list.find((i) => i.id === convoId);
  if (item) {
    item.title = title;
    await saveConvoList(list);
  }
}

const ROLEPLAY_CONFIG_KEY = 'aif_roleplay_config';

/**
 * 保存角色扮演配置
 */
export async function saveRoleplayConfig(config: RoleplayConfig): Promise<void> {
  await AsyncStorage.setItem(ROLEPLAY_CONFIG_KEY, JSON.stringify(config));
}

/**
 * 读取角色扮演配置
 */
export async function loadRoleplayConfig(): Promise<RoleplayConfig> {
  const raw = await AsyncStorage.getItem(ROLEPLAY_CONFIG_KEY);
  if (!raw) return DEFAULT_ROLEPLAY_CONFIG;
  try {
    return JSON.parse(raw) as RoleplayConfig;
  } catch {
    return DEFAULT_ROLEPLAY_CONFIG;
  }
}
