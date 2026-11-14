const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

let config = getSentryExpoConfig(__dirname);

config = {
	...config,
	resolver: {
		...config.resolver,
		blockList: [...config.resolver.blockList, /(\/lib-origin\/roze\/native\/.+?\/.+?\.node\.ts)$/, /\/nodejs-assets\/.*/],
		sourceExts: [...config.resolver.sourceExts, "sql"],
		resolveRequest: (context, moduleName, platform) => {
			if (moduleName === "react-native-carplay") {
				return { filePath: require.resolve("react-native-carplay/lib/index.js"), type: "sourceFile" };
			}
			if (moduleName === "zlib") {
				return { filePath: path.resolve(__dirname, "stubs/zlib.ts"), type: "sourceFile" };
			}
			// Node.js-only packages that cannot run in Hermes — stub for all RN platforms
			const nodeOnlyStubs = { sharp: "stubs/sharp.ts" };
			if (nodeOnlyStubs[moduleName]) {
				return { filePath: path.resolve(__dirname, nodeOnlyStubs[moduleName]), type: "sourceFile" };
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
