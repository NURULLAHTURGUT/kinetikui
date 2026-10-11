import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// CanvasKit is served from the Cloudflare CDN (see cdn/), under a versioned path
// so it can be cached forever. /canvaskit.wasm on this site is the fallback.
const canvasKitVersion = require('canvaskit-wasm/package.json').version;
const canvasKitUrl =
  process.env.CANVASKIT_URL ??
  `https://cdn.kinetik-ui.dev/canvaskit/${canvasKitVersion}/canvaskit.wasm`;

// Agents get the markdown twin of a page for `*.md` or `Accept: text/markdown`.
// Rewrites run in Vercel's routing layer, so pages stay static and cached.
const acceptsMarkdown = [{ type: 'header', key: 'accept', value: '(.*)text/markdown(.*)' }];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_CANVASKIT_URL: canvasKitUrl },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/index.md', destination: '/md/index' },
        { source: '/docs/:slug.md', destination: '/md/docs/:slug' },
        { source: '/components/:name.md', destination: '/md/components/:name' },
        { source: '/', has: acceptsMarkdown, destination: '/md/index' },
        { source: '/docs/:slug', has: acceptsMarkdown, destination: '/md/docs/:slug' },
        { source: '/components/:name', has: acceptsMarkdown, destination: '/md/components/:name' },
      ],
    };
  },
  // Registry sources and React Native libraries ship untranspiled TS/JSX/Flow.
  transpilePackages: [
    '@kinetik/registry',
    'react-native',
    'react-native-web',
    'react-native-reanimated',
    'react-native-worklets',
    'react-native-gesture-handler',
    'react-native-safe-area-context',
    '@shopify/react-native-skia',
  ],
  webpack(cfg, { webpack, isServer }) {
    cfg.resolve.alias = {
      ...cfg.resolve.alias,
      'react-native$': 'react-native-web',
      'expo-haptics': path.join(here, 'stubs/expo-haptics.ts'),
    };
    // Reanimated's web code loads react-native-web internals with a guarded
    // `require` inside ES modules. Under strict ESM parsing `require` is
    // undefined, the guard swallows the error and every animated style update
    // fails, so parse these packages as mixed modules.
    cfg.module.rules.push({
      test: /[\\/]node_modules[\\/]react-native-(reanimated|worklets)[\\/].*\.js$/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false },
    });
    // CanvasKit (Skia's web runtime) has a Node branch that requires fs/path.
    cfg.resolve.fallback = { ...cfg.resolve.fallback, fs: false, path: false };
    // Prefer web implementations, as Metro does.
    cfg.resolve.extensions = [
      '.web.tsx',
      '.web.ts',
      '.web.mjs',
      '.web.js',
      ...cfg.resolve.extensions,
    ];
    cfg.plugins.push(
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
        'process.env.EXPO_OS': JSON.stringify('web'),
        // React Native libraries (worklets, Reanimated) expect Node's `global`.
        ...(isServer ? null : { global: 'globalThis' }),
      }),
    );
    return cfg;
  },
};

export default config;
