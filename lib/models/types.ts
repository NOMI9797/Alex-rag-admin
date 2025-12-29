/**
 * TypeScript types for database models
 */

import { ObjectId } from 'mongodb';

// Organization (multi-tenant root)
export interface Organization {
  _id?: ObjectId;
  org_id: string; // Unique identifier
  name: string;
  created_at: Date;
  updated_at: Date;
}

// Phone Numbers
export interface PhoneNumber {
  _id?: ObjectId;
  org_id: string;
  phone_number: string; // E.164 format: "+923001234678"
  last_4_digits: string; // "4678"
  twilio_account_sid: string;
  twilio_auth_token: string; // Should be encrypted in production
  twilio_trunk_sid?: string; // Set after SIP trunk creation
  // LiveKit Configuration (per phone number, like Twilio credentials)
  livekit_api_key?: string; // LiveKit API Key for this phone number
  livekit_api_secret?: string; // LiveKit API Secret for this phone number
  livekit_url?: string; // LiveKit WebSocket URL
  livekit_sip_uri?: string; // LiveKit SIP URI
  livekit_dispatch_rule_id?: string; // Set after dispatch rule creation
  status: 'pending' | 'configured' | 'active' | 'error';
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

// Knowledge Bases
export interface KnowledgeBase {
  _id?: ObjectId;
  org_id: string;
  phone_number_id: ObjectId; // Reference to PhoneNumber
  name: string; // e.g., "electrical_appliance"
  collection_name: string; // e.g., "4678_electrical_appliance"
  file_name: string; // Original filename
  file_path: string; // Storage path: "kb/{org_id}/{file_id}.pdf"
  file_size: number; // Bytes
  file_type: string; // "pdf", "docx", "txt", "md"
  vector_count: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

// Call Logs (for future use)
export interface CallLog {
  _id?: ObjectId;
  org_id: string;
  phone_number_id: ObjectId;
  knowledge_base_id: ObjectId;
  call_sid: string; // Twilio call SID
  from_number: string;
  to_number: string;
  duration: number; // Seconds
  status: string;
  transcript?: string;
  created_at: Date;
}

// Subscriptions (for future use)
export interface Subscription {
  _id?: ObjectId;
  org_id: string;
  plan: string; // "free", "basic", "pro", etc.
  status: 'active' | 'cancelled' | 'expired';
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date?: Date;
  created_at: Date;
  updated_at: Date;
}

