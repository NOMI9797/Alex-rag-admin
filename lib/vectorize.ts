/**
 * Text vectorization using OpenAI embeddings
 */

import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 100;

/**
 * Create embeddings for a list of texts
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const embeddings: number[][] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const batchEmbeddings = response.data.map(item => item.embedding);
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

/**
 * Create embedding for a single text
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const embeddings = await createEmbeddings([text]);
  return embeddings[0];
}

/**
 * Tokenize text into paragraphs (matching Python implementation)
 * Falls back to sentence-based chunking if no paragraph breaks found
 */
export function tokenizeParagraphs(text: string): string[] {
  // Split by double newlines (paragraph breaks)
  let paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Fallback: If we only got 1 paragraph and it's too large (>2000 chars),
  // split by sentences or fixed chunks
  if (paragraphs.length === 1 && paragraphs[0].length > 2000) {
    console.warn('Document has no paragraph breaks. Using sentence-based chunking.');
    
    // Try splitting by sentences (periods followed by space or newline)
    const sentences = paragraphs[0]
      .split(/\.\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Group sentences into chunks of ~500 characters
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 500 && currentChunk.length > 0) {
        chunks.push(currentChunk.trim() + '.');
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim() + '.');
    }
    
    paragraphs = chunks.filter(c => c.length > 0);
  }

  return paragraphs;
}

/**
 * Clean content by removing navigation elements and UI components
 * IMPORTANT: Preserves empty lines to maintain paragraph breaks for tokenization
 */
export function cleanContent(text: string): string {
  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  const skipPatterns = [
    'Docs',
    'Search',
    'GitHub',
    'Slack',
    'Sign in',
    'Home',
    'AI Agents',
    'Telephony',
    'Recipes',
    'Reference',
    'On this page',
    'Get started with LiveKit today',
    'Content from https://docs.livekit.io/',
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Preserve empty lines for paragraph breaks
    if (!trimmed) {
      cleanedLines.push('');
      continue;
    }

    // Skip if line matches any skip patterns
    if (skipPatterns.some(pattern => trimmed.includes(pattern))) {
      continue;
    }

    // Skip if line is just a URL or navigation link
    if (trimmed.startsWith('http') || trimmed.startsWith('[') || trimmed.endsWith(']')) {
      continue;
    }

    cleanedLines.push(trimmed);
  }

  return cleanedLines.join('\n');
}

