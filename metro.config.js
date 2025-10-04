const { getSentryExpoConfig } = require("@sentry/react-native/metro");

let config = getSentryExpoConfig(__dirname);

config = {
	...config,
	resolver: {
		...config.resolver,
		// blockList: [config.resolver.blockList, /(\/lib-origin\/roze\/native\/.+?\/.+?\.node\.ts)$/]
	}
};
config.resolver.sourceExts.push('sql');

module.exports = config;
