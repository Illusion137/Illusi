const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

let config = getSentryExpoConfig(__dirname);

config = {
	...config,
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
				return {
					filePath: require.resolve("react-native-carplay/lib/index.js"),
					type: "sourceFile"
				};
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
