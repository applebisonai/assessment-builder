/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@anthropic-ai/sdk'],
  experimental: { serverComponentsExternalPackages: ['@anthropic-ai/sdk'] }
};
export default nextConfig;
