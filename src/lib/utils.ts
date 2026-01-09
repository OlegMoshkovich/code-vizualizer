/**
 * Utility functions for URL validation and code fetching
 */

import axios from 'axios';
import { URLValidationResult, CodeFetchResult, SupportedFileType } from '../types';

/**
 * Maximum allowed file size (500KB)
 */
const MAX_FILE_SIZE = 500 * 1024; // 500KB in bytes

/**
 * Supported file extensions
 */
const SUPPORTED_EXTENSIONS: SupportedFileType[] = ['.ts', '.tsx'];

/**
 * Validates if a URL is properly formatted and potentially accessible
 * @param url - The URL to validate
 * @returns Validation result with normalized URL if valid
 */
export function validateURL(url: string): URLValidationResult {
  try {
    // Basic URL validation
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL is required' };
    }

    // Trim whitespace
    const trimmedUrl = url.trim();
    
    if (trimmedUrl.length === 0) {
      return { isValid: false, error: 'URL cannot be empty' };
    }

    // Try to parse the URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }

    // Check protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }

    // Check if it's a supported file type
    const pathname = parsedUrl.pathname.toLowerCase();
    const hasValidExtension = SUPPORTED_EXTENSIONS.some(ext => pathname.endsWith(ext));
    
    if (!hasValidExtension) {
      return { 
        isValid: false, 
        error: `Unsupported file type. Supported types: ${SUPPORTED_EXTENSIONS.join(', ')}` 
      };
    }

    // Normalize GitHub URLs to raw.githubusercontent.com
    let normalizedUrl = trimmedUrl;
    if (parsedUrl.hostname === 'github.com') {
      const pathParts = parsedUrl.pathname.split('/');
      if (pathParts.length >= 5 && pathParts[3] === 'blob') {
        // Convert github.com/user/repo/blob/branch/file to raw.githubusercontent.com/user/repo/branch/file
        const [, user, repo, , branch, ...fileParts] = pathParts;
        normalizedUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${fileParts.join('/')}`;
      }
    }

    // Handle gist URLs
    if (parsedUrl.hostname === 'gist.github.com') {
      // Gist URLs should be converted to raw format
      const pathParts = parsedUrl.pathname.split('/');
      if (pathParts.length >= 2) {
        const gistId = pathParts[2];
        if (gistId) {
          // For gists, we need the raw URL format
          normalizedUrl = `https://gist.githubusercontent.com/${pathParts[1]}/${gistId}/raw`;
        }
      }
    }

    return {
      isValid: true,
      normalizedUrl
    };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    };
  }
}

/**
 * Fetches code content from a URL with proper error handling
 * @param url - The URL to fetch code from
 * @returns Promise with fetch result
 */
export async function fetchCodeFromURL(url: string): Promise<CodeFetchResult> {
  try {
    // Validate URL first
    const validation = validateURL(url);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'Invalid URL',
        url
      };
    }

    const targetUrl = validation.normalizedUrl || url;

    // Set up axios with timeout and headers
    const response = await axios.get(targetUrl, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'text/plain, text/typescript, application/typescript, */*',
        'User-Agent': 'TypeScript-Function-Visualizer/1.0'
      },
      responseType: 'text',
      maxContentLength: MAX_FILE_SIZE,
      validateStatus: (status) => status >= 200 && status < 400
    });

    // Check content type if available
    const contentType = response.headers['content-type'];
    if (contentType && !isTextContent(contentType)) {
      return {
        success: false,
        error: 'URL does not point to a text file',
        url: targetUrl
      };
    }

    // Check file size
    const contentLength = response.headers['content-length'];
    const size = contentLength ? parseInt(contentLength, 10) : response.data.length;
    
    if (size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large (${formatBytes(size)}). Maximum size is ${formatBytes(MAX_FILE_SIZE)}`,
        url: targetUrl,
        size
      };
    }

    // Validate that we got actual content
    if (!response.data || typeof response.data !== 'string') {
      return {
        success: false,
        error: 'No content received from URL',
        url: targetUrl
      };
    }

    // Basic check for TypeScript-like content
    const content = response.data;
    if (!isLikelyTypeScriptContent(content)) {
      return {
        success: false,
        error: 'Content does not appear to be TypeScript code',
        url: targetUrl,
        size
      };
    }

    return {
      success: true,
      content,
      url: targetUrl,
      size
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          error: 'Unable to reach the URL. Please check the URL and your internet connection.',
          url
        };
      }
      
      if (error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Request timed out. The server may be slow or unreachable.',
          url
        };
      }

      if (error.response) {
        const status = error.response.status;
        switch (status) {
          case 404:
            return {
              success: false,
              error: 'File not found (404). Please check the URL.',
              url
            };
          case 403:
            return {
              success: false,
              error: 'Access forbidden (403). The file may be private.',
              url
            };
          case 401:
            return {
              success: false,
              error: 'Authentication required (401). The file may be private.',
              url
            };
          default:
            return {
              success: false,
              error: `Server error (${status}). Please try again later.`,
              url
            };
        }
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      url
    };
  }
}

/**
 * Checks if a content type indicates text content
 * @param contentType - The content type header value
 * @returns True if the content type indicates text
 */
function isTextContent(contentType: string): boolean {
  const textTypes = [
    'text/',
    'application/typescript',
    'application/javascript',
    'application/x-typescript'
  ];
  
  return textTypes.some(type => contentType.toLowerCase().includes(type));
}

/**
 * Basic heuristic to check if content looks like TypeScript
 * @param content - The file content to check
 * @returns True if content appears to be TypeScript-like
 */
function isLikelyTypeScriptContent(content: string): boolean {
  if (!content || content.trim().length === 0) {
    return false;
  }

  // Look for common TypeScript/JavaScript patterns
  const patterns = [
    /\bfunction\s+\w+/,
    /\bconst\s+\w+/,
    /\blet\s+\w+/,
    /\bvar\s+\w+/,
    /\bclass\s+\w+/,
    /\binterface\s+\w+/,
    /\btype\s+\w+/,
    /\bimport\s+/,
    /\bexport\s+/,
    /=>/,
    /:\s*\w+/, // Type annotations
  ];

  // Check if at least one pattern matches
  return patterns.some(pattern => pattern.test(content));
}

/**
 * Formats bytes into human readable format
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.5 KB")
 */
function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Extracts filename from URL
 * @param url - The URL to extract filename from
 * @returns The filename or a default name
 */
export function getFilenameFromURL(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const segments = pathname.split('/');
    const filename = segments[segments.length - 1];
    
    return filename || 'unknown.ts';
  } catch {
    return 'unknown.ts';
  }
}

/**
 * Checks if URL appears to be a GitHub repository file
 * @param url - The URL to check
 * @returns True if it looks like a GitHub file URL
 */
export function isGitHubURL(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'github.com' || parsedUrl.hostname === 'raw.githubusercontent.com';
  } catch {
    return false;
  }
}

/**
 * Checks if URL appears to be a GitHub Gist
 * @param url - The URL to check
 * @returns True if it looks like a GitHub Gist URL
 */
export function isGistURL(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'gist.github.com' || parsedUrl.hostname === 'gist.githubusercontent.com';
  } catch {
    return false;
  }
}