/**
 * Knowledge Base model and database operations
 */

import { getDatabase } from '@/lib/mongodb';
import { KnowledgeBase } from './types';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'knowledge_bases';

/**
 * Get knowledge bases by org_id
 */
export async function getKnowledgeBasesByOrg(org_id: string): Promise<KnowledgeBase[]> {
  const db = await getDatabase();
  const kbs = await db
    .collection<KnowledgeBase>(COLLECTION_NAME)
    .find({ org_id })
    .sort({ created_at: -1 })
    .toArray();
  return kbs;
}

/**
 * Get knowledge bases by phone number ID
 */
export async function getKnowledgeBasesByPhoneNumber(
  phone_number_id: string
): Promise<KnowledgeBase[]> {
  const db = await getDatabase();
  const kbs = await db
    .collection<KnowledgeBase>(COLLECTION_NAME)
    .find({ phone_number_id: new ObjectId(phone_number_id) })
    .sort({ created_at: -1 })
    .toArray();
  return kbs;
}

/**
 * Get knowledge base by ID
 */
export async function getKnowledgeBaseById(id: string): Promise<KnowledgeBase | null> {
  const db = await getDatabase();
  const kb = await db
    .collection<KnowledgeBase>(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id) });
  return kb;
}

/**
 * Get knowledge base by collection name
 */
export async function getKnowledgeBaseByCollection(
  org_id: string,
  collection_name: string
): Promise<KnowledgeBase | null> {
  const db = await getDatabase();
  const kb = await db
    .collection<KnowledgeBase>(COLLECTION_NAME)
    .findOne({ org_id, collection_name });
  return kb;
}

/**
 * Create a new knowledge base entry
 */
export async function createKnowledgeBase(data: {
  org_id: string;
  phone_number_id: string;
  name: string;
  collection_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
}): Promise<KnowledgeBase> {
  const db = await getDatabase();

  const kb: KnowledgeBase = {
    org_id: data.org_id,
    phone_number_id: new ObjectId(data.phone_number_id),
    name: data.name,
    collection_name: data.collection_name,
    file_name: data.file_name,
    file_path: data.file_path,
    file_size: data.file_size,
    file_type: data.file_type,
    vector_count: 0,
    status: 'uploading',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await db.collection<KnowledgeBase>(COLLECTION_NAME).insertOne(kb);

  return {
    ...kb,
    _id: result.insertedId,
  };
}

/**
 * Update knowledge base
 */
export async function updateKnowledgeBase(
  id: string,
  updates: Partial<KnowledgeBase>
): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.collection<KnowledgeBase>(COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updates,
        updated_at: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete knowledge base
 */
export async function deleteKnowledgeBase(id: string): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.collection<KnowledgeBase>(COLLECTION_NAME).deleteOne({
    _id: new ObjectId(id),
  });

  return result.deletedCount > 0;
}

/**
 * Check if knowledge base name already exists for this org and phone number
 */
export async function knowledgeBaseNameExists(
  org_id: string,
  phone_number_id: string,
  name: string
): Promise<boolean> {
  const db = await getDatabase();
  const existing = await db.collection<KnowledgeBase>(COLLECTION_NAME).findOne({
    org_id,
    phone_number_id: new ObjectId(phone_number_id),
    name,
  });
  return existing !== null;
}


