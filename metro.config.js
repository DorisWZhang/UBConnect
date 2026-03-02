// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.sourceExts.push('mjs');
config.resolver.unstable_enablePackageExports = false;

// @firebase/auth@1.7.9 ships its RN bundle with 100% CRLF line endings.
// @babel/parser 7.29 fails to parse such files ("Unexpected token" at EOF).
// The custom transformer normalises CRLF → LF for all @firebase/auth files.
config.transformer.babelTransformerPath = require.resolve('./crlf-transformer');

module.exports = config;
