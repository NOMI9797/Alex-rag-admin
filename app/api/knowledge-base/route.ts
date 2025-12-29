/**
 * API routes for knowledge base management
 * GET /api/knowledge-base - List knowledge bases for current org
 * DELETE /api/knowledge-base?id={id} - Delete knowledge base
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import {
  getKnowledgeBasesByOrg,
  getKnowledgeBaseById,
  deleteKnowledgeBase,
} from '@/lib/models/knowledge-base';
import { createQdrantManager } from '@/lib/qdrant';

/**
 * GET - List knowledge bases
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phoneNumberId = searchParams.get('phoneNumberId');

    const org_id = getCurrentOrgId();

    let knowledgeBases;

    if (phoneNumberId) {
      // Get KBs for specific phone number
      const { getKnowledgeBasesByPhoneNumber } = await import('@/lib/models/knowledge-base');
      knowledgeBases = await getKnowledgeBasesByPhoneNumber(phoneNumberId);

      // Filter by org_id for security
      knowledgeBases = knowledgeBases.filter(kb => kb.org_id === org_id);
    } else {
      // Get all KBs for org
      knowledgeBases = await getKnowledgeBasesByOrg(org_id);
    }

    // Format response
    const formattedKBs = knowledgeBases.map(kb => ({
      id: kb._id?.toString(),
      name: kb.name,
      collection_name: kb.collection_name,
      file_name: kb.file_name,
      file_size: kb.file_size,
      file_type: kb.file_type,
      vector_count: kb.vector_count,
      status: kb.status,
      error_message: kb.error_message,
      created_at: kb.created_at,
      updated_at: kb.updated_at,
    }));

    return NextResponse.json({
      success: true,
      knowledgeBases: formattedKBs,
    });
  } catch (error) {
    console.error('Error in GET /api/knowledge-base:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete knowledge base
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Knowledge base ID is required' },
        { status: 400 }
      );
    }

    const org_id = getCurrentOrgId();

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

    // Delete vectors from Qdrant
    try {
      const qdrant = createQdrantManager(kb.collection_name);
      const exists = await qdrant.collectionExists();

      if (exists) {
        // Delete entire collection
        await qdrant.deleteAll();
      }
    } catch (error) {
      console.error('Failed to delete Qdrant collection:', error);
      // Continue with database deletion
    }

    // Delete KB record from database
    const deleted = await deleteKnowledgeBase(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete knowledge base' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Knowledge base deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/knowledge-base:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

