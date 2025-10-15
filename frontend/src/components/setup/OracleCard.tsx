'use client';

import React, { useState, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import toast from 'react-hot-toast';
import { contracts } from '../../lib/contracts';

// OracleMock ABI from compiled Forge artifacts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const OracleMockArtifact = require('@contracts/out/OracleMock.sol/OracleMock.json');
const oracleMockAbi = OracleMockArtifact.abi;

interface OracleCardProps {
  onRefresh: () => void;
}

export default function OracleCard({ onRefresh }: OracleCardProps) {
  const { address: userAddress, isConnected } = useAccount();
  const [customPrice, setCustomPrice] = useState('5.00');

  // OracleMock uses 36 decimals (Morpho standard: 10^36 for price scaling)
  const ORACLE_DECIMALS = 36;
  
  const oracleAddress = contracts.oracles.oracle;

  // Read current price from OracleMock
  const { data: currentPriceRaw, refetch: refetchPrice } = useReadContract({
    address: oracleAddress as `0x${string}`,
    abi: oracleMockAbi,
    functionName: 'price',
    query: { enabled: !!oracleAddress && isConnected },
  }) as { data: bigint | undefined; refetch: () => void };

  // Write contract for setting price
  const { writeContract, data: setPriceTxHash, isPending, error: writeError } = useWriteContract();

  const { isLoading: isSetPriceConfirming, error: setPriceError } = useWaitForTransactionReceipt({
    hash: setPriceTxHash,
  });

  // Track if we've already handled this transaction
  const handledTxRef = useRef<string | null>(null);

  // Handle write contract errors
  React.useEffect(() => {
    if (writeError) {
      toast.dismiss('set-price-tx');
      toast.error('Failed to initiate price update transaction');
    }
  }, [writeError]);

  // Handle transaction success/error
  React.useEffect(() => {
    if (setPriceTxHash && setPriceTxHash !== handledTxRef.current) {
      if (setPriceError) {
        handledTxRef.current = setPriceTxHash;
        toast.dismiss('set-price-tx');
        toast.error('Transaction failed. Please try again.');
      } else if (!isSetPriceConfirming) {
        handledTxRef.current = setPriceTxHash;
        toast.dismiss('set-price-tx');
        toast.success(`Price updated to ${customPrice}!`);
        refetchPrice();
        onRefresh();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPriceTxHash, isSetPriceConfirming, setPriceError, customPrice]);

  const handleSetPrice = async (priceValue: string) => {
    if (!userAddress || !oracleAddress) {
      toast.error('Please connect your wallet and ensure oracle is deployed');
      return;
    }

    try {
      // OracleMock uses 36 decimals for Morpho compatibility
      const price = parseUnits(priceValue, ORACLE_DECIMALS);
      
      toast.loading(`Setting price to ${priceValue}...`, { id: 'set-price-tx' });
      
      writeContract({
        address: oracleAddress as `0x${string}`,
        abi: oracleMockAbi,
        functionName: 'setPrice',
        args: [price],
      });
    } catch (error) {
      console.error('Set price error:', error);
      toast.dismiss('set-price-tx');
      toast.error('Failed to set price');
    }
  };

  const handlePresetPrice = (preset: string) => {
    if (!currentPriceRaw) return;
    
    const currentPrice = Number(formatUnits(currentPriceRaw, ORACLE_DECIMALS));
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
        newPrice = currentPrice * 0.50;
        break;
      case 'recovery':
        newPrice = currentPrice * 2.00;
        break;
      default:
        return;
    }
    
    const newPriceStr = newPrice.toFixed(2);
    handleSetPrice(newPriceStr);
  };

  const isOracleDeployed = Boolean(oracleAddress);
  const isUpdating = isPending || isSetPriceConfirming;

  // Format current price (OracleMock uses 36 decimals)
  const currentPrice = currentPriceRaw 
    ? formatUnits(currentPriceRaw, ORACLE_DECIMALS)
    : '0.00';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Oracle Controls (Mock)
      </h2>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Please connect your wallet to control the oracle</p>
        </div>
      ) : !isOracleDeployed ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">Oracle not deployed yet</p>
          <p className="text-sm text-gray-500">
            Run the deployment script: <code className="bg-gray-100 px-2 py-1 rounded">DeployOracleMock.s.sol</code>
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
                {parseFloat(currentPrice).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">
                {contracts.oracles.aggregator.pair}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Using OracleMock (Morpho Blue built-in)
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
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="5.00"
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
                  disabled={isUpdating || !currentPriceRaw}
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
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-medium">OracleMock</span>
              </div>
              <div>
                <span className="text-gray-600">Decimals:</span>
                <span className="ml-2 font-medium">{ORACLE_DECIMALS}</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-gray-600 text-sm">Address:</span>
              <div className="bg-gray-50 rounded-md p-2 font-mono text-xs break-all mt-1">
                {oracleAddress}
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  Eden Testnet - Simple Oracle
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Using Morpho Blue&apos;s built-in OracleMock for testnet deployment. Provides simple, controllable price feeds.
                </p>
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
                  Changing oracle prices affects all positions using this market. Test with caution!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
