/**
 * API route for getting knowledge base statistics
 */

import { NextResponse } from 'next/server';
import { createQdrantManager } from '@/lib/qdrant';

export async function GET() {
  try {
    const qdrant = createQdrantManager();
    
    // Check if collection exists
    const exists = await qdrant.collectionExists();
    
    if (!exists) {
      return NextResponse.json({
        exists: false,
        vector_count: 0,
        collection_name: process.env.QDRANT_COLLECTION_NAME || 'knowledge_base',
      });
    }

    const stats = await qdrant.getStats();

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to get collection stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: true,
      ...stats,
    });

  } catch (error) {
    console.error('Error in stats route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

