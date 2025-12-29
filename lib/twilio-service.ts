/**
 * Twilio service for phone number and SIP trunk management
 */

import twilio from 'twilio';

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
}

export interface TwilioPhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  sid: string;
}

export class TwilioService {
  /**
   * Create Twilio client with customer credentials
   * Supports both Account SID/Auth Token and API Key/Secret
   */
  private createClient(credentials: TwilioCredentials & { apiKey?: string; apiSecret?: string }) {
    // If API Key and Secret are provided, use them with Account SID
    if (credentials.apiKey && credentials.apiSecret) {
      return twilio(credentials.apiKey, credentials.apiSecret, { 
        accountSid: credentials.accountSid 
      });
    }
    // Otherwise use Account SID and Auth Token
    return twilio(credentials.accountSid, credentials.authToken);
  }

  /**
   * Validate Twilio credentials by making a test API call
   */
  async validateCredentials(credentials: TwilioCredentials): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const client = this.createClient(credentials);
      
      // Test credentials by fetching account info
      await client.api.accounts(credentials.accountSid).fetch();
      
      return { valid: true };
    } catch (error: any) {
      console.error('Twilio credential validation failed:', error);
      
      if (error.status === 401) {
        return { valid: false, error: 'Invalid Account SID or Auth Token' };
      }
      
      return { 
        valid: false, 
        error: error.message || 'Failed to validate credentials' 
      };
    }
  }

  /**
   * List phone numbers associated with Twilio account
   */
  async listPhoneNumbers(credentials: TwilioCredentials): Promise<{
    success: boolean;
    phoneNumbers?: TwilioPhoneNumber[];
    error?: string;
  }> {
    try {
      const client = this.createClient(credentials);
      
      const incomingPhoneNumbers = await client.incomingPhoneNumbers.list();
      
      const phoneNumbers: TwilioPhoneNumber[] = incomingPhoneNumbers.map(num => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        sid: num.sid,
      }));
      
      return { success: true, phoneNumbers };
    } catch (error: any) {
      console.error('Failed to list Twilio phone numbers:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to list phone numbers' 
      };
    }
  }

  /**
   * Verify that a phone number exists in the Twilio account
   */
  async verifyPhoneNumber(
    credentials: TwilioCredentials,
    phoneNumber: string
  ): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const result = await this.listPhoneNumbers(credentials);
      
      if (!result.success || !result.phoneNumbers) {
        return { valid: false, error: result.error };
      }
      
      const exists = result.phoneNumbers.some(num => num.phoneNumber === phoneNumber);
      
      if (!exists) {
        return { 
          valid: false, 
          error: 'Phone number not found in your Twilio account' 
        };
      }
      
      return { valid: true };
    } catch (error: any) {
      console.error('Failed to verify phone number:', error);
      return { 
        valid: false, 
        error: error.message || 'Failed to verify phone number' 
      };
    }
  }

  /**
   * Create SIP Trunk in customer's Twilio account
   */
  async createSIPTrunk(
    credentials: TwilioCredentials & { apiKey?: string; apiSecret?: string },
    customerId: string,
    livekitSipUri: string
  ): Promise<{
    success: boolean;
    trunkSid?: string;
    error?: string;
  }> {
    try {
      console.log('Creating Twilio client...');
      console.log('Using API Key:', credentials.apiKey ? 'YES' : 'NO');
      console.log('Account SID:', credentials.accountSid);
      
      const client = this.createClient(credentials);
      
      console.log('Creating SIP Trunk...');
      // Create SIP Trunk
      const trunk = await client.trunking.v1.trunks.create({
        friendlyName: `LiveKit-SIP-${customerId}`,
      });
      
      console.log('SIP Trunk created:', trunk.sid);
      
      console.log('Adding Origination URI:', livekitSipUri);
      // Add Origination URI (LiveKit SIP endpoint)
      await client.trunking.v1
        .trunks(trunk.sid)
        .originationUrls.create({
          friendlyName: 'LiveKit SIP URI',
          sipUrl: livekitSipUri,
          weight: 10,
          priority: 10,
          enabled: true,
        });
      
      console.log('Origination URI added successfully');
      
      return { success: true, trunkSid: trunk.sid };
    } catch (error: any) {
      console.error('Failed to create SIP trunk:', error);
      
      let errorMessage = error.message || 'Failed to create SIP trunk';
      
      if (error.status === 401) {
        errorMessage = 'Authentication failed. Please verify your Twilio Account SID, API Key, and API Secret. Make sure the API Key has permission to create SIP trunks.';
      } else if (error.code === 20003) {
        errorMessage = 'Twilio authentication error (20003). Verify your credentials and API Key permissions.';
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  /**
   * Add phone number to SIP trunk
   */
  async addPhoneNumberToTrunk(
    credentials: TwilioCredentials,
    trunkSid: string,
    phoneNumberSid: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const client = this.createClient(credentials);
      
      await client.trunking.v1
        .trunks(trunkSid)
        .phoneNumbers.create({
          phoneNumberSid: phoneNumberSid,
        });
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to add phone number to trunk:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to add phone number to trunk' 
      };
    }
  }

  /**
   * Get phone number SID by phone number string
   */
  async getPhoneNumberSid(
    credentials: TwilioCredentials,
    phoneNumber: string
  ): Promise<{
    success: boolean;
    sid?: string;
    error?: string;
  }> {
    try {
      const result = await this.listPhoneNumbers(credentials);
      
      if (!result.success || !result.phoneNumbers) {
        return { success: false, error: result.error };
      }
      
      const phone = result.phoneNumbers.find(num => num.phoneNumber === phoneNumber);
      
      if (!phone) {
        return { 
          success: false, 
          error: 'Phone number not found in your Twilio account' 
        };
      }
      
      return { success: true, sid: phone.sid };
    } catch (error: any) {
      console.error('Failed to get phone number SID:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to get phone number SID' 
      };
    }
  }

  /**
   * Complete SIP trunk setup (create trunk + add phone number)
   */
  async setupSIPTrunk(
    credentials: TwilioCredentials,
    customerId: string,
    phoneNumber: string,
    livekitSipUri: string
  ): Promise<{
    success: boolean;
    trunk_sid?: string;
    error?: string;
  }> {
    try {
      console.log('=== Starting SIP Trunk Setup ===');
      
      // 1. Create SIP trunk
      console.log('Step 1: Creating SIP trunk...');
      const trunkResult = await this.createSIPTrunk(
        credentials,
        customerId,
        livekitSipUri
      );
      
      if (!trunkResult.success || !trunkResult.trunkSid) {
        console.error('Failed at Step 1:', trunkResult.error);
        return { success: false, error: trunkResult.error };
      }
      console.log('Step 1: Success - Trunk SID:', trunkResult.trunkSid);
      
      // 2. Get phone number SID
      console.log('Step 2: Getting phone number SID for', phoneNumber);
      const sidResult = await this.getPhoneNumberSid(credentials, phoneNumber);
      
      if (!sidResult.success || !sidResult.sid) {
        console.error('Failed at Step 2:', sidResult.error);
        // Rollback: delete the trunk
        await this.deleteSIPTrunk(credentials, trunkResult.trunkSid);
        return { success: false, error: sidResult.error };
      }
      console.log('Step 2: Success - Phone number SID:', sidResult.sid);
      
      // 3. Add phone number to trunk
      console.log('Step 3: Adding phone number to trunk...');
      const addResult = await this.addPhoneNumberToTrunk(
        credentials,
        trunkResult.trunkSid,
        sidResult.sid
      );
      
      if (!addResult.success) {
        console.error('Failed at Step 3:', addResult.error);
        // Rollback: delete the trunk
        await this.deleteSIPTrunk(credentials, trunkResult.trunkSid);
        return { success: false, error: addResult.error };
      }
      console.log('Step 3: Success - Phone number added to trunk');
      console.log('=== SIP Trunk Setup Complete ===');
      console.log('Returning trunk_sid:', trunkResult.trunkSid);
      
      return { success: true, trunk_sid: trunkResult.trunkSid };
    } catch (error: any) {
      console.error('Failed to setup SIP trunk:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to setup SIP trunk' 
      };
    }
  }

  /**
   * Delete SIP trunk
   */
  async deleteSIPTrunk(
    credentials: TwilioCredentials,
    trunkSid: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const client = this.createClient(credentials);
      
      await client.trunking.v1.trunks(trunkSid).remove();
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete SIP trunk:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to delete SIP trunk' 
      };
    }
  }
}

/**
 * Create singleton instance
 */
export const twilioService = new TwilioService();

