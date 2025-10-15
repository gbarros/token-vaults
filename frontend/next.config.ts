import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { webpack }) => {
    // Resolve @contracts alias based on environment
    // Production: use committed vercel/contracts/ folder
    // Development: use ../contracts/ directly via filesystem
    const contractsPath = process.env.NODE_ENV === 'production'
      ? path.resolve(__dirname, 'vercel/contracts')
      : path.resolve(__dirname, '../contracts');
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@contracts': contractsPath,
    };
    
    // Ignore optional contract artifacts that may not exist
    // These are wrapped in try-catch in the code
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /@contracts\/broadcast\/DeployAggregator\.s\.sol/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /@contracts\/broadcast\/DeployOracle\.s\.sol/,
      })
    );
    
    console.log(`📦 @contracts → ${process.env.NODE_ENV === 'production' ? 'vercel/contracts/' : '../contracts/'}`);
    
    return config;
  },
};

export default nextConfig;
