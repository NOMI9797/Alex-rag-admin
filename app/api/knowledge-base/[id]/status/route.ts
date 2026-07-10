/**
 * API route to check knowledge base processing status
 * GET /api/knowledge-base/[id]/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import { getKnowledgeBaseById } from '@/lib/models/knowledge-base';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;

    const org_id = await getCurrentOrgId();

    // Get KB record
    const kb = await getKnowledgeBaseById(id);

    if (!kb) {
      return NextResponse.json(
        { success: false, error: 'Knowledge base not found' },
        { status: 404 }
      );
    }

    // Verify org ownership
    if (kb.org_id !== org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      status: kb.status,
      vector_count: kb.vector_count,
      error_message: kb.error_message,
    });
  } catch (error) {
    console.error('Error in GET /api/knowledge-base/[id]/status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}


