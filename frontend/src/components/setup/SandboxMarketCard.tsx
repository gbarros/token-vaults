'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import toast from 'react-hot-toast';
import { parseEther } from 'viem';
import { contracts, getMarketParams } from '../../lib/contracts';
import { useMarketMetrics } from '@/hooks/useMarketData';
import { useMarketDataRaw } from '@/hooks/useMarketDataRaw';
import { useMarketInsights } from '@/hooks/useMarketInsights';
import { morphoBlueAbi, erc20Abi } from '../../lib/abis';
import { marketParamsToAbi } from '../../lib/sdkUtils';
import { formatTokenAmount } from '../../lib/formatNumber';

// Helper function to create Blockscout Eden Testnet links
const getEtherscanLink = (address: string) => `https://eden-testnet.blockscout.com/address/${address}`;

// Component for clickable address links
const AddressLink = ({ address, label }: { address: string; label?: string }) => (
  <a
    href={getEtherscanLink(address)}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 hover:text-blue-800 underline font-mono text-xs break-all"
    title={`View ${label || 'address'} on Blockscout`}
  >
    {address}
  </a>
);

interface SandboxMarketCardProps {
  onRefresh?: () => void;
}

export default function SandboxMarketCard({ onRefresh: _onRefresh }: SandboxMarketCardProps) {
  // Suppress unused variable warnings for future use
  void _onRefresh;
  const { isConnected, address } = useAccount();
  const [_isCreating, _setIsCreating] = useState(false);
  void _isCreating;
  void _setIsCreating;

  // Market action states
  const [supplyAmount, setSupplyAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Contract interaction hooks
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Get market data and insights using SDK-powered hooks
  const marketMetrics = useMarketMetrics();
  const marketInsights = useMarketInsights();
  const { data: marketDataRaw } = useMarketDataRaw();

  const marketData = contracts.markets.sandbox;
  const marketParams = getMarketParams();
  
  // Check if market actually exists on-chain (not just in config)
  // A market exists if it has been updated at least once (lastUpdate > 0)
  const isMarketCreated = marketDataRaw && marketDataRaw[4] > 0n; // marketDataRaw[4] = lastUpdate

  const handleCreateMarket = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    toast.success('Market creation would be initiated here');
  };

  // Use centralized utility for MarketParams conversion

  // Market action handlers
  const handleSupply = async () => {
    if (!isConnected || !supplyAmount || !marketParams) {
      toast.error('Please connect wallet and enter amount');
      return;
    }

    try {
      setIsProcessing(true);
      const amount = parseEther(supplyAmount);
      const marketParamsAbi = marketParamsToAbi(marketParams);
      
      // First approve the token
      await writeContract({
        address: contracts.tokens.fakeUSD as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [contracts.morpho.morphoBlueCore, amount],
      });

      toast.success(`Supplying ${supplyAmount} fakeUSD...`);
      
      // Then supply to the market
      await writeContract({
        address: contracts.morpho.morphoBlueCore,
        abi: morphoBlueAbi,
        functionName: 'supply',
        args: [marketParamsAbi, amount, BigInt(0), address!, '0x'],
      });

      setSupplyAmount('');
    } catch (err) {
      toast.error('Supply failed: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBorrow = async () => {
    if (!isConnected || !borrowAmount || !marketParams) {
      toast.error('Please connect wallet and enter amount');
      return;
    }

    try {
      setIsProcessing(true);
      const amount = parseEther(borrowAmount);
      const marketParamsAbi = marketParamsToAbi(marketParams);
      
      await writeContract({
        address: contracts.morpho.morphoBlueCore,
        abi: morphoBlueAbi,
        functionName: 'borrow',
        args: [marketParamsAbi, amount, BigInt(0), address!, address!],
      });

      toast.success(`Borrowing ${borrowAmount} fakeUSD...`);
      setBorrowAmount('');
    } catch (err) {
      toast.error('Borrow failed: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSupplyCollateral = async () => {
    if (!isConnected || !collateralAmount || !marketParams) {
      toast.error('Please connect wallet and enter amount');
      return;
    }

    try {
      setIsProcessing(true);
      const amount = parseEther(collateralAmount);
      const marketParamsAbi = marketParamsToAbi(marketParams);
      
      // First approve the collateral token
      await writeContract({
        address: contracts.tokens.fakeTIA as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [contracts.morpho.morphoBlueCore, amount],
      });

      toast.success(`Supplying ${collateralAmount} fakeTIA as collateral...`);
      
      // Then supply collateral
      await writeContract({
        address: contracts.morpho.morphoBlueCore,
        abi: morphoBlueAbi,
        functionName: 'supplyCollateral',
        args: [marketParamsAbi, amount, address!, '0x'],
      });

      setCollateralAmount('');
    } catch (err) {
      toast.error('Collateral supply failed: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRepay = async () => {
    if (!isConnected || !repayAmount || !marketParams) {
      toast.error('Please connect wallet and enter amount');
      return;
    }

    try {
      setIsProcessing(true);
      const amount = parseEther(repayAmount);
      const marketParamsAbi = marketParamsToAbi(marketParams);
      
      // First approve the token
      await writeContract({
        address: contracts.tokens.fakeUSD as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [contracts.morpho.morphoBlueCore, amount],
      });

      toast.success(`Repaying ${repayAmount} fakeUSD...`);
      
      // Then repay
      await writeContract({
        address: contracts.morpho.morphoBlueCore,
        abi: morphoBlueAbi,
        functionName: 'repay',
        args: [marketParamsAbi, amount, BigInt(0), address!, '0x'],
      });

      setRepayAmount('');
    } catch (err) {
      toast.error('Repay failed: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if all prerequisites are met
  const hasTokens = contracts.tokens.fakeUSD && contracts.tokens.fakeTIA;
  const hasOracle = contracts.oracles.oracle;
  const canCreateMarket = hasTokens && hasOracle;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Sandbox Market</h2>
        <div className="flex items-center space-x-2">
          {!isConnected && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              🔌 Disconnected
            </span>
          )}
          {isMarketCreated ? (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              ✅ Created
            </span>
          ) : (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              ⏳ Pending
            </span>
          )}
            </div>
          </div>

      <div className="space-y-6">
        {/* Connection Warning */}
        {!isConnected && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Wallet Not Connected</p>
                <p className="text-xs text-blue-600 mt-1">
                  Connect your wallet to interact with the market. Make sure you&apos;re on Eden Testnet (Chain ID: 3735928814).
                </p>
              </div>
            </div>
          </div>
        )}
          {/* Market Configuration */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Market Configuration</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Loan Token:</span>
              <div className="mt-1">
                {contracts.tokens.fakeUSD ? (
                  <AddressLink address={contracts.tokens.fakeUSD} label="fakeUSD token" />
                ) : (
                  <span className="text-gray-400 text-xs">Not deployed</span>
                )}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Collateral Token:</span>
              <div className="mt-1">
                {contracts.tokens.fakeTIA ? (
                  <AddressLink address={contracts.tokens.fakeTIA} label="fakeTIA token" />
                ) : (
                  <span className="text-gray-400 text-xs">Not deployed</span>
                )}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Oracle:</span>
              <div className="mt-1">
                {contracts.oracles.oracle ? (
                  <AddressLink address={contracts.oracles.oracle} label="Oracle contract" />
                ) : (
                  <span className="text-gray-400 text-xs">Not deployed</span>
                )}
                </div>
              </div>
              <div>
                <span className="text-gray-600">IRM:</span>
              <div className="mt-1">
                <AddressLink address={contracts.morpho.irmMock} label="IRM Mock (Eden)" />
              </div>
            </div>
            <div>
              <span className="text-gray-600">Morpho Blue:</span>
              <div className="mt-1">
                <AddressLink address={contracts.morpho.morphoBlueCore} label="Morpho Blue Core" />
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

        {/* Deployment Warning (only show if critical components are missing) */}
        {!canCreateMarket && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800">Missing Contract Deployments</p>
                <div className="mt-2 space-y-1 text-xs text-yellow-700">
                  {!hasTokens && (
                    <div>❌ Tokens (fakeUSD, fakeTIA) not deployed</div>
                  )}
                  {!hasOracle && (
                    <div>❌ Oracle not deployed</div>
                  )}
                </div>
                <div className="mt-3 text-xs">
                  <p className="font-medium text-yellow-800">Next steps:</p>
                  <ol className="mt-1 ml-4 list-decimal space-y-1 text-yellow-700">
                    <li>Run deployment scripts from <code className="bg-yellow-100 px-1 rounded">contracts/</code> directory</li>
                    <li>See <code className="bg-yellow-100 px-1 rounded">README.md</code> → Quick Start section for deployment sequence</li>
                    <li>Check Troubleshooting section if deployment fails</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
          )}

        {/* Market Actions */}
              <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Market Actions</h3>
          
          {/* Create Market Button (if not created) */}
          {canCreateMarket && !isMarketCreated && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <button
                onClick={handleCreateMarket}
                disabled={!isConnected}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {isConnected ? 'Create Market' : 'Connect Wallet to Create Market'}
              </button>
              </div>
            )}

          {/* Market Interaction Actions (if market exists) */}
            {isMarketCreated && (
            <div className="space-y-4">
              {/* Supply & Borrow Section */}
              <div className="grid grid-cols-2 gap-3">
                {/* Supply */}
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <h4 className="text-xs font-medium text-green-800 mb-2">💰 Supply fakeUSD</h4>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      value={supplyAmount}
                      onChange={(e) => setSupplyAmount(e.target.value)}
                      placeholder="100"
                      className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                      disabled={isProcessing || isPending || isConfirming}
                    />
                    <button
                      onClick={handleSupply}
                      disabled={!isConnected || !supplyAmount || isProcessing || isPending || isConfirming}
                      className="w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isProcessing || isPending || isConfirming ? 'Processing...' : 'Supply'}
                    </button>
                  </div>
                </div>

                {/* Borrow */}
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <h4 className="text-xs font-medium text-red-800 mb-2">📤 Borrow fakeUSD</h4>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      value={borrowAmount}
                      onChange={(e) => setBorrowAmount(e.target.value)}
                      placeholder="50"
                      className="w-full px-2 py-1 text-xs border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                      disabled={isProcessing || isPending || isConfirming}
                    />
                    <button
                      onClick={handleBorrow}
                      disabled={!isConnected || !borrowAmount || isProcessing || isPending || isConfirming}
                      className="w-full px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isProcessing || isPending || isConfirming ? 'Processing...' : 'Borrow'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Collateral & Repay Section */}
              <div className="grid grid-cols-2 gap-3">
                {/* Supply Collateral */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <h4 className="text-xs font-medium text-blue-800 mb-2">🔒 Collateral fakeTIA</h4>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      value={collateralAmount}
                      onChange={(e) => setCollateralAmount(e.target.value)}
                      placeholder="25"
                      className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={isProcessing || isPending || isConfirming}
                    />
                    <button
                      onClick={handleSupplyCollateral}
                      disabled={!isConnected || !collateralAmount || isProcessing || isPending || isConfirming}
                      className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isProcessing || isPending || isConfirming ? 'Processing...' : 'Add Collateral'}
                    </button>
                  </div>
                </div>

                {/* Repay */}
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <h4 className="text-xs font-medium text-orange-800 mb-2">💸 Repay fakeUSD</h4>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      placeholder="25"
                      className="w-full px-2 py-1 text-xs border border-orange-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                      disabled={isProcessing || isPending || isConfirming}
                    />
                    <button
                      onClick={handleRepay}
                      disabled={!isConnected || !repayAmount || isProcessing || isPending || isConfirming}
                      className="w-full px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isProcessing || isPending || isConfirming ? 'Processing...' : 'Repay'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Scenario Buttons */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <h4 className="text-xs font-medium text-gray-700 mb-2">⚡ Quick Scenarios</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setSupplyAmount('1000');
                      setCollateralAmount('500');
                      setBorrowAmount('300');
                    }}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    disabled={isProcessing || isPending || isConfirming}
                  >
                    Conservative
                  </button>
                  <button
                    onClick={() => {
                      setSupplyAmount('500');
                      setCollateralAmount('200');
                      setBorrowAmount('150');
                    }}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    disabled={isProcessing || isPending || isConfirming}
                  >
                    Balanced
                  </button>
              <button
                    onClick={() => {
                      setSupplyAmount('200');
                      setCollateralAmount('100');
                      setBorrowAmount('80');
                    }}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    disabled={isProcessing || isPending || isConfirming}
                  >
                    Aggressive
              </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Click to populate fields with preset amounts for different risk scenarios
                </p>
              </div>

              {/* Transaction Status */}
              {(isPending || isConfirming || error) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="text-xs">
                    {isPending && (
                      <div className="flex items-center text-yellow-800">
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-yellow-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Transaction pending...
                      </div>
                    )}
                    {isConfirming && (
                      <div className="flex items-center text-blue-800">
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Confirming transaction...
                      </div>
                    )}
                    {isConfirmed && (
                      <div className="text-green-800">
                        ✅ Transaction confirmed!
                      </div>
                    )}
                    {error && (
                      <div className="text-red-800">
                        ❌ Error: {error.message}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Connection Prompt */}
          {!isConnected && (
            <div className="text-center py-4 text-sm text-gray-500">
              Connect your wallet to interact with the market
            </div>
            )}
          </div>


        {/* Market Metrics (real-time data from chain) */}
          {isMarketCreated && (
            <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              Market Metrics
              {marketMetrics.isLoading && (
                <svg className="animate-spin ml-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {marketMetrics.error && (
                <span className="ml-2 text-red-500 text-xs">⚠️ Error loading</span>
              )}
            </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-green-50 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="text-green-600 font-medium">Supply APR:</span>
                  <div className="flex items-center">
                    <span className={`font-bold ${
                      marketMetrics.error ? 'text-red-500' : 
                      marketMetrics.supplyAPR === 'Oracle Stale' || marketMetrics.supplyAPR === 'SDK Limitation' ? 'text-orange-600' : 
                      'text-green-700'
                    }`}>
                      {marketMetrics.error ? 'Error' : marketMetrics.supplyAPR === 'SDK Limitation' ? 'N/A' : `${marketMetrics.supplyAPR}%`}
                    </span>
                    {(marketMetrics.supplyAPR === 'Oracle Stale' || marketMetrics.supplyAPR === 'SDK Limitation') && (
                      <div className="relative ml-1 group">
                        <svg className="w-4 h-4 text-orange-500 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          <div className="text-center">
                            {marketMetrics.supplyAPR === 'Oracle Stale' ? (
                              <>
                                <div className="font-medium">Oracle Price is Stale</div>
                                <div className="mt-1">Update the price in the &quot;Oracle Controls&quot; card above</div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium">SDK Limitation</div>
                                <div className="mt-1">Morpho SDK only supports Adaptive Curve IRMs</div>
                              </>
                            )}
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="text-red-600 font-medium">Borrow APR:</span>
                  <div className="flex items-center">
                    <span className={`font-bold ${
                      marketMetrics.error ? 'text-red-500' : 
                      marketMetrics.borrowAPR === 'Oracle Stale' || marketMetrics.borrowAPR === 'SDK Limitation' ? 'text-orange-600' : 
                      'text-red-700'
                    }`}>
                      {marketMetrics.error ? 'Error' : marketMetrics.borrowAPR === 'SDK Limitation' ? 'N/A' : `${marketMetrics.borrowAPR}%`}
                    </span>
                    {(marketMetrics.borrowAPR === 'Oracle Stale' || marketMetrics.borrowAPR === 'SDK Limitation') && (
                      <div className="relative ml-1 group">
                        <svg className="w-4 h-4 text-orange-500 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          <div className="text-center">
                            {marketMetrics.borrowAPR === 'Oracle Stale' ? (
                              <>
                                <div className="font-medium">Oracle Price is Stale</div>
                                <div className="mt-1">Update the price in the &quot;Oracle Controls&quot; card above</div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium">SDK Limitation</div>
                                <div className="mt-1">Morpho SDK only supports Adaptive Curve IRMs</div>
                              </>
                            )}
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 font-medium">Utilization:</span>
                  <span className={`font-bold ${marketMetrics.error ? 'text-red-500' : 'text-blue-700'}`}>
                    {marketMetrics.error ? 'Error' : `${marketMetrics.utilization}%`}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Supply:</span>
                  <span className={`ml-2 font-medium ${marketMetrics.error ? 'text-red-500' : ''}`}>
                    {marketMetrics.error ? 'Error' : formatTokenAmount(marketMetrics.totalSupply)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <p>
                📊 Total Borrowed: {marketMetrics.error ? 'Error' : `${formatTokenAmount(marketMetrics.totalBorrow)}`} fakeUSD
              </p>
              <p className="mt-1">
                🔄 Updates every 30s • APR calculated from IRM using Morpho SDK
              </p>
            </div>
          </div>
        )}

        {/* Enhanced Market Insights Section */}
        {isMarketCreated && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              Advanced Market Insights
              {marketInsights.isLoading && (
                <svg className="animate-spin ml-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {marketInsights.error && (
                <span className="ml-2 text-red-500 text-xs">⚠️ Error</span>
              )}
            </h4>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-blue-50 rounded-md p-2">
                <span className="text-blue-600 font-medium">Available Liquidity:</span>
                <div className="text-blue-800 font-semibold">
                  {marketInsights.error ? 'Error' : `${formatTokenAmount(marketInsights.availableLiquidity)} fakeUSD`}
                </div>
              </div>
              
              <div className="bg-green-50 rounded-md p-2">
                <span className="text-green-600 font-medium">Total Value Locked:</span>
                <div className="text-green-800 font-semibold">
                  {marketInsights.error ? 'Error' : `${formatTokenAmount(marketInsights.totalValueLocked)} fakeUSD`}
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-md p-2">
                <span className="text-purple-600 font-medium">Rate at Target:</span>
                <div className="text-purple-800 font-semibold">
                  {marketInsights.error ? 'Error' : `${marketInsights.rateAtTarget}%`}
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-md p-2">
                <span className="text-orange-600 font-medium">Market Status:</span>
                <div className="text-orange-800 font-semibold">
                  {marketInsights.error ? 'Error' : (marketInsights.isIdle ? '💤 Idle' : '🔥 Active')}
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-gray-500">
              <p>📈 Optimal Utilization: {marketInsights.optimalUtilization}%</p>
              <p>⏰ Last Update: {marketInsights.lastUpdateTime}</p>
              <p className="mt-2 text-purple-600">ℹ️ Rate at Target: IRM Mock uses simple utilization-based rates (no target concept like AdaptiveCurveIRM)</p>
              <p className="mt-1 text-blue-600">✨ Powered by Morpho Blue SDK</p>
            </div>
            </div>
          )}

        {/* Market Status */}
        <div className="border-t border-gray-200 pt-4">
          {isMarketCreated ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">Market Active</p>
                  <p className="text-xs text-green-600 font-mono mt-1 break-all">
                    ID: {marketData.id}
                  </p>
                  {marketMetrics.error && (
                    <div className="mt-2 text-xs text-red-600">
                      <p className="font-medium">⚠️ Data Loading Error</p>
                      <p className="mt-1">Possible issues:</p>
                      <ul className="ml-4 mt-1 list-disc space-y-0.5">
                        <li>RPC connection problem - check your network</li>
                        <li>Contract address mismatch - verify deployment</li>
                      </ul>
                      <p className="mt-2">
                        See <code className="bg-red-100 px-1 rounded">README.md</code> → Troubleshooting section
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Market Not Deployed</p>
                  <p className="text-xs text-gray-600 mt-1">
                    No market found on-chain. Run the deployment scripts to create the market.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    📖 See <code className="bg-gray-200 px-1 rounded">README.md</code> Quick Start section
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}