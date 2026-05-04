#!/bin/bash
# ================================================================
# AIF Chat - APK 构建脚本
# 在 Windows 上使用 Git Bash 运行
# ================================================================

set -e

echo "=== AIF Chat APK 构建脚本 ==="
echo ""

# 检查 JDK
if [ ! -d "/c/m/.jdk17/jdk-17.0.14+7" ]; then
    echo "❌ JDK 17 未找到（预期在 /c/m/.jdk17/）"
    echo "   请先安装 Microsoft Build of OpenJDK 17"
    exit 1
fi

# 检查 Android SDK
if [ ! -d "/c/Users/Administrator/AppData/Local/Android/Sdk" ]; then
    echo "⚠️  Android SDK 路径可能不正确，继续但可能失败…"
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="/c/m/mobile-app"

echo "📦 项目目录: $PROJECT_DIR"
echo "🔨 构建目录: $BUILD_DIR"
echo ""

# 1. 复制到短路径
echo "➡️  复制项目到短路径..."
rm -rf "$BUILD_DIR"
cp -r "$PROJECT_DIR" "$BUILD_DIR"
cd "$BUILD_DIR"

# 2. 安装依赖
echo "📦 安装依赖..."
npm install --silent

# 3. Prebuild
echo "🏗️  执行 expo prebuild..."
npx expo prebuild --platform android --clean

# 4. 复制字体
echo "🔤 复制字体文件..."
FONTS="android/app/src/main/assets/fonts"
mkdir -p "$FONTS"
cp node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf "$FONTS/"
cp node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf "$FONTS/material-community.ttf"
cp node_modules/@expo-google-fonts/m-plus-rounded-1c/400Regular/MPLUSRounded1c_400Regular.ttf "$FONTS/"
cp node_modules/@expo-google-fonts/m-plus-rounded-1c/700Bold/MPLUSRounded1c_700Bold.ttf "$FONTS/"
cp node_modules/@expo-google-fonts/m-plus-rounded-1c/800ExtraBold/MPLUSRounded1c_800ExtraBold.ttf "$FONTS/"

# 5. 复制 keystore
echo "🔑 复制签名文件..."
if [ -f "$PROJECT_DIR/aif-release.keystore" ]; then
    cp "$PROJECT_DIR/aif-release.keystore" "android/app/"
fi

# 6. 配置签名
echo "⚙️  配置签名..."
BUILD_GRADLE="android/app/build.gradle"
# 检查是否已有 release 签名配置，没有则添加
if ! grep -q "signingConfigs.release" "$BUILD_GRADLE" 2>/dev/null; then
    # 已有处理逻辑...
    echo "   请手动编辑 $BUILD_GRADLE 添加 release 签名配置"
fi

# 7. 构建
echo "⏳ 构建 APK (这可能需要 5-10 分钟)..."
export JAVA_HOME="/c/m/.jdk17/jdk-17.0.14+7"
export ANDROID_HOME="/c/Users/Administrator/AppData/Local/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

cd android
./gradlew assembleRelease

# 8. 复制回原目录
echo "📋 复制 APK 回项目目录..."
cp app/build/outputs/apk/release/app-release.apk "$PROJECT_DIR/AIFChat.apk"

echo ""
echo "✅ 构建完成！"
echo "   APK 位置: $PROJECT_DIR/AIFChat.apk"
ls -lh "$PROJECT_DIR/AIFChat.apk"
