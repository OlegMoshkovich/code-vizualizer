/**
 * Tests for URLInput component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import URLInput from './URLInput';
import { validateURL, fetchCodeFromURL } from '../lib/utils';
import type { CodeFetchResult } from '../types';

// Mock the utility functions
jest.mock('../lib/utils', () => ({
  validateURL: jest.fn(),
  fetchCodeFromURL: jest.fn(),
  getFilenameFromURL: jest.fn(() => 'test.ts'),
  isGitHubURL: jest.fn(() => false),
  isGistURL: jest.fn(() => false),
}));

const mockValidateURL = validateURL as jest.MockedFunction<typeof validateURL>;
const mockFetchCodeFromURL = fetchCodeFromURL as jest.MockedFunction<typeof fetchCodeFromURL>;

describe('URLInput Component', () => {
  const mockOnAnalyze = jest.fn();
  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateURL.mockReturnValue({ isValid: true, normalizedUrl: 'https://example.com/test.ts' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render input field and analyze button', () => {
      render(<URLInput />);
      
      expect(screen.getByLabelText(/typescript file url/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze typescript file analysis/i })).toBeInTheDocument();
    });

    it('should render with initial URL value', () => {
      const initialUrl = 'https://example.com/test.ts';
      render(<URLInput initialUrl={initialUrl} />);
      
      expect(screen.getByDisplayValue(initialUrl)).toBeInTheDocument();
    });

    it('should render help text with supported URLs', () => {
      render(<URLInput />);
      
      expect(screen.getByText(/supported urls:/i)).toBeInTheDocument();
      expect(screen.getByText(/github raw urls/i)).toBeInTheDocument();
      expect(screen.getByText(/github gist urls/i)).toBeInTheDocument();
      expect(screen.getByText(/maximum file size: 500kb/i)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<URLInput className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('URL Input Validation', () => {
    it('should validate URL on input change', async () => {
      const user = userEvent.setup();
      render(<URLInput />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      await user.type(input, 'https://example.com/test.ts');
      
      expect(mockValidateURL).toHaveBeenCalledWith('https://example.com/test.ts');
    });

    it('should show validation message for valid URL', async () => {
      const user = userEvent.setup();
      mockValidateURL.mockReturnValue({ 
        isValid: true, 
        normalizedUrl: 'https://example.com/test.ts' 
      });
      
      render(<URLInput />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      await user.type(input, 'https://example.com/test.ts');
      
      await waitFor(() => {
        expect(screen.getByText(/✓ valid typescript file url/i)).toBeInTheDocument();
      });
    });

    it('should show error message for invalid URL', async () => {
      const user = userEvent.setup();
      mockValidateURL.mockReturnValue({ 
        isValid: false, 
        error: 'Invalid URL format' 
      });
      
      render(<URLInput />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      await user.type(input, 'invalid-url');
      
      await waitFor(() => {
        expect(screen.getByText(/invalid url format/i)).toBeInTheDocument();
      });
    });

    it('should clear validation messages when input is empty', async () => {
      const user = userEvent.setup();
      render(<URLInput initialUrl="https://example.com/test.ts" />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      await user.clear(input);
      
      expect(screen.queryByText(/✓ valid typescript file url/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/invalid url format/i)).not.toBeInTheDocument();
    });
  });

  describe('Analyze Functionality', () => {
    it('should call onAnalyze when analyze button is clicked with valid URL', async () => {
      const user = userEvent.setup();
      const mockResult: CodeFetchResult = {
        success: true,
        content: 'function test() {}',
        url: 'https://example.com/test.ts',
        size: 100
      };
      
      mockFetchCodeFromURL.mockResolvedValue(mockResult);
      
      render(<URLInput onAnalyze={mockOnAnalyze} onStatusChange={mockOnStatusChange} />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      const button = screen.getByRole('button', { name: /analyze typescript file analysis/i });
      
      await user.type(input, 'https://example.com/test.ts');
      await user.click(button);
      
      await waitFor(() => {
        expect(mockFetchCodeFromURL).toHaveBeenCalledWith('https://example.com/test.ts');
        expect(mockOnAnalyze).toHaveBeenCalledWith(mockResult);
      });
    });

    it('should handle fetch errors gracefully', async () => {
      const user = userEvent.setup();
      const mockResult: CodeFetchResult = {
        success: false,
        error: 'File not found',
        url: 'https://example.com/missing.ts'
      };
      
      mockFetchCodeFromURL.mockResolvedValue(mockResult);
      
      render(<URLInput onStatusChange={mockOnStatusChange} />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      const button = screen.getByRole('button', { name: /analyze typescript file analysis/i });
      
      await user.type(input, 'https://example.com/missing.ts');
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/file not found/i)).toBeInTheDocument();
        expect(mockOnStatusChange).toHaveBeenCalledWith('error');
      });
    });

    it('should trigger analysis on Enter key press', async () => {
      const user = userEvent.setup();
      const mockResult: CodeFetchResult = {
        success: true,
        content: 'function test() {}',
        url: 'https://example.com/test.ts'
      };
      
      mockFetchCodeFromURL.mockResolvedValue(mockResult);
      
      render(<URLInput onAnalyze={mockOnAnalyze} />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      
      await user.type(input, 'https://example.com/test.ts');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(mockFetchCodeFromURL).toHaveBeenCalledWith('https://example.com/test.ts');
      });
    });

    it('should not trigger analysis on Enter when disabled', async () => {
      const user = userEvent.setup();
      
      render(<URLInput onAnalyze={mockOnAnalyze} disabled />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      
      await user.type(input, 'https://example.com/test.ts');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      expect(mockFetchCodeFromURL).not.toHaveBeenCalled();
    });
  });

  describe('Status Management', () => {

    it('should call onStatusChange with correct statuses during analysis flow', async () => {
      const user = userEvent.setup();
      const mockResult: CodeFetchResult = {
        success: true,
        content: 'function test() {}',
        url: 'https://example.com/test.ts'
      };
      
      mockFetchCodeFromURL.mockResolvedValue(mockResult);
      
      render(<URLInput onStatusChange={mockOnStatusChange} />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      const button = screen.getByRole('button', { name: /analyze typescript file analysis/i });
      
      await user.type(input, 'https://example.com/test.ts');
      await user.click(button);
      
      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith('validating');
        expect(mockOnStatusChange).toHaveBeenCalledWith('fetching');
        expect(mockOnStatusChange).toHaveBeenCalledWith('complete');
      });
    });

    it('should show loading spinner during analysis', async () => {
      const user = userEvent.setup();
      
      // Mock fetchCodeFromURL to never resolve
      mockFetchCodeFromURL.mockImplementation(() => new Promise(() => {}));
      
      render(<URLInput />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      const button = screen.getByRole('button', { name: /analyze typescript file analysis/i });
      
      await user.type(input, 'https://example.com/test.ts');
      await user.click(button);
      
      await waitFor(() => {
        const updatedButton = screen.getByRole('button');
        expect(updatedButton).toHaveTextContent(/validating|fetching/i);
      });
    });

    it('should update button text based on status', async () => {
      const user = userEvent.setup();
      
      // Mock fetchCodeFromURL to never resolve for this test
      mockFetchCodeFromURL.mockImplementation(() => new Promise(() => {}));
      
      render(<URLInput />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      let button = screen.getByRole('button', { name: /analyze typescript file analysis/i });
      
      expect(button).toHaveTextContent('Analyze');
      
      await user.type(input, 'https://example.com/test.ts');
      await user.click(button);
      
      await waitFor(() => {
        button = screen.getByRole('button');
        expect(button).toHaveTextContent(/validating|fetching/i);
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable input and button when disabled prop is true', () => {
      render(<URLInput disabled />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      const button = screen.getByRole('button');
      
      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });

    it('should disable button when URL is empty', () => {
      render(<URLInput />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should disable input and button during analysis', async () => {
      const user = userEvent.setup();
      
      // Mock fetchCodeFromURL to never resolve
      mockFetchCodeFromURL.mockImplementation(() => new Promise(() => {}));
      
      render(<URLInput />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      const button = screen.getByRole('button');
      
      await user.type(input, 'https://example.com/test.ts');
      await user.click(button);
      
      await waitFor(() => {
        expect(input).toBeDisabled();
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<URLInput />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      const button = screen.getByRole('button', { name: /analyze typescript file analysis/i });
      
      expect(input).toHaveAttribute('id', 'url-input');
      expect(button).toHaveAttribute('aria-label');
    });

    it('should associate error messages with input', async () => {
      const user = userEvent.setup();
      mockValidateURL.mockReturnValue({ 
        isValid: false, 
        error: 'Invalid URL format' 
      });
      
      render(<URLInput />);
      
      const input = screen.getByLabelText(/typescript file url/i);
      await user.type(input, 'invalid-url');
      
      await waitFor(() => {
        const errorContainer = screen.getByRole('alert');
        expect(errorContainer).toHaveAttribute('id', 'url-error');
        expect(input).toHaveAttribute('aria-describedby', 'url-error');
      });
    });
  });
});