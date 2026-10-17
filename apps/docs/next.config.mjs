import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// CanvasKit (Skia's web runtime) is served by this site under a versioned path,
// so it can be cached forever and a new version never meets a stale file. The
// Cloudflare CDN (see cdn/) is opt-in: set CANVASKIT_URL once it is deployed.
const canvasKitVersion = require('canvaskit-wasm/package.json').version;
const canvasKitLocal = `/canvaskit/${canvasKitVersion}/canvaskit.wasm`;
const canvasKitUrl = process.env.CANVASKIT_URL ?? '';

// Agents get the markdown twin of a page for `*.md` or `Accept: text/markdown`.
// Rewrites run in Vercel's routing layer, so pages stay static and cached.
const acceptsMarkdown = [{ type: 'header', key: 'accept', value: '(.*)text/markdown(.*)' }];

/*
 * Security headers. The site is static, so the policy only allows what it
 * uses: its own scripts (Next.js inlines a few, plus the theme boot script),
 * WebAssembly for the Skia previews, inline styles from react-native-web, the
 * GitHub API for the star count, GitHub avatars on the sponsors page and the
 * CanvasKit CDN. Development needs eval for hot reload, so the policy is
 * production-only.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self' https://api.github.com${canvasKitUrl ? ` ${new URL(canvasKitUrl).origin}` : ''}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }]
    : []),
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_CANVASKIT_URL: canvasKitUrl, NEXT_PUBLIC_CANVASKIT_LOCAL: canvasKitLocal },
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/canvaskit/:version/canvaskit.wasm',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Demo photos are not content-hashed, so a week rather than forever.
      {
        source: '/photos/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/canvaskit/:version/canvaskit.wasm', destination: '/canvaskit.wasm' },
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
