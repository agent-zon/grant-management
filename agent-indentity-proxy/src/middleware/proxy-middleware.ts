import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { McpResponseTransformer } from '../transformers/mcp-response-transformer.js';
import { handleGrantCall, isGrantCall } from '../handlers/grant-handler.js';

// Extend IncomingMessage to hold Express Request
interface ProxyRequest extends IncomingMessage {
  expressRequest?: Request;
}

/**
 * MCP Proxy Middleware
 * 
 * This middleware proxies MCP (Model Context Protocol) requests to an upstream server
 * while injecting grant management capabilities. It:
 * 
 * - Intercepts grant-related tool calls and handles them locally
 * - Transforms responses to inject grant tools and prompts
 * - Proxies all other requests to the upstream MCP server
 */

/**
 * Create an MCP proxy middleware
 * 
 * @param headerName - The header name to use for routing to upstream server (default: 'upstream_mcp_url')
 * @returns Express middleware that proxies MCP requests with grant injection
 */
export const createMcpProxy = (headerName: string = 'upstream_mcp_url') => {
  const proxyOptions: Options = {
    target: 'http://placeholder.local',
    changeOrigin: true,
    ws: true,
    selfHandleResponse: false,

    router: (req: IncomingMessage) => {
      // Extract target from request header (priority 1: custom header)
      const headerValue = req.headers[headerName.toLowerCase()];
      let target = Array.isArray(headerValue) ? headerValue[0] : headerValue;
      
      // Priority 2: X-Forwarded-Host header
      if (!target) {
        const forwardedHost = req.headers['x-forwarded-host'];
        const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
        
        if (host) {
          const forwardedProto = req.headers['x-forwarded-proto'];
          const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
          target = `${protocol || 'https'}://${host}`;
        }
      }
      
      // Fall back to default if no headers present
      const finalTarget = target || "https://adminmcp-dev.c-127c9ef.stage.kyma.ondemand.com/mcp";
      
      if (!finalTarget) {
        throw new Error(`Invalid Upstream URL: header '${headerName}' is missing or empty`);
      }
      
      return finalTarget;
    },

    on: {
      proxyRes: handleProxyResponse,
      error: handleProxyError,
    },
  };

  const proxy = createProxyMiddleware(proxyOptions);

  return createInterceptingMiddleware(proxy);
};

/**
 * Handle successful proxy responses by injecting grant data
 */
function handleProxyResponse(proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) {
  const proxyReq = req as ProxyRequest;
  const expressReq = proxyReq.expressRequest;
  
  res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);

  // Pass the Express request if available, otherwise pass the proxy request
  const transformer = new McpResponseTransformer(expressReq || req as any);
  
  proxyRes
    .pipe(transformer)
    .pipe(res);
    
  proxyRes.on('error', (err) => {
    console.error('[MCP Proxy] Upstream stream error:', err);
    res.end();
  });
}

/**
 * Handle proxy errors
 */
function handleProxyError(err: Error, req: IncomingMessage, res: ServerResponse | any) {
  if (res && typeof res.writeHead === 'function' && !res.headersSent) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Proxy Error', 
      details: err.message 
    }));
  }
}

/**
 * Create middleware that intercepts grant calls before proxying
 */
function createInterceptingMiddleware(proxy: any) {
  return (req: Request, res: Response, next: any) => {
    if (req.method !== 'POST') {
      return proxy(req, res, next);
    }

    bufferAndProcessRequest(req, res, next, proxy);
  };
}

/**
 * Buffer the request body and decide whether to handle locally or proxy
 */
function bufferAndProcessRequest(req: Request, res: Response, next: any, proxy: any) {
  const chunks: Buffer[] = [];
  
  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', async () => {
    try {
      const bodyBuffer = Buffer.concat(chunks);
      const parsed = JSON.parse(bodyBuffer.toString('utf-8'));
      const { method, params, id } = parsed;

      // Check if this is a grant-related call
      if (isGrantCall(method, params)) {
        await handleLocalGrantCall(method, params, id, req, res);
      } else {
        proxyRequest(bodyBuffer, req, res, next, proxy);
      }
    } catch (err) {
      handleRequestError(err as Error, res);
    }
  });

  req.on('error', (err) => {
    handleRequestError(err, res);
  });
}

/**
 * Handle grant calls locally and send JSON-RPC response
 */
async function handleLocalGrantCall(
  method: string, 
  params: any, 
  id: any, 
  req: Request, 
  res: Response
) {
  try {
    const result = await handleGrantCall(method, params, req);
    
    console.log('[MCP Proxy] Grant call completed:', {
      method: method,
      resultType: Array.isArray(result?.content) ? 'content' : typeof result,
      contentLength: result?.content?.length,
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.json({
      jsonrpc: '2.0',
      id: id || null,
      result: result,
    });
  } catch (error: any) {
    console.error('[MCP Proxy] Grant call failed:', {
      method: method,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Recreate the request as a readable stream and proxy it
 */
function proxyRequest(
  bodyBuffer: Buffer, 
  req: Request, 
  res: Response, 
  next: any, 
  proxy: any
) {
  const bodyStream = Readable.from([bodyBuffer]);
  
  // Create a new request-like object with the body stream
  const proxyReq = Object.create(req, {
    readable: { value: true, writable: false },
    read: { value: bodyStream.read.bind(bodyStream) },
    pipe: { value: bodyStream.pipe.bind(bodyStream) },
    on: { value: bodyStream.on.bind(bodyStream) },
    once: { value: bodyStream.once.bind(bodyStream) },
    removeListener: { value: bodyStream.removeListener.bind(bodyStream) },
    emit: { value: bodyStream.emit.bind(bodyStream) },
    expressRequest: { value: req, writable: false }, // Attach Express request
  }) as ProxyRequest;
  
  proxyReq.method = req.method;
  proxyReq.url = req.url;
  proxyReq.headers = { 
    ...req.headers, 
    'content-length': bodyBuffer.length.toString() 
  };
  
  proxy(proxyReq, res, next);
}

/**
 * Send JSON-RPC error response
 */
function handleRequestError(err: Error, res: Response) {
  console.error('[MCP Proxy] Request error:', err);
  
  if (!res.headersSent) {
    res.status(500).json({ 
      jsonrpc: '2.0',
      id: null,
      error: { 
        code: -32603,
        message: 'Internal error',
        data: { details: err.message }
      }
    });
  }
}
