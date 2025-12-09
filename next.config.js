/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Disable TypeScript checking during builds
    ignoreBuildErrors: true,
  }
}

module.exports = nextConfig