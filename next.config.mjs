/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY
  },
  typescript: {
    ignoreBuildErrors: true,
  },

};

export default nextConfig;