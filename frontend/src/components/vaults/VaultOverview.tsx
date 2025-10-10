'use client';

import { useVaultData } from '@/hooks/useVaultData';
import { useSupplyCap } from '@/hooks/useSupplyCap';
import { useSupplyQueue } from '@/hooks/useSupplyQueue';
import { useVaultAllocation } from '@/hooks/useVaultAllocation';
import { vaults } from '@/lib/contracts';
import { formatUnits } from 'viem';
import { AddressLink } from '@/components/ui/AddressLink';

export function VaultOverview() {
  const { data: vaultData, isLoading, error, isFetching } = useVaultData();
  const { data: supplyCapData, isLoading: supplyCapLoading, isFetching: supplyCapFetching } = useSupplyCap();
  const { data: supplyQueueLength, isLoading: supplyQueueLoading, isFetching: supplyQueueFetching } = useSupplyQueue();
  const { data: allocationData, isFetching: allocationFetching } = useVaultAllocation();

  if (!vaults.metaMorphoDemo.address) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vault Overview</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">
            Vault not deployed yet. Please deploy the vault first using the deployment scripts.
          </p>
        </div>
      </div>
    );
  }

  const isInitialLoading = isLoading;
  const isAnyFetching = isFetching || supplyCapFetching || supplyQueueFetching || allocationFetching;

  if (isInitialLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vault Overview</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vault Overview</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">
            Error loading vault data: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!vaultData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vault Overview</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const sharePrice = vaultData?.totalSupply && vaultData?.totalSupply > BigInt(0) 
    ? Number(vaultData.totalAssets) / Number(vaultData.totalSupply)
    : 1;

  return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">Vault Overview</h2>
            {isAnyFetching && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-gray-500">Updating...</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
          {/* Supply Cap Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              supplyCapLoading ? 'bg-gray-400' :
              supplyCapData?.supplyCap === BigInt(0) ? 'bg-red-400' : 'bg-green-400'
            }`}></div>
            <span className="text-xs text-gray-600">
              {supplyCapLoading ? 'Loading...' :
               supplyCapData?.supplyCap === BigInt(0) ? 'No Supply Cap' : 'Cap Set'
              }
            </span>
          </div>
          {/* Supply Queue Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              supplyQueueLoading ? 'bg-gray-400' :
              supplyQueueLength === BigInt(0) ? 'bg-red-400' : 'bg-green-400'
            }`}></div>
            <span className="text-xs text-gray-600">
              {supplyQueueLoading ? 'Loading...' :
               supplyQueueLength === BigInt(0) ? 'Queue Empty' : 'Queue Set'
              }
            </span>
          </div>
          {/* Vault Status */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Vault Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Name:</span>
              <span className="text-sm font-medium">{vaults.metaMorphoDemo.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Symbol:</span>
              <span className="text-sm font-medium">{vaults.metaMorphoDemo.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Asset:</span>
              <span className="text-sm font-medium">fakeUSD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Timelock:</span>
              <span className="text-sm font-medium text-green-600">0 (Demo Mode)</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Vault Metrics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Assets:</span>
              <span className="text-sm font-medium">
                {vaultData?.totalAssets 
                  ? `${parseFloat(formatUnits(vaultData.totalAssets, 18)).toFixed(6)} fakeUSD`
                  : '0.000000 fakeUSD'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Supply:</span>
              <span className="text-sm font-medium">
                {vaultData?.totalSupply 
                  ? `${parseFloat(formatUnits(vaultData.totalSupply, 18)).toFixed(6)} ${vaults.metaMorphoDemo.symbol}`
                  : `0.000000 ${vaults.metaMorphoDemo.symbol}`
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Share Price:</span>
              <span className="text-sm font-medium">
                {sharePrice.toFixed(8)} fakeUSD
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Fee:</span>
              <span className="text-sm font-medium">
                {vaultData?.fee ? `${Number(vaultData.fee) / 1e16}%` : '0%'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Supply Cap:</span>
              <span className="text-sm font-medium">
                {supplyCapLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : supplyCapData?.supplyCap ? (
                  <span className={supplyCapData.supplyCap === BigInt(0) ? 'text-red-600' : 'text-green-600'}>
                    {supplyCapData.supplyCap === BigInt(0) 
                      ? 'Not Set' 
                      : `${parseFloat(formatUnits(supplyCapData.supplyCap, 18)).toLocaleString()} fakeUSD`
                    }
                  </span>
                ) : (
                  <span className="text-red-600">Not Set</span>
                )}
              </span>
            </div>
            {supplyCapData?.pendingCap && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pending Cap:</span>
                <span className="text-sm font-medium text-yellow-600">
                  {parseFloat(formatUnits(supplyCapData.pendingCap.value, 18)).toLocaleString()} fakeUSD
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Supply Queue:</span>
              <span className="text-sm font-medium">
                {supplyQueueLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : supplyQueueLength !== undefined ? (
                  <span className={supplyQueueLength === BigInt(0) ? 'text-red-600' : 'text-green-600'}>
                    {supplyQueueLength === BigInt(0) 
                      ? '⚠️ Empty (Deposits Disabled)' 
                      : `${supplyQueueLength.toString()} market${supplyQueueLength > BigInt(1) ? 's' : ''}`
                    }
                  </span>
                ) : (
                  <span className="text-red-600">⚠️ Not Configured</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Governance</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-600">Owner:</span>
            <div className="text-gray-900 break-all">
              {vaultData?.owner ? (
                <AddressLink address={vaultData.owner} />
              ) : (
                'Loading...'
              )}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Curator:</span>
            <div className="text-gray-900 break-all">
              {vaultData?.curator ? (
                <AddressLink address={vaultData.curator} />
              ) : (
                'Loading...'
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Vault Address:</span>
          {vaults.metaMorphoDemo.address ? (
            <AddressLink 
              address={vaults.metaMorphoDemo.address} 
              className="text-gray-500 hover:text-blue-600"
            />
          ) : (
            <span className="font-mono">Not available</span>
          )}
        </div>
      </div>
    </div>
  );
}
