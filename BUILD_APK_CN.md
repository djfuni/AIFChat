# Android APK 打包说明

这个目录已经补齐了 Expo EAS 打包所需的关键配置：

- `eas.json`：包含 `preview` APK 打包配置和 `production` AAB 上架配置
- `.env.example`：API 域名环境变量示例
- `scripts/check-config.mjs`：打包前配置检查
- `assets/adaptive-icon.png` 与 `assets/splash.png`：Android 图标和启动图

## 一、先部署后端接口

把 `../backend_patch/app_api.php` 上传到你现有网站根目录，例如：

```text
https://api.aifmusic.top/app_api.php
```

然后确保：

1. 网站启用 HTTPS。
2. 服务器设置强随机 JWT 密钥，例如 `MUSIC_JWT_SECRET`。
3. `data/` 目录不能被公网直接访问。
4. 手机 App 的 `EXPO_PUBLIC_API_BASE_URL` 指向你的 HTTPS 域名，不要带 `/app_api.php`。

## 二、修改 App 配置

进入 `mobile-app` 目录：

```bash
cd mobile-app
cp .env.example .env
```

编辑 `.env`：

```bash
EXPO_PUBLIC_API_BASE_URL=https://你的域名
```

同时建议修改 `app.json`：

```json
{
  "expo": {
    "name": "你的应用名称",
    "slug": "your-app-slug",
    "android": {
      "package": "com.yourcompany.aifchat"
    }
  }
}
```

`android.package` 一旦正式发布后不建议频繁更换。

## 三、安装依赖

建议使用 Node.js 18 或 20：

```bash
npm install
npm run check:config
npm run typecheck
```

如果 Expo 提示依赖版本需要修复，可以运行：

```bash
npx expo install --fix
```

## 四、云端打包 APK，推荐

先登录 Expo：

```bash
npx eas-cli@latest login
```

首次使用时，把项目关联到 Expo：

```bash
npx eas-cli@latest init
```

然后打包可直接安装的 Android APK：

```bash
npm run build:android:apk
```

或直接执行：

```bash
npx eas-cli@latest build -p android --profile preview
```

命令完成后，终端会给出下载链接。下载到的文件就是可安装的 `.apk`。

## 五、本地打包 APK，可选

本地打包需要你电脑安装：

- JDK
- Android Studio
- Android SDK
- Gradle / Android 构建工具
- 可访问 npm、Maven、Gradle 依赖源的网络

命令：

```bash
npm run build:android:apk:local
```

本地打包对系统环境要求更高；如果只是想尽快得到 APK，建议使用 EAS 云端打包。

## 六、上架 Google Play

上架 Google Play 一般使用 AAB：

```bash
npm run build:android:aab
```

也可以直接执行：

```bash
npx eas-cli@latest build -p android --profile production
```

## 七、安全上线检查

上线前务必确认：

1. App 内没有写死任何上游模型 API Key。
2. App 只访问你的 `app_api.php`。
3. 后端 `MUSIC_JWT_SECRET` 足够随机，且不提交到代码仓库。
4. Refresh Token 已启用轮换和失效机制。
5. 登录、注册、验证码、聊天接口均开启限流。
6. 后台记录 App 用量，避免“不扣站内 Token”导致成本失控。
7. 生产环境关闭 PHP 错误直出。
8. 服务器只允许 HTTPS，建议开启 HSTS。
9. APK 签名密钥妥善保存，不要上传到公开仓库。
10. 修改默认包名、应用名、图标和隐私政策链接后再公开分发。
