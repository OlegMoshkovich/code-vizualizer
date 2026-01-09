/**
 * API Route for TypeScript Code Parsing
 * Handles requests to parse TypeScript code from URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateURL, fetchCodeFromURL, getFilenameFromURL } from '../../../lib/utils';
import { parseTypeScriptCode } from '../../../lib/codeParser';
import { buildReactFlowGraph } from '../../../lib/graphBuilder';
import type { GraphData } from '../../../types';

interface ParseCodeRequest {
  url: string;
}

interface ParseCodeSuccessResponse {
  success: true;
  data: {
    nodes: GraphData['nodes'];
    edges: GraphData['edges'];
    metadata: {
      fileName: string;
      totalFunctions: number;
      totalCalls: number;
      imports: string[];
      exports: string[];
      fileSize?: number;
      parseTime: number;
    };
  };
}

interface ParseCodeErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

type ParseCodeResponse = ParseCodeSuccessResponse | ParseCodeErrorResponse;

// Rate limiting storage (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

/**
 * POST /api/parse-code
 * Parses TypeScript code from a URL and returns graph data
 */
export async function POST(request: NextRequest): Promise<NextResponse<ParseCodeResponse>> {
  const startTime = Date.now();

  try {
    // Check rate limiting
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Parse request body
    let body: ParseCodeRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Validate request
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'URL is required in request body',
        },
        { status: 400 }
      );
    }

    // Validate URL format
    const urlValidation = validateURL(body.url);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid URL: ${urlValidation.error}`,
        },
        { status: 400 }
      );
    }

    // Fetch code from URL
    const fetchResult = await fetchCodeFromURL(body.url);
    if (!fetchResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch code: ${fetchResult.error}`,
          details: {
            url: fetchResult.url,
            size: fetchResult.size,
          },
        },
        { status: 400 }
      );
    }

    // Parse TypeScript code
    const parseResult = await parseTypeScriptCode(fetchResult.content!);
    
    // Check for critical parse errors
    const syntaxErrors = parseResult.errors.filter(error => error.type === 'syntax');
    if (syntaxErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse TypeScript code',
          details: {
            errors: syntaxErrors,
            url: body.url,
          },
        },
        { status: 400 }
      );
    }

    // Check if any functions were found
    if (parseResult.functions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No functions found in the provided TypeScript file',
          details: {
            url: body.url,
            errors: parseResult.errors,
          },
        },
        { status: 400 }
      );
    }

    // Build React Flow graph
    const graphData = buildReactFlowGraph(parseResult);

    // Prepare metadata
    const metadata = {
      fileName: getFilenameFromURL(body.url),
      totalFunctions: parseResult.functions.length,
      totalCalls: parseResult.calls.length,
      imports: (parseResult as any).metadata?.imports || [],
      exports: (parseResult as any).metadata?.exports || [],
      fileSize: fetchResult.size,
      parseTime: Date.now() - startTime,
    };

    // Return success response
    const response: ParseCodeSuccessResponse = {
      success: true,
      data: {
        nodes: graphData.nodes,
        edges: graphData.edges,
        metadata,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Parse code API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error occurred while parsing code',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/parse-code
 * Returns API information
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: 'TypeScript Code Parser API',
    version: '1.0.0',
    description: 'Parses TypeScript files from URLs and returns function relationship graphs',
    endpoints: {
      'POST /api/parse-code': {
        description: 'Parse TypeScript code from URL',
        body: {
          url: 'string - URL to TypeScript file',
        },
        response: {
          success: 'boolean',
          data: 'GraphData - React Flow compatible graph',
          error: 'string - Error message if failed',
        },
      },
    },
    limits: {
      maxFileSize: '500KB',
      rateLimit: `${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW / 1000}s`,
      supportedTypes: ['.ts', '.tsx'],
    },
  });
}

/**
 * Gets client IP address for rate limiting
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback for development
  return 'unknown';
}

/**
 * Checks and updates rate limit for a client
 */
function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP);
  
  if (!clientData) {
    // First request from this IP
    rateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }
  
  if (now > clientData.resetTime) {
    // Reset window
    rateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT_MAX) {
    // Rate limit exceeded
    return false;
  }
  
  // Increment count
  clientData.count += 1;
  return true;
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}