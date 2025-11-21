module.exports = {
  expo: {
    name: 'Movimento SZ',
    slug: 'movimento-sz',
    scheme: 'samarah-fitness',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.movimento.sz',
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription: 'Este app precisa acessar a câmera para fotos de perfil e progresso.',
        NSPhotoLibraryUsageDescription: 'Este app precisa acessar suas fotos para perfil e acompanhamento.',
        NSPhotoLibraryAddUsageDescription: 'Este app precisa salvar fotos no seu dispositivo.',
        UIBackgroundModes: ['fetch', 'remote-notification'],
      },
      associatedDomains: ['applinks:movimento.sz'],
      usesAppleSignIn: false,
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
      package: 'com.movimento.sz',
      versionCode: 1,
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      'expo-router',
      [
        'expo-image-picker',
        {
          photosPermission: 'Este app precisa acessar suas fotos para perfil e acompanhamento.',
          cameraPermission: 'Este app precisa acessar a câmera para fotos de perfil e progresso.',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '15.1',
            newArchEnabled: false,
          },
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: '35.0.0',
            minSdkVersion: 24,
            newArchEnabled: false,
            java: {
              compileSdkVersion: 17,
            },
          },
        },
      ],
    ],
    runtimeVersion: '1.0.0',
    extra: {
      eas: {
        projectId: '86ffa9f2-95de-4d49-868d-c3d27a3ddcff',
      },
    },
  },
};
