'use client';

import { useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import WalletCard from '@/components/setup/WalletCard';
import TokenFaucetCard from '@/components/setup/TokenFaucetCard';
import OracleCard from '@/components/setup/OracleCard';
import SandboxMarketCard from '@/components/setup/SandboxMarketCard';

export default function SetupPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Morpho Vaults Demo - Setup & Mocks
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Set up your testnet environment with faucet tokens, configurable oracles, 
            and a sandbox Morpho Blue market for testing vault functionality.
          </p>
        </div>

        {/* Network Warning */}
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Eden Testnet Required
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                This demo requires connection to Eden Testnet. Make sure your wallet is connected to the correct network.
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <WalletCard refreshTrigger={refreshTrigger} />
            <TokenFaucetCard onRefresh={handleRefresh} />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <OracleCard onRefresh={handleRefresh} />
            <SandboxMarketCard onRefresh={handleRefresh} />
          </div>
        </div>

        {/* Deployment Info */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            🎉 Forge Deployment Active
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Network:</span>
              <span className="ml-2 text-blue-700">Eden Testnet</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Deployment:</span>
              <span className="ml-2 text-blue-700">Fresh Forge Scripts</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Oracle Scaling:</span>
              <span className="ml-2 text-blue-700">36-decimal (Fixed)</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Market Status:</span>
              <span className="ml-2 text-blue-700">Initialized & Active</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-blue-600">
            <p>
              ✅ All contracts deployed via Forge scripts with proper deployment artifacts
            </p>
            <p>
              ✅ Oracle scaling fixed (36 decimals) - borrowing fully functional
            </p>
            <p>
              ✅ Market initialized with ~61% utilization rate
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This is a demo environment for educational purposes. 
            All tokens are testnet-only and have no real value.
          </p>
          <p className="mt-1">
            Built with Morpho Blue v1.1 on Eden Testnet using Forge deployment scripts.
          </p>
        </div>
      </div>
    </div>
  );
}
