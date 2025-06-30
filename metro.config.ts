// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig, mergeConfig } = require('expo/metro-config');
// const { getConfig } = require('./getConfig');

const default_config = getDefaultConfig(__dirname);

// const {wrapWithReanimatedMetroConfig} = require('react-native-reanimated/metro-config'); // uncomment if using reanimated
module.exports = default_config
//   module.exports = getConfig(
// //  wrapWithReanimatedMetroConfig(mergeConfig(defaultConfig, config)), // uncomment if using reanimated
//   mergeConfig(default_config, {}), // comment if using reanimated
//   {
//     root: __dirname,
//     localLibs: [
//       // '../react-native-track-player',
//     ]
//   }
// );