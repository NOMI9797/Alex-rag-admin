/**
 * API route for managing agent instructions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createQdrantManager } from '@/lib/qdrant';

const INSTRUCTIONS_CONFIG_KEY = 'agent_instructions';

/**
 * GET /api/instructions
 * Retrieve current agent instructions from Qdrant
 */
export async function GET() {
  try {
    const qdrant = createQdrantManager();
    
    // Ensure collection exists
    const collectionExists = await qdrant.collectionExists();
    if (!collectionExists) {
      return NextResponse.json({
        success: true,
        instructions: null,
        message: 'No instructions configured yet',
      });
    }

    // Retrieve instructions from Qdrant
    const instructions = await qdrant.getConfig(INSTRUCTIONS_CONFIG_KEY);

    return NextResponse.json({
      success: true,
      instructions: instructions,
      message: instructions ? 'Instructions retrieved successfully' : 'No instructions configured yet',
    });

  } catch (error) {
    console.error('Error in GET /api/instructions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve instructions' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/instructions
 * Save new agent instructions to Qdrant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instructions } = body;

    if (!instructions || typeof instructions !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Instructions text is required' 
        },
        { status: 400 }
      );
    }

    // Validate instructions length (reasonable limits)
    if (instructions.length < 10) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Instructions must be at least 10 characters long' 
        },
        { status: 400 }
      );
    }

    if (instructions.length > 50000) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Instructions must be less than 50,000 characters' 
        },
        { status: 400 }
      );
    }

    const qdrant = createQdrantManager();
    
    // Ensure collection exists
    const collectionReady = await qdrant.ensureCollection();
    if (!collectionReady) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to initialize Qdrant collection' 
        },
        { status: 500 }
      );
    }

    // Store instructions in Qdrant
    const success = await qdrant.uploadConfig(INSTRUCTIONS_CONFIG_KEY, instructions);

    if (!success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to save instructions to Qdrant. Please check the logs.' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Instructions saved successfully',
      instructions: instructions,
    });

  } catch (error) {
    console.error('Error in POST /api/instructions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save instructions' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/instructions
 * Reset instructions to default (remove from Qdrant)
 */
export async function DELETE() {
  try {
    const qdrant = createQdrantManager();
    
    // Check if collection exists
    const collectionExists = await qdrant.collectionExists();
    if (!collectionExists) {
      return NextResponse.json({
        success: true,
        message: 'Instructions already reset (collection does not exist)',
      });
    }

    // Delete instructions from Qdrant
    const success = await qdrant.deleteConfig(INSTRUCTIONS_CONFIG_KEY);

    if (!success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to delete instructions from Qdrant' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Instructions reset to default successfully',
    });

  } catch (error) {
    console.error('Error in DELETE /api/instructions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset instructions' 
      },
      { status: 500 }
    );
  }
}

