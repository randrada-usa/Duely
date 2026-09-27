import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { setMainActivityLaunchMode } = require('./withRevenueCatAndroid');

describe('RevenueCat Android config plugin', () => {
  it('uses singleTop so the purchase activity can return to Duely', () => {
    const manifest = {
      manifest: {
        application: [{
          $: { 'android:name': '.MainApplication' },
          activity: [{
            $: {
              'android:name': '.MainActivity',
              'android:launchMode': 'singleTask',
            },
            'intent-filter': [{
              action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
              category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
            }, {
              action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
              category: [{ $: { 'android:name': 'android.intent.category.BROWSABLE' } }],
              data: [{ $: { 'android:scheme': 'duely' } }],
            }],
          }],
        }],
      },
    };

    expect(
      setMainActivityLaunchMode(manifest, 'exp+duely').manifest.application[0].activity[0].$[
        'android:launchMode'
      ],
    ).toBe('singleTop');
    const viewFilter = manifest.manifest.application[0].activity[0][
      'intent-filter'
    ].find((intentFilter) =>
      intentFilter.action.some(
        (action) => action.$['android:name'] === 'android.intent.action.VIEW',
      ),
    );
    expect(viewFilter.data).toContainEqual({
      $: { 'android:scheme': 'exp+duely' },
    });
  });
});
