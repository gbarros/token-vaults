/**
 * Format numbers for human readability
 * - Adds thousand separators (1,000,000)
 * - Optionally abbreviates large numbers (1.5M, 2.3B)
 */

export interface FormatNumberOptions {
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Use abbreviated format (1.5k, 2.3M) for large numbers */
  abbreviated?: boolean;
  /** Threshold for abbreviation (default: 10000) */
  abbreviationThreshold?: number;
  /** Always show decimals even if zero (default: false) */
  forceDecimals?: boolean;
  /** Locale for formatting (default: 'en-US') */
  locale?: string;
}

const ABBREVIATIONS = [
  { value: 1e12, symbol: 'T' },
  { value: 1e9, symbol: 'B' },
  { value: 1e6, symbol: 'M' },
  { value: 1e3, symbol: 'k' },
];

/**
 * Format a number with thousand separators and optional abbreviation
 * 
 * @example
 * formatNumber(1234.5) // "1,234.5"
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234567, { abbreviated: true }) // "1.23M"
 * formatNumber(1500, { abbreviated: true }) // "1.5k"
 * formatNumber(999, { abbreviated: true }) // "999" (below threshold)
 */
export function formatNumber(
  value: number | string | bigint | undefined | null,
  options: FormatNumberOptions = {}
): string {
  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  // Convert to number
  let numValue: number;
  if (typeof value === 'bigint') {
    numValue = Number(value);
  } else if (typeof value === 'string') {
    numValue = parseFloat(value);
  } else {
    numValue = value;
  }

  // Handle invalid numbers
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '0';
  }

  const {
    decimals = 2,
    abbreviated = false,
    abbreviationThreshold = 10000,
    forceDecimals = false,
    locale = 'en-US',
  } = options;

  // Use abbreviated format for large numbers
  if (abbreviated && Math.abs(numValue) >= abbreviationThreshold) {
    for (const { value: divisor, symbol } of ABBREVIATIONS) {
      if (Math.abs(numValue) >= divisor) {
        const abbreviated = numValue / divisor;
        
        // Determine decimal places based on size
        let abbrevDecimals = decimals;
        if (Math.abs(abbreviated) >= 100) {
          abbrevDecimals = 0; // 123M, not 123.45M
        } else if (Math.abs(abbreviated) >= 10) {
          abbrevDecimals = 1; // 12.3M, not 12.34M
        }
        
        const formatted = abbreviated.toLocaleString(locale, {
          minimumFractionDigits: forceDecimals ? abbrevDecimals : 0,
          maximumFractionDigits: abbrevDecimals,
        });
        
        return `${formatted}${symbol}`;
      }
    }
  }

  // Standard format with thousand separators
  return numValue.toLocaleString(locale, {
    minimumFractionDigits: forceDecimals ? decimals : 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a token amount (optimized for token displays)
 * - Uses abbreviated format for large amounts
 * - Smart decimal handling (fewer decimals for large numbers)
 * 
 * @example
 * formatTokenAmount(1234.567) // "1,234.57"
 * formatTokenAmount(1234567) // "1.23M"
 */
export function formatTokenAmount(
  value: number | string | bigint | undefined | null,
  decimals: number = 2
): string {
  return formatNumber(value, {
    decimals,
    abbreviated: true,
    abbreviationThreshold: 10000, // Start abbreviating at 10k
  });
}

/**
 * Format a USD/currency amount
 * Always shows 2 decimals, uses abbreviation for large amounts
 * 
 * @example
 * formatCurrency(1234.5) // "1,234.50"
 * formatCurrency(1234567.89) // "1.23M"
 */
export function formatCurrency(
  value: number | string | bigint | undefined | null
): string {
  return formatNumber(value, {
    decimals: 2,
    abbreviated: true,
    abbreviationThreshold: 100000, // Start abbreviating at 100k for currency
    forceDecimals: false,
  });
}

/**
 * Format a percentage value
 * 
 * @example
 * formatPercentage(12.3456) // "12.35%"
 * formatPercentage(0.5) // "0.50%"
 */
export function formatPercentage(
  value: number | string | undefined | null,
  decimals: number = 2
): string {
  if (value === null || value === undefined || value === '') {
    return '0.00%';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '0.00%';
  }

  return `${numValue.toFixed(decimals)}%`;
}

/**
 * Format a compact number (always abbreviated if possible)
 * Useful for labels, badges, or compact displays
 * 
 * @example
 * formatCompact(1234) // "1.2k"
 * formatCompact(1234567) // "1.2M"
 */
export function formatCompact(
  value: number | string | bigint | undefined | null
): string {
  return formatNumber(value, {
    decimals: 1,
    abbreviated: true,
    abbreviationThreshold: 1000, // Always abbreviate at 1k+
  });
}

/**
 * Format a token amount that's already been converted from wei to ether (as a string)
 * Useful when you already have the result of formatEther() or formatUnits()
 * 
 * @example
 * const ethValue = formatEther(bigintValue); // "1234.567890123456"
 * formatTokenString(ethValue) // "1,234.57"
 */
export function formatTokenString(
  etherValue: string,
  decimals: number = 2
): string {
  const numValue = parseFloat(etherValue);
  return formatNumber(numValue, {
    decimals,
    abbreviated: true,
    abbreviationThreshold: 10000,
  });
}

