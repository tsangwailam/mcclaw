/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  optimizeFonts: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:${process.env.MC_API_PORT || 3100}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
