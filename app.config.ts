import type { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

export default (config: ConfigContext["config"]): ExpoConfig => ({
	...config,
	name: IS_DEV ? "Illusi (Dev)" : "Illusi",
	slug: "Illusi",
	version: "21.1.0",
	// "orientation": "portrait",
	// "icon": "./assets/icon.png",
	// "userInterfaceStyle": "dark",
	// "splash": {
	//     "image": "./assets/splash.png",
	//     "resizeMode": "contain",
	//     "backgroundColor": "#000000"
	// },
	scheme: "illusi",
	runtimeVersion: "1.0.0",
	extra: {
		eas: { projectId: "e19a915b-3ff0-4591-80a6-6872abb71919" },
		expoRouter: {
			unstable_settings: {
				// "initialRouteName": "index",
				skipRoutes: ["track"]
			}
		}
	},
	updates: {
		// "fallbackToCacheTimeout": 0,
		url: "https://u.expo.dev/e19a915b-3ff0-4591-80a6-6872abb71919"
	},
	assetBundlePatterns: ["**/*"],
	ios: {
		bundleIdentifier: IS_DEV ? "com.illusion137.Illusi.dev" : "com.illusion137.Illusi",
		// Required for Syncplay (MultipeerConnectivity) on iOS 14+. Without these the
		// advertiser fails with NSNetServicesErrorDomain -72008 (missing config).
		infoPlist: {
			NSLocalNetworkUsageDescription: "Allow Illusi to find and sync playback with nearby devices.",
			NSBonjourServices: ["_illusi-p2p._tcp", "_illusi-p2p._udp"]
		}
		// "supportsTablet": false,
		// "usesIcloudStorage": false,
		// "associatedDomains": ["applinks:illusi.dev"]
	},
	web: { favicon: "./assets/favicon.png" },
	plugins: [
		["expo-font", { fonts: ["./assets/fonts/LEMON.otf", "./assets/fonts/StarsBorneoDEMO.ttf"] }],
		"expo-router",
		["@sentry/react-native/expo", { url: "https://sentry.io/", project: "illusi", organization: "illusion-ke" }],
		"expo-audio",
		"expo-sharing",
		"expo-asset",
		"expo-image",
		["expo-build-properties", { buildReactNativeFromSource: true, useHermesV1: true }]
	],
	experiments: { reactCompiler: true, typedRoutes: true }
});
