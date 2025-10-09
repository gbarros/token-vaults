import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Morpho Vaults v1.1 Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            A comprehensive demonstration of building yield-bearing products using Morpho Vaults v1.1 
            as the yield engine on Eden Testnet.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/setup"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
            >
              Get Started
            </Link>
            <a
              href="https://docs.morpho.org"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium"
            >
              View Docs
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Faucet Tokens</h3>
            <p className="text-gray-600">
              Deploy and mint testnet tokens (fakeUSD, fakeTIA) with built-in faucet functionality 
              and cooldown mechanisms.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurable Oracle</h3>
            <p className="text-gray-600">
              Control price feeds with a settable aggregator that implements Chainlink&apos;s interface 
              for testing market dynamics.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sandbox Market</h3>
            <p className="text-gray-600">
              Create and initialize a Morpho Blue market with configurable parameters 
              for testing vault functionality.
            </p>
          </div>
        </div>

        {/* Demo Stages */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Demo Stages</h2>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Simple Morpho Integration</h3>
                <p className="text-gray-600">
                  Use Morpho&apos;s existing vaults and infrastructure with minimal Solidity requirements. 
                  Show how quickly you can deliver a working &quot;earn&quot; MVP.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Custom Vault Extension</h3>
                <p className="text-gray-600">
                  Introduce a custom vault implementation that connects directly to Morpho Blue markets 
                  for advanced control and customization.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Stack */}
        <div className="bg-gray-900 text-white rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Technical Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-3">Smart Contracts</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Foundry (Solidity, OpenZeppelin)</li>
                <li>• Morpho Blue v1.1</li>
                <li>• ERC-4626 Vaults</li>
                <li>• Chainlink Oracle Interface</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Frontend & Ops</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Next.js + React</li>
                <li>• Viem + Wagmi</li>
                <li>• TypeScript Scripts</li>
                <li>• Eden Testnet (Powered by Celestia)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}