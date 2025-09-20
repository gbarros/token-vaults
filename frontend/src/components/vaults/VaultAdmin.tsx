'use client';

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'react-hot-toast';
import { useVaultData } from '@/hooks/useVaultData';
import { useVaultAllocation } from '@/hooks/useVaultAllocation';
import { vaults, getMarketParams } from '@/lib/contracts';
import { metaMorphoAbi } from '@/lib/abis';
import { AddressLink } from '@/components/ui/AddressLink';

export function VaultAdmin() {
  const { address } = useAccount();
  const { data: vaultData } = useVaultData();
  const { data: allocationData } = useVaultAllocation();
  const [newSupplyCap, setNewSupplyCap] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const { writeContract: writeSubmitCap, data: submitCapHash } = useWriteContract();
  const { writeContract: writeAcceptCap, data: acceptCapHash } = useWriteContract();
  const { writeContract: writeSetSupplyQueue, data: setSupplyQueueHash } = useWriteContract();
  const { writeContract: writeReallocate, data: reallocateHash } = useWriteContract();

  const { isLoading: submitCapLoading } = useWaitForTransactionReceipt({
    hash: submitCapHash,
  });
  const { isLoading: acceptCapLoading } = useWaitForTransactionReceipt({
    hash: acceptCapHash,
  });
  const { isLoading: setSupplyQueueLoading } = useWaitForTransactionReceipt({
    hash: setSupplyQueueHash,
  });
  const { isLoading: reallocateLoading } = useWaitForTransactionReceipt({
    hash: reallocateHash,
  });

  const isLoading = submitCapLoading || acceptCapLoading || setSupplyQueueLoading || reallocateLoading;

  // Role checking
  const isOwner = address && vaultData?.owner && 
    address.toLowerCase() === vaultData.owner.toLowerCase();
  const isCurator = address && vaultData?.curator && 
    address.toLowerCase() === vaultData.curator.toLowerCase();
  
  // For now, assume owner has all roles (which is correct in our setup)
  const hasOwnerRole = isOwner;
  const hasCuratorRole = isOwner || isCurator;
  const hasAllocatorRole = isOwner; // Owner is set as allocator in deployment

  const marketParams = getMarketParams();

  if (!isOwner || !vaults.metaMorphoDemo.address || !marketParams || !vaultData) {
    return null;
  }

  const handleSubmitCap = async () => {
    console.log('handleSubmitCap called');
    console.log('vaults.metaMorphoDemo.address:', vaults.metaMorphoDemo.address);
    console.log('marketParams:', marketParams);
    console.log('newSupplyCap:', newSupplyCap);
    
    if (!vaults.metaMorphoDemo.address || !marketParams || !newSupplyCap) {
      console.log('Early return - missing required values');
      return;
    }

    try {
      const capAmount = parseUnits(newSupplyCap, 18);
      console.log('capAmount:', capAmount);
      
      // Convert MarketParams to plain object if needed
      const marketParamsObj = {
        loanToken: marketParams.loanToken,
        collateralToken: marketParams.collateralToken,
        oracle: marketParams.oracle,
        irm: marketParams.irm,
        lltv: marketParams.lltv,
      };
      console.log('marketParamsObj:', marketParamsObj);
      
      writeSubmitCap({
        address: vaults.metaMorphoDemo.address as `0x${string}`,
        abi: metaMorphoAbi,
        functionName: 'submitCap',
        args: [marketParamsObj, capAmount],
      });
      toast.success('Supply cap submission transaction sent');
    } catch (error) {
      console.error('Submit cap error:', error);
      toast.error('Failed to submit supply cap');
    }
  };

  const handleAcceptCap = async () => {
    console.log('handleAcceptCap called');
    console.log('vaults.metaMorphoDemo.address:', vaults.metaMorphoDemo.address);
    console.log('marketParams:', marketParams);
    
    if (!vaults.metaMorphoDemo.address || !marketParams) {
      console.log('Early return - missing required values');
      return;
    }

    try {
      // Convert MarketParams to plain object if needed
      const marketParamsObj = {
        loanToken: marketParams.loanToken,
        collateralToken: marketParams.collateralToken,
        oracle: marketParams.oracle,
        irm: marketParams.irm,
        lltv: marketParams.lltv,
      };
      console.log('marketParamsObj:', marketParamsObj);
      
      writeAcceptCap({
        address: vaults.metaMorphoDemo.address as `0x${string}`,
        abi: metaMorphoAbi,
        functionName: 'acceptCap',
        args: [marketParamsObj],
      });
      toast.success('Accept cap transaction sent');
    } catch (error) {
      console.error('Accept cap error:', error);
      toast.error('Failed to accept supply cap');
    }
  };

  const handleSetSupplyQueue = async () => {
    console.log('handleSetSupplyQueue called');
    
    if (!vaults.metaMorphoDemo.address || !marketParams) {
      console.log('Early return - missing required values');
      return;
    }

    try {
      const marketId = marketParams.id;
      console.log('Setting supply queue with market ID:', marketId);
      
      writeSetSupplyQueue({
        address: vaults.metaMorphoDemo.address as `0x${string}`,
        abi: metaMorphoAbi,
        functionName: 'setSupplyQueue',
        args: [[marketId]], // Array of market IDs
      });
      toast.success('Supply queue update transaction sent');
    } catch (error) {
      console.error('Set supply queue error:', error);
      toast.error('Failed to set supply queue');
    }
  };

  const handleReallocate = async () => {
    console.log('handleReallocate called');
    
    if (!vaults.metaMorphoDemo.address || !marketParams || !vaultData?.totalAssets) {
      console.log('Early return - missing required values');
      return;
    }

    try {
      // Convert MarketParams to plain object
      const marketParamsObj = {
        loanToken: marketParams.loanToken,
        collateralToken: marketParams.collateralToken,
        oracle: marketParams.oracle,
        irm: marketParams.irm,
        lltv: marketParams.lltv,
      };

      // Use type(uint256).max to allocate all available idle funds
      const maxUint256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      const allocation = {
        marketParams: marketParamsObj,
        assets: maxUint256, // type(uint256).max - allocates all available idle funds
      };

      console.log('Reallocating with allocation:', allocation);
      
      writeReallocate({
        address: vaults.metaMorphoDemo.address as `0x${string}`,
        abi: metaMorphoAbi,
        functionName: 'reallocate',
        args: [[allocation]], // Array of MarketAllocation
      });
      toast.success('Portfolio rebalancing transaction sent - optimizing fund allocation!');
    } catch (error) {
      console.error('Reallocate error:', error);
      toast.error('Failed to reallocate funds');
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-900">Vault Administration</h2>
          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Owner Only
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-purple-600 hover:text-purple-800 transition-colors"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Vault Info */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Vault Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Owner:</span>
                <div className="text-xs mt-1">
                  <AddressLink 
                    address={vaultData.owner} 
                    displayLength={{ start: 10, end: 8 }}
                    className="text-xs"
                  />
                </div>
              </div>
              <div>
                <span className="text-gray-600">Curator:</span>
                <div className="text-xs mt-1">
                  <AddressLink 
                    address={vaultData.curator} 
                    displayLength={{ start: 10, end: 8 }}
                    className="text-xs"
                  />
                </div>
              </div>
              <div>
                <span className="text-gray-600">Fee:</span>
                <div className="mt-1">
                  {vaultData.fee ? (Number(vaultData.fee) / 1e16).toFixed(2) : '0.00'}%
                </div>
              </div>
              <div>
                <span className="text-gray-600">Guardian:</span>
                <div className="text-xs mt-1">
                  {vaultData.guardian === '0x0000000000000000000000000000000000000000' 
                    ? 'Not set' 
                    : (
                      <AddressLink 
                        address={vaultData.guardian} 
                        displayLength={{ start: 10, end: 8 }}
                        className="text-xs"
                      />
                    )
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Supply Cap Management */}
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <h3 className="text-sm font-medium text-gray-900">Supply Cap Management</h3>
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Curator Role</span>
            </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Supply Cap (fakeUSD)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={newSupplyCap}
                      onChange={(e) => setNewSupplyCap(e.target.value)}
                      placeholder="e.g., 500000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={isLoading}
                    />
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setNewSupplyCap('200000')}
                        className="flex-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded border-0 transition-colors"
                        disabled={isLoading}
                      >
                        200K
                      </button>
                      <button
                        onClick={() => setNewSupplyCap('500000')}
                        className="flex-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded border-0 transition-colors"
                        disabled={isLoading}
                      >
                        500K
                      </button>
                      <button
                        onClick={() => setNewSupplyCap('1000000')}
                        className="flex-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded border-0 transition-colors"
                        disabled={isLoading}
                      >
                        1M
                      </button>
                      <button
                        onClick={() => setNewSupplyCap('2000000')}
                        className="flex-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded border-0 transition-colors"
                        disabled={isLoading}
                      >
                        2M
                      </button>
                    </div>
                  </div>
                </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleSubmitCap}
                  disabled={isLoading || !newSupplyCap}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
                >
                  {submitCapLoading ? 'Submitting...' : 'Submit Cap'}
                </button>
                <button
                  onClick={handleAcceptCap}
                  disabled={isLoading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
                >
                  {acceptCapLoading ? 'Accepting...' : 'Accept Cap'}
                </button>
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
                <p className="font-medium mb-1">How it works:</p>
                <p>1. <strong>Submit Cap:</strong> Propose a new supply cap for the market</p>
                <p>2. <strong>Accept Cap:</strong> Activate the submitted cap (available immediately since timelock = 0)</p>
              </div>
            </div>
          </div>

          {/* Allocator Role Actions */}
          {hasAllocatorRole && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h3 className="text-sm font-medium text-gray-900">Supply Queue Management</h3>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Allocator Role</span>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                Manage which markets the vault can deposit into. The supply queue determines where deposits are allocated.
              </p>
              {allocationData?.idleAssets && allocationData.idleAssets > BigInt(0) && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-medium text-orange-800">Portfolio Rebalancing Needed</span>
                  </div>
                  <p className="text-xs text-orange-700">
                    ${parseFloat(formatUnits(allocationData.idleAssets, 18)).toFixed(2)} fakeUSD is currently unallocated.
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Use "Rebalance Portfolio" to optimize fund allocation and maximize yield.
                  </p>
                </div>
              )}
              {allocationData?.idleAssets === BigInt(0) && allocationData?.totalAssets > BigInt(0) && (
                <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-800">Portfolio Auto-Allocated</span>
                  </div>
                  <p className="text-xs text-green-700">
                    All ${parseFloat(formatUnits(allocationData.totalAssets, 18)).toFixed(2)} fakeUSD is automatically allocated and earning yield.
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    MetaMorpho automatically allocates deposits to markets in the supply queue. Manual rebalancing is only needed for strategy changes.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                    <span className="text-xs font-medium text-yellow-800">Current Market</span>
                  </div>
                  <p className="text-xs text-yellow-700">
                    fakeUSD/fakeTIA (86% LLTV)
                  </p>
                  <p className="text-xs text-yellow-600 mt-1 font-mono">
                    ID: {marketParams.id.slice(0, 10)}...{marketParams.id.slice(-8)}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={handleSetSupplyQueue}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    {setSupplyQueueLoading ? 'Setting Queue...' : 'Add Market to Supply Queue'}
                  </button>
                          <button
                            onClick={handleReallocate}
                            disabled={isLoading || !allocationData?.idleAssets || allocationData.idleAssets === BigInt(0)}
                            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
                          >
                            {reallocateLoading ? 'Rebalancing...' : '⚖️ Rebalance Portfolio'}
                          </button>
                </div>
                <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-md">
                  <p className="font-medium mb-1">⚖️ About Portfolio Rebalancing:</p>
                  <p>• <strong>Auto-allocation:</strong> Deposits are automatically allocated to markets in the supply queue</p>
                  <p>• <strong>Manual rebalancing:</strong> Move funds between markets or to idle for withdrawals</p>
                  <p>• <strong>Strategy changes:</strong> Adjust exposure across different markets</p>
                  <p className="mt-2 text-blue-600">
                    {allocationData?.idleAssets && allocationData.idleAssets > BigInt(0) 
                      ? `Action available: Deploy $${parseFloat(formatUnits(allocationData.idleAssets, 18)).toFixed(2)} idle funds to market`
                      : 'All deposits are auto-allocated. Manual rebalancing only needed for strategy changes.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* Owner Notice */}
          <div className="text-center">
            <p className="text-gray-500 text-xs">
              ⚠️ Owner privileges active - use responsibly
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
