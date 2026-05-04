/**
 * Post-prebuild script: copies icon fonts to Android assets/fonts/
 * so they are available to the native font loader at runtime.
 *
 * Expo's prebuild regenerates the android/ directory, so we need to
 * re-copy the font files each time.
 */
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ANDROID_FONTS_DIR = path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'assets', 'fonts');

// Font files to copy: { source path (relative to node_modules), destination filename }
const FONTS = [
  // MaterialCommunityIcons for @expo/vector-icons (font name: material-community)
  {
    src: '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf',
    dest: 'MaterialCommunityIcons.ttf',
  },
  // Same font but renamed to match the fontFamily name used by @expo/vector-icons
  {
    src: '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf',
    dest: 'material-community.ttf',
  },
  // M PLUS Rounded 1c fonts
  {
    src: '@expo-google-fonts/m-plus-rounded-1c/400Regular/MPLUSRounded1c_400Regular.ttf',
    dest: 'MPLUSRounded1c_400Regular.ttf',
  },
  {
    src: '@expo-google-fonts/m-plus-rounded-1c/700Bold/MPLUSRounded1c_700Bold.ttf',
    dest: 'MPLUSRounded1c_700Bold.ttf',
  },
  {
    src: '@expo-google-fonts/m-plus-rounded-1c/800ExtraBold/MPLUSRounded1c_800ExtraBold.ttf',
    dest: 'MPLUSRounded1c_800ExtraBold.ttf',
  },
];

function main() {
  // Ensure the target directory exists
  if (!fs.existsSync(ANDROID_FONTS_DIR)) {
    fs.mkdirSync(ANDROID_FONTS_DIR, { recursive: true });
  }

  for (const font of FONTS) {
    const srcPath = path.join(PROJECT_ROOT, 'node_modules', font.src);
    const destPath = path.join(ANDROID_FONTS_DIR, font.dest);

    if (!fs.existsSync(srcPath)) {
      console.warn(`[post-prebuild] Font source not found: ${srcPath}`);
      continue;
    }

    fs.copyFileSync(srcPath, destPath);
    console.log(`[post-prebuild] Copied: ${font.dest}`);
  }

  console.log('[post-prebuild] Font copy complete!');
}

main();
