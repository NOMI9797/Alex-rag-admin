/**
 * Organization model and database operations
 */

import { getDatabase } from '@/lib/mongodb';
import { Organization } from './types';

const COLLECTION_NAME = 'organizations';

/**
 * Get organization by org_id
 */
export async function getOrganization(org_id: string): Promise<Organization | null> {
  const db = await getDatabase();
  const org = await db.collection<Organization>(COLLECTION_NAME).findOne({ org_id });
  return org;
}

/**
 * Create a new organization
 */
export async function createOrganization(data: {
  org_id: string;
  name: string;
}): Promise<Organization> {
  const db = await getDatabase();
  
  const org: Organization = {
    org_id: data.org_id,
    name: data.name,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await db.collection<Organization>(COLLECTION_NAME).insertOne(org);
  
  return {
    ...org,
    _id: result.insertedId,
  };
}

/**
 * Update organization
 */
export async function updateOrganization(
  org_id: string,
  updates: Partial<Organization>
): Promise<boolean> {
  const db = await getDatabase();
  
  const result = await db.collection<Organization>(COLLECTION_NAME).updateOne(
    { org_id },
    { 
      $set: {
        ...updates,
        updated_at: new Date(),
      }
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Check if organization exists
 */
export async function organizationExists(org_id: string): Promise<boolean> {
  const org = await getOrganization(org_id);
  return org !== null;
}

