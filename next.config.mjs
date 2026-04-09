/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@anthropic-ai/sdk', 'docx'] }
};
export default nextConfig;
