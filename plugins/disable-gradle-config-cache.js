const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function disableGradleConfigCache(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) =>
        !(item.type === 'property' && item.key === 'org.gradle.configuration-cache')
    );

    config.modResults.push({
      type: 'property',
      key: 'org.gradle.configuration-cache',
      value: 'false',
    });

    return config;
  });
};
