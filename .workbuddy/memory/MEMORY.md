# AIF Chat Mobile App - 项目记忆

## 项目概览
- **类型**: Expo + React Native + React Native Paper 聊天应用
- **框架**: Expo SDK 52, React Native 0.76.9, React Native Paper 5.x
- **视觉风格**: Material Design 3（MD3LightTheme 自定义色板）
- **包名**: `top.aifmusic.chat`
- **后端**: PHP (`app_api.php`)，API 基础 URL: `https://api.aifmusic.top`
- **认证**: JWT（access token + refresh token），Token 存储在 `expo-secure-store`

## 文件结构
- `App.tsx` — 主 UI（登录/注册/聊天，所有组件在单文件中）
- `src/api.ts` — API 请求层（含超时控制、token 刷新、SSE 流式支持）
- `src/config.ts` — API 基础 URL 和文案常量
- `src/types.ts` — TypeScript 类型定义
- `src/storage.ts` — 聊天记录持久化（AsyncStorage）
- `android/` — Android 原生项目（Expo prebuild 生成）

## 已完成的重要修复
1. API 层 `rawRequest` 返回值统一为 `ApiResult<T>`
2. 注册流程补全 `captcha_id` / `captcha_code` 参数
3. 请求超时控制 + 网络错误友好提示
4. Boot 屏幕加载失败重试
5. 聊天记录持久化（AsyncStorage）
6. 多对话管理（新建/切换/删除/历史列表）
7. SSE 流式输出（自动回退）
8. Android Release 签名配置（gradle.properties 参数化）
9. 按钮样式全面优化：主按钮改为实心 contained + 增大内边距 + 粗体标签；注册链接改为 TouchableOpacity + primary 色高亮；发送按钮改为独立圆形 IconButton；删除按钮改为红色；验证码按钮改为实心
10. 深度思考功能：chatMetaBar 添加 Switch 开关，开启后 API 传 `deep_thinking: true`，显示紫色提示条，打字状态文字变化
11. 验证码获取修复：captcha_id/svg 是顶级字段不在 data 里，getCaptcha 兼容两种结构
12. 个人主页：Token 消耗统计（已使用/剩余/总额度 + 进度条）、账号信息、退出登录
13. 模型限制：仅 lite/pro/github 系列对 App 用户开放，锁定模型显示灰色 + 锁图标
14. 公告引导：聊天内可关闭公告条 + 个人主页公告卡片，引导到 https://api.aifmusic.top
15. 图标字体修复（最终方案）：将 `MaterialCommunityIcons.ttf` 手动复制到 `android/app/src/main/assets/fonts/`（含 `material-community.ttf` 别名），ExpoFontLoader 通过 `queryCustomNativeFonts()` 自动发现并注册字体名，使 `Font.isLoaded()` 返回 true，`createIconSet` 正常渲染图标。同时 `useFonts` 中保留 `...MaterialCommunityIcons.font` 作为备用。
16. **v1.4.0 新增**：
    - 消息重试：AI 回复出错时显示红色刷新按钮，自动重发上一条用户消息
    - Markdown 渲染：引入 `react-native-markdown-display`，AI 回复支持代码块/列表/标题等
    - 消息复制/分享：长按菜单 + 快捷分享按钮（`Share.share()` API）
    - 图片发送：`expo-image-picker` 选择相册图片，多模态消息格式发送

## 构建注意事项
- Windows 下路径过长会导致 MAX_PATH 问题，构建时需复制到短路径（如 `C:\m`）
- JDK 17 使用 Microsoft Build，安装到 `.jdk17/` 目录
- Release 签名通过 gradle.properties 配置 `AIF_RELEASE_*` 参数
- 依赖安装后运行 `npx expo install --fix` 修复版本冲突
- **重要**: `npx expo prebuild` 会覆盖 android/ 目录，签名配置和 keystore 需每次重新应用
- **兼容性**: minSdk=24 (Android 7.0), compileSdk=36 (Android 16), targetSdk=35
- **Android 16 适配**: AndroidManifest 添加 enableOnBackInvokedCallback, network_security_config
- **权限**: READ_EXTERNAL_STORAGE 限定 maxSdkVersion=32, WRITE_EXTERNAL_STORAGE 限定 maxSdkVersion=29

## 技术决策
- ...
- UI 消息列表: FlatList 替代 ScrollView 提升长列表性能
- 消息气泡: 长按弹出菜单复制文字（`@react-native-clipboard/clipboard`），显示时间戳（同一组最后一条）
- 打字动画: Animated 脉冲动画（三个跳动圆点）
- LayoutAnimation: 新建/切换对话时启用过渡动画
- 个人主页: RefreshControl 下拉刷新用户 Token 数据
- 版本号: v1.3.0，显示在个人主页底部
- 角色扮演: systemPrompt 参数在 chatStream 头部插入 system 消息，不显示在 UI 中
- 字体: M PLUS Rounded 1c（@expo-google-fonts），通过 configureFonts 全局配置
- 图标字体: `MaterialCommunityIcons.font` 必须在 `useFonts` 中显式加载，否则 bare workflow 下图标不渲染

## 技术决策
- Token 存储: `expo-secure-store`（安全，不走普通 AsyncStorage）
- 聊天持久化: `@react-native-async-storage/async-storage`（对话量大，不适合 SecureStore）
- 流式输出: 自动检测后端 SSE 支持，不支持则回退普通请求
- 深度思考: 前端 Switch 开关控制，传 `deep_thinking: true` 给后端 API
- 按钮风格: Material Design 3 实心 contained 按钮为主，搭配粗体文字和充足内边距
- 模型限制: `isModelAllowed()` + config.ts `allowedModelPrefixes`，只允许 lite/pro/github
- 验证码字段: captcha API 返回的 captcha_id/svg 是顶级字段，不是 data 子对象
- 网站引导: 聊天内公告 + 个人主页公告卡片，指向 https://api.aifmusic.top
- 图标字体加载: Expo bare workflow 下 `@expo/vector-icons` 的懒加载可能失败，必须：
  1. 将 TTF 文件复制到 `android/app/src/main/assets/fonts/`（含 `material-community.ttf` 小写别名）
  2. `useFonts` 中保留 `...MaterialCommunityIcons.font` 作为备用
  3. `npx expo prebuild` 后必须重新执行字体复制
- 重试机制: 使用 `lastUserMessageRef` + `doSend(content, image, prevMessages)` 闭包安全模式，`setMessagesState` 先用函数式更新清理错误消息，再手工传 `cleanedMessages` 给 `doSend` 避免闭包过期
- 图片发送: 消息添加 `imageData`(base64) + `imageMimeType` 字段，API 层 `buildMessagesWithSystem` 构建多模态格式 `content: [{type:'text',...},{type:'image_url',...}]`
- Markdown 渲染: 仅 assistant 消息使用 `<Markdown>`，用户消息保持纯文本；使用 `react-native-markdown-display`，自定义暗色代码块样式
- 提示词广场: FlatList 展示所有角色预设，分类筛选（全部/动漫/功能），复制/使用按钮
- QQ 群链接: 使用 `Linking.openURL()` 打开 `https://qm.qq.com/q/86IlgPwgBq`
- 服务端: PHP 8.1+ 后端，`app_api.php?action=xxx` 路由，MySQL 数据库，JWT 认证（firebase/php-jwt），OpenAI 兼容 AI 代理，数学验证码 SVG 生成，PHPMailer SMTP 发信
