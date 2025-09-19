import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ADDRESSES_FILE = '../config/addresses.ts';

export interface AddressUpdate {
  path: string; // e.g., 'tokens.fakeUSD' or 'oracles.aggregator.address'
  value: string;
  source?: string; // tx hash or docs link
}

/**
 * Update the addresses.ts file with new values
 */
export function updateAddresses(updates: AddressUpdate[]): void {
  const filePath = join(process.cwd(), ADDRESSES_FILE);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    for (const update of updates) {
      const { path, value, source } = update;
      
      // Handle nested path like 'tokens.fakeUSD'
      const pathParts = path.split('.');
      
      if (pathParts.length === 2) {
        // Simple nested update like tokens.fakeUSD
        const [section, key] = pathParts;
        const regex = new RegExp(`(${section}:\\s*\\{[^}]*${key}:\\s*)"[^"]*"`, 'g');
        content = content.replace(regex, `$1"${value}"`);
      } else if (pathParts.length === 3) {
        // Deeper nested like oracles.aggregator.address
        const [section, subsection, key] = pathParts;
        const regex = new RegExp(
          `(${section}:\\s*\\{[^}]*${subsection}:\\s*\\{[^}]*${key}:\\s*)"[^"]*"`,
          'g'
        );
        content = content.replace(regex, `$1"${value}"`);
      }
      
      // Update source if provided
      if (source) {
        const sourceRegex = new RegExp(`(sources:\\s*\\{[^}]*${path.replace('.', '_')}:\\s*)"[^"]*"`, 'g');
        content = content.replace(sourceRegex, `$1"${source}"`);
      }
    }
    
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Updated addresses.ts with ${updates.length} changes`);
    
  } catch (error) {
    console.error('❌ Failed to update addresses.ts:', error);
    throw error;
  }
}

/**
 * Add a new source entry to the addresses file
 */
export function addSource(key: string, value: string): void {
  const filePath = join(process.cwd(), ADDRESSES_FILE);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Find the sources section and add the new entry
    const sourcesRegex = /(sources:\s*\{)([^}]*)(}\s*\})/;
    const match = content.match(sourcesRegex);
    
    if (match) {
      const [, start, existing, end] = match;
      const newEntry = existing.trim() ? `,\n    ${key}: "${value}"` : `\n    ${key}: "${value}"`;
      content = content.replace(sourcesRegex, `${start}${existing}${newEntry}\n  ${end}`);
      
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Added source: ${key} -> ${value}`);
    }
  } catch (error) {
    console.error('❌ Failed to add source:', error);
    throw error;
  }
}
