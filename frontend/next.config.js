/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: '/mapbox/:path*',
        destination: 'https://api.mapbox.com/:path*',
      },
      {
        source: '/mapbox-tiles/:path*',
        destination: 'https://tiles.mapbox.com/:path*',
      },
      // Proxy backend requests to local FastAPI server
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/users/:path*',
        destination: 'http://127.0.0.1:8000/users/:path*',
      },
      {
        source: '/static/:path*',
        destination: 'http://127.0.0.1:8000/static/:path*',
      },
      {
        source: '/health',
        destination: 'http://127.0.0.1:8000/health',
      },
      {
        source: '/token',
        destination: 'http://127.0.0.1:8000/token',
      },
      {
        source: '/audio/:path*',
        destination: 'http://127.0.0.1:8000/audio/:path*',
      },
    ]
  },
}

module.exports = nextConfig