'use client';

import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import toast from 'react-hot-toast';
import { addresses } from '../../config/addresses';

// Minimal Aggregator ABI
const aggregatorAbi = [
  {
    type: 'function',
    name: 'latestRoundData',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'description',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setAnswer',
    inputs: [
      { name: 'answer', type: 'int256' },
      { name: 'roundId', type: 'uint80' },
      { name: 'updatedAt', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

interface OracleCardProps {
  onRefresh: () => void;
}

export default function OracleCard({ onRefresh }: OracleCardProps) {
  const { address: userAddress, isConnected } = useAccount();
  const [customPrice, setCustomPrice] = useState('5.00');

  const aggregatorAddress = addresses.oracles.aggregator.address;

  // Read oracle data
  const { data: latestRoundData, refetch: refetchPrice } = useReadContract({
    address: aggregatorAddress as `0x${string}`,
    abi: aggregatorAbi,
    functionName: 'latestRoundData',
    query: { enabled: !!aggregatorAddress && isConnected },
  });

  const { data: decimals } = useReadContract({
    address: aggregatorAddress as `0x${string}`,
    abi: aggregatorAbi,
    functionName: 'decimals',
    query: { enabled: !!aggregatorAddress && isConnected },
  });

  const { data: description } = useReadContract({
    address: aggregatorAddress as `0x${string}`,
    abi: aggregatorAbi,
    functionName: 'description',
    query: { enabled: !!aggregatorAddress && isConnected },
  });

  // Write contract for setting price
  const { writeContract, data: setPriceTxHash, isPending } = useWriteContract();

  const { isLoading: isSetPriceConfirming } = useWaitForTransactionReceipt({
    hash: setPriceTxHash,
  });

  // Handle transaction success/error separately
  React.useEffect(() => {
    if (setPriceTxHash && !isSetPriceConfirming) {
      toast.success(`Price updated to ${customPrice}!`);
      refetchPrice();
      onRefresh();
    }
  }, [setPriceTxHash, isSetPriceConfirming, customPrice, refetchPrice, onRefresh]);

  const handleSetPrice = async (priceValue: string) => {
    if (!userAddress || !aggregatorAddress) {
      toast.error('Please connect your wallet and ensure aggregator is deployed');
      return;
    }

    try {
      const priceDecimals = decimals || 8;
      const price = parseUnits(priceValue, priceDecimals);
      
      writeContract({
        address: aggregatorAddress as `0x${string}`,
        abi: aggregatorAbi,
        functionName: 'setAnswer',
        args: [price, BigInt(0), BigInt(0)], // auto-increment roundId, use current timestamp
      });

      toast.loading(`Setting price to ${priceValue}...`, { id: 'set-price-tx' });
    } catch (error) {
      console.error('Set price error:', error);
      toast.error('Failed to set price');
    }
  };

  const handlePresetPrice = (preset: string) => {
    if (!latestRoundData || !decimals) return;
    
    const currentPrice = Number(formatUnits(latestRoundData[1], decimals));
    let newPrice: number;
    
    switch (preset) {
      case '+5%':
        newPrice = currentPrice * 1.05;
        break;
      case '-5%':
        newPrice = currentPrice * 0.95;
        break;
      case '+20%':
        newPrice = currentPrice * 1.20;
        break;
      case '-20%':
        newPrice = currentPrice * 0.80;
        break;
      case 'crash':
        newPrice = currentPrice * 0.50; // 50% crash
        break;
      case 'recovery':
        newPrice = currentPrice * 2.00; // 100% recovery
        break;
      default:
        return;
    }
    
    const newPriceStr = newPrice.toFixed(decimals === 8 ? 8 : 18);
    handleSetPrice(newPriceStr);
  };

  const isAggregatorDeployed = aggregatorAddress && aggregatorAddress !== '';
  const isUpdating = isPending || isSetPriceConfirming;

  // Format current price
  const currentPrice = latestRoundData && decimals 
    ? formatUnits(latestRoundData[1], decimals)
    : '0.00000000';

  // Format last update time
  const lastUpdate = latestRoundData 
    ? new Date(Number(latestRoundData[3]) * 1000).toLocaleString()
    : 'Never';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Oracle Controls
      </h2>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Please connect your wallet to control the oracle</p>
        </div>
      ) : !isAggregatorDeployed ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">Aggregator not deployed yet</p>
          <p className="text-sm text-gray-500">
            Run the deployment script: <code className="bg-gray-100 px-2 py-1 rounded">npm run ops:deploy:aggregator</code>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current Price Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Price
            </label>
            <div className="bg-gray-50 rounded-md p-4">
              <div className="text-2xl font-bold text-gray-900">
                {currentPrice}
              </div>
              <div className="text-sm text-gray-600">
                {description || addresses.oracles.aggregator.pair}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Last updated: {lastUpdate}
              </div>
            </div>
          </div>

          {/* Custom Price Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Set Custom Price
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                step="0.00000001"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="5.00000000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUpdating}
              />
              <button
                onClick={() => handleSetPrice(customPrice)}
                disabled={isUpdating || !customPrice}
                className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Setting...' : 'Set Price'}
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['+5%', '-5%', '+20%', '-20%', 'crash', 'recovery'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetPrice(preset)}
                  disabled={isUpdating || !latestRoundData}
                  className={`px-3 py-2 text-sm rounded-md font-medium ${
                    preset.includes('crash') || preset.includes('-')
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : preset.includes('recovery') || preset.includes('+')
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Oracle Info */}
          <div className="pt-2 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Decimals:</span>
                <span className="ml-2 font-medium">{decimals || 8}</span>
              </div>
              <div>
                <span className="text-gray-600">Round ID:</span>
                <span className="ml-2 font-medium">{latestRoundData ? latestRoundData[0].toString() : '0'}</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-gray-600 text-sm">Address:</span>
              <div className="bg-gray-50 rounded-md p-2 font-mono text-xs break-all mt-1">
                {aggregatorAddress}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-yellow-800">
                  Price changes affect collateral values and health factors in the market.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
