const {getDefaultConfig} = require('expo/metro-config');
const {mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  ...getDefaultConfig(__dirname),
  watchFolders: [
    ...getDefaultConfig(__dirname).watchFolders,
    path.resolve(__dirname, '../ffmpeg-kit/react-native'),
  ],
  resolver: {
    extraNodeModules: {
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
    },
  },
  transformer: { 
    async getTransformOptions() {
      return {
        transform: {
          inlineRequires: true, // <----- I don't know why this was necessary... but it was. I'd LOVE to get more info on this.
        },
      };
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);