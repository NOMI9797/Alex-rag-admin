/**
 * Client-side utilities (safe for browser)
 */

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return ['txt', 'pdf', 'docx', 'doc', 'md', 'markdown'];
}

/**
 * Check if a file is supported
 */
export function isFileSupported(filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? getSupportedExtensions().includes(extension) : false;
}

/**
 * Get MIME type mappings for file upload
 */
export function getMimeTypeMapping() {
  return {
    'text/plain': ['.txt'],
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'text/markdown': ['.md', '.markdown'],
  };
}
