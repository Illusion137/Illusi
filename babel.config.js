module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-syntax-import-attributes', {deprecatedAssertSyntax: true}],
      // ["inline-import", { "extensions": [".sql"] }],
      '@babel/plugin-transform-export-namespace-from'
    ] // <-- add this
  };
};