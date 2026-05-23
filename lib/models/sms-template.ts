/**
 * SMS Template model and database operations
 */

import { getDatabase } from '@/lib/mongodb';
import { SmsTemplate } from './types';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'sms_templates';

/**
 * Create a new SMS template
 */
export async function createSmsTemplate(data: {
  template_id: string;
  org_id: string;
  template_name: string;
  message_body: string;
  trigger_condition?: string;
}): Promise<SmsTemplate> {
  const db = await getDatabase();
  const template: SmsTemplate = {
    ...data,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };
  
  await db.collection<SmsTemplate>(COLLECTION_NAME).insertOne(template);
  return template;
}

/**
 * Get all SMS templates for an organization
 */
export async function getSmsTemplatesByOrg(org_id: string): Promise<SmsTemplate[]> {
  try {
    const db = await getDatabase();
    const templates = await db
      .collection<SmsTemplate>(COLLECTION_NAME)
      .find({ org_id })
      .sort({ created_at: -1 })
      .toArray();
    return templates;
  } catch (error) {
    console.error('Error fetching SMS templates:', error);
    return [];
  }
}

/**
 * Get active SMS templates for an organization
 */
export async function getActiveSmsTemplatesByOrg(org_id: string): Promise<SmsTemplate[]> {
  try {
    const db = await getDatabase();
    const templates = await db
      .collection<SmsTemplate>(COLLECTION_NAME)
      .find({ org_id, is_active: true })
      .sort({ created_at: -1 })
      .toArray();
    return templates;
  } catch (error) {
    console.error('Error fetching active SMS templates:', error);
    return [];
  }
}

/**
 * Get SMS template by template_id and org_id
 */
export async function getSmsTemplateById(
  template_id: string,
  org_id: string
): Promise<SmsTemplate | null> {
  try {
    const db = await getDatabase();
    const template = await db
      .collection<SmsTemplate>(COLLECTION_NAME)
      .findOne({ template_id, org_id });
    return template;
  } catch (error) {
    console.error('Error fetching SMS template:', error);
    return null;
  }
}

/**
 * Update SMS template
 */
export async function updateSmsTemplate(
  template_id: string,
  org_id: string,
  updates: Partial<Omit<SmsTemplate, '_id' | 'org_id' | 'template_id' | 'created_at'>>
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db
      .collection<SmsTemplate>(COLLECTION_NAME)
      .updateOne(
        { template_id, org_id },
        { 
          $set: { 
            ...updates,
            updated_at: new Date()
          } 
        }
      );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating SMS template:', error);
    return false;
  }
}

/**
 * Delete SMS template
 */
export async function deleteSmsTemplate(
  template_id: string,
  org_id: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db
      .collection<SmsTemplate>(COLLECTION_NAME)
      .deleteOne({ template_id, org_id });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting SMS template:', error);
    return false;
  }
}

/**
 * Toggle template active status
 */
export async function toggleSmsTemplateStatus(
  template_id: string,
  org_id: string,
  is_active: boolean
): Promise<boolean> {
  return await updateSmsTemplate(template_id, org_id, { is_active });
}

