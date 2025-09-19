'use client';

import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import toast from 'react-hot-toast';
import { addresses } from '../../config/addresses';

// Minimal ERC20 + Faucet ABI
const faucetTokenAbi = [
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
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
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'canMint',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'remainingCooldown',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxMintPerCall',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

interface TokenFaucetCardProps {
  onRefresh: () => void;
}

// Interface for token data (currently unused but may be needed for future features)
// interface TokenData {
//   address: string;
//   name: string;
//   symbol: string;
//   balance: bigint;
//   totalSupply: bigint;
//   canMint: boolean;
//   remainingCooldown: number;
//   maxMintPerCall: bigint;
// }

export default function TokenFaucetCard({ onRefresh }: TokenFaucetCardProps) {
  const { address: userAddress, isConnected } = useAccount();
  const [mintAmount, setMintAmount] = useState('100');
  const [selectedToken, setSelectedToken] = useState<'fakeUSD' | 'fakeTIA'>('fakeUSD');

  const tokens = {
    fakeUSD: addresses.tokens.fakeUSD,
    fakeTIA: addresses.tokens.fakeTIA,
  };

  // Read contract data for selected token
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _tokenName } = useReadContract({
    address: tokens[selectedToken] as `0x${string}`,
    abi: faucetTokenAbi,
    functionName: 'name',
    query: { enabled: !!tokens[selectedToken] && isConnected },
  });

  const { data: tokenSymbol } = useReadContract({
    address: tokens[selectedToken] as `0x${string}`,
    abi: faucetTokenAbi,
    functionName: 'symbol',
    query: { enabled: !!tokens[selectedToken] && isConnected },
  });

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: tokens[selectedToken] as `0x${string}`,
    abi: faucetTokenAbi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!tokens[selectedToken] && !!userAddress && isConnected },
  });

  const { data: totalSupply } = useReadContract({
    address: tokens[selectedToken] as `0x${string}`,
    abi: faucetTokenAbi,
    functionName: 'totalSupply',
    query: { enabled: !!tokens[selectedToken] && isConnected },
  });

  const { data: canMint } = useReadContract({
    address: tokens[selectedToken] as `0x${string}`,
    abi: faucetTokenAbi,
    functionName: 'canMint',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!tokens[selectedToken] && !!userAddress && isConnected },
  });

  const { data: remainingCooldown } = useReadContract({
    address: tokens[selectedToken] as `0x${string}`,
    abi: faucetTokenAbi,
    functionName: 'remainingCooldown',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!tokens[selectedToken] && !!userAddress && isConnected },
  });

  const { data: maxMintPerCall } = useReadContract({
    address: tokens[selectedToken] as `0x${string}`,
    abi: faucetTokenAbi,
    functionName: 'maxMintPerCall',
    query: { enabled: !!tokens[selectedToken] && isConnected },
  });

  // Write contract for minting
  const { writeContract, data: mintTxHash, isPending } = useWriteContract();

  const { isLoading: isMintConfirming } = useWaitForTransactionReceipt({
    hash: mintTxHash,
  });

  // Handle transaction success/error separately
  React.useEffect(() => {
    if (mintTxHash && !isMintConfirming) {
      toast.success(`Successfully minted ${mintAmount} ${tokenSymbol}!`);
      refetchBalance();
      onRefresh();
    }
  }, [mintTxHash, isMintConfirming, mintAmount, tokenSymbol, refetchBalance, onRefresh]);

  const handleMint = async () => {
    if (!userAddress || !tokens[selectedToken]) {
      toast.error('Please connect your wallet and ensure tokens are deployed');
      return;
    }

    try {
      const amount = parseEther(mintAmount);
      
      writeContract({
        address: tokens[selectedToken] as `0x${string}`,
        abi: faucetTokenAbi,
        functionName: 'mint',
        args: [userAddress, amount],
      });

      toast.loading('Minting tokens...', { id: 'mint-tx' });
    } catch (error) {
      console.error('Mint error:', error);
      toast.error('Failed to initiate mint transaction');
    }
  };

  const isTokenDeployed = tokens[selectedToken] && tokens[selectedToken] !== '';
  const isMinting = isPending || isMintConfirming;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
        Token Faucet
      </h2>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Please connect your wallet to use the faucet</p>
        </div>
      ) : !isTokenDeployed ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">Tokens not deployed yet</p>
          <p className="text-sm text-gray-500">
            Run the deployment script: <code className="bg-gray-100 px-2 py-1 rounded">npm run ops:deploy:tokens</code>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Token
            </label>
            <div className="flex space-x-2">
              {Object.keys(tokens).map((token) => (
                <button
                  key={token}
                  onClick={() => setSelectedToken(token as 'fakeUSD' | 'fakeTIA')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedToken === token
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          {/* Token Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Balance
              </label>
              <div className="bg-gray-50 rounded-md p-3">
                <span className="text-lg font-semibold">
                  {userBalance ? formatEther(userBalance) : '0.0000'}
                </span>
                <span className="text-sm text-gray-600 ml-1">{tokenSymbol}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Supply
              </label>
              <div className="bg-gray-50 rounded-md p-3">
                <span className="text-lg font-semibold">
                  {totalSupply ? formatEther(totalSupply) : '0.0000'}
                </span>
                <span className="text-sm text-gray-600 ml-1">{tokenSymbol}</span>
              </div>
            </div>
          </div>

          {/* Mint Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mint Amount
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder="100"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isMinting}
              />
              <button
                onClick={handleMint}
                disabled={!canMint || isMinting || !mintAmount}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isMinting ? 'Minting...' : 'Mint'}
              </button>
            </div>
            
            {/* Cooldown Info */}
            {remainingCooldown && remainingCooldown > 0 && (
              <p className="text-sm text-yellow-600 mt-1">
                ⏱️ Cooldown: {remainingCooldown}s remaining
              </p>
            )}
            
            {maxMintPerCall && (
              <p className="text-sm text-gray-500 mt-1">
                Max per call: {formatEther(maxMintPerCall)} {tokenSymbol}
              </p>
            )}
          </div>

          {/* Token Address */}
          <div className="pt-2 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Address
            </label>
            <div className="bg-gray-50 rounded-md p-2 font-mono text-xs break-all">
              {tokens[selectedToken]}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
