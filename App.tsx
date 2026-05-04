import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  MD3LightTheme,
  Menu,
  PaperProvider,
  Snackbar,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

import { APP_COPY } from './src/config';
import {
  ApiError,
  chat,
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

const theme = {
  ...MD3LightTheme,
  roundness: 24,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6750A4',
    onPrimary: '#FFFFFF',
    primaryContainer: '#EADDFF',
    onPrimaryContainer: '#21005D',
    secondary: '#625B71',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E8DEF8',
    onSecondaryContainer: '#1D192B',
    tertiary: '#7D5260',
    tertiaryContainer: '#FFD8E4',
    surface: '#FFFBFE',
    surfaceVariant: '#E7E0EC',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#49454F',
    outline: '#79747E',
    background: '#FFFBFE',
    error: '#B3261E',
  },
};

type Screen = 'boot' | 'login' | 'register' | 'chat';

type Notice = { text: string; tone?: 'normal' | 'error' };

function nowId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function asErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return '操作失败，请稍后再试';
}

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
            <Text variant="bodyMedium" style={styles.muted}>使用你网站已有账号即可登录。</Text>
            <TextInput
              mode="outlined"
              label="用户名或邮箱"
              value={account}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setAccount}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="密码"
              value={password}
              secureTextEntry={secure}
              onChangeText={setPassword}
              right={<TextInput.Icon icon={secure ? 'eye' : 'eye-off'} onPress={() => setSecure((value) => !value)} />}
              style={styles.input}
            />
            <Button mode="contained" loading={loading} disabled={loading} onPress={submit} style={styles.primaryButton}>
              登录并开始使用
            </Button>
            <Button mode="text" onPress={onRegister} disabled={loading}>没有账号？立即注册</Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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

  const reloadCaptcha = useCallback(async () => {
    try {
      const captcha = await getCaptcha();
      setCaptchaId(captcha.captcha_id);
      setCaptchaSvg(captcha.svg);
      setCaptchaCode('');
    } catch (error) {
      notice({ text: asErrorMessage(error), tone: 'error' });
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
    try {
      await sendEmailCode(email.trim(), captchaId, captchaCode.trim());
      notice({ text: '邮箱验证码已发送' });
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
              <Button mode="text" onPress={onBack}>返回登录</Button>
            </View>
            <TextInput mode="outlined" label="用户名" value={username} onChangeText={setUsername} style={styles.input} />
            <TextInput mode="outlined" label="邮箱" value={email} keyboardType="email-address" autoCapitalize="none" onChangeText={setEmail} style={styles.input} />
            <View style={styles.captchaRow}>
              <Surface mode="flat" style={styles.captchaBox}>
                {captchaSvg ? <SvgXml xml={captchaSvg} width={160} height={56} /> : <ActivityIndicator />}
              </Surface>
              <IconButton icon="refresh" mode="contained-tonal" onPress={reloadCaptcha} />
            </View>
            <TextInput mode="outlined" label="图片验证码" value={captchaCode} autoCapitalize="characters" onChangeText={setCaptchaCode} style={styles.input} />
            <View style={styles.codeRow}>
              <TextInput mode="outlined" label="邮箱验证码" value={emailCode} keyboardType="number-pad" onChangeText={setEmailCode} style={styles.codeInput} />
              <Button mode="contained-tonal" loading={sendingCode} disabled={sendingCode} onPress={sendCode} style={styles.codeButton}>发送</Button>
            </View>
            <TextInput
              mode="outlined"
              label="密码（至少 8 位）"
              value={password}
              secureTextEntry={secure}
              onChangeText={setPassword}
              right={<TextInput.Icon icon={secure ? 'eye' : 'eye-off'} onPress={() => setSecure((value) => !value)} />}
              style={styles.input}
            />
            <Button mode="contained" loading={loading} disabled={loading} onPress={submit} style={styles.primaryButton}>注册并登录</Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user';
  return (
    <View style={[styles.messageRow, mine ? styles.messageRight : styles.messageLeft]}>
      <Surface mode="flat" style={[styles.messageBubble, mine ? styles.userBubble : styles.assistantBubble]}>
        <Text variant="bodyLarge" style={mine ? styles.userBubbleText : styles.assistantBubbleText}>{message.content}</Text>
      </Surface>
    </View>
  );
}

function ModelPicker({ currentModel, modelList, onChange }: {
  currentModel: string;
  modelList: ModelItem[];
  onChange: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const label = useMemo(() => {
    const model = modelList.find((item) => item.id === currentModel);
    return model?.label || currentModel || '默认模型';
  }, [currentModel, modelList]);

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={<Button mode="contained-tonal" compact icon="tune" onPress={() => setVisible(true)}>{label}</Button>}
    >
      {modelList.slice(0, 16).map((item) => (
        <Menu.Item
          key={item.id}
          title={item.label}
          leadingIcon={item.id === currentModel ? 'check' : item.type === 'reasoning' ? 'brain' : 'message-text'}
          onPress={() => {
            onChange(item.id);
            setVisible(false);
          }}
        />
      ))}
    </Menu>
  );
}

function ChatScreen({ user, onSignedOut, notice }: {
  user: User;
  onSignedOut: () => void;
  notice: (notice: Notice) => void;
}) {
  const [messageText, setMessageText] = useState('');
  const [messagesState, setMessagesState] = useState<ChatMessage[]>([
    {
      id: nowId('assistant'),
      role: 'assistant',
      content: `你好，${user.nickname || user.username}。你可以直接开始对话，默认使用速度优先模型。`,
      createdAt: Date.now(),
    },
  ]);
  const [modelList, setModelList] = useState<ModelItem[]>([]);
  const [currentModel, setCurrentModel] = useState('lite');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    let mounted = true;
    models()
      .then((result) => {
        if (!mounted) return;
        setModelList(result.models);
        setCurrentModel(result.default_model || result.models[0]?.id || 'lite');
      })
      .catch((error) => notice({ text: asErrorMessage(error), tone: 'error' }));
    return () => { mounted = false; };
  }, [notice]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messagesState, sending]);

  const submit = async () => {
    const content = messageText.trim();
    if (!content || sending) return;
    const userMessage: ChatMessage = { id: nowId('user'), role: 'user', content, createdAt: Date.now() };
    const nextMessages = [...messagesState, userMessage].slice(-20);
    setMessagesState(nextMessages);
    setMessageText('');
    setSending(true);
    try {
      const result = await chat(nextMessages, currentModel);
      const assistantMessage: ChatMessage = {
        id: nowId('assistant'),
        role: 'assistant',
        content: result.text || '没有收到有效回复，请稍后再试。',
        createdAt: Date.now(),
      };
      setMessagesState((items) => [...items, assistantMessage].slice(-40));
    } catch (error) {
      notice({ text: asErrorMessage(error), tone: 'error' });
      setMessagesState((items) => [
        ...items,
        {
          id: nowId('assistant'),
          role: 'assistant',
          content: '这次请求没有成功。你可以稍后重试，或切换模型后再发一次。',
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const signOut = async () => {
    try {
      await logout();
      onSignedOut();
    } catch (error) {
      notice({ text: asErrorMessage(error), tone: 'error' });
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.Content title="AIF Chat" subtitle={APP_COPY.noTokenHint} />
        <Appbar.Action icon="logout" onPress={signOut} />
      </Appbar.Header>
      <View style={styles.chatMetaBar}>
        <ModelPicker currentModel={currentModel} modelList={modelList} onChange={setCurrentModel} />
        <Chip compact icon="flash">速度优先</Chip>
      </View>
      <Divider />
      <ScrollView ref={scrollRef} style={styles.messageList} contentContainerStyle={styles.messageListContent}>
        {messagesState.map((item) => <MessageBubble key={item.id} message={item} />)}
        {sending ? (
          <View style={[styles.messageRow, styles.messageLeft]}>
            <Surface mode="flat" style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" />
              <Text variant="bodyMedium" style={styles.typingText}>正在生成回复…</Text>
            </Surface>
          </View>
        ) : null}
      </ScrollView>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <Surface mode="elevated" style={styles.composer}>
          <TextInput
            mode="outlined"
            value={messageText}
            onChangeText={setMessageText}
            placeholder="输入消息…"
            multiline
            maxLength={4000}
            style={styles.composerInput}
            right={<TextInput.Icon icon="send" disabled={sending || !messageText.trim()} onPress={submit} />}
          />
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Root() {
  const [screen, setScreen] = useState<Screen>('boot');
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const showNotice = useCallback((next: Notice) => setNotice(next), []);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
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
      } catch {
        if (mounted) setScreen('login');
      }
    };
    boot();
    return () => { mounted = false; };
  }, []);

  if (screen === 'boot') {
    return (
      <View style={[styles.flex, styles.boot]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.bootText}>正在准备移动端体验…</Text>
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
        />
      ) : null}
      <Snackbar
        visible={Boolean(notice)}
        onDismiss={() => setNotice(null)}
        duration={3600}
        style={notice?.tone === 'error' ? styles.errorSnack : undefined}
      >
        {notice?.text || ''}
      </Snackbar>
    </View>
  );
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Root />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  boot: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  bootText: { color: theme.colors.onSurfaceVariant },
  authContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 36,
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', marginBottom: 24, gap: 8 },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: theme.colors.onPrimaryContainer, fontWeight: '800' },
  heroTitle: { color: theme.colors.onSurface, fontWeight: '800' },
  heroSubtitle: { color: theme.colors.onSurfaceVariant },
  heroChip: { marginTop: 4, backgroundColor: theme.colors.secondaryContainer },
  authCard: { borderRadius: 28, backgroundColor: theme.colors.surface },
  cardContent: { gap: 12, paddingVertical: 12 },
  sectionTitle: { fontWeight: '800' },
  muted: { color: theme.colors.onSurfaceVariant, marginBottom: 4 },
  input: { backgroundColor: theme.colors.surface },
  primaryButton: { marginTop: 4, borderRadius: 24 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  captchaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  captchaBox: {
    width: 176,
    minHeight: 72,
    borderRadius: 22,
    padding: 8,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeInput: { flex: 1, backgroundColor: theme.colors.surface },
  codeButton: { borderRadius: 22, alignSelf: 'stretch', justifyContent: 'center' },
  chatMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
  },
  messageList: { flex: 1, backgroundColor: theme.colors.background },
  messageListContent: { padding: 16, gap: 12 },
  messageRow: { width: '100%', flexDirection: 'row' },
  messageLeft: { justifyContent: 'flex-start' },
  messageRight: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '86%',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: { backgroundColor: theme.colors.primary },
  assistantBubble: { backgroundColor: theme.colors.surfaceVariant },
  userBubbleText: { color: theme.colors.onPrimary, lineHeight: 24 },
  assistantBubbleText: { color: theme.colors.onSurface, lineHeight: 24 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typingText: { color: theme.colors.onSurfaceVariant },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.select({ ios: 8, android: 12 }),
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.surface,
  },
  composerInput: { maxHeight: 140, backgroundColor: theme.colors.surface },
  errorSnack: { backgroundColor: theme.colors.error },
});
