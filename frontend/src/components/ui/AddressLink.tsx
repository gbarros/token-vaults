'use client';

interface AddressLinkProps {
  address: string;
  className?: string;
  displayLength?: {
    start: number;
    end: number;
  };
  showFullOnHover?: boolean;
}

export function AddressLink({ 
  address, 
  className = "", 
  displayLength = { start: 6, end: 4 },
  showFullOnHover = true 
}: AddressLinkProps) {
  const displayAddress = `${address.slice(0, displayLength.start)}...${address.slice(-displayLength.end)}`;
  const etherscanUrl = `https://explorer-eden-testnet.binarybuilders.services/address/${address}`;

  return (
    <a
      href={etherscanUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-mono hover:text-blue-600 hover:underline transition-colors cursor-pointer ${className}`}
      title={showFullOnHover ? `${address} (Click to view on Etherscan)` : `View on Etherscan`}
    >
      {displayAddress}
    </a>
  );
}
