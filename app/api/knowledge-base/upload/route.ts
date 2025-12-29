/**
 * API route for uploading knowledge base files (multi-tenant)
 * POST /api/knowledge-base/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { createQdrantManager } from '@/lib/qdrant';
import { parseFile } from '@/lib/parsers';
import { createEmbeddings, tokenizeParagraphs, cleanContent } from '@/lib/vectorize';
import { getCurrentOrgId } from '@/lib/org-context';
import {
  createKnowledgeBase,
  updateKnowledgeBase,
  knowledgeBaseNameExists,
} from '@/lib/models/knowledge-base';
import { getPhoneNumberById } from '@/lib/models/phone-number';

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const phoneNumberId = formData.get('phoneNumberId') as string;
    const knowledgeBaseName = formData.get('knowledgeBaseName') as string;

    // Validate input
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: 'Phone number ID is required' },
        { status: 400 }
      );
    }

    if (!knowledgeBaseName) {
      return NextResponse.json(
        { error: 'Knowledge base name is required' },
        { status: 400 }
      );
    }

    // Get org context
    const org_id = getCurrentOrgId();

    // Get phone number record
    const phoneNumber = await getPhoneNumberById(phoneNumberId);

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    // Verify org ownership
    if (phoneNumber.org_id !== org_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if knowledge base name already exists for this phone number
    const exists = await knowledgeBaseNameExists(
      org_id,
      phoneNumberId,
      knowledgeBaseName
    );

    if (exists) {
      return NextResponse.json(
        { error: 'Knowledge base with this name already exists for this phone number' },
        { status: 400 }
      );
    }

    // Create collection name: {last_4_digits}_{kb_name}
    // Note: Qdrant doesn't allow forward slashes in collection names, so we use underscore
    const collectionName = `${phoneNumber.last_4_digits}_${knowledgeBaseName}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse file based on extension
    let content: string;
    try {
      content = await parseFile(buffer, file.name);
    } catch (error) {
      return NextResponse.json(
        {
          error: `Failed to parse file: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
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

    // Create KB record in database
    const fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    const kb = await createKnowledgeBase({
      org_id,
      phone_number_id: phoneNumberId,
      name: knowledgeBaseName,
      collection_name: collectionName,
      file_name: file.name,
      file_path: `kb/${org_id}/${Date.now()}-${file.name}`, // Virtual path for now
      file_size: file.size,
      file_type: fileType,
    });

    // Update status to processing
    await updateKnowledgeBase(kb._id!.toString(), { status: 'processing' });

    // Generate embeddings
    console.log(`Generating embeddings for ${paragraphs.length} paragraphs...`);
    const embeddings = await createEmbeddings(paragraphs);

    // Prepare metadata
    const metadata = paragraphs.map((_, index) => ({
      org_id,
      phone_number_id: phoneNumberId,
      knowledge_base_id: kb._id!.toString(),
      filename: file.name,
      paragraph_index: index,
      source: 'knowledge_base',
      uploaded_at: new Date().toISOString(),
      last_4_digits: phoneNumber.last_4_digits,
    }));

    // Upload to Qdrant with dynamic collection name
    const qdrant = createQdrantManager(collectionName);
    await qdrant.ensureCollection();

    const success = await qdrant.uploadVectors(embeddings, paragraphs, metadata);

    if (!success) {
      await updateKnowledgeBase(kb._id!.toString(), {
        status: 'error',
        error_message: 'Failed to upload vectors to Qdrant',
      });

      return NextResponse.json(
        { error: 'Failed to upload vectors to Qdrant' },
        { status: 500 }
      );
    }

    // Update KB record with vector count and status
    await updateKnowledgeBase(kb._id!.toString(), {
      vector_count: paragraphs.length,
      status: 'ready',
    });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${paragraphs.length} paragraphs from ${file.name}`,
      knowledgeBase: {
        id: kb._id!.toString(),
        name: knowledgeBaseName,
        collection_name: collectionName,
        file_name: file.name,
        vector_count: paragraphs.length,
        status: 'ready',
      },
    });
  } catch (error) {
    console.error('Error in /api/knowledge-base/upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

