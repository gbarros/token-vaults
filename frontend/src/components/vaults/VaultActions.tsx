'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'react-hot-toast';
import { useVaultData } from '@/hooks/useVaultData';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useTokenAllowance } from '@/hooks/useTokenAllowance';
import { vaults, tokens } from '@/lib/contracts';
import { metaMorphoAbi, erc20Abi } from '@/lib/abis';
import { isWrongNetwork, switchToExpectedNetwork, getNetworkInfo, EXPECTED_CHAIN_ID } from '@/lib/networkUtils';
import { formatTokenString } from '@/lib/formatNumber';

export function VaultActions() {
  const { address, chain } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  const { data: vaultData } = useVaultData();
  const { data: tokenBalance } = useTokenBalance(tokens.fakeUSD);
  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(
    tokens.fakeUSD,
    vaults.metaMorphoDemo.address
  );

  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeDeposit, data: depositHash } = useWriteContract();
  const { writeContract: writeWithdraw, data: withdrawHash } = useWriteContract();

  const { isLoading: approveLoading, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  const { isLoading: depositLoading } = useWaitForTransactionReceipt({
    hash: depositHash,
  });
  const { isLoading: withdrawLoading } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  const isLoading = approveLoading || depositLoading || withdrawLoading;

  // Refetch allowance when approval is successful
  useEffect(() => {
    if (approveSuccess) {
      refetchAllowance();
      toast.success('Approval successful! You can now deposit.');
    }
  }, [approveSuccess, refetchAllowance]);

  // Check if vault is available
  if (!vaults.metaMorphoDemo.address || !tokens.fakeUSD) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vault Actions</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">
            Vault or token addresses not available. Please ensure contracts are deployed.
          </p>
        </div>
      </div>
    );
  }

  // Check if user is on the correct network
  const wrongNetwork = isWrongNetwork(chain);
  const networkInfo = getNetworkInfo(chain);

  const depositAmountBN = depositAmount ? parseUnits(depositAmount, 18) : BigInt(0);
  const withdrawAmountBN = withdrawAmount ? parseUnits(withdrawAmount, 18) : BigInt(0);
  
  const needsApproval = depositAmountBN > BigInt(0) && (allowance || BigInt(0)) < depositAmountBN;
  const canDeposit = depositAmountBN > BigInt(0) && (tokenBalance || BigInt(0)) >= depositAmountBN && !needsApproval;
  const canWithdraw = withdrawAmountBN > BigInt(0) && vaultData?.userShares && vaultData.userShares >= withdrawAmountBN;

  const handleApprove = async () => {
    if (!tokens.fakeUSD || !vaults.metaMorphoDemo.address) return;

    try {
      writeApprove({
        address: tokens.fakeUSD as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [vaults.metaMorphoDemo.address as `0x${string}`, parseUnits('1000000', 18)], // Large approval
      });
      toast.success('Approval transaction submitted');
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve tokens');
    }
  };

  const handleDeposit = async () => {
    if (!vaults.metaMorphoDemo.address || !address || !depositAmountBN) return;

    try {
      writeDeposit({
        address: vaults.metaMorphoDemo.address as `0x${string}`,
        abi: metaMorphoAbi,
        functionName: 'deposit',
        args: [depositAmountBN, address],
      });
      toast.success('Deposit transaction submitted');
      setDepositAmount('');
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('Failed to deposit');
    }
  };

  const handleWithdraw = async () => {
    if (!vaults.metaMorphoDemo.address || !address || !withdrawAmountBN) return;

    try {
      writeWithdraw({
        address: vaults.metaMorphoDemo.address as `0x${string}`,
        abi: metaMorphoAbi,
        functionName: 'redeem',
        args: [withdrawAmountBN, address, address],
      });
      toast.success('Withdraw transaction submitted');
      setWithdrawAmount('');
    } catch (error) {
      console.error('Withdraw error:', error);
      toast.error('Failed to withdraw');
    }
  };


  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Vault Actions</h2>

      {/* Wrong Network Warning */}
      {wrongNetwork && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Wrong Network</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You're connected to <strong>{networkInfo.current.name}</strong> (Chain ID: {networkInfo.current.id}).
                  Please switch to <strong>{networkInfo.expected.name}</strong> (Chain ID: {networkInfo.expected.id}) to continue.
                </p>
              </div>
              <div className="mt-4">
                <button
                  onClick={switchToExpectedNetwork}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Switch to {networkInfo.expected.name}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'deposit'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'withdraw'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Deposit Tab */}
      {activeTab === 'deposit' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deposit Amount (fakeUSD)
            </label>
            <div className="relative">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={() => setDepositAmount(tokenBalance ? formatUnits(tokenBalance, 18) : '0')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                disabled={isLoading}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Your fakeUSD Balance:</span>
              <span>{tokenBalance ? formatTokenString(formatUnits(tokenBalance, 18)) : '0'}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Allowance:</span>
              <span>{allowance ? formatTokenString(formatUnits(allowance, 18)) : '0'}</span>
            </div>
            <div className="flex justify-between">
              <span>Shares to Receive:</span>
              <span>
                {depositAmountBN > BigInt(0) && vaultData?.totalAssets && vaultData?.totalSupply 
                  ? formatTokenString((Number(depositAmountBN) * Number(vaultData.totalSupply) / Number(vaultData.totalAssets)).toString())
                  : depositAmount || '0'
                }
              </span>
            </div>
          </div>

          {needsApproval ? (
            <div className="space-y-2">
              <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                💡 You need to approve the vault to spend your fakeUSD tokens before depositing.
              </div>
              <button
                onClick={handleApprove}
                disabled={isLoading || !depositAmountBN || wrongNetwork}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {wrongNetwork ? 'Wrong Network - Switch Above' : (approveLoading ? 'Approving...' : `Approve ${depositAmount || '0'} fakeUSD`)}
              </button>
            </div>
          ) : (
            <button
              onClick={handleDeposit}
              disabled={isLoading || !canDeposit || wrongNetwork}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {wrongNetwork ? 'Wrong Network - Switch Above' : (depositLoading ? 'Depositing...' : 'Deposit')}
            </button>
          )}
        </div>
      )}

      {/* Withdraw Tab */}
      {activeTab === 'withdraw' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdraw Amount (Shares)
            </label>
            <div className="relative">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={() => setWithdrawAmount(vaultData?.userShares ? formatUnits(vaultData.userShares, 18) : '0')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                disabled={isLoading}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Your Vault Shares:</span>
              <span>{vaultData?.userShares ? formatTokenString(formatUnits(vaultData.userShares, 18)) : '0'}</span>
            </div>
            <div className="flex justify-between">
              <span>Assets to Receive:</span>
              <span>
                {withdrawAmountBN > BigInt(0) && vaultData?.totalAssets && vaultData?.totalSupply 
                  ? formatTokenString((Number(withdrawAmountBN) * Number(vaultData.totalAssets) / Number(vaultData.totalSupply)).toString())
                  : withdrawAmount || '0'
                } fakeUSD
              </span>
            </div>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={isLoading || !canWithdraw || wrongNetwork}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {wrongNetwork ? 'Wrong Network - Switch Above' : (withdrawLoading ? 'Withdrawing...' : 'Withdraw')}
          </button>
        </div>
      )}

      {/* Status Messages */}
      {!tokenBalance && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-yellow-800 text-sm">
            You don&apos;t have any fakeUSD tokens. Visit the <a href="/setup" className="underline">Setup page</a> to mint some.
          </p>
        </div>
      )}
    </div>
  );
}
