const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force Metro to use the root React packages, not any nested ones
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect react and react-dom to the root node_modules versions
  if (moduleName === 'react' || moduleName === 'react-dom') {
    return {
      filePath: path.resolve(__dirname, 'node_modules', moduleName, 'index.js'),
      type: 'sourceFile',
    };
  }

  // Default resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
