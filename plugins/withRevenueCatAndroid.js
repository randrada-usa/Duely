const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

function setMainActivityLaunchMode(androidManifest, developmentScheme) {
  const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);
  mainActivity.$['android:launchMode'] = 'singleTop';
  if (developmentScheme) {
    const viewFilter = mainActivity['intent-filter']?.find((intentFilter) =>
      intentFilter.action?.some(
        (action) => action.$['android:name'] === 'android.intent.action.VIEW',
      ),
    );
    if (viewFilter) {
      viewFilter.data ??= [];
      const hasScheme = viewFilter.data.some(
        (entry) => entry.$['android:scheme'] === developmentScheme,
      );
      if (!hasScheme) {
        viewFilter.data.push({ $: { 'android:scheme': developmentScheme } });
      }
    }
  }
  return androidManifest;
}

function withRevenueCatAndroid(config) {
  return withAndroidManifest(config, (modConfig) => {
    modConfig.modResults = setMainActivityLaunchMode(
      modConfig.modResults,
      config.slug ? `exp+${config.slug}` : undefined,
    );
    return modConfig;
  });
}

module.exports = withRevenueCatAndroid;
module.exports.setMainActivityLaunchMode = setMainActivityLaunchMode;
