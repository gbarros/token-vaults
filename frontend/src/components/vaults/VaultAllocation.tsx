'use client';

import { useVaultAllocation } from '@/hooks/useVaultAllocation';
import { useMarketData } from '@/hooks/useMarketData';
import { formatUnits } from 'viem';

export function VaultAllocation() {
  const { data: allocation, isLoading: allocationLoading, isFetching: allocationFetching } = useVaultAllocation();
  const { data: marketData, isLoading: marketLoading, isFetching: marketFetching } = useMarketData();

  const isInitialLoading = allocationLoading || marketLoading;
  const isFetching = allocationFetching || marketFetching;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Allocation Strategy</h2>
        {isFetching && !isInitialLoading && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-gray-500">Updating...</span>
          </div>
        )}
      </div>

      {isInitialLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Queue Configuration */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Supply & Withdraw Queues</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-green-800 mb-2">Supply Queue</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-700">1. Sandbox Market</span>
                    <span className="text-xs text-green-600 font-medium">Active</span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-blue-800 mb-2">Withdraw Queue</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-700">1. Idle (Cash)</span>
                    <span className="text-xs text-blue-600 font-medium">Instant</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-700">2. Sandbox Market</span>
                    <span className="text-xs text-blue-600 font-medium">Queued</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Market Allocation */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Market Allocation</h3>
            <div className="space-y-3">
              {/* Sandbox Market */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Sandbox Market</h4>
                    <p className="text-xs text-gray-500">fakeTIA/fakeUSD • 86% LLTV</p>
                  </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {allocation?.marketAllocations?.[0]?.assets 
                          ? `${parseFloat(formatUnits(allocation.marketAllocations[0].assets, 18)).toFixed(2)} fakeUSD`
                          : '0.00 fakeUSD'
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {allocation?.totalAssets && allocation.totalAssets > BigInt(0)
                          ? `${((Number(allocation.marketAllocations?.[0]?.assets || BigInt(0)) / Number(allocation.totalAssets)) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Utilization:</span>
                    <div className="font-medium">
                      {marketData?.utilization ? `${(marketData.utilization * 100).toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Supply APY:</span>
                    <div className="font-medium text-green-600">
                      {marketData?.supplyAPY ? `${marketData.supplyAPY.toFixed(2)}%` : '0%'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Supply Cap:</span>
                    <div className="font-medium">
                      100 fakeUSD
                    </div>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Market Utilization</span>
                    <span>{marketData?.utilization ? `${(marketData.utilization * 100).toFixed(1)}%` : '0%'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${marketData?.utilization ? marketData.utilization * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Idle Position */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Idle Position</h4>
                    <p className="text-xs text-gray-500">Cash reserves • 0% yield</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {allocation?.idleAssets 
                        ? `${parseFloat(formatUnits(allocation.idleAssets, 18)).toFixed(2)} fakeUSD`
                        : '0.00 fakeUSD'
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {allocation?.totalAssets && allocation.totalAssets > BigInt(0)
                        ? `${((Number(allocation.idleAssets || BigInt(0)) / Number(allocation.totalAssets)) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Allocation Strategy Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Strategy Notes</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>• Funds are allocated to markets based on supply queue order</p>
              <p>• Withdrawals come from idle position first, then markets in withdraw queue order</p>
              <p>• Allocator can reallocate between markets to optimize yield</p>
              <p>• Supply caps limit maximum allocation per market for risk management</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
