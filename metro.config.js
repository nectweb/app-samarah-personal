const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

// Add alias resolver
//config.resolver.alias = {
  //'@': path.resolve(__dirname, '.'),
//};

module.exports = config;