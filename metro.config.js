const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

let config = getSentryExpoConfig(__dirname);

config = {
	...config,
	platforms: ["ios", "android", "macos", "windows"],
	resolver: {
		...config.resolver,
		blockList: [...config.resolver.blockList, /(\/lib-origin\/roze\/native\/.+?\/.+?\.node\.ts)$/, /\/nodejs-assets\/.*/],
		sourceExts: [...config.resolver.sourceExts, "sql"],
		// Force react-native-carplay to resolve via its compiled lib/index.js instead of
		// src/index.ts (the "react-native" field). The TS source has a circular dependency:
		// src/index.ts → Template.ts → CarPlay.ts → GridTemplate.ts → Template.ts
		// The compiled lib/ files have no such cycle (type-only imports were erased by tsc).
		resolveRequest: (context, moduleName, platform) => {
			if (moduleName === "react-native-carplay") {
				return { filePath: require.resolve("react-native-carplay/lib/index.js"), type: "sourceFile" };
			}
			// Node.js-only packages that cannot run in Hermes — stub for all RN platforms
			const nodeOnlyStubs = { sharp: "stubs/sharp.ts" };
			if (nodeOnlyStubs[moduleName]) {
				return { filePath: path.resolve(__dirname, nodeOnlyStubs[moduleName]), type: "sourceFile" };
			}
			// Resolve iOS-only modules to stubs on desktop platforms
			const desktopStubs = {
				"react-native-track-player": "stubs/react-native-track-player.ts",
				"react-native-siri-shortcut": "stubs/react-native-siri-shortcut.ts",
				"nodejs-mobile-react-native": "stubs/nodejs-mobile-react-native.ts",
				"react-native-airplay-button": "stubs/react-native-airplay-button.ts",
				"@simform_solutions/react-native-audio-waveform": "stubs/react-native-audio-waveform.ts"
			};
			if ((platform === "macos" || platform === "windows") && desktopStubs[moduleName]) {
				return { filePath: require.resolve(desktopStubs[moduleName]), type: "sourceFile" };
			}
			return context.resolveRequest(context, moduleName, platform);
		}
	}
};
config.transformer = {
	...config.transformer,
	unstable_allowRequireContext: true // important for expo-router
};

config.watchFolders = [
	path.resolve(__dirname, "lib-origin"), // ensure HMR watches this
	path.resolve(__dirname, "utils") // ensure HMR watches this
];

// config.server = {
// 	...config.server,
// 	enhanceMiddleware: (middleware) => {
// 		return (req, res, next) => {
// 		// prevent Sentry config from caching pages aggressively
// 		res.setHeader("Cache-Control", "no-store");
// 		return middleware(req, res, next);
// 		};
// 	},
// };

config.resolver.sourceExts.push("sql");

module.exports = config;
