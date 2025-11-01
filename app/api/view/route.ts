/**
 * API route for viewing knowledge base content
 */

import { NextRequest, NextResponse } from 'next/server';
import { createQdrantManager } from '@/lib/qdrant';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');

    const qdrant = createQdrantManager();
    
    const texts = await qdrant.getAllTexts(limit);

    return NextResponse.json({
      success: true,
      texts,
      count: texts.length,
    });

  } catch (error) {
    console.error('Error in view route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

