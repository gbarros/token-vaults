'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import { addresses } from '../../config/addresses';

interface SandboxMarketCardProps {
  onRefresh: () => void;
}

export default function SandboxMarketCard({ onRefresh: _onRefresh }: SandboxMarketCardProps) {
  // Suppress unused variable warnings for future use
  void _onRefresh;
  const { isConnected } = useAccount();
  const [_isCreating, _setIsCreating] = useState(false);
  void _isCreating;
  void _setIsCreating;

  const marketData = addresses.markets.sandbox;
  const isMarketCreated = marketData.id && marketData.id !== '';

  const handleCreateMarket = async () => {
    toast('Market creation requires running the ops script. Please use the terminal command below.');
  };

  const handleInitUtilization = async () => {
    toast('Utilization initialization requires running the ops script. Please use the terminal command below.');
  };

  // Check if all prerequisites are met
  const hasTokens = addresses.tokens.fakeUSD && addresses.tokens.fakeTIA;
  const hasOracle = addresses.oracles.builtOracle;
  const hasMorphoAddresses = addresses.morpho.morphoBlueCore && addresses.morpho.adaptiveCurveIRM;

  const canCreateMarket = hasTokens && hasOracle && hasMorphoAddresses;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Sandbox Market
      </h2>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Please connect your wallet to manage the market</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Prerequisites Check */}
          <div className="bg-gray-50 rounded-md p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Prerequisites</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${hasTokens ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>Faucet Tokens Deployed</span>
              </div>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${addresses.oracles.aggregator.address ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>Price Aggregator Deployed</span>
              </div>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${hasOracle ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>Morpho Oracle Built</span>
              </div>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${hasMorphoAddresses ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>Morpho Addresses Configured</span>
              </div>
            </div>
          </div>

          {/* Market Configuration */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Market Configuration</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Loan Token:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {addresses.tokens.fakeUSD || 'Not deployed'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Collateral Token:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {addresses.tokens.fakeTIA || 'Not deployed'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Oracle:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {addresses.oracles.builtOracle || 'Not built'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">IRM:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {addresses.morpho.adaptiveCurveIRM}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">LLTV:</span>
                <span className="ml-2 font-medium">
                  {(Number(marketData.lltv) / 1e18 * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Market Status */}
          {isMarketCreated ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Market Created Successfully</p>
                  <p className="text-xs text-green-600 font-mono mt-1 break-all">
                    ID: {marketData.id}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-yellow-800">Market not created yet</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isMarketCreated && (
              <div>
              <button
                onClick={handleCreateMarket}
                disabled={!canCreateMarket}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Market
              </button>
                {!canCreateMarket && (
                  <p className="text-sm text-red-600 mt-1">
                    Complete all prerequisites first
                  </p>
                )}
              </div>
            )}

            {isMarketCreated && (
              <button
                onClick={handleInitUtilization}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Initialize Utilization
              </button>
            )}
          </div>

          {/* Terminal Commands */}
          <div className="bg-gray-900 text-gray-100 rounded-md p-4 text-sm">
            <h4 className="font-medium mb-2">Terminal Commands:</h4>
            <div className="space-y-1 font-mono text-xs">
              {!hasTokens && (
                <div>
                  <span className="text-gray-400"># Deploy tokens:</span>
                  <br />
                  <span className="text-green-400">npm run ops:deploy:tokens</span>
                </div>
              )}
              {!addresses.oracles.aggregator.address && (
                <div>
                  <span className="text-gray-400"># Deploy aggregator:</span>
                  <br />
                  <span className="text-green-400">npm run ops:deploy:aggregator</span>
                </div>
              )}
              {!hasOracle && addresses.oracles.aggregator.address && (
                <div>
                  <span className="text-gray-400"># Build oracle:</span>
                  <br />
                  <span className="text-green-400">npm run ops:build:oracle</span>
                </div>
              )}
              {canCreateMarket && !isMarketCreated && (
                <div>
                  <span className="text-gray-400"># Create market:</span>
                  <br />
                  <span className="text-green-400">npm run ops:create:market</span>
                </div>
              )}
              {isMarketCreated && (
                <div>
                  <span className="text-gray-400"># Initialize utilization:</span>
                  <br />
                  <span className="text-green-400">npm run ops:init:util</span>
                </div>
              )}
            </div>
          </div>

          {/* Market Metrics (placeholder for when market is active) */}
          {isMarketCreated && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Market Metrics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Utilization:</span>
                  <span className="ml-2 font-medium">0.00%</span>
                </div>
                <div>
                  <span className="text-gray-600">Supply APR:</span>
                  <span className="ml-2 font-medium">0.00%</span>
                </div>
                <div>
                  <span className="text-gray-600">Borrow APR:</span>
                  <span className="ml-2 font-medium">0.00%</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Supply:</span>
                  <span className="ml-2 font-medium">0.00</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Metrics will update after utilization initialization
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
