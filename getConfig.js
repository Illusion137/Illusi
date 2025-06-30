const path = require('path');
const escape = require('escape-string-regexp');
const exclusionList = require('metro-config/src/defaults/exclusionList');

/**
 * Get Metro configuration for a project using local libraries.
 *
 * @param {import('metro-config').MetroConfig} defaultConfig Default Metro configuration
 * @param {object} options Options for customization
 * @param {string} options.root Root directory of the project
 * @param {string[]} options.localLibs Array of relative paths to local libraries
 * @returns {import('metro-config').MetroConfig} Metro configuration
 */
const getConfig = (defaultConfig, { root, localLibs }) => {
  const resolvedLibs = localLibs.map((lib) => path.resolve(root, lib));

  // Create exclusion rules for each library
  const blacklistPatterns = resolvedLibs.flatMap((lib) => [
    // Block `react-native` inside the library's node_modules
    new RegExp(`^${escape(path.join(lib, 'node_modules/react-native'))}\\/.*$`),
    // Block other shared peer dependencies inside the library's node_modules
    ...Object.keys(require(path.join(lib, 'package.json')).peerDependencies || {}).map(
      (dep) =>
        new RegExp(`^${escape(path.join(lib, 'node_modules', dep))}\\/.*$`)
    ),
  ]);

  const nodeModules = resolvedLibs.reduce((acc, lib) => {
    const libName = require(path.join(lib, 'package.json')).name;
    acc[libName] = lib;
  
    const peerDeps = Object.keys(require(path.join(lib, 'package.json')).peerDependencies || {});
    peerDeps.forEach((dep) => {
      acc[dep] = path.join(root, 'node_modules', dep);
    });
  
    return acc;
  }, {});

  return {
    ...defaultConfig,
    projectRoot: root,
    watchFolders: resolvedLibs,
    resolver: {
      ...defaultConfig.resolver,
      blacklistRE: exclusionList(blacklistPatterns),
      extraNodeModules: nodeModules,
    },
  };
};

module.exports = { getConfig };