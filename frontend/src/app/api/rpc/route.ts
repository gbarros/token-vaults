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
    
    // Forward the request to Eden RPC with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(EDEN_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Get the response
    const data = await response.json();
    
    // Return the response to the browser
    return NextResponse.json(data);
  } catch (error) {
    console.error('RPC Proxy Error:', error);
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { 
          jsonrpc: '2.0', 
          id: null, 
          error: { 
            code: -32603, 
            message: 'RPC request timeout (5s)' 
          } 
        },
        { status: 504 }
      );
    }
    
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

