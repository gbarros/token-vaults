import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Make missing Forge artifacts non-fatal during build
    // These are optional fallback deployments that may not exist
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };
    
    // Ignore missing optional artifacts
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /DeployAggregator\.s\.sol.*run-latest\.json$/,
      })
    );
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /DeployOracle\.s\.sol.*run-latest\.json$/,
      })
    );
    
    return config;
  },
};

export default nextConfig;
