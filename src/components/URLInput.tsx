'use client';

/**
 * URLInput Component
 * Provides interface for users to input TypeScript file URLs for analysis
 */

import { useState, useCallback } from 'react';
import { validateURL, fetchCodeFromURL, getFilenameFromURL, isGitHubURL, isGistURL } from '../lib/utils';
import { AnalysisStatus, CodeFetchResult } from '../types';

export interface URLInputProps {
  /** Callback fired when analysis should begin */
  onAnalyze?: (result: CodeFetchResult) => void;
  /** Callback fired when analysis status changes */
  onStatusChange?: (status: AnalysisStatus) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Initial URL value */
  initialUrl?: string;
  /** Custom class name */
  className?: string;
}

/**
 * URLInput component for pasting and validating TypeScript file URLs
 */
export default function URLInput({ 
  onAnalyze, 
  onStatusChange,
  disabled = false,
  initialUrl = '',
  className = ''
}: URLInputProps) {
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  /**
   * Updates the analysis status and notifies parent component
   */
  const updateStatus = useCallback((newStatus: AnalysisStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  /**
   * Validates the URL and provides user feedback
   */
  const validateUrlInput = useCallback((inputUrl: string) => {
    if (!inputUrl.trim()) {
      setValidationMessage(null);
      setError(null);
      return false;
    }

    const validation = validateURL(inputUrl);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid URL');
      setValidationMessage(null);
      return false;
    }

    // Provide helpful information about the URL
    let message = '✓ Valid TypeScript file URL';
    if (isGitHubURL(inputUrl)) {
      message += ' (GitHub)';
    } else if (isGistURL(inputUrl)) {
      message += ' (GitHub Gist)';
    }

    const filename = getFilenameFromURL(validation.normalizedUrl || inputUrl);
    if (filename !== 'unknown.ts') {
      message += ` - ${filename}`;
    }

    setValidationMessage(message);
    setError(null);
    return true;
  }, []);

  /**
   * Handles URL input changes with real-time validation
   */
  const handleUrlChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = event.target.value;
    setUrl(newUrl);
    validateUrlInput(newUrl);
  }, [validateUrlInput]);

  /**
   * Handles the analyze button click
   */
  const handleAnalyze = useCallback(async () => {
    if (!url.trim() || status !== 'idle') {
      return;
    }

    try {
      updateStatus('validating');
      setError(null);

      // Validate URL first
      if (!validateUrlInput(url)) {
        updateStatus('error');
        return;
      }

      updateStatus('fetching');
      
      // Fetch the code
      const result = await fetchCodeFromURL(url);
      
      if (!result.success) {
        setError(result.error || 'Failed to fetch code');
        updateStatus('error');
        return;
      }

      updateStatus('complete');
      
      // Notify parent component
      onAnalyze?.(result);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      updateStatus('error');
    }
  }, [url, status, updateStatus, validateUrlInput, onAnalyze]);

  /**
   * Handles Enter key press in input field
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !disabled && status === 'idle') {
      event.preventDefault();
      handleAnalyze();
    }
  }, [disabled, status, handleAnalyze]);

  /**
   * Gets the appropriate button text based on current status
   */
  const getButtonText = () => {
    switch (status) {
      case 'validating':
        return 'Validating...';
      case 'fetching':
        return 'Fetching...';
      case 'parsing':
        return 'Parsing...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Try Again';
      default:
        return 'Analyze';
    }
  };

  /**
   * Determines if the analyze button should be disabled
   */
  const isAnalyzeDisabled = disabled || !url.trim() || (status !== 'idle' && status !== 'error');

  return (
    <div className={`w-full max-w-2xl mx-auto space-y-4 ${className}`}>
      {/* URL Input Field */}
      <div className="space-y-2">
        <label 
          htmlFor="url-input" 
          className="block text-sm font-medium text-gray-700"
        >
          TypeScript File URL
        </label>
        <div className="relative">
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={handleUrlChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || (status !== 'idle' && status !== 'error')}
            placeholder="https://raw.githubusercontent.com/user/repo/main/file.ts"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 transition-colors"
            aria-describedby={error ? "url-error" : validationMessage ? "url-validation" : undefined}
          />
          {status !== 'idle' && status !== 'error' && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* Validation Message */}
      {validationMessage && !error && (
        <div 
          id="url-validation"
          className="text-sm text-green-600 flex items-center space-x-2"
        >
          <span>{validationMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div 
          id="url-error"
          className="text-sm text-red-600 flex items-center space-x-2"
          role="alert"
        >
          <span className="text-red-500">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzeDisabled}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={`${getButtonText()} TypeScript file analysis`}
      >
        {getButtonText()}
      </button>

      {/* Help Text */}
      <div className="text-sm text-gray-500 space-y-1">
        <p>Supported URLs:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>GitHub raw URLs (raw.githubusercontent.com)</li>
          <li>GitHub file URLs (automatically converted to raw)</li>
          <li>GitHub Gist URLs</li>
          <li>Direct links to .ts or .tsx files</li>
        </ul>
        <p className="text-xs text-gray-400 mt-2">
          Maximum file size: 500KB. CORS restrictions may apply to some URLs.
        </p>
      </div>
    </div>
  );
}