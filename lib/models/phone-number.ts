/**
 * Phone Number model and database operations
 */

import { getDatabase } from '@/lib/mongodb';
import { PhoneNumber } from './types';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'phone_numbers';

/**
 * Extract last 4 digits from phone number
 */
export function extractLast4Digits(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.slice(-4);
}

/**
 * Sanitize phone number for use in collection names and room names
 * Removes all non-alphanumeric characters except underscores and hyphens
 */
export function sanitizePhoneNumber(phoneNumber: string): string {
  // Remove +, spaces, parentheses, and other special chars
  // Keep only digits, letters, underscores, and hyphens
  return phoneNumber.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Get phone numbers by org_id
 */
export async function getPhoneNumbersByOrg(org_id: string): Promise<PhoneNumber[]> {
  try {
    const db = await getDatabase();
    const phoneNumbers = await db
      .collection<PhoneNumber>(COLLECTION_NAME)
      .find({ org_id })
      .toArray();
    return phoneNumbers;
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    // Return empty array on error instead of throwing
    // This prevents the UI from breaking on connection issues
    return [];
  }
}

/**
 * Get phone number by ID
 */
export async function getPhoneNumberById(id: string): Promise<PhoneNumber | null> {
  const db = await getDatabase();
  const phoneNumber = await db
    .collection<PhoneNumber>(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id) });
  return phoneNumber;
}

/**
 * Get phone number by phone_number string
 */
export async function getPhoneNumberByNumber(
  org_id: string,
  phone_number: string
): Promise<PhoneNumber | null> {
  const db = await getDatabase();
  const phoneNumber = await db
    .collection<PhoneNumber>(COLLECTION_NAME)
    .findOne({ org_id, phone_number });
  return phoneNumber;
}

/**
 * Create a new phone number
 */
export async function createPhoneNumber(data: {
  org_id: string;
  phone_number: string;
  twilio_account_sid: string;
  twilio_auth_token: string;
}): Promise<PhoneNumber> {
  const db = await getDatabase();

  const phoneNumber: PhoneNumber = {
    org_id: data.org_id,
    phone_number: data.phone_number,
    last_4_digits: extractLast4Digits(data.phone_number),
    twilio_account_sid: data.twilio_account_sid,
    twilio_auth_token: data.twilio_auth_token,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await db.collection<PhoneNumber>(COLLECTION_NAME).insertOne(phoneNumber);

  return {
    ...phoneNumber,
    _id: result.insertedId,
  };
}

/**
 * Create phone number with LiveKit credentials only (no Twilio)
 */
export async function createPhoneNumberWithLiveKit(data: {
  org_id: string;
  phone_number: string;
  livekit_api_key: string;
  livekit_api_secret: string;
  livekit_url: string;
  livekit_sip_uri: string;
}): Promise<PhoneNumber> {
  const db = await getDatabase();

  const phoneNumber: PhoneNumber = {
    org_id: data.org_id,
    phone_number: data.phone_number,
    last_4_digits: extractLast4Digits(data.phone_number),
    twilio_account_sid: '', // Not required for LiveKit-only
    twilio_auth_token: '', // Not required for LiveKit-only
    livekit_api_key: data.livekit_api_key,
    livekit_api_secret: data.livekit_api_secret,
    livekit_url: data.livekit_url,
    livekit_sip_uri: data.livekit_sip_uri,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await db.collection<PhoneNumber>(COLLECTION_NAME).insertOne(phoneNumber);

  return {
    ...phoneNumber,
    _id: result.insertedId,
  };
}

/**
 * Update phone number
 */
export async function updatePhoneNumber(
  id: string,
  updates: Partial<PhoneNumber>
): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.collection<PhoneNumber>(COLLECTION_NAME).updateOne(
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
 * Update LiveKit configuration for a phone number
 */
export async function updatePhoneNumberLiveKitConfig(
  id: string,
  config: {
    livekit_api_key?: string;
    livekit_api_secret?: string;
    livekit_url?: string;
    livekit_sip_uri?: string;
  }
): Promise<boolean> {
  return updatePhoneNumber(id, config);
}

/**
 * Get LiveKit configuration for a phone number
 */
export async function getPhoneNumberLiveKitConfig(id: string): Promise<{
  livekit_api_key?: string;
  livekit_api_secret?: string;
  livekit_url?: string;
  livekit_sip_uri?: string;
} | null> {
  const phoneNumber = await getPhoneNumberById(id);
  if (!phoneNumber) return null;

  return {
    livekit_api_key: phoneNumber.livekit_api_key,
    livekit_api_secret: phoneNumber.livekit_api_secret,
    livekit_url: phoneNumber.livekit_url,
    livekit_sip_uri: phoneNumber.livekit_sip_uri,
  };
}

/**
 * Delete phone number
 */
export async function deletePhoneNumber(id: string): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.collection<PhoneNumber>(COLLECTION_NAME).deleteOne({
    _id: new ObjectId(id),
  });

  return result.deletedCount > 0;
}

/**
 * Check if phone number already exists for this org
 */
export async function phoneNumberExists(
  org_id: string,
  phone_number: string
): Promise<boolean> {
  const existing = await getPhoneNumberByNumber(org_id, phone_number);
  return existing !== null;
}

