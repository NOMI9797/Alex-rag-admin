/**
 * API route for deleting all knowledge base vectors
 */

import { NextResponse } from 'next/server';
import { createQdrantManager } from '@/lib/qdrant';

export async function DELETE() {
  try {
    const qdrant = createQdrantManager();
    
    const success = await qdrant.deleteAll();

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete knowledge base' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Knowledge base deleted successfully',
    });

  } catch (error) {
    console.error('Error in delete route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

