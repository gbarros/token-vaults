/**
 * Simple RPC Proxy for Eden Testnet
 * 
 * Proxies RPC calls from browser to Eden RPC endpoint to bypass CORS issues.
 * Browser -> Next.js API route -> Eden RPC -> Browser
 */

import { NextRequest, NextResponse } from 'next/server';

const EDEN_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://ev-reth-eden-testnet.binarybuilders.services:8545';

export async function POST(request: NextRequest) {
  try {
    // Get the JSON-RPC request body from the browser
    const body = await request.json();
    
    // Forward the request to Eden RPC
    const response = await fetch(EDEN_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Get the response
    const data = await response.json();
    
    // Return the response to the browser
    return NextResponse.json(data);
  } catch (error) {
    console.error('RPC Proxy Error:', error);
    return NextResponse.json(
      { 
        jsonrpc: '2.0', 
        id: null, 
        error: { 
          code: -32603, 
          message: 'Internal proxy error' 
        } 
      },
      { status: 500 }
    );
  }
}

// Optional: Support GET for health checks
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    proxy: 'Eden RPC Proxy',
    target: EDEN_RPC_URL 
  });
}

