/**
 * WebSocket-based RPC Proxy for Eden Testnet
 * 
 * Maintains a persistent WebSocket connection to Eden RPC and forwards JSON-RPC calls.
 * More efficient than HTTP for high-frequency requests (e.g., during page reloads).
 * 
 * Browser -> Next.js API (HTTP POST) -> Eden RPC (WebSocket) -> Browser
 */

import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

// WebSocket URL for Eden Testnet
const EDEN_WS_URL = 'wss://ev-reth-eden-testnet.binarybuilders.services:8546';

// Singleton WebSocket connection
let ws: WebSocket | null = null;
let wsReady = false;
const pendingRequests = new Map<number | string, {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}>();

// Initialize WebSocket connection
function initWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return ws;
  }

  console.log('[WS Proxy] Connecting to', EDEN_WS_URL);
  ws = new WebSocket(EDEN_WS_URL);

  ws.on('open', () => {
    console.log('[WS Proxy] Connected to Eden RPC');
    wsReady = true;
  });

  ws.on('message', (data: Buffer) => {
    try {
      const response = JSON.parse(data.toString());
      const requestId = response.id;

      if (pendingRequests.has(requestId)) {
        const { resolve, timeout } = pendingRequests.get(requestId)!;
        clearTimeout(timeout);
        pendingRequests.delete(requestId);
        resolve(response);
      }
    } catch (error) {
      console.error('[WS Proxy] Failed to parse response:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('[WS Proxy] WebSocket error:', error);
    wsReady = false;
  });

  ws.on('close', () => {
    console.log('[WS Proxy] WebSocket closed, will reconnect on next request');
    wsReady = false;
    ws = null;

    // Reject all pending requests
    for (const [id, { reject, timeout }] of pendingRequests.entries()) {
      clearTimeout(timeout);
      reject(new Error('WebSocket connection closed'));
      pendingRequests.delete(id);
    }
  });

  return ws;
}

// Send JSON-RPC request via WebSocket
function sendRpcRequest(body: any, timeoutMs = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const ws = initWebSocket();

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket not ready'));
      return;
    }

    const requestId = body.id ?? Date.now();
    const timeout = setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }
    }, timeoutMs);

    pendingRequests.set(requestId, { resolve, reject, timeout });

    try {
      ws.send(JSON.stringify(body));
    } catch (error) {
      clearTimeout(timeout);
      pendingRequests.delete(requestId);
      reject(error);
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Get the JSON-RPC request body from the browser
    const body = await request.json();

    // Wait for WebSocket to be ready (with timeout)
    const maxWait = 3000; // 3 seconds
    const startTime = Date.now();
    
    while (!wsReady && Date.now() - startTime < maxWait) {
      initWebSocket();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!wsReady) {
      throw new Error('WebSocket connection failed');
    }

    // Forward the request via WebSocket
    const data = await sendRpcRequest(body, 5000);

    // Return the response to the browser
    return NextResponse.json(data);
  } catch (error) {
    console.error('[WS Proxy] Error:', error);

    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'WebSocket proxy error',
        },
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: wsReady ? 'connected' : 'disconnected',
    proxy: 'Eden WebSocket RPC Proxy',
    target: EDEN_WS_URL,
  });
}

