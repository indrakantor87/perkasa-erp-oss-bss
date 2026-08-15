import type { NextConfig } from 'next'

const isProduction = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  reactStrictMode: !isProduction,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,

  compiler: isProduction
    ? {
        removeConsole: {
          exclude: ['error', 'warn'],
        },
        reactRemoveProperties: isProduction
          ? { properties: ['^data-testid$', '^aria-testid$'] }
          : false,
      }
    : undefined,

  optimizePackageImports: [
    'lucide-react',
    'leaflet',
    'xlsx',
    'qrcode',
    'jsbarcode',
    'recharts',
    'clsx',
    'tailwind-merge',
  ],

  images: {
    formats: ['image/avif', 'image/webp'],
    contentSecurityPolicy: "default-src 'self'; img-src 'self' data: https: blob:",
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    minimumCacheTTL: 86400,
  },

  experimental: {
    optimizeCss: true,
    cssMinify: 'lightningcss',
    workerThreads: true,
    serverMinification: true,
    serverSourceMaps: false,
    clientRouterFilter: true,
  },

  async headers() {
    return [
      {
        source: '/:all*(js|css|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|otf|ico)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, stale-if-error=604800, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default nextConfig
