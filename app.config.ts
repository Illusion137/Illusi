const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
    "name": IS_DEV ? 'Illusi (Dev)' : 'Illusi',
    "slug": "Illusi",
    "version": "14.5.12",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
        "image": "./assets/splash.png",
        "resizeMode": "contain",
        "backgroundColor": "#000000"
    },
    "runtimeVersion": "1.0.0",
    "extra": {
        "eas": {
            "projectId": "e19a915b-3ff0-4591-80a6-6872abb71919"
        }
    },
    "updates": {
        // "fallbackToCacheTimeout": 0, 
        "url": "https://u.expo.dev/e19a915b-3ff0-4591-80a6-6872abb71919"
    },
    "assetBundlePatterns": [
        "**/*"
    ],
    "ios": {
        "bundleIdentifier": IS_DEV ? 'com.illusion137.Illusi.dev' : 'com.illusion137.Illusi',
        "supportsTablet": false,
        "usesIcloudStorage": false,
        "infoPlist": {
            "UIBackgroundModes": [
                "audio",
                "fetch"
            ]
        }
    },
    "web": {
        "favicon": "./assets/favicon.png"
    },
    "plugins": [
        "expo-font",
        "expo-sqlite"
    ],
    "experiments": {
        "reactCompiler": true
    },
}
