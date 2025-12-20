/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // 必须保留这个，Docker 才能构建成功
  
  // 合并 typescript 配置
  typescript: {
    ignoreBuildErrors: true,
  },

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
    ]
  },
}

module.exports = nextConfig