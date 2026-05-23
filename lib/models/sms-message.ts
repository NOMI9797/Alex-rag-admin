/**
 * SMS Message model and database operations
 */

import { getDatabase } from '@/lib/mongodb';
import { SmsMessage } from './types';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'sms_messages';

/**
 * Get SMS messages by organization with pagination
 */
export async function getSmsMessagesByOrg(
  org_id: string,
  options: {
    limit?: number;
    skip?: number;
    direction?: 'inbound' | 'outbound';
    status?: string;
  } = {}
): Promise<SmsMessage[]> {
  try {
    const db = await getDatabase();
    const { limit = 50, skip = 0, direction, status } = options;
    
    const query: any = { org_id };
    if (direction) {
      query.direction = direction;
    }
    if (status) {
      query.status = status;
    }
    
    const messages = await db
      .collection<SmsMessage>(COLLECTION_NAME)
      .find(query)
      .sort({ sent_at: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
    return messages;
  } catch (error) {
    console.error('Error fetching SMS messages:', error);
    return [];
  }
}

/**
 * Get SMS message by ID
 */
export async function getSmsMessageById(message_id: string): Promise<SmsMessage | null> {
  try {
    const db = await getDatabase();
    const message = await db
      .collection<SmsMessage>(COLLECTION_NAME)
      .findOne({ _id: new ObjectId(message_id) });
    return message;
  } catch (error) {
    console.error('Error fetching SMS message:', error);
    return null;
  }
}

/**
 * Get SMS messages by phone number
 */
export async function getSmsMessagesByPhoneNumber(
  org_id: string,
  phone_number: string,
  limit: number = 50
): Promise<SmsMessage[]> {
  try {
    const db = await getDatabase();
    const messages = await db
      .collection<SmsMessage>(COLLECTION_NAME)
      .find({ 
        org_id,
        $or: [
          { from_number: phone_number },
          { to_number: phone_number }
        ]
      })
      .sort({ sent_at: -1 })
      .limit(limit)
      .toArray();
    return messages;
  } catch (error) {
    console.error('Error fetching SMS messages by phone number:', error);
    return [];
  }
}

/**
 * Get SMS messages by related call ID
 */
export async function getSmsMessagesByCallId(
  org_id: string,
  call_id: string
): Promise<SmsMessage[]> {
  try {
    const db = await getDatabase();
    const messages = await db
      .collection<SmsMessage>(COLLECTION_NAME)
      .find({ org_id, related_call_id: call_id })
      .sort({ sent_at: -1 })
      .toArray();
    return messages;
  } catch (error) {
    console.error('Error fetching SMS messages by call ID:', error);
    return [];
  }
}

/**
 * Count SMS messages by organization
 */
export async function countSmsMessagesByOrg(
  org_id: string,
  filters?: {
    direction?: 'inbound' | 'outbound';
    status?: string;
  }
): Promise<number> {
  try {
    const db = await getDatabase();
    const query: any = { org_id };
    if (filters?.direction) {
      query.direction = filters.direction;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    
    const count = await db
      .collection<SmsMessage>(COLLECTION_NAME)
      .countDocuments(query);
    return count;
  } catch (error) {
    console.error('Error counting SMS messages:', error);
    return 0;
  }
}

