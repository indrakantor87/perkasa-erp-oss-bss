import type { NextConfig } from 'next'

const isProduction = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  reactStrictMode: !isProduction,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  productionBrowserSourceMaps: false,

  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    contentSecurityPolicy: "default-src 'self'; img-src 'self' data: https: blob:",
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    minimumCacheTTL: isProduction ? 14400 : 60,
  },

  experimental: {
    optimizeCss: true,
    workerThreads: true,
  },

  async headers() {
    return [
      {
        source: '/:all*(js|css|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|otf|ico)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value:
              'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, stale-if-error=604800, immutable',
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
