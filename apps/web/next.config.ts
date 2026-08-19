import type { NextConfig } from 'next'

const isProduction = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  productionBrowserSourceMaps: false,
  crossOrigin: 'anonymous',

  images: {
    formats: ['image/avif', 'image/webp'],
    contentSecurityPolicy: "default-src 'self'; img-src 'self' data: https: blob:",
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    minimumCacheTTL: isProduction ? 259200 : 60,
    unoptimized: !isProduction,
  },

  experimental: {
    optimizeCss: true,
    workerThreads: true,
    optimizePackageImports: [
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
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
              'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=2592000, stale-if-error=2592000, immutable',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value:
              'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=2592000, immutable',
          },
          { key: 'Accept-Ranges', value: 'bytes' },
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
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
}

export default nextConfig
