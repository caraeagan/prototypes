/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Completely disable ESLint during builds
    ignoreDuringBuilds: true,
    dirs: [] // Don't lint any directories
  },
  typescript: {
    // Disable TypeScript checking during builds
    ignoreBuildErrors: true,
  },
  // Additional Vercel-specific config
  experimental: {
    skipESLintDuringBuilds: true,
    skipTypeChecking: true
  }
}

module.exports = nextConfig