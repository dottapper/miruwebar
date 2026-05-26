import { describe, it, expect, vi } from 'vitest';
import {
  externalizeDataUrls,
  collectDataImagePaths,
  preparePublishedScreens,
  buildMarkerAssetForPublish
} from '../../api/publish-assets.js';

describe('publish-assets', () => {
  it('externalizeDataUrls replaces nested data:image strings', async () => {
    const upload = vi.fn(async () => 'https://cdn.example/logo.png');
    const input = {
      logo: 'data:image/png;base64,abcd',
      nested: { bg: 'data:image/jpeg;base64,efgh' }
    };
    const out = await externalizeDataUrls(input, upload);
    expect(out.logo).toBe('https://cdn.example/logo.png');
    expect(out.nested.bg).toBe('https://cdn.example/logo.png');
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('preparePublishedScreens strips startScreen logo data URLs', async () => {
    const upload = vi.fn(async () => '/projects/demo/assets/start-logo.png');
    const screens = await preparePublishedScreens({
      startScreen: { logo: 'data:image/png;base64,xx', title: 'Hi' },
      loadingScreen: null,
      guideScreen: null
    }, upload);
    expect(screens.startScreen.logo).toBe('/projects/demo/assets/start-logo.png');
    expect(collectDataImagePaths(screens)).toHaveLength(0);
  });

  it('buildMarkerAssetForPublish builds imageTarget asset', async () => {
    const mindBuf = Buffer.from('mind-test');
    const built = await buildMarkerAssetForPublish(
      {
        markerImage: 'data:image/png;base64,cG5n',
        marker: {
          type: 'imageTarget',
          targetMind: mindBuf.toString('base64'),
          imageWidth: 555,
          imageHeight: 800
        }
      },
      {
        uploadImage: vi.fn(async () => 'https://cdn.example/marker.png'),
        uploadFile: vi.fn(async () => 'https://cdn.example/target.mind')
      }
    );
    expect(built.asset.type).toBe('imageTarget');
    expect(built.asset.engine).toBe('mindar');
    expect(built.asset.targetUrl).toBe('https://cdn.example/target.mind');
    expect(built.markerPattern).toBeNull();
  });

  it('imageTarget without mind file throws', async () => {
    await expect(
      buildMarkerAssetForPublish(
        { marker: { type: 'imageTarget' }, markerImage: null },
        { uploadImage: vi.fn(), uploadFile: vi.fn() }
      )
    ).rejects.toThrow(/imageTarget requires/);
  });
});
