/**
 * LiveKit service for SIP dispatch rule management
 */

import { SipClient } from 'livekit-server-sdk';
import { RoomConfiguration, RoomAgentDispatch } from '@livekit/protocol';
import { sanitizePhoneNumber } from '@/lib/models/phone-number';

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
      // Use consistent sanitization function across the codebase
      const sanitizedPhone = sanitizePhoneNumber(metadata.phone_number);
      
      // First parameter: the rule object (SipDispatchRuleDirect)
      const rule = {
        roomName: `room-${sanitizedPhone}`,
        type: 'direct' as const,  // TypeScript literal type
      };
      
      // Second parameter: options
      // Note: inboundNumbers is not a valid parameter in LiveKit SDK
      // LiveKit matches calls based on trunkIds only
      
      // Create agent dispatch configuration
      const agentDispatch = new RoomAgentDispatch({
        agentName: 'alex_rag_agent', // Agent name that will be dispatched
        metadata: JSON.stringify({
          org_id: metadata.org_id,
          phone_number_id: metadata.phone_number_id,
          phone_number: metadata.phone_number,
        }),
      });
      
      // Create room configuration with agent and metadata
      // Metadata in roomConfig will be available in the room when it's created
      const roomConfig = new RoomConfiguration({
        agents: [agentDispatch],
        metadata: JSON.stringify({
          org_id: metadata.org_id,
          phone_number_id: metadata.phone_number_id,
          phone_number: metadata.phone_number,
        }),
      });
      
      const options = {
        name: ruleId,
        trunkIds: trunkIds,
        hidePhoneNumber: false,
        metadata: JSON.stringify({
          org_id: metadata.org_id,
          phone_number_id: metadata.phone_number_id,
          phone_number: metadata.phone_number,
        }),
        roomConfig: roomConfig,
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
    ruleId?: string;
    error?: string;
  }> {
    try {
      // LiveKit doesn't support partial updates
      // We need to delete and recreate the rule
      await this.deleteDispatchRule(ruleId);

      // Recreate rule if we have enough information (metadata is required)
      if (updates.metadata && updates.trunkIds && updates.inboundNumbers) {
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

  /**
   * Create LiveKit Inbound Trunk for accepting calls from Twilio
   */
  async createInboundTrunk(
    name: string,
    phoneNumber: string,
    metadata?: { org_id: string; phone_number_id: string }
  ): Promise<{
    success: boolean;
    trunkId?: string;
    error?: string;
  }> {
    try {
      const trunk = await this.sipClient.createSipInboundTrunk(
        name,
        [phoneNumber],
        {
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        }
      );

      console.log('Created LiveKit Inbound Trunk:', trunk.sipTrunkId);

      return {
        success: true,
        trunkId: trunk.sipTrunkId,
      };
    } catch (error: any) {
      console.error('Failed to create LiveKit Inbound Trunk:', error);
      return {
        success: false,
        error: error.message || 'Failed to create inbound trunk',
      };
    }
  }

  /**
   * List all LiveKit Inbound Trunks
   */
  async listInboundTrunks(): Promise<{
    success: boolean;
    trunks?: any[];
    error?: string;
  }> {
    try {
      const trunks = await this.sipClient.listSipInboundTrunk();
      return {
        success: true,
        trunks: trunks,
      };
    } catch (error: any) {
      console.error('Failed to list LiveKit Inbound Trunks:', error);
      return {
        success: false,
        error: error.message || 'Failed to list inbound trunks',
      };
    }
  }

  /**
   * Find LiveKit Inbound Trunk by phone number
   */
  async findInboundTrunkByPhoneNumber(phoneNumber: string): Promise<{
    success: boolean;
    trunkId?: string;
    error?: string;
  }> {
    try {
      const listResult = await this.listInboundTrunks();
      if (!listResult.success || !listResult.trunks) {
        return { success: false, error: listResult.error };
      }

      const trunk = listResult.trunks.find((t: any) => 
        t.numbers && t.numbers.includes(phoneNumber)
      );

      if (trunk) {
        return {
          success: true,
          trunkId: trunk.sipTrunkId,
        };
      }

      return { success: false, error: 'Inbound trunk not found' };
    } catch (error: any) {
      console.error('Failed to find LiveKit Inbound Trunk:', error);
      return {
        success: false,
        error: error.message || 'Failed to find inbound trunk',
      };
    }
  }

  /**
   * Delete LiveKit Inbound Trunk
   */
  async deleteInboundTrunk(trunkId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Use deleteSipTrunk for both inbound and outbound trunks
      await this.sipClient.deleteSipTrunk(trunkId);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete LiveKit Inbound Trunk:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete inbound trunk',
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

