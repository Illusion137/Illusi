const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
    "name": IS_DEV ? 'Illusi (Dev)' : 'Illusi',
    "slug": "Illusi",
    "version": "14.1.5",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
        "image": "./assets/splash.png",
        "resizeMode": "contain",
        "backgroundColor": "#000000"
    },
    "updates": {
        // "fallbackToCacheTimeout": 0, 
        "url": "https://u.expo.dev/e19a915b-3ff0-4591-80a6-6872abb71919"
    },
    "runtimeVersion": {
        "policy": "sdkVersion"
    },
    "assetBundlePatterns": [
        "**/*"
    ],
    "ios": {
        "supportsTablet": false,
        "bundleIdentifier": IS_DEV ? 'com.illusion137.Illusi.dev' : 'com.illusion137.Illusi',
        "usesIcloudStorage": false,
        "infoPlist": {
            "UIBackgroundModes": [
                "audio",
                "fetch"
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
    },
    "plugins": [
        "expo-font"
    ]
}
