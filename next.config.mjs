/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['langchain', '@langchain/core', '@langchain/langgraph', '@langchain/openai', '@langchain/anthropic'],
  },
};

export default nextConfig;
