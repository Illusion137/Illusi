const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

let config = getSentryExpoConfig(__dirname);

config = {
	...config,
	resolver: {
		...config.resolver,
		blockList: [...config.resolver.blockList, /(\/lib-origin\/roze\/native\/.+?\/.+?\.node\.ts)$/],
		sourceExts: [...config.resolver.sourceExts, "sql"]
	}
};
config.transformer = {
	...config.transformer,
	unstable_allowRequireContext: true, // important for expo-router
};

config.watchFolders = [
	// path.resolve(__dirname, "lib-origin"), // ensure HMR watches this
	path.resolve(__dirname, "utils"), // ensure HMR watches this
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

config.resolver.sourceExts.push('sql');

module.exports = config;
