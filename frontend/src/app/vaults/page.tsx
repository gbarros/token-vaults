'use client';

import { useAccount } from 'wagmi';
import { VaultOverview } from '@/components/vaults/VaultOverview';
import { VaultPerformance } from '@/components/vaults/VaultPerformance';
import { VaultAllocation } from '@/components/vaults/VaultAllocation';
import { VaultActions } from '@/components/vaults/VaultActions';
import { VaultAdmin } from '@/components/vaults/VaultAdmin';

export default function VaultsPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Morpho Vaults
            </h1>
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-gray-600 mb-6">
                Please connect your wallet to access vault functionality.
              </p>
              <p className="text-sm text-gray-500">
                Make sure you&apos;re connected to Eden Testnet.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Morpho Vaults Demo
          </h1>
          <p className="mt-2 text-gray-600">
            Deposit into MetaMorpho v1.1 vault for automated yield optimization across Morpho Blue markets.
          </p>
        </div>

        {/* Admin Panel - Only visible to vault owner */}
        <VaultAdmin />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <VaultOverview />
            <VaultPerformance />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <VaultActions />
            <VaultAllocation />
          </div>
        </div>

        {/* Educational Content */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">
            What moves APY?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h3 className="font-medium mb-2">Immediate Effects:</h3>
              <ul className="space-y-1">
                <li>• Deposits: Share mint visible instantly</li>
                <li>• Allocation: Visible after tx mined (~seconds)</li>
                <li>• Oracle price changes: Immediate risk metrics shift</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Gradual Effects:</h3>
              <ul className="space-y-1">
                <li>• Borrow activity: APY jump within 1-5 minutes</li>
                <li>• Interest accrual: Noticeable after 10-30 minutes</li>
                <li>• Rate drift: Several hours to days</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
