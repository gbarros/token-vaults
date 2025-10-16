'use client';

import React from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { edenTestnet } from '@/lib/wagmi';

interface WalletCardProps {
  refreshTrigger: number;
}

export default function WalletCard({ refreshTrigger: _refreshTrigger }: WalletCardProps) {
  // Suppress unused variable warning for future use
  void _refreshTrigger;
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address,
    query: {
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  const isCorrectNetwork = chainId === edenTestnet.id;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
        </svg>
        Wallet Connection
      </h2>

      {!isConnected ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-600 mb-4">No wallet connected</p>
          <p className="text-sm text-gray-500">
            Please connect your wallet to continue with the demo setup.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Connected Address
            </label>
            <div className="bg-gray-50 rounded-md p-3 font-mono text-sm break-all">
              {address}
            </div>
          </div>

          {/* Network Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Network Status
            </label>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isCorrectNetwork ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-sm font-medium ${isCorrectNetwork ? 'text-green-700' : 'text-red-700'}`}>
                {isCorrectNetwork ? 'Eden Testnet' : `Wrong Network (Chain ID: ${chainId})`}
              </span>
            </div>
            {!isCorrectNetwork && (
              <p className="text-sm text-red-600 mt-1">
                Please switch to Eden Testnet (Chain ID: {edenTestnet.id}) to continue.
              </p>
            )}
          </div>

          {/* ETH Balance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ETH Balance
            </label>
            <div className="bg-gray-50 rounded-md p-3">
              <span className="text-lg font-semibold">
                {balance ? formatEther(balance.value) : '0.0000'} ETH
              </span>
              {balance && balance.value < BigInt('10000000000000000') && ( // < 0.01 ETH
                <p className="text-sm text-yellow-600 mt-1">
                  ⚠️ Low balance! You may need more ETH for transactions.
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Quick Actions:</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://faucet-eden-testnet.binarybuilders.services"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Get Eden TIA
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <a
                href={`https://eden-testnet.blockscout.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                View on Explorer
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
