const IS_DEV = process.env.APP_VARIANT === 'development';

export default{
    "name": IS_DEV ? 'Illusi (Dev)' : 'Illusi',
    "slug": "Illusi",
    "version": "5.13.23",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "entryPoint": "./index.js",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": IS_DEV ? 'com.illusion137.Illusi.dev' : 'com.illusion137.Illusi',
      "usesIcloudStorage": false,
      "infoPlist": {
        "UIBackgroundModes": [
          "audio"
        ]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.illusion137.Illusi"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "e19a915b-3ff0-4591-80a6-6872abb71919"
      }
    }
}
