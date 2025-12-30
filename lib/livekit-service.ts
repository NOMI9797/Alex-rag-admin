/**
 * LiveKit service for SIP dispatch rule management
 */

import { SipClient } from 'livekit-server-sdk';

export interface DispatchRuleMetadata {
  customer_id: string;
  org_id: string;
  phone_number_id: string;
  knowledge_base_id?: string;
  org_name: string;
  phone_number: string; // Full phone number for uniqueness
}

export interface CreateDispatchRuleParams {
  ruleId: string;
  trunkIds: string[];
  inboundNumbers: string[];
  metadata: DispatchRuleMetadata;
}

export interface LiveKitCredentials {
  apiKey: string;
  apiSecret: string;
  wsUrl: string;
  sipUri?: string;
}

export class LiveKitService {
  private sipClient: SipClient;
  private credentials: LiveKitCredentials;

  constructor(credentials?: LiveKitCredentials) {
    // Use provided credentials or fall back to environment variables
    if (credentials) {
      this.credentials = credentials;
    } else {
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;
      const wsUrl = process.env.LIVEKIT_URL;
      const sipUri = process.env.LIVEKIT_SIP_URI;

      if (!apiKey || !apiSecret || !wsUrl) {
        throw new Error(
          'LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL must be set in environment variables or provided as credentials'
        );
      }

      this.credentials = {
        apiKey,
        apiSecret,
        wsUrl,
        sipUri,
      };
    }

    this.sipClient = new SipClient(
      this.credentials.wsUrl,
      this.credentials.apiKey,
      this.credentials.apiSecret
    );
  }

  /**
   * Get SIP URI (from credentials or env)
   */
  getSipUri(): string {
    return this.credentials.sipUri || process.env.LIVEKIT_SIP_URI || '';
  }

  /**
   * Create SIP dispatch rule for inbound calls
   */
  async createDispatchRule(params: CreateDispatchRuleParams): Promise<{
    success: boolean;
    ruleId?: string;
    error?: string;
  }> {
    try {
      const { ruleId, trunkIds, inboundNumbers, metadata } = params;

      // Create dispatch rule using LiveKit SDK signature: createSipDispatchRule(rule, options)
      // Reference: https://docs.livekit.io/telephony/accepting-calls/dispatch-rule/
      
      // Sanitize phone number for room name (remove +, spaces, etc.)
      const sanitizedPhone = metadata.phone_number.replace(/[^a-zA-Z0-9_-]/g, '');
      
      // First parameter: the rule object (SipDispatchRuleDirect)
      const rule = {
        roomName: `room-${sanitizedPhone}`,
        type: 'direct' as const,  // TypeScript literal type
      };
      
      // Second parameter: options
      const options = {
        name: ruleId,
        trunkIds: trunkIds,
        inboundNumbers: inboundNumbers,
        hidePhoneNumber: false,
        metadata: JSON.stringify({
          org_id: metadata.org_id,
          phone_number_id: metadata.phone_number_id,
          phone_number: metadata.phone_number,
        }),
      };
      
      const dispatchRuleResult = await this.sipClient.createSipDispatchRule(rule, options);

      console.log('Created LiveKit dispatch rule:', dispatchRuleResult.sipDispatchRuleId);

      return {
        success: true,
        ruleId: dispatchRuleResult.sipDispatchRuleId,
      };
    } catch (error: any) {
      console.error('Failed to create LiveKit dispatch rule:', error);
      return {
        success: false,
        error: error.message || 'Failed to create dispatch rule',
      };
    }
  }

  /**
   * Delete SIP dispatch rule
   */
  async deleteDispatchRule(ruleId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.sipClient.deleteSipDispatchRule(ruleId);

      console.log('Deleted LiveKit dispatch rule:', ruleId);

      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete LiveKit dispatch rule:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete dispatch rule',
      };
    }
  }

  /**
   * Update dispatch rule metadata
   */
  async updateDispatchRule(
    ruleId: string,
    updates: Partial<CreateDispatchRuleParams>
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // LiveKit doesn't support partial updates
      // We need to delete and recreate the rule
      await this.deleteDispatchRule(ruleId);

      if (updates.metadata) {
        const createResult = await this.createDispatchRule(
          updates as CreateDispatchRuleParams
        );
        return createResult;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to update LiveKit dispatch rule:', error);
      return {
        success: false,
        error: error.message || 'Failed to update dispatch rule',
      };
    }
  }

  /**
   * List all SIP dispatch rules
   */
  async listDispatchRules(): Promise<{
    success: boolean;
    rules?: any[];
    error?: string;
  }> {
    try {
      const rules = await this.sipClient.listSipDispatchRule();

      return {
        success: true,
        rules: rules,
      };
    } catch (error: any) {
      console.error('Failed to list LiveKit dispatch rules:', error);
      return {
        success: false,
        error: error.message || 'Failed to list dispatch rules',
      };
    }
  }
}

/**
 * Create LiveKit service instance
 * @param credentials Optional credentials. If not provided, uses env vars
 */
export function createLiveKitService(credentials?: LiveKitCredentials): LiveKitService {
  return new LiveKitService(credentials);
}

/**
 * Create LiveKit service from phone number config
 * Falls back to env vars if phone number config not available
 */
export async function createLiveKitServiceFromPhoneNumber(phoneNumberId: string): Promise<LiveKitService> {
  const { getPhoneNumberLiveKitConfig } = await import('@/lib/models/phone-number');
  const config = await getPhoneNumberLiveKitConfig(phoneNumberId);

  // Use phone number-specific config if available, otherwise use env vars
  if (config?.livekit_api_key && config?.livekit_api_secret && config?.livekit_url) {
    return new LiveKitService({
      apiKey: config.livekit_api_key,
      apiSecret: config.livekit_api_secret,
      wsUrl: config.livekit_url,
      sipUri: config.livekit_sip_uri,
    });
  }

  // Fallback to env vars
  return new LiveKitService();
}

