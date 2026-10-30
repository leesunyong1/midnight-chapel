/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  images: {
    qualities: [60, 75, 85, 90],
  },
};

export default nextConfig;
