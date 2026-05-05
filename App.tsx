import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  ToastAndroid,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Markdown from 'react-native-markdown-display';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  List,
  MD3LightTheme,
  Menu,
  PaperProvider,
  ProgressBar,
  Snackbar,
  Surface,
  Switch,
  Text,
  TextInput,
  configureFonts,
} from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { APP_COPY, QQ_GROUP_URL, WEBSITE_URL } from './src/config';
import {
  ApiError,
  chatStream,
  getAccessToken,
  getCaptcha,
  login,
  logout,
  me,
  models,
  register,
  sendEmailCode,
} from './src/api';
import type { ChatMessage, ModelItem, User } from './src/types';
import {
  createConversation,
  getCurrentConvoId,
  getConvoList,
  getMessages,
  saveMessages,
  deleteConversation,
  setCurrentConvoId,
  saveRoleplayConfig,
  loadRoleplayConfig,
  type ConversationMeta,
} from './src/storage';
import {
  BUILTIN_PRESETS,
  getPresetById,
  type RoleplayConfig,
  type RoleplayPreset,
} from './src/roleplay';
import {
  saveCustomApiConfig,
  loadCustomApiConfig,
  DEFAULT_CUSTOM_API_CONFIG,
  type CustomApiConfig,
} from './src/customApi';
import { openaiChatStream, testApiConnection } from './src/openaiStream';

// ==================== 字体主题 ====================

const theme = {
  ...MD3LightTheme,
  roundness: 28,
  fonts: configureFonts({
    config: {
      displayLarge: { fontFamily: 'MPLUSRounded1c_800ExtraBold', fontWeight: '800', fontSize: 57, lineHeight: 64, letterSpacing: -0.25 },
      displayMedium: { fontFamily: 'MPLUSRounded1c_700Bold', fontWeight: '700', fontSize: 45, lineHeight: 52, letterSpacing: 0 },
      displaySmall: { fontFamily: 'MPLUSRounded1c_700Bold', fontWeight: '700', fontSize: 36, lineHeight: 44, letterSpacing: 0 },
      headlineLarge: { fontFamily: 'MPLUSRounded1c_700Bold', fontWeight: '700', fontSize: 32, lineHeight: 40, letterSpacing: 0 },
      headlineMedium: { fontFamily: 'MPLUSRounded1c_700Bold', fontWeight: '700', fontSize: 28, lineHeight: 36, letterSpacing: 0 },
      headlineSmall: { fontFamily: 'MPLUSRounded1c_700Bold', fontWeight: '700', fontSize: 24, lineHeight: 32, letterSpacing: 0 },
      titleLarge: { fontFamily: 'MPLUSRounded1c_700Bold', fontWeight: '700', fontSize: 22, lineHeight: 28, letterSpacing: 0 },
      titleMedium: { fontFamily: 'MPLUSRounded1c_700Bold', fontWeight: '700', fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
      titleSmall: { fontFamily: 'MPLUSRounded1c_700Bold', fontWeight: '700', fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
      bodyLarge: { fontFamily: 'MPLUSRounded1c_400Regular', fontWeight: '400', fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
      bodyMedium: { fontFamily: 'MPLUSRounded1c_400Regular', fontWeight: '400', fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
      bodySmall: { fontFamily: 'MPLUSRounded1c_400Regular', fontWeight: '400', fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
      labelLarge: { fontFamily: 'MPLUSRounded1c_700Bold', fontWeight: '700', fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
      labelMedium: { fontFamily: 'MPLUSRounded1c_700Bold', fontWeight: '700', fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
      labelSmall: { fontFamily: 'MPLUSRounded1c_400Regular', fontWeight: '400', fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
    },
  }),
  colors: {
    ...MD3LightTheme.colors,
    // 清新天蓝二次元主题
    primary: '#4A9BD9',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D6E8F7',
    onPrimaryContainer: '#041E33',
    secondary: '#5B8DB5',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#D1E4F0',
    onSecondaryContainer: '#071D2B',
    tertiary: '#B06D8E',
    tertiaryContainer: '#FFD9E8',
    onTertiaryContainer: '#3A0025',
    surface: '#F8FCFF',
    surfaceVariant: '#E0EAF1',
    onSurface: '#1A1C1E',
    onSurfaceVariant: '#44474F',
    outline: '#74777F',
    background: '#F8FCFF',
    error: '#BA1A1A',
    elevation: {
      level0: 'transparent',
      level1: '#F0F6FD',
      level2: '#EBF1FA',
      level3: '#E5ECF6',
      level4: '#E3EAF5',
      level5: '#E0E7F2',
    },
  },
};

// ==================== Markdown 样式 ====================

const markdownStyles = StyleSheet.create({
  body: { color: theme.colors.onSurface, fontSize: 15, lineHeight: 22 },
  heading1: { fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: 4, color: theme.colors.onSurface },
  heading2: { fontSize: 20, fontWeight: '700', marginTop: 6, marginBottom: 4, color: theme.colors.onSurface },
  heading3: { fontSize: 18, fontWeight: '700', marginTop: 4, marginBottom: 2, color: theme.colors.onSurface },
  heading4: { fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 2, color: theme.colors.onSurface },
  code_inline: { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.error, fontFamily: 'monospace', fontSize: 13, paddingHorizontal: 4, borderRadius: 4 },
  code_block: { backgroundColor: '#1E1E2E', color: '#CDD6F4', fontFamily: 'monospace', fontSize: 13, padding: 12, borderRadius: 12, marginVertical: 6 },
  fence: { backgroundColor: '#1E1E2E', padding: 12, borderRadius: 12, marginVertical: 6 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: theme.colors.primary, paddingLeft: 12, marginVertical: 6, opacity: 0.85 },
  link: { color: theme.colors.primary, textDecorationLine: 'underline' },
  list_item: { marginVertical: 2 },
  bullet_list: { paddingLeft: 8 },
  ordered_list: { paddingLeft: 8 },
  hr: { marginVertical: 8, backgroundColor: theme.colors.outline, height: StyleSheet.hairlineWidth },
  paragraph: { marginVertical: 4 },
});

const markdownStylesUser = {
  ...markdownStyles,
  body: { color: theme.colors.onPrimary, fontSize: 15, lineHeight: 22 },
  link: { color: theme.colors.onPrimary, textDecorationLine: 'underline' },
  code_inline: { backgroundColor: 'rgba(255,255,255,0.2)', color: theme.colors.onPrimary, fontFamily: 'monospace', fontSize: 13, paddingHorizontal: 4, borderRadius: 4 },
  code_block: { backgroundColor: '#1E1E2E', color: '#CDD6F4', fontFamily: 'monospace', fontSize: 13, padding: 12, borderRadius: 12, marginVertical: 6 },
  fence: { backgroundColor: '#1E1E2E', padding: 12, borderRadius: 12, marginVertical: 6 },
};

// ==================== 短提示 ====================

function showToast(msg: string) {
  if (Platform.OS === 'android' && ToastAndroid) {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  }
}

function isModelAllowed(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return APP_COPY.allowedModelPrefixes.some((prefix) => id.startsWith(prefix));
}

type Screen = 'boot' | 'boot_error' | 'login' | 'register' | 'chat';
type Notice = { text: string; tone?: 'normal' | 'error' | 'warning' };

function nowId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function asErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return '操作失败，请稍后再试';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const dateStr = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  const timeStr = formatTime(ts);
  if (d.toDateString() === now.toDateString()) return timeStr;
  return `${dateStr} ${timeStr}`;
}

function welcomeMessage(user: User): ChatMessage {
  return {
    id: nowId('assistant'),
    role: 'assistant',
    content:
      `你好，${user.nickname || user.username}！这里是小蓝助手~ ✨\n\n` +
      `你可以直接开始跟我聊天哦！试试点击右上角菜单，开启「角色扮演」模式，让我变成你想要的样子吧~ 🎭`,
    createdAt: Date.now(),
  };
}

// ==================== 打字脉冲动画组件 ====================

function TypingDots({ deepThinking }: { deepThinking: boolean }) {
  const [dot1] = useState(() => new Animated.Value(0));
  const [dot2] = useState(() => new Animated.Value(0));
  const [dot3] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(800),
        ]),
      );

    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 200);
    const a3 = anim(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (dot: Animated.Value) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        scale: dot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }),
      },
    ],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
        {deepThinking ? '正在深度思考中' : '正在输入中'}
      </Text>
    </View>
  );
}

// ==================== HeroHeader ====================

function HeroHeader() {
  return (
    <View style={styles.hero}>
      <Surface mode="flat" style={styles.logoBadge}>
        <Text variant="headlineSmall" style={styles.logoText}>A</Text>
      </Surface>
      <Text variant="headlineMedium" style={styles.heroTitle}>{APP_COPY.name}</Text>
      <Text variant="bodyMedium" style={styles.heroSubtitle}>{APP_COPY.tagline}</Text>
      <Chip compact icon="shield-check" style={styles.heroChip}>{APP_COPY.noTokenHint}</Chip>
    </View>
  );
}

// ==================== LoginScreen ====================

function LoginScreen({ onLoggedIn, onRegister, notice }: {
  onLoggedIn: (user: User) => void;
  onRegister: () => void;
  notice: (notice: Notice) => void;
}) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!account.trim() || !password) {
      notice({ text: '请填写账号和密码', tone: 'error' });
      return;
    }
    setLoading(true);
    try {
      const payload = await login(account.trim(), password);
      onLoggedIn(payload.user);
    } catch (error) {
      notice({ text: asErrorMessage(error), tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
        <HeroHeader />
        <Card mode="elevated" style={styles.authCard}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleLarge" style={styles.sectionTitle}>登录账号</Text>
            <Text variant="bodyMedium" style={styles.muted}>使用你网站已有账号即可登录 ~</Text>
            <TextInput
              mode="outlined"
              label="用户名或邮箱"
              value={account}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setAccount}
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />
            <TextInput
              mode="outlined"
              label="密码"
              value={password}
              secureTextEntry={secure}
              onChangeText={setPassword}
              left={<TextInput.Icon icon="lock" />}
              right={<TextInput.Icon icon={secure ? 'eye' : 'eye-off'} onPress={() => setSecure((value) => !value)} />}
              style={styles.input}
              onSubmitEditing={submit}
            />
            <Button mode="contained" loading={loading} disabled={loading} onPress={submit} style={styles.primaryButton} contentStyle={styles.primaryButtonContent} labelStyle={styles.primaryButtonLabel}>
              登录并开始使用
            </Button>
            <TouchableOpacity onPress={onRegister} disabled={loading} style={styles.registerLink}>
              <Text style={styles.registerLinkText}>还没有账号？<Text style={styles.registerLinkHighlight}>立即注册</Text></Text>
            </TouchableOpacity>
            <Divider style={{ marginVertical: 8 }} />
            <Text variant="labelMedium" style={[styles.muted, { textAlign: 'center', marginBottom: 8 }]}>第三方登录（即将开放）</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
              <IconButton icon="qqchat" mode="contained-tonal" size={32} containerColor={theme.colors.surfaceVariant} iconColor={theme.colors.onSurfaceVariant} disabled />
              <IconButton icon="wechat" mode="contained-tonal" size={32} containerColor={theme.colors.surfaceVariant} iconColor={theme.colors.onSurfaceVariant} disabled />
              <IconButton icon="github" mode="contained-tonal" size={32} containerColor={theme.colors.surfaceVariant} iconColor={theme.colors.onSurfaceVariant} disabled />
              <IconButton icon="google" mode="contained-tonal" size={32} containerColor={theme.colors.surfaceVariant} iconColor={theme.colors.onSurfaceVariant} disabled />
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==================== RegisterScreen ====================

function RegisterScreen({ onRegistered, onBack, notice }: {
  onRegistered: (user: User) => void;
  onBack: () => void;
  notice: (notice: Notice) => void;
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  const [debugCode, setDebugCode] = useState('');

  const reloadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaError('');
    try {
      const captcha = await getCaptcha();
      setCaptchaId(captcha.captcha_id);
      setCaptchaSvg(captcha.svg);
      setCaptchaCode('');
      setDebugCode('');
    } catch (error) {
      const msg = asErrorMessage(error);
      setCaptchaError(msg);
      notice({ text: '验证码加载失败：' + msg, tone: 'error' });
    } finally {
      setCaptchaLoading(false);
    }
  }, [notice]);

  useEffect(() => {
    reloadCaptcha();
  }, [reloadCaptcha]);

  const sendCode = async () => {
    if (!email.trim() || !captchaCode.trim()) {
      notice({ text: '请先填写邮箱和图片验证码', tone: 'error' });
      return;
    }
    setSendingCode(true);
    setDebugCode('');
    try {
      const result = await sendEmailCode(email.trim(), captchaId, captchaCode.trim());
      if (result.debug_code) {
        setDebugCode(result.debug_code);
        setEmailCode(result.debug_code);
        notice({ text: '⚠️ 调试模式 - 验证码已自动填入', tone: 'warning' });
      } else {
        notice({ text: '邮箱验证码已发送 ~' });
      }
    } catch (error) {
      await reloadCaptcha();
      notice({ text: asErrorMessage(error), tone: 'error' });
    } finally {
      setSendingCode(false);
    }
  };

  const submit = async () => {
    if (!username.trim() || !email.trim() || !password || !emailCode.trim()) {
      notice({ text: '请完整填写注册信息', tone: 'error' });
      return;
    }
    setLoading(true);
    try {
      const payload = await register({
        username: username.trim(),
        email: email.trim(),
        password,
        email_code: emailCode.trim(),
        captcha_id: captchaId,
        captcha_code: captchaCode.trim(),
      });
      onRegistered(payload.user);
    } catch (error) {
      notice({ text: asErrorMessage(error), tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
        <HeroHeader />
        <Card mode="elevated" style={styles.authCard}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.rowBetween}>
              <Text variant="titleLarge" style={styles.sectionTitle}>注册账号</Text>
              <Button mode="text" onPress={onBack} labelStyle={styles.backButtonLabel}>返回登录</Button>
            </View>
            <TextInput mode="outlined" label="用户名" value={username} onChangeText={setUsername} style={styles.input} left={<TextInput.Icon icon="account-outline" />} />
            <TextInput mode="outlined" label="邮箱" value={email} keyboardType="email-address" autoCapitalize="none" onChangeText={setEmail} style={styles.input} left={<TextInput.Icon icon="email-outline" />} />
            <View style={styles.captchaRow}>
              <Surface mode="flat" style={styles.captchaBox}>
                {captchaLoading ? (
                  <ActivityIndicator size="small" />
                ) : captchaError ? (
                  <TouchableOpacity onPress={reloadCaptcha} style={styles.captchaErrorBox}>
                    <Text variant="labelSmall" style={styles.captchaErrorText}>加载失败，点击重试</Text>
                  </TouchableOpacity>
                ) : captchaSvg ? (
                  <SvgXml xml={captchaSvg} width={160} height={56} />
                ) : null}
              </Surface>
              <IconButton icon="refresh" mode="contained" containerColor={theme.colors.primary} iconColor={theme.colors.onPrimary} onPress={reloadCaptcha} size={24} />
            </View>
            <TextInput mode="outlined" label="图片验证码" value={captchaCode} autoCapitalize="characters" onChangeText={setCaptchaCode} style={styles.input} left={<TextInput.Icon icon="image-outline" />} />
            {debugCode ? (
              <Surface mode="flat" style={styles.debugCodeBox}>
                <Text variant="labelMedium" style={styles.debugCodeText}>🔧 调试模式 - 验证码：<Text variant="labelLarge" style={styles.debugCodeValue}>{debugCode}</Text></Text>
              </Surface>
            ) : null}
            <View style={styles.codeRow}>
              <TextInput mode="outlined" label="邮箱验证码" value={emailCode} keyboardType="number-pad" onChangeText={setEmailCode} style={styles.codeInput} left={<TextInput.Icon icon="numeric" />} />
              <Button mode="contained" loading={sendingCode} disabled={sendingCode} onPress={sendCode} style={styles.codeButton} contentStyle={styles.codeButtonContent} labelStyle={styles.codeButtonLabel}>发送</Button>
            </View>
            <TextInput
              mode="outlined"
              label="密码（至少 8 位）"
              value={password}
              secureTextEntry={secure}
              onChangeText={setPassword}
              left={<TextInput.Icon icon="lock" />}
              right={<TextInput.Icon icon={secure ? 'eye' : 'eye-off'} onPress={() => setSecure((value) => !value)} />}
              style={styles.input}
              onSubmitEditing={submit}
            />
            <Button mode="contained" loading={loading} disabled={loading} onPress={submit} style={styles.primaryButton} contentStyle={styles.primaryButtonContent} labelStyle={styles.primaryButtonLabel}>注册并登录</Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==================== 消息气泡 ====================

function MessageBubble({ message, isLastInGroup, onRetry }: {
  message: ChatMessage;
  isLastInGroup: boolean;
  onRetry?: () => void;
}) {
  const mine = message.role === 'user';
  const [menuVisible, setMenuVisible] = useState(false);

  const copyText = () => {
    Clipboard.setString(message.content);
    setMenuVisible(false);
    showToast('已复制');
  };

  const shareText = async () => {
    setMenuVisible(false);
    try {
      await Share.share({ message: message.content });
    } catch { /* 取消分享不做处理 */ }
  };

  const hasImage = message.role === 'user' && message.imageData;

  return (
    <View style={[styles.messageRow, mine ? styles.messageRight : styles.messageLeft]}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableWithoutFeedback onLongPress={() => setMenuVisible(true)} delayLongPress={300}>
            <Surface mode="flat" style={[styles.messageBubble, mine ? styles.userBubble : styles.assistantBubble]}>
              {hasImage ? (
                <View style={{ marginBottom: 6 }}>
                  <Image
                    source={{ uri: `data:${message.imageMimeType || 'image/jpeg'};base64,${message.imageData}` }}
                    style={styles.messageImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
              {mine ? (
                <Text variant="bodyLarge" style={styles.userBubbleText}>{message.content}</Text>
              ) : (
                <Markdown style={markdownStyles}>{message.content}</Markdown>
              )}
            </Surface>
          </TouchableWithoutFeedback>
        }
      >
        <Menu.Item leadingIcon="content-copy" title="复制文字" onPress={copyText} />
        <Menu.Item leadingIcon="share-variant" title="分享" onPress={shareText} />
      </Menu>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {isLastInGroup ? (
          <Text variant="labelSmall" style={[styles.messageTime, mine ? styles.messageTimeRight : styles.messageTimeLeft]}>
            {formatTime(message.createdAt)}
          </Text>
        ) : null}
        {!mine && message.isError && onRetry ? (
          <IconButton
            icon="refresh"
            mode="contained"
            containerColor={theme.colors.errorContainer}
            iconColor={theme.colors.error}
            size={20}
            onPress={onRetry}
            style={{ margin: 0 }}
          />
        ) : null}
        {isLastInGroup && !mine && !message.isError && message.content ? (
          <TouchableOpacity
            onPress={async () => {
              try {
                await Share.share({ message: message.content });
              } catch {}
            }}
            style={{ padding: 2 }}
          >
            <Text style={{ fontSize: 12, color: theme.colors.outline }}>分享</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ==================== 模型选择器 ====================

function ModelPicker({ currentModel, modelList, onChange }: {
  currentModel: string;
  modelList: ModelItem[];
  onChange: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  const allowedModels = useMemo(() => modelList.filter((m) => isModelAllowed(m.id)), [modelList]);
  const lockedModels = useMemo(() => modelList.filter((m) => !isModelAllowed(m.id)), [modelList]);

  const label = useMemo(() => {
    const model = modelList.find((item) => item.id === currentModel);
    return model?.label || currentModel || '默认模型';
  }, [currentModel, modelList]);

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <IconButton
          icon="tune"
          mode="contained-tonal"
          size={22}
          containerColor={theme.colors.secondaryContainer}
          iconColor={theme.colors.onSecondaryContainer}
          onPress={() => setVisible(true)}
        />
      }
    >
      <Menu.Item
        title="当前模型"
        disabled
        titleStyle={{ fontWeight: '700', color: theme.colors.primary, fontSize: 14 }}
      />
      <Divider />
      {allowedModels.slice(0, 16).map((item) => (
        <Menu.Item
          key={item.id}
          title={item.label}
          leadingIcon={item.id === currentModel ? 'check-circle' : item.type === 'reasoning' ? 'brain' : 'message-text'}
          onPress={() => {
            onChange(item.id);
            setVisible(false);
          }}
          titleStyle={item.id === currentModel ? { fontWeight: '700', color: theme.colors.primary } : undefined}
        />
      ))}
      {lockedModels.length > 0 ? [
        <Divider key="lock-divider" />,
        <Menu.Item
          key="lock-header"
          title="更多模型（网站可用）"
          leadingIcon="lock"
          disabled
          titleStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}
        />,
        ...lockedModels.slice(0, 8).map((item) => (
          <Menu.Item
            key={item.id}
            title={`${item.label} 🔒`}
            leadingIcon="lock-outline"
            disabled
            titleStyle={{ color: theme.colors.outline, fontSize: 13 }}
            onPress={() => {
              setVisible(false);
              Linking.openURL(WEBSITE_URL);
            }}
          />
        )),
      ] : null}
    </Menu>
  );
}

// ==================== 角色扮演配置面板 ====================

type ChatSubScreen = 'chat' | 'history' | 'profile' | 'roleplay' | 'settings' | 'prompts';

function RoleplayConfigScreen({
  config,
  onSave,
  onBack,
}: {
  config: RoleplayConfig;
  onSave: (config: RoleplayConfig) => void;
  onBack: () => void;
}) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(config.presetId);
  const [customPrompt, setCustomPrompt] = useState(config.customPrompt);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const currentPreset = selectedPresetId ? getPresetById(selectedPresetId) : null;
  const effectivePrompt = customPrompt.trim()
    ? customPrompt
    : (currentPreset?.systemPrompt || '');

  const animePresets = useMemo(() => BUILTIN_PRESETS.filter((p) => p.category === 'anime'), []);
  const functionalPresets = useMemo(() => BUILTIN_PRESETS.filter((p) => p.category === 'functional'), []);

  const handleSave = () => {
    onSave({
      enabled,
      presetId: customPrompt.trim() ? null : selectedPresetId,
      customPrompt,
    });
    onBack();
  };

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title="角色扮演" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {/* 主开关 */}
        <Surface mode="elevated" style={styles.roleplayToggleCard}>
          <View style={styles.roleplayToggleRow}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                🎭 角色扮演模式
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {enabled
                  ? effectivePrompt
                    ? `当前：${currentPreset ? `${currentPreset.emoji} ${currentPreset.name}` : '自定义预设'}`
                    : '已开启，请选择一个角色或输入自定义预设'
                  : '关闭时 AI 将以默认方式回复'}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              color={theme.colors.tertiary}
            />
          </View>
        </Surface>

        {!enabled ? null : (
          <>
            {/* 动漫角色 */}
            <View>
              <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 8, color: theme.colors.onSurface }}>
                🎀 动漫角色
              </Text>
              <View style={{ gap: 8 }}>
                {animePresets.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    onPress={() => {
                      setSelectedPresetId(preset.id);
                      setCustomPrompt('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Surface
                      mode="elevated"
                      style={[
                        styles.roleplayPresetCard,
                        selectedPresetId === preset.id && !customPrompt.trim()
                          ? styles.roleplayPresetActive
                          : undefined,
                      ]}
                    >
                      <View style={styles.roleplayPresetRow}>
                        <View style={styles.roleplayPresetEmoji}>
                          <Text variant="titleLarge">{preset.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text variant="titleSmall" style={{ fontWeight: '700' }}>{preset.name}</Text>
                            {selectedPresetId === preset.id && !customPrompt.trim() ? (
                              <IconButton icon="check-circle" size={18} iconColor={theme.colors.primary} style={{ margin: 0 }} />
                            ) : null}
                          </View>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                            {preset.description}
                          </Text>
                        </View>
                      </View>
                    </Surface>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 功能角色 */}
            <View>
              <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 8, color: theme.colors.onSurface }}>
                ⚙️ 功能角色
              </Text>
              <View style={{ gap: 8 }}>
                {functionalPresets.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    onPress={() => {
                      setSelectedPresetId(preset.id);
                      setCustomPrompt('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Surface
                      mode="elevated"
                      style={[
                        styles.roleplayPresetCard,
                        selectedPresetId === preset.id && !customPrompt.trim()
                          ? styles.roleplayPresetActive
                          : undefined,
                      ]}
                    >
                      <View style={styles.roleplayPresetRow}>
                        <View style={styles.roleplayPresetEmoji}>
                          <Text variant="titleLarge">{preset.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text variant="titleSmall" style={{ fontWeight: '700' }}>{preset.name}</Text>
                            {selectedPresetId === preset.id && !customPrompt.trim() ? (
                              <IconButton icon="check-circle" size={18} iconColor={theme.colors.primary} style={{ margin: 0 }} />
                            ) : null}
                          </View>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                            {preset.description}
                          </Text>
                        </View>
                      </View>
                    </Surface>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 自定义预设 */}
            <View>
              <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 8, color: theme.colors.onSurface }}>
                ✏️ 自定义预设词
              </Text>
              <TextInput
                mode="outlined"
                multiline
                value={customPrompt}
                onChangeText={(text) => {
                  setCustomPrompt(text);
                  if (text.trim()) setSelectedPresetId(null);
                }}
                placeholder="输入自定义的系统提示词…（填写后自动切换为自定义模式）"
                style={{ minHeight: 100, backgroundColor: theme.colors.surface }}
                maxLength={2000}
              />
              {customPrompt.trim() ? (
                <Text variant="labelSmall" style={{ color: theme.colors.tertiary, marginTop: 4 }}>
                  ✨ 已启用自定义预设，角色选择将被忽略
                </Text>
              ) : null}
            </View>

            {/* 当前系统提示预览 */}
            {effectivePrompt ? (
              <Surface mode="flat" style={styles.roleplayPreview}>
                <TouchableOpacity
                  onPress={() => setShowPromptPreview(!showPromptPreview)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Text variant="labelMedium" style={{ fontWeight: '700', color: theme.colors.primary }}>
                    📋 当前系统提示词
                  </Text>
                  <IconButton
                    icon={showPromptPreview ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    iconColor={theme.colors.primary}
                    style={{ margin: 0 }}
                  />
                </TouchableOpacity>
                {showPromptPreview ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 20 }}>
                    {effectivePrompt}
                  </Text>
                ) : null}
              </Surface>
            ) : null}
          </>
        )}

        {/* 保存按钮 */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={{ borderRadius: 28, marginTop: 8 }}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontSize: 16, fontWeight: '600' }}
        >
          保存设置
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== 自定义 API 设置面板 ====================

function SettingsScreen({
  config,
  onSave,
  onBack,
  notice,
}: {
  config: CustomApiConfig;
  onSave: (config: CustomApiConfig) => void;
  onBack: () => void;
  notice: (notice: Notice) => void;
}) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);
  const [maxTokens, setMaxTokens] = useState(String(config.maxTokens));
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    const newConfig: CustomApiConfig = {
      enabled,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      apiKey,
      model: model.trim(),
      maxTokens: Math.max(128, parseInt(maxTokens, 10) || 2048),
    };
    onSave(newConfig);
    onBack();
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testApiConnection({
        enabled: true,
        baseUrl: baseUrl.replace(/\/+$/, ''),
        apiKey,
        model: model.trim(),
        maxTokens: Math.max(128, parseInt(maxTokens, 10) || 2048),
      });
      if (result.ok) {
        notice({ text: result.message, tone: 'normal' });
      } else {
        notice({ text: result.message, tone: 'error' });
      }
    } catch (error) {
      notice({ text: asErrorMessage(error), tone: 'error' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title="自定义 API" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {/* 启用开关 */}
        <Surface mode="elevated" style={{ borderRadius: 20, backgroundColor: theme.colors.surface, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                🔌 使用自定义 API
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {enabled ? '已启用，将使用自定义接口发送消息' : '关闭后使用内置 AIF API'}
              </Text>
            </View>
            <Switch value={enabled} onValueChange={setEnabled} color={theme.colors.primary} />
          </View>
        </Surface>

        {!enabled ? null : (
          <>
            {/* API 地址 */}
            <View>
              <Text variant="labelMedium" style={{ fontWeight: '600', color: theme.colors.onSurface, marginBottom: 4 }}>
                API 地址
              </Text>
              <TextInput
                mode="outlined"
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="https://api.openai.com/v1"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ backgroundColor: theme.colors.surface }}
                left={<TextInput.Icon icon="api" />}
              />
              <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                支持 OpenAI 兼容接口（OpenAI / DeepSeek / 硅基流动 / Azure 等）
              </Text>
            </View>

            {/* API Key */}
            <View>
              <Text variant="labelMedium" style={{ fontWeight: '600', color: theme.colors.onSurface, marginBottom: 4 }}>
                API Key
              </Text>
              <TextInput
                mode="outlined"
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-..."
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ backgroundColor: theme.colors.surface }}
                left={<TextInput.Icon icon="key-variant" />}
                right={<TextInput.Icon icon={showKey ? 'eye-off' : 'eye'} onPress={() => setShowKey(!showKey)} />}
              />
            </View>

            {/* 模型名 */}
            <View>
              <Text variant="labelMedium" style={{ fontWeight: '600', color: theme.colors.onSurface, marginBottom: 4 }}>
                模型名称
              </Text>
              <TextInput
                mode="outlined"
                value={model}
                onChangeText={setModel}
                placeholder="gpt-4o-mini"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ backgroundColor: theme.colors.surface }}
                left={<TextInput.Icon icon="cube-outline" />}
              />
            </View>

            {/* Max Tokens */}
            <View>
              <Text variant="labelMedium" style={{ fontWeight: '600', color: theme.colors.onSurface, marginBottom: 4 }}>
                最大 Token 数
              </Text>
              <TextInput
                mode="outlined"
                value={maxTokens}
                onChangeText={setMaxTokens}
                placeholder="2048"
                keyboardType="number-pad"
                style={{ backgroundColor: theme.colors.surface }}
                left={<TextInput.Icon icon="counter" />}
              />
            </View>

            {/* 测试连接 */}
            <Button
              mode="outlined"
              icon="connection"
              loading={testing}
              disabled={testing || !apiKey.trim()}
              onPress={handleTest}
              style={{ borderRadius: 28 }}
              contentStyle={{ paddingVertical: 6 }}
              labelStyle={{ fontWeight: '600' }}
            >
              测试连接
            </Button>
          </>
        )}

        {/* 保存按钮 */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={{ borderRadius: 28, marginTop: 8 }}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontSize: 16, fontWeight: '600' }}
        >
          保存设置
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== 提示词广场 ====================

function PromptSquareScreen({ onBack, onApply, notice }: {
  onBack: () => void;
  onApply: (config: RoleplayConfig) => void;
  notice: (notice: Notice) => void;
}) {
  const animePresets = useMemo(() => BUILTIN_PRESETS.filter((p) => p.category === 'anime'), []);
  const functionalPresets = useMemo(() => BUILTIN_PRESETS.filter((p) => p.category === 'functional'), []);
  const [filter, setFilter] = useState<'all' | 'anime' | 'functional'>('all');

  const presets = filter === 'all' ? BUILTIN_PRESETS : filter === 'anime' ? animePresets : functionalPresets;

  const handleUse = (preset: RoleplayPreset) => {
    onApply({ enabled: true, presetId: preset.id, customPrompt: '' });
    Clipboard.setString(preset.systemPrompt);
    showToast(`已启用「${preset.name}」提示词已复制`);
    onBack();
  };

  const handleCopy = (preset: RoleplayPreset) => {
    Clipboard.setString(preset.systemPrompt);
    showToast('提示词已复制');
  };

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title="提示词广场" subtitle="浏览并应用角色提示词" />
      </Appbar.Header>

      {/* 分类筛选 */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
        <Chip compact selected={filter === 'all'} onPress={() => setFilter('all')} showSelectedCheck>全部 ({BUILTIN_PRESETS.length})</Chip>
        <Chip compact selected={filter === 'anime'} onPress={() => setFilter('anime')} showSelectedCheck>动漫 ({animePresets.length})</Chip>
        <Chip compact selected={filter === 'functional'} onPress={() => setFilter('functional')} showSelectedCheck>功能 ({functionalPresets.length})</Chip>
      </View>

      <FlatList
        data={presets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Surface mode="elevated" style={{ borderRadius: 20, backgroundColor: theme.colors.surface, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => handleUse(item)} style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: theme.colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="titleMedium" style={{ fontWeight: '700' }}>{item.name}</Text>
                    <Chip compact style={{ height: 22, backgroundColor: item.category === 'anime' ? theme.colors.tertiaryContainer : theme.colors.secondaryContainer }}>
                      <Text style={{ fontSize: 11 }}>{item.category === 'anime' ? '动漫' : '功能'}</Text>
                    </Chip>
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{item.description}</Text>
                  <Text numberOfLines={3} variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 6, backgroundColor: theme.colors.surfaceVariant, padding: 8, borderRadius: 12, fontSize: 12, lineHeight: 18 }}>
                    {item.systemPrompt}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <Button mode="outlined" compact icon="content-copy" onPress={() => handleCopy(item)} style={{ borderRadius: 20, height: 36 }}>
                  复制
                </Button>
                <Button mode="contained" compact icon="check" onPress={() => handleUse(item)} style={{ borderRadius: 20, height: 36 }}>
                  使用
                </Button>
              </View>
            </TouchableOpacity>
          </Surface>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>暂无预设</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ==================== ProfileScreen ====================

function ProfileScreen({ user, onBack, onSignOut, onRefreshUser }: {
  user: User;
  onBack: () => void;
  onSignOut: () => void;
  onRefreshUser: () => Promise<User | null>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const tokensUsed = currentUser.tokens_used ?? 0;
  const tokensLimit = currentUser.tokens_limit ?? 0;
  const tokensRemaining = currentUser.tokens_remaining ?? (tokensLimit > 0 ? tokensLimit - tokensUsed : 0);
  const usagePercent = tokensLimit > 0 ? Math.min(tokensUsed / tokensLimit, 1) : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const updated = await onRefreshUser();
      if (updated) setCurrentUser(updated);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title="个人主页" />
      </Appbar.Header>
      <ScrollView
        contentContainerStyle={styles.profileContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />
        }
      >
        <View style={styles.profileHeader}>
          <Surface mode="flat" style={styles.profileAvatar}>
            <Text variant="headlineMedium" style={styles.profileAvatarText}>
              {(currentUser.nickname || currentUser.username).charAt(0).toUpperCase()}
            </Text>
          </Surface>
          <Text variant="titleLarge" style={styles.profileName}>{currentUser.nickname || currentUser.username}</Text>
          <Text variant="bodyMedium" style={styles.muted}>@{currentUser.username}</Text>
          {currentUser.role ? <Chip compact icon="account" style={styles.roleChip}>{currentUser.role}</Chip> : null}
        </View>

        <Divider style={styles.profileDivider} />

        <Card mode="elevated" style={styles.profileCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Token 使用情况</Text>
            <View style={styles.tokenStats}>
              <View style={styles.tokenStatItem}>
                <Text variant="headlineSmall" style={styles.tokenStatValue}>{tokensUsed.toLocaleString()}</Text>
                <Text variant="labelSmall" style={styles.muted}>已使用</Text>
              </View>
              <View style={styles.tokenStatDivider} />
              <View style={styles.tokenStatItem}>
                <Text variant="headlineSmall" style={[styles.tokenStatValue, { color: usagePercent > 0.8 ? theme.colors.error : theme.colors.tertiary }]}>{tokensRemaining.toLocaleString()}</Text>
                <Text variant="labelSmall" style={styles.muted}>剩余</Text>
              </View>
              <View style={styles.tokenStatDivider} />
              <View style={styles.tokenStatItem}>
                <Text variant="headlineSmall" style={styles.tokenStatValue}>{tokensLimit > 0 ? tokensLimit.toLocaleString() : '∞'}</Text>
                <Text variant="labelSmall" style={styles.muted}>总额度</Text>
              </View>
            </View>
            {tokensLimit > 0 ? (
              <View style={styles.tokenProgressWrap}>
                <ProgressBar progress={usagePercent} color={usagePercent > 0.8 ? theme.colors.error : theme.colors.primary} style={styles.tokenProgress} />
                <Text variant="labelSmall" style={styles.muted}>{Math.round(usagePercent * 100)}% 已使用</Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        <Card mode="elevated" style={styles.profileCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>账号信息</Text>
            <List.Item
              title="用户名"
              description={currentUser.username}
              left={(props) => <List.Icon {...props} icon="account-outline" />}
            />
            {currentUser.email ? (
              <List.Item
                title="邮箱"
                description={currentUser.email}
                left={(props) => <List.Icon {...props} icon="email-outline" />}
              />
            ) : null}
            {currentUser.points !== undefined ? (
              <List.Item
                title="站内积分"
                description={String(currentUser.points)}
                left={(props) => <List.Icon {...props} icon="star-outline" />}
              />
            ) : null}
            <List.Item
              title="用户角色"
              description={currentUser.role || '普通用户'}
              left={(props) => <List.Icon {...props} icon="shield-account-outline" />}
            />
          </Card.Content>
        </Card>

        <Surface mode="flat" style={styles.announcementCard}>
          <View style={styles.announcementRow}>
            <IconButton icon="bullhorn-outline" size={20} iconColor={theme.colors.primary} />
            <View style={styles.announcementText}>
              <Text variant="labelMedium" style={styles.announcementTitle}>公告</Text>
              <Text variant="bodySmall" style={styles.announcementBody}>{APP_COPY.announcement}</Text>
            </View>
          </View>
          <Button
            mode="contained"
            icon="open-in-new"
            onPress={() => Linking.openURL(WEBSITE_URL)}
            style={styles.announcementButton}
            contentStyle={styles.announcementButtonContent}
            labelStyle={styles.announcementButtonLabel}
          >
            {APP_COPY.websiteLabel}
          </Button>
        </Surface>

        <Surface mode="flat" style={styles.announcementCard}>
          <View style={styles.announcementRow}>
            <IconButton icon="qqchat" size={20} iconColor={theme.colors.primary} />
            <View style={styles.announcementText}>
              <Text variant="labelMedium" style={styles.announcementTitle}>加入官方 QQ 群</Text>
              <Text variant="bodySmall" style={styles.announcementBody}>与其他用户交流提示词、反馈建议</Text>
            </View>
          </View>
          <Button
            mode="contained"
            icon="open-in-new"
            onPress={() => Linking.openURL(QQ_GROUP_URL)}
            style={styles.announcementButton}
            contentStyle={styles.announcementButtonContent}
            labelStyle={styles.announcementButtonLabel}
          >
            {APP_COPY.joinQQGroup}
          </Button>
        </Surface>

        <View style={styles.versionInfo}>
          <Text variant="labelSmall" style={styles.muted}>AIF Chat v{APP_COPY.version}</Text>
        </View>

        <Button
          mode="outlined"
          icon="logout"
          onPress={onSignOut}
          style={styles.signOutButton}
          textColor={theme.colors.error}
        >
          退出登录
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== ChatScreen（主聊天界面） ====================

function ChatScreen({ user, onSignedOut, onUserUpdated, notice }: {
  user: User;
  onSignedOut: () => void;
  onUserUpdated: (user: User) => void;
  notice: (notice: Notice) => void;
}) {
  const [messageText, setMessageText] = useState('');
  const [messagesState, setMessagesState] = useState<ChatMessage[]>([]);
  const [modelList, setModelList] = useState<ModelItem[]>([]);
  const [currentModel, setCurrentModel] = useState('lite');
  const [sending, setSending] = useState(false);
  const [subScreen, setSubScreen] = useState<ChatSubScreen>('chat');
  const [convoList, setConvoList] = useState<ConversationMeta[]>([]);
  const [currentConvoId, setCurrentConvoId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [customApiConfig, setCustomApiConfig] = useState<CustomApiConfig>(DEFAULT_CUSTOM_API_CONFIG);
  const flatListRef = useRef<FlatList>(null);
  const lastUserMessageRef = useRef<string>('');

  // 角色扮演状态
  const [roleplayConfig, setRoleplayConfig] = useState<RoleplayConfig>({
    enabled: false,
    presetId: null,
    customPrompt: '',
  });

  // 计算当前有效的 system prompt
  const effectiveSystemPrompt = useMemo(() => {
    if (!roleplayConfig.enabled) return undefined;
    if (roleplayConfig.customPrompt.trim()) return roleplayConfig.customPrompt.trim();
    if (roleplayConfig.presetId) {
      const preset = getPresetById(roleplayConfig.presetId);
      return preset?.systemPrompt;
    }
    return undefined;
  }, [roleplayConfig]);

  // 获取当前角色名称（用于显示）
  const roleplayLabel = useMemo(() => {
    if (!roleplayConfig.enabled) return null;
    if (roleplayConfig.customPrompt.trim()) return '✏️ 自定义';
    if (roleplayConfig.presetId) {
      const preset = getPresetById(roleplayConfig.presetId);
      return preset ? `${preset.emoji} ${preset.name}` : null;
    }
    return null;
  }, [roleplayConfig]);

  // 启动时加载角色扮演配置
  useEffect(() => {
    loadRoleplayConfig().then(setRoleplayConfig).catch(() => {});
  }, []);

  // 加载自定义 API 配置
  useEffect(() => {
    loadCustomApiConfig().then(setCustomApiConfig).catch(() => {});
  }, []);

  // 加载模型列表
  useEffect(() => {
    let mounted = true;
    models()
      .then((result) => {
        if (!mounted) return;
        const allowed = result.models.filter((m) => isModelAllowed(m.id));
        setModelList(result.models);
        const defaultModel = result.default_model || 'lite';
        setCurrentModel(isModelAllowed(defaultModel) ? defaultModel : (allowed[0]?.id || 'lite'));
      })
      .catch((error) => notice({ text: asErrorMessage(error), tone: 'error' }));
    return () => { mounted = false; };
  }, [notice]);

  // 初始化对话
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const list = await getConvoList();
      if (!mounted) return;
      setConvoList(list);

      const savedId = await getCurrentConvoId();
      if (savedId && list.some((c) => c.id === savedId)) {
        const msgs = await getMessages(savedId);
        if (!mounted) return;
        setCurrentConvoId(savedId);
        setMessagesState(msgs.length > 0 ? msgs : [welcomeMessage(user)]);
      } else {
        setMessagesState([welcomeMessage(user)]);
      }
    };
    init();
    return () => { mounted = false; };
  }, [user]);

  // 自动滚动
  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated }), 80);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messagesState, sending, scrollToBottom]);

  // 持久化消息
  const persistMessages = useCallback(async (convoId: string, msgs: ChatMessage[], model: string) => {
    try {
      await saveMessages(convoId, msgs, model);
      const list = await getConvoList();
      setConvoList(list);
    } catch { /* 静默失败 */ }
  }, []);

  const signOut = async () => {
    try {
      await logout();
      onSignedOut();
    } catch (error) {
      notice({ text: asErrorMessage(error), tone: 'error' });
    }
  };

  const refreshUserProfile = async (): Promise<User | null> => {
    try {
      const result = await me();
      onUserUpdated(result.user);
      return result.user;
    } catch { return null; }
  };

  // 保存角色扮演配置
  const handleSaveRoleplay = useCallback(async (newConfig: RoleplayConfig) => {
    setRoleplayConfig(newConfig);
    await saveRoleplayConfig(newConfig);
    if (newConfig.enabled && newConfig.customPrompt.trim()) {
      notice({ text: '✨ 角色扮演已开启，自定义预设已生效' });
    } else if (newConfig.enabled && newConfig.presetId) {
      const preset = getPresetById(newConfig.presetId);
      notice({ text: `🎭 角色扮演已开启，当前角色：${preset?.emoji} ${preset?.name}` });
    } else if (!newConfig.enabled) {
      notice({ text: '角色扮演已关闭，AI 将以默认方式回复' });
    }
  }, [notice]);

  // 核心发送逻辑
  const doSend = useCallback(async (content: string, image: { base64: string; mimeType: string } | undefined, prevMessages?: ChatMessage[]) => {
    const currentMessages = prevMessages || messagesState;
    if (!content && !image) return;

    const usingCustomApi = customApiConfig.enabled && customApiConfig.apiKey.trim();

    if (!usingCustomApi && !isModelAllowed(currentModel)) {
      notice({ text: '该模型仅限网站使用，请切换到可用模型', tone: 'error' });
      return;
    }

    Keyboard.dismiss();

    const userMessage: ChatMessage = {
      id: nowId('user'),
      role: 'user',
      content: content || '(图片消息)',
      createdAt: Date.now(),
      ...(image ? { imageData: image.base64, imageMimeType: image.mimeType } : {}),
    };
    const nextMessages = [...currentMessages, userMessage].slice(-50);
    setMessagesState(nextMessages);
    setPendingImage(null);
    setSending(true);

    const assistantId = nowId('assistant');
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };
    setMessagesState([...nextMessages, assistantMessage]);

    const onChunk = (chunk: string) => {
      setMessagesState((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: msg.content + chunk }
            : msg
        )
      );
    };

    const onDone = async (fullText: string) => {
      setSending(false);
      const finalMessages = [...nextMessages, { ...assistantMessage, content: fullText || '没有收到有效回复，请稍后再试。' }].slice(-100);
      setMessagesState(finalMessages);

      let convoId = currentConvoId;
      if (!convoId) {
        convoId = await createConversation(currentModel);
        setCurrentConvoId(convoId);
      }
      await persistMessages(convoId, finalMessages, currentModel);
    };

    const onError = async (error: Error) => {
      // 如果自定义 API 失败且没有启用，直接报错
      if (!usingCustomApi) {
        setSending(false);
        notice({ text: error.message || '请求失败', tone: 'error' });
        const errorMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: '这次请求没有成功。你可以点击重试按钮重新发送，或切换模型后再试。',
          createdAt: Date.now(),
          isError: true,
        };
        const finalMessages = [...nextMessages, errorMsg].slice(-100);
        setMessagesState(finalMessages);

        let convoId = currentConvoId;
        if (!convoId) {
          convoId = await createConversation(currentModel);
          setCurrentConvoId(convoId);
        }
        await persistMessages(convoId, finalMessages, currentModel);
        return;
      }

      // 自定义 API 失败，自动回退到内置 API
      setSending(false);
      notice({ text: `自定义 API 请求失败：${error.message}。已自动回退到内置 API`, tone: 'error' });
      // 移除错误占位
      setMessagesState([...nextMessages, { ...assistantMessage, content: '' }]);
      // 用内置 API 重试
      chatStream(
        nextMessages,
        currentModel,
        deepThinking,
        effectiveSystemPrompt,
        onChunk,
        onDone,
        onError,
      );
    };

    if (usingCustomApi) {
      openaiChatStream(nextMessages, customApiConfig, onChunk, onDone, onError);
    } else {
      chatStream(
        nextMessages,
        currentModel,
        deepThinking,
        effectiveSystemPrompt,
        onChunk,
        onDone,
        onError,
      );
    }
  }, [messagesState, currentModel, deepThinking, effectiveSystemPrompt, notice, currentConvoId, persistMessages, customApiConfig]);

  // 发送消息
  const submit = useCallback(async () => {
    const content = messageText.trim();
    if ((!content && !pendingImage) || sending) return;
    lastUserMessageRef.current = content || '(图片消息)';
    setMessageText('');
    doSend(content, pendingImage || undefined, undefined);
  }, [messageText, pendingImage, sending, doSend]);

  const startNewChat = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessagesState([welcomeMessage(user)]);
    setCurrentConvoId(null);
    setPendingImage(null);
    setSubScreen('chat');
  }, [user]);

  const switchToConvo = useCallback(async (convoId: string) => {
    const msgs = await getMessages(convoId);
    setCurrentConvoId(convoId);
    await setCurrentConvoId(convoId);
    setMessagesState(msgs.length > 0 ? msgs : [welcomeMessage(user)]);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubScreen('chat');
  }, [user]);

  const removeConvo = useCallback(async (convoId: string) => {
    await deleteConversation(convoId);
    const list = await getConvoList();
    setConvoList(list);
    if (currentConvoId === convoId) {
      setCurrentConvoId(null);
      setMessagesState([welcomeMessage(user)]);
    }
  }, [currentConvoId, user]);

  // 重试：重新发送上一条用户消息
  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current || sending) return;
    let cleanedMessages: ChatMessage[] = [];
    setMessagesState((prev) => {
      if (prev.length < 2) return prev;
      const last = prev[prev.length - 1];
      if (last.role === 'assistant') {
        cleanedMessages = prev.slice(0, -1);
        return cleanedMessages;
      }
      cleanedMessages = prev;
      return prev;
    });
    const text = lastUserMessageRef.current;
    lastUserMessageRef.current = '';
    // 异步触发：setMessagesState 尚未生效，所以手动传 cleanedMessages
    setTimeout(() => doSend(text, undefined, cleanedMessages), 50);
  }, [sending, doSend]);

  // 选择图片
  const pickImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        notice({ text: '需要相册权限才能选择图片', tone: 'error' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]?.base64) {
        const asset = result.assets[0];
        const mimeType = (asset.mimeType || 'image/jpeg') as string;
        const base64 = asset.base64 as string;
        setPendingImage({ base64, mimeType });
      }
    } catch (error) {
      notice({ text: '选择图片失败', tone: 'error' });
    }
  }, [notice]);

  // 子屏幕渲染
  if (subScreen === 'profile') {
    return (
      <ProfileScreen
        user={user}
        onBack={() => setSubScreen('chat')}
        onSignOut={signOut}
        onRefreshUser={refreshUserProfile}
      />
    );
  }

  if (subScreen === 'roleplay') {
    return (
      <RoleplayConfigScreen
        config={roleplayConfig}
        onSave={handleSaveRoleplay}
        onBack={() => setSubScreen('chat')}
      />
    );
  }

  if (subScreen === 'settings') {
    return (
      <SettingsScreen
        config={customApiConfig}
        onSave={async (newConfig) => {
          setCustomApiConfig(newConfig);
          await saveCustomApiConfig(newConfig);
          notice({ text: newConfig.enabled ? '🔌 自定义 API 已启用' : '已关闭自定义 API' });
        }}
        onBack={() => setSubScreen('chat')}
        notice={notice}
      />
    );
  }

  if (subScreen === 'prompts') {
    return (
      <PromptSquareScreen
        onBack={() => setSubScreen('chat')}
        onApply={(config) => {
          setRoleplayConfig(config);
          saveRoleplayConfig(config);
        }}
        notice={notice}
      />
    );
  }

  if (subScreen === 'history') {
    return (
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <Appbar.Header elevated mode="center-aligned">
          <Appbar.BackAction onPress={() => setSubScreen('chat')} />
          <Appbar.Content title="对话历史" />
          <Appbar.Action icon="plus" onPress={startNewChat} />
        </Appbar.Header>
        <FlatList
          data={convoList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={convoList.length === 0 ? { flexGrow: 1 } : undefined}
          ListEmptyComponent={
            <View style={styles.emptyHistoryInner}>
              <IconButton icon="chat-outline" size={56} iconColor={theme.colors.outline} />
              <Text variant="bodyLarge" style={styles.muted}>还没有聊天记录呢</Text>
              <Text variant="bodySmall" style={[styles.muted, { marginBottom: 8 }]}>开始一段新对话吧 ✨</Text>
              <Button mode="contained" onPress={startNewChat} style={{ borderRadius: 28 }}>开始新对话</Button>
            </View>
          }
          renderItem={({ item }) => (
            <List.Item
              title={item.title}
              description={`${item.model} · ${formatDateTime(item.updatedAt)}`}
              left={(props) => <List.Icon {...props} icon="chat" />}
              right={(props) => (
                <IconButton
                  {...props}
                  icon="delete"
                  mode="contained"
                  containerColor={theme.colors.errorContainer}
                  iconColor={theme.colors.error}
                  size={18}
                  onPress={() => removeConvo(item.id)}
                />
              )}
              onPress={() => switchToConvo(item.id)}
              style={currentConvoId === item.id ? styles.activeConvo : undefined}
            />
          )}
          ItemSeparatorComponent={() => <Divider />}
        />
      </SafeAreaView>
    );
  }

  // 主聊天界面
  const canSend = !sending && (messageText.trim().length > 0 || Boolean(pendingImage));

  const isLastInGroup = (index: number): boolean => {
    if (index === messagesState.length - 1) return true;
    const current = messagesState[index];
    const next = messagesState[index + 1];
    return current.role !== next.role || (next.createdAt - current.createdAt) > 120_000;
  };

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.Action
          icon="menu"
          iconColor={theme.colors.onSurface}
          onPress={() => setSubScreen('history')}
        />
        <Appbar.Content title="AIF Chat" subtitle={roleplayLabel || APP_COPY.noTokenHint} />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              iconColor={theme.colors.onSurface}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item leadingIcon="plus" title="新对话" onPress={() => { setMenuVisible(false); startNewChat(); }} />
          <Menu.Item leadingIcon="history" title="对话历史" onPress={() => { setMenuVisible(false); setSubScreen('history'); }} />
          <Menu.Item
            leadingIcon={roleplayConfig.enabled ? 'theater' : 'theater'}
            title={roleplayConfig.enabled ? '角色扮演设置' : '角色扮演'}
            onPress={() => { setMenuVisible(false); setSubScreen('roleplay'); }}
          />
          <Menu.Item leadingIcon="account-circle" title="个人主页" onPress={() => { setMenuVisible(false); setSubScreen('profile'); }} />
          <Menu.Item leadingIcon="tune" title="自定义 API" onPress={() => { setMenuVisible(false); setSubScreen('settings'); }} />
          <Menu.Item leadingIcon="message-text-outline" title="提示词广场" onPress={() => { setMenuVisible(false); setSubScreen('prompts'); }} />
          <Divider />
          <Menu.Item leadingIcon="qqchat" title="加入官方 QQ 群" onPress={() => { setMenuVisible(false); Linking.openURL(QQ_GROUP_URL); }} />
          <Menu.Item leadingIcon="logout" title="退出登录" onPress={() => { setMenuVisible(false); signOut(); }} />
        </Menu>
      </Appbar.Header>

      {/* 顶部操作栏：模型选择 + 深度思考 + 角色扮演状态 */}
      <View style={styles.chatMetaBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ModelPicker currentModel={currentModel} modelList={modelList} onChange={setCurrentModel} />
          {roleplayLabel ? (
            <Chip compact icon="theater" style={{ backgroundColor: theme.colors.tertiaryContainer, height: 28 }}>
              {roleplayLabel}
            </Chip>
          ) : null}
        </View>
        <View style={styles.deepThinkingRow}>
          <IconButton
            icon="head-lightbulb"
            size={18}
            iconColor={deepThinking ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
            style={deepThinking ? styles.deepThinkingIconActive : undefined}
          />
          <Text variant="labelMedium" style={deepThinking ? styles.deepThinkingLabelActive : styles.deepThinkingLabel}>深度思考</Text>
          <Switch
            value={deepThinking}
            onValueChange={setDeepThinking}
            color={theme.colors.primary}
            style={styles.deepThinkingSwitch}
          />
        </View>
      </View>

      {deepThinking ? (
        <Surface mode="flat" style={styles.deepThinkingBanner}>
          <Text variant="labelMedium" style={styles.deepThinkingBannerText}>深度思考模式已开启，AI 将进行更深入的分析推理</Text>
        </Surface>
      ) : null}

      <Divider />

      <FlatList
        ref={flatListRef}
        data={messagesState}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageListContent}
        ListHeaderComponent={
          showAnnouncement ? (
            <Surface mode="flat" style={styles.chatAnnouncement}>
              <Text variant="bodySmall" style={styles.chatAnnouncementText}>
                💡 {APP_COPY.announcement}
                <Text style={styles.chatAnnouncementLink} onPress={() => Linking.openURL(WEBSITE_URL)}> {APP_COPY.websiteLabel} →</Text>
              </Text>
              <IconButton icon="close" size={14} iconColor={theme.colors.onSurfaceVariant} onPress={() => setShowAnnouncement(false)} style={styles.chatAnnouncementClose} />
            </Surface>
          ) : null
        }
        renderItem={({ item, index }) => (
          <MessageBubble
            message={item}
            isLastInGroup={isLastInGroup(index)}
            onRetry={item.role === 'assistant' && item.isError ? retryLastMessage : undefined}
          />
        )}
        ListFooterComponent={sending ? (
          <View style={[styles.messageRow, styles.messageLeft]}>
            <Surface mode="flat" style={[styles.messageBubble, styles.assistantBubble, { paddingVertical: 12, paddingHorizontal: 16 }]}>
              <TypingDots deepThinking={deepThinking} />
            </Surface>
          </View>
        ) : null}
        onContentSizeChange={() => scrollToBottom(false)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      />

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <Surface mode="elevated" style={styles.composer}>
          {pendingImage ? (
            <View style={styles.imagePreviewRow}>
              <View style={styles.imagePreviewWrap}>
                <Image
                  source={{ uri: `data:${pendingImage.mimeType};base64,${pendingImage.base64}` }}
                  style={styles.imagePreviewThumb}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.imagePreviewRemove}
                  onPress={() => setPendingImage(null)}
                >
                  <Text style={styles.imagePreviewRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          <View style={styles.composerRow}>
            <IconButton
              icon="image-plus"
              mode="contained-tonal"
              containerColor={theme.colors.surfaceVariant}
              iconColor={theme.colors.onSurfaceVariant}
              size={22}
              onPress={pickImage}
              style={{ marginBottom: 4 }}
            />
            <TextInput
              mode="outlined"
              value={messageText}
              onChangeText={setMessageText}
              placeholder={
                pendingImage
                  ? '添加图片描述…'
                  : deepThinking
                  ? '输入消息（深度思考模式）…'
                  : roleplayConfig.enabled
                  ? '快来和你的角色聊天吧~'
                  : '输入消息…'
              }
              multiline
              maxLength={4000}
              style={styles.composerInput}
            />
            <IconButton
              icon="send"
              mode="contained"
              containerColor={canSend ? theme.colors.primary : theme.colors.surfaceVariant}
              iconColor={canSend ? theme.colors.onPrimary : theme.colors.outline}
              size={28}
              onPress={submit}
              disabled={!canSend && !pendingImage}
              style={styles.sendButton}
            />
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==================== Root ====================

function Root() {
  const [screen, setScreen] = useState<Screen>('boot');
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [bootError, setBootError] = useState<string>('');

  const showNotice = useCallback((next: Notice) => setNotice(next), []);

  const boot = useCallback(async () => {
    let mounted = true;
    setScreen('boot');
    setBootError('');
    try {
      const token = await getAccessToken();
      if (!token) {
        if (mounted) setScreen('login');
        return;
      }
      const result = await me();
      if (!mounted) return;
      setUser(result.user);
      setScreen('chat');
    } catch (error) {
      if (!mounted) return;
      setBootError(error instanceof Error ? error.message : '启动失败，请检查网络连接');
      setScreen('boot_error');
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  if (screen === 'boot') {
    return (
      <View style={[styles.flex, styles.boot]}>
        <Surface mode="flat" style={styles.logoBadge}>
          <Text variant="headlineSmall" style={styles.logoText}>A</Text>
        </Surface>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.bootText}>正在准备移动端体验…</Text>
      </View>
    );
  }

  if (screen === 'boot_error') {
    return (
      <View style={[styles.flex, styles.boot]}>
        <Surface mode="flat" style={styles.logoBadge}>
          <Text variant="headlineSmall" style={styles.logoText}>A</Text>
        </Surface>
        <Text variant="titleMedium" style={styles.bootErrorTitle}>启动失败</Text>
        <Text variant="bodyMedium" style={styles.bootErrorText}>{bootError}</Text>
        <Button mode="contained" onPress={boot} style={styles.primaryButton} contentStyle={styles.primaryButtonContent} labelStyle={styles.primaryButtonLabel}>重试</Button>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {screen === 'login' ? (
        <LoginScreen
          notice={showNotice}
          onRegister={() => setScreen('register')}
          onLoggedIn={(nextUser) => {
            setUser(nextUser);
            setScreen('chat');
          }}
        />
      ) : null}
      {screen === 'register' ? (
        <RegisterScreen
          notice={showNotice}
          onBack={() => setScreen('login')}
          onRegistered={(nextUser) => {
            setUser(nextUser);
            setScreen('chat');
          }}
        />
      ) : null}
      {screen === 'chat' && user ? (
        <ChatScreen
          user={user}
          notice={showNotice}
          onSignedOut={() => {
            setUser(null);
            setScreen('login');
          }}
          onUserUpdated={(updatedUser) => setUser(updatedUser)}
        />
      ) : null}
      <Snackbar
        visible={Boolean(notice)}
        onDismiss={() => setNotice(null)}
        duration={3600}
        style={[
          notice?.tone === 'error' ? styles.errorSnack : undefined,
          notice?.tone === 'warning' ? styles.warningSnack : undefined,
          { borderRadius: 28 },
        ]}
      >
        {notice?.text || ''}
      </Snackbar>
    </View>
  );
}

// ==================== App 入口 ====================

export default function App() {
  const [fontsLoaded, fontsError] = useFonts({
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_700Bold,
    MPLUSRounded1c_800ExtraBold,
    // 确保 MaterialCommunityIcons 字体在 App 渲染前就加载完成
    // 这样 React Native Paper 的所有图标按钮才能正常显示
    ...MaterialCommunityIcons.font,
  });

  // 字体加载失败时仍允许进入
  if (!fontsLoaded && !fontsError) {
    return (
      <View style={[styles.flex, styles.boot]}>
        <Surface mode="flat" style={styles.logoBadge}>
          <Text variant="headlineSmall" style={styles.logoText}>A</Text>
        </Surface>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.bootText}>加载字体中…</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Root />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

// ==================== 样式 ====================

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  boot: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  bootText: { color: theme.colors.onSurfaceVariant },
  bootErrorTitle: { color: theme.colors.error, fontWeight: '700' },
  bootErrorText: { color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 },

  // 认证
  authContainer: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 36, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 24, gap: 8 },
  logoBadge: { width: 72, height: 72, borderRadius: 24, backgroundColor: theme.colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: theme.colors.onPrimaryContainer, fontWeight: '800' },
  heroTitle: { color: theme.colors.onSurface, fontWeight: '800' },
  heroSubtitle: { color: theme.colors.onSurfaceVariant },
  heroChip: { marginTop: 4, backgroundColor: theme.colors.secondaryContainer },
  authCard: { borderRadius: 28, backgroundColor: theme.colors.surface },
  cardContent: { gap: 12, paddingVertical: 12 },
  sectionTitle: { fontWeight: '700' },
  muted: { color: theme.colors.onSurfaceVariant, marginBottom: 4 },
  input: { backgroundColor: theme.colors.surface },
  primaryButton: { marginTop: 8, borderRadius: 28 },
  primaryButtonContent: { paddingVertical: 8, paddingHorizontal: 8 },
  primaryButtonLabel: { fontSize: 16, fontWeight: '700' },
  registerLink: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  registerLinkText: { fontSize: 14, color: theme.colors.onSurfaceVariant },
  registerLinkHighlight: { color: theme.colors.primary, fontWeight: '700' },
  backButtonLabel: { color: theme.colors.primary, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  captchaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  captchaBox: { width: 176, minHeight: 72, borderRadius: 22, padding: 8, backgroundColor: theme.colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
  captchaErrorBox: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  captchaErrorText: { color: theme.colors.error, textAlign: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeInput: { flex: 1, backgroundColor: theme.colors.surface },
  codeButton: { borderRadius: 22, alignSelf: 'stretch', justifyContent: 'center' },
  codeButtonContent: { paddingVertical: 4 },
  codeButtonLabel: { fontWeight: '700' },
  debugCodeBox: { borderRadius: 12, padding: 10, marginBottom: 8, backgroundColor: theme.colors.tertiaryContainer },
  debugCodeText: { color: theme.colors.onTertiaryContainer, textAlign: 'center' },
  debugCodeValue: { fontWeight: '700', letterSpacing: 2 },

  // 聊天顶栏
  chatMetaBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.surface },
  modelPickerContent: { paddingHorizontal: 4 },
  modelPickerLabel: { fontWeight: '700' },
  deepThinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  deepThinkingIconActive: { backgroundColor: theme.colors.primaryContainer, borderRadius: 12 },
  deepThinkingLabel: { color: theme.colors.onSurfaceVariant, fontSize: 12 },
  deepThinkingLabelActive: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  deepThinkingSwitch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  deepThinkingBanner: { backgroundColor: theme.colors.primaryContainer, paddingHorizontal: 16, paddingVertical: 6 },
  deepThinkingBannerText: { color: theme.colors.onPrimaryContainer, fontSize: 12 },

  // 消息
  messageListContent: { padding: 16, gap: 8, paddingBottom: 8 },
  messageRow: { width: '100%', flexDirection: 'column' },
  messageLeft: { alignItems: 'flex-start' },
  messageRight: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '86%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 6 },
  assistantBubble: { backgroundColor: theme.colors.surfaceVariant, borderBottomLeftRadius: 6 },
  userBubbleText: { color: theme.colors.onPrimary, lineHeight: 22, fontSize: 15 },
  assistantBubbleText: { color: theme.colors.onSurface, lineHeight: 22, fontSize: 15 },
  messageTime: { marginTop: 2, marginHorizontal: 4, fontSize: 10, color: theme.colors.outline },
  messageTimeLeft: { alignSelf: 'flex-start' },
  messageTimeRight: { alignSelf: 'flex-end' },

  // 输入栏
  composer: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.select({ ios: 8, android: 12 }), borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: theme.colors.surface },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  composerInput: { flex: 1, maxHeight: 140, backgroundColor: theme.colors.surface },
  sendButton: { marginBottom: 4, borderRadius: 24, marginHorizontal: 0 },

  // 图片预览
  imagePreviewRow: { flexDirection: 'row', marginBottom: 8, marginLeft: 44 },
  imagePreviewWrap: { position: 'relative', width: 64, height: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.surfaceVariant },
  imagePreviewThumb: { width: 64, height: 64 },
  imagePreviewRemove: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  imagePreviewRemoveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  messageImage: { width: 200, height: 200, borderRadius: 12 },

  // 通知
  errorSnack: { backgroundColor: theme.colors.error },
  warningSnack: { backgroundColor: theme.colors.tertiary },

  // 历史
  emptyHistoryInner: { alignItems: 'center', justifyContent: 'center', paddingTop: 64, gap: 4 },
  activeConvo: { backgroundColor: theme.colors.primaryContainer },

  // 公告
  chatAnnouncement: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.secondaryContainer, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, paddingRight: 4, marginBottom: 8 },
  chatAnnouncementText: { flex: 1, color: theme.colors.onSecondaryContainer, lineHeight: 18 },
  chatAnnouncementLink: { color: theme.colors.primary, fontWeight: '700' },
  chatAnnouncementClose: { margin: 0 },

  // 个人主页
  profileContent: { padding: 16, gap: 16, paddingBottom: 32 },
  profileHeader: { alignItems: 'center', gap: 4, paddingTop: 16 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  profileAvatarText: { color: theme.colors.onPrimaryContainer, fontWeight: '800' },
  profileName: { fontWeight: '700', color: theme.colors.onSurface },
  roleChip: { marginTop: 4, backgroundColor: theme.colors.tertiaryContainer },
  profileDivider: { marginVertical: 4 },
  profileCard: { borderRadius: 20, backgroundColor: theme.colors.surface },
  tokenStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 12, marginBottom: 8 },
  tokenStatItem: { alignItems: 'center', gap: 2 },
  tokenStatValue: { fontWeight: '700', color: theme.colors.primary },
  tokenStatDivider: { width: 1, height: 32, backgroundColor: theme.colors.outline, opacity: 0.3 },
  tokenProgressWrap: { gap: 4, marginTop: 4 },
  tokenProgress: { height: 8, borderRadius: 4 },
  announcementCard: { borderRadius: 20, backgroundColor: theme.colors.primaryContainer, padding: 16, gap: 8 },
  announcementRow: { flexDirection: 'row', alignItems: 'flex-start' },
  announcementText: { flex: 1, gap: 2 },
  announcementTitle: { fontWeight: '700', color: theme.colors.onPrimaryContainer },
  announcementBody: { color: theme.colors.onPrimaryContainer, lineHeight: 18 },
  announcementButton: { borderRadius: 20 },
  announcementButtonContent: { paddingVertical: 4 },
  announcementButtonLabel: { fontWeight: '700' },
  versionInfo: { alignItems: 'center', paddingVertical: 4 },
  signOutButton: { borderRadius: 20, borderColor: theme.colors.error, marginTop: 8 },

  // 角色扮演
  roleplayToggleCard: { borderRadius: 20, backgroundColor: theme.colors.surface, padding: 16 },
  roleplayToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleplayPresetCard: { borderRadius: 16, backgroundColor: theme.colors.surface, padding: 12 },
  roleplayPresetActive: { backgroundColor: theme.colors.primaryContainer, borderWidth: 2, borderColor: theme.colors.primary },
  roleplayPresetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleplayPresetEmoji: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
  roleplayPreview: { borderRadius: 16, backgroundColor: theme.colors.surfaceVariant, padding: 12 },
});
