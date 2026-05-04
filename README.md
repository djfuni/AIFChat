# AIF Chat Mobile 🎨✨

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2052-000?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?logo=react)](https://reactnative.dev)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

一个基于 **Expo SDK 52** + **React Native 0.76** + **React Native Paper 5** 的二次元风格 AI 聊天移动应用，支持自定义 API、角色扮演、流式对话、图片发送等功能。

---

## ✨ 功能特性

### 🤖 AI 聊天
- 多模型支持（轻量快速 / 专业均衡 / 深度推理）
- **SSE 流式输出**，实时显示 AI 回复
- **深度思考模式**（Deep Thinking）
- 支持 **图片发送**（多模态识别）
- **Markdown 渲染**（代码块、标题、列表等）

### 🎭 角色扮演
- **17 个内置角色**（初音未来、派蒙、胡桃、蕾姆、绫波丽…）
- 自定义角色提示词
- **提示词广场** — 浏览并一键应用所有角色预设

### 🔌 自定义 API
- 支持 OpenAI 兼容接口（OpenAI / DeepSeek / 硅基流动 / Azure）
- 配置 API 地址、Key、模型名
- 失败自动回退到内置 API
- 一键测试连接

### 🎨 视觉设计
- 清新天蓝色 Material Design 3 主题
- **M PLUS Rounded 1c** 圆润日系字体
- 丰富的二次元风格 UI 细节
- 连贯的动画和过渡效果

### 🛡️ 安全设计
- Token 使用 `expo-secure-store` 加密存储
- 支持 JWT Access Token + Refresh Token
- 注册需要图形验证码 + 邮箱验证码
- 个人 Token 使用统计与进度条

---

## 📱 截图

| 聊天界面 | 角色扮演 | 自定义 API |
|---------|---------|-----------|
| (演示) | (演示) | (演示) |

---

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio（用于构建 APK）
- JDK 17（Android 构建）

### 安装运行

```bash
# 克隆项目
git clone https://github.com/你的用户名/aifchat-mobile.git
cd aifchat-mobile

# 安装依赖
npm install

# 启动开发服务器
npx expo start
```

### 对接你自己的后端

1. 部署 `server/` 目录下的 PHP 后端到你的服务器（详见 [服务端部署指南](server/README.md)）
2. 配置 API 地址：

```bash
# 方式一：环境变量
export EXPO_PUBLIC_API_BASE_URL=https://你的域名

# 方式二：修改 app.json
# 修改 extra.apiBaseUrl 字段
```

3. 重新构建 APK：

```bash
# Android
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

---

## 🏗️ 项目结构

```
mobile-app/
├── App.tsx                  # 主应用（登录/注册/聊天/设置等所有界面）
├── app.json                 # Expo 配置
├── src/
│   ├── api.ts               # API 请求层（流式 SSE、Token 刷新）
│   ├── config.ts            # 配置和文案常量
│   ├── types.ts             # TypeScript 类型定义
│   ├── storage.ts           # 聊天记录持久化（AsyncStorage）
│   ├── roleplay.ts          # 角色扮演预设系统（17个角色）
│   ├── customApi.ts         # 自定义 API 配置存储
│   └── openaiStream.ts      # OpenAI 兼容流式调用
├── server/                  # PHP 后端
│   ├── app_api.php          # API 主入口
│   ├── database.sql         # 数据库初始化
│   ├── config.php           # 配置加载
│   └── includes/            # 功能模块
└── android/                 # Android 原生项目（prebuild 生成）
```

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| **Expo SDK 52** | React Native 框架 |
| **React Native 0.76** | 跨平台移动开发 |
| **React Native Paper 5** | Material Design 3 UI 库 |
| **@expo/vector-icons** | Material Community Icons |
| **expo-secure-store** | 安全 Token 存储 |
| **expo-font** | 字体加载 |
| **react-native-markdown-display** | Markdown 渲染 |
| **expo-image-picker** | 图片选择 |
| **@react-native-async-storage** | 本地持久化 |
| **PHP 8.1+** | 后端 API |
| **MySQL** | 数据存储 |
| **OpenAI API** | AI 推理 |

---

## 📄 开源协议

本项目基于 MIT 协议开源，你可以自由使用、修改和分发。

---

## ❤️ 贡献

欢迎提交 Issue 和 Pull Request！如果你喜欢这个项目，请给个 Star ⭐

### 你可以通过以下方式贡献：
- 🐛 提交 Bug 报告
- 💡 提出新功能建议
- 🌍 帮助改进文档
- 🎨 完善 UI 设计
