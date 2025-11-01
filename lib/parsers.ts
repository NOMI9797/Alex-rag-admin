/**
 * File parsers for different document formats (Server-side only)
 * These functions should only be used in API routes, not in client components
 */

// Dynamic imports for server-side only
const getPdfParse = async () => {
  const pdf = await import('pdf-parse');
  return (pdf as any).default || pdf;
};

const getMammoth = async () => {
  const mammoth = await import('mammoth');
  return (mammoth as any).default || mammoth;
};

const getMarked = async () => {
  const { marked } = await import('marked');
  return marked;
};

/**
 * Parse a text file
 */
export async function parseTxt(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8');
}

/**
 * Parse a PDF file
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getPdfParse();
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

/**
 * Parse a DOCX file
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await getMammoth();
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

/**
 * Parse a Markdown file
 */
export async function parseMd(buffer: Buffer): Promise<string> {
  try {
    const markdown = buffer.toString('utf-8');
    const marked = await getMarked();
    // Convert markdown to plain text by rendering and stripping HTML
    const html = await marked(markdown);
    // Simple HTML tag removal (for plain text extraction)
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text;
  } catch (error) {
    console.error('Error parsing Markdown:', error);
    throw new Error('Failed to parse Markdown file');
  }
}

/**
 * Parse a file based on its extension
 */
export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
      return parseTxt(buffer);
    case 'pdf':
      return parsePdf(buffer);
    case 'docx':
    case 'doc':
      return parseDocx(buffer);
    case 'md':
    case 'markdown':
      return parseMd(buffer);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

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

