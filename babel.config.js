	module.exports = function(api) {
	api.cache(true);
	return {
		presets: ['babel-preset-expo'],
		plugins: [
			['@babel/plugin-syntax-import-attributes', {deprecatedAssertSyntax: true}],
			["inline-import", { "extensions": [".sql"] }],
			'@babel/plugin-transform-export-namespace-from',
			[
				'module-resolver',
				{
					root: ['./'],
					alias: {
						"@hooks/*": "hooks/*",
						"@utils/*": "utils/*",
						"@components/*": "components/*",
						"@screens/*": "screens/*",
						"@native/*": "lib-origin/roze/native/*",
						"@lib/*": "lib-origin/roze/lib/*",
						"@origin/*": "lib-origin/origin/src/*",
						"@illusive/*": "lib-origin/Illusive/src/*",
						"@common/*": "lib-origin/common/*",
						"@sample/*": "lib-origin/sample/*"
					}
				},
			],
			"react-native-reanimated/plugin"
		]
	};
	};