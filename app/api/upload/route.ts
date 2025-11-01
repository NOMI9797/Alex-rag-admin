/**
 * API route for uploading knowledge base files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createQdrantManager } from '@/lib/qdrant';
import { parseFile } from '@/lib/parsers';
import { createEmbeddings, tokenizeParagraphs, cleanContent } from '@/lib/vectorize';

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse file based on extension
    let content: string;
    try {
      content = await parseFile(buffer, file.name);
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    // Clean and tokenize content
    const cleanedContent = cleanContent(content);
    const paragraphs = tokenizeParagraphs(cleanedContent);

    if (paragraphs.length === 0) {
      return NextResponse.json(
        { error: 'No content found in file after processing' },
        { status: 400 }
      );
    }

    // Generate embeddings
    console.log(`Generating embeddings for ${paragraphs.length} paragraphs...`);
    const embeddings = await createEmbeddings(paragraphs);

    // Prepare metadata
    const metadata = paragraphs.map((_, index) => ({
      filename: file.name,
      paragraph_index: index,
      source: 'knowledge_base',
      uploaded_at: new Date().toISOString(),
    }));

    // Upload to Qdrant
    const qdrant = createQdrantManager();
    await qdrant.ensureCollection();
    
    const success = await qdrant.uploadVectors(embeddings, paragraphs, metadata);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to upload vectors to Qdrant' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${paragraphs.length} paragraphs from ${file.name}`,
      paragraphs_count: paragraphs.length,
      filename: file.name,
    });

  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

