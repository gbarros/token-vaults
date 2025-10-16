'use client';

import { useVaultData } from '@/hooks/useVaultData';
import { useVaultAPY } from '@/hooks/useVaultAPY';
import { formatUnits } from 'viem';
import { formatTokenString, formatCurrency } from '@/lib/formatNumber';

export function VaultPerformance() {
  const { data: vaultData, isLoading } = useVaultData();
  const { data: apy, isLoading: apyLoading } = useVaultAPY();

  const sharePrice = vaultData?.totalSupply && vaultData?.totalSupply > BigInt(0) 
    ? Number(vaultData.totalAssets) / Number(vaultData.totalSupply)
    : 1;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance</h2>

      <div className="grid grid-cols-1 gap-6">
        {/* APY Display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Current APY</h3>
                  <div className="mt-1">
                    {apyLoading ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-20"></div>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-green-600">
                        {apy ? `${apy.toFixed(2)}%` : '0.00%'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Weighted average across allocations
                  </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Share Price</div>
              <div className="text-lg font-semibold text-gray-900">
                {sharePrice.toFixed(8)}
              </div>
              <div className="text-xs text-gray-500">fakeUSD</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Value Locked</span>
              <span className="text-sm font-medium">
                {isLoading ? (
                  <div className="animate-pulse h-4 bg-gray-200 rounded w-20"></div>
                ) : (
                  vaultData?.totalAssets 
                    ? `$${formatCurrency(formatUnits(vaultData.totalAssets, 18))}`
                    : '$0'
                )}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Shares Outstanding</span>
              <span className="text-sm font-medium">
                {isLoading ? (
                  <div className="animate-pulse h-4 bg-gray-200 rounded w-20"></div>
                ) : (
                  vaultData?.totalSupply 
                    ? formatTokenString(formatUnits(vaultData.totalSupply, 18))
                    : '0'
                )}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last Update</span>
              <span className="text-sm font-medium">
                {vaultData?.lastUpdate 
                  ? new Date(Number(vaultData.lastUpdate) * 1000).toLocaleTimeString()
                  : 'Never'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">Share Price History</div>
            <div className="h-24 flex items-center justify-center">
              <div className="text-xs text-gray-400">
                Chart coming soon - tracking share price over time
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Performance Notes</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• APY is calculated from underlying market utilization and borrow rates</p>
          <p>• Share price increases as interest accrues to the vault</p>
          <p>• Performance depends on allocator strategy and market conditions</p>
        </div>
      </div>
    </div>
  );
}
