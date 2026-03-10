/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the local monorepo package so Next.js handles its TypeScript
  transpilePackages: ["@industrial/types"],
};

module.exports = nextConfig;
