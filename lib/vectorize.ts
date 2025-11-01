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
 */
export function tokenizeParagraphs(text: string): string[] {
  // Split by double newlines (paragraph breaks)
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs;
}

/**
 * Clean content by removing navigation elements and UI components
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
    
    if (!trimmed) {
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

