# AIF Chat Mobile App

这是一个 Expo + React Native + React Native Paper 的移动端源码，视觉风格按 Material Design 3 的颜色角色、圆角、卡片、状态层和层级来组织。

## 对接步骤

1. 先把 `../backend_patch/app_api.php` 上传到网站根目录。
2. 修改 `src/config.ts`：

```ts
export const API_BASE_URL = 'https://你的域名';
```

3. 安装依赖并启动：

```bash
npm install
npm run start
```

4. 构建 Android / iOS 前，请替换 `app.json` 里的 `android.package`、`ios.bundleIdentifier`，并放入正式 App 图标。

## 安全设计

- App 不保存任何上游模型 API Key。
- 登录后只保存短期 access token 与 refresh token。
- Token 使用 `expo-secure-store` 保存，不放入普通本地存储。
- 所有模型调用都走你服务器的 `app_api.php`，服务器端记录用量但不扣站内 Token。
- 注册需要图片验证码 + 邮箱验证码。

## 默认模型

后端默认优先选择 `lite`。你可以在服务器上创建 `data/app_settings.json`：

```json
{
  "default_model": "lite"
}
```

也可以通过环境变量覆盖：

```bash
export AIF_APP_DEFAULT_MODEL="lite"
```
