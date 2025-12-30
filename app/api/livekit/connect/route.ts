/**
 * API route to connect phone number with LiveKit credentials
 * POST /api/livekit/connect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import { extractLast4Digits, sanitizePhoneNumber, updatePhoneNumber } from '@/lib/models/phone-number';
import { createLiveKitService } from '@/lib/livekit-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone_number, twilio_account_sid, twilio_api_key, twilio_api_secret } = body;

    // Validate input
    if (!phone_number || !twilio_account_sid || !twilio_api_key || !twilio_api_secret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number, Account SID, API Key, and API Secret are required',
        },
        { status: 400 }
      );
    }

    const org_id = await getCurrentOrgId();

    // Check if phone number already exists
    const { getPhoneNumberByNumber } = await import('@/lib/models/phone-number');
    const existingPhoneNumber = await getPhoneNumberByNumber(org_id, phone_number);
    
    // If phone number exists and is already active/configured, reject
    if (existingPhoneNumber && (existingPhoneNumber.status === 'active' || existingPhoneNumber.status === 'configured')) {
      return NextResponse.json(
        {
          success: false,
          error: 'This phone number is already connected',
        },
        { status: 400 }
      );
    }
    
    // If phone number exists with 'pending' or 'error' status, we'll update it instead of creating new
    const isUpdate = existingPhoneNumber !== null;

    // Get LiveKit credentials from env (required)
    const livekit_url = process.env.LIVEKIT_URL;
    const livekit_sip_uri = process.env.LIVEKIT_SIP_URI;
    const livekit_api_key = process.env.LIVEKIT_API_KEY;
    const livekit_api_secret = process.env.LIVEKIT_API_SECRET;
    
    if (!livekit_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'LIVEKIT_URL not configured in environment variables',
        },
        { status: 500 }
      );
    }

    if (!livekit_sip_uri) {
      return NextResponse.json(
        {
          success: false,
          error: 'LIVEKIT_SIP_URI not configured in environment variables',
        },
        { status: 500 }
      );
    }

    if (!livekit_api_key || !livekit_api_secret) {
      return NextResponse.json(
        {
          success: false,
          error: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured in environment variables',
        },
        { status: 500 }
      );
    }

    // Validate Twilio credentials and create trunk FIRST (before DB record)
    console.log('Validating Twilio credentials...');
    console.log('Account SID:', twilio_account_sid);
    console.log('API Key:', twilio_api_key);
    console.log('API Secret:', twilio_api_secret ? '***' : 'MISSING');

    // Create Twilio SIP Trunk using Account SID and API Key/Secret
    const { TwilioService } = await import('@/lib/twilio-service');
    const twilioService = new TwilioService();
    
    const trunkResult = await twilioService.setupSIPTrunk(
      { 
        accountSid: twilio_account_sid, 
        authToken: twilio_api_secret,
        apiKey: twilio_api_key,
        apiSecret: twilio_api_secret,
      } as any,  // Type assertion for extended credentials
      org_id,
      phone_number,
      livekit_sip_uri
    );

    if (!trunkResult.success || !trunkResult.trunk_sid) {
      // DON'T create database record if SIP trunk setup fails
      return NextResponse.json({
        success: false,
        error: trunkResult.error || 'Failed to create Twilio SIP trunk',
      }, { status: 400 });
    }

    console.log('=== Creating LiveKit Dispatch Rule ===');
    console.log('Trunk SID:', trunkResult.trunk_sid);
    console.log('Phone Number:', phone_number);
    
    // Create LiveKit dispatch rule using credentials from env
    const livekit = createLiveKitService({
      apiKey: livekit_api_key,
      apiSecret: livekit_api_secret,
      wsUrl: livekit_url,
      sipUri: livekit_sip_uri,
    });

    const sanitizedPhone = sanitizePhoneNumber(phone_number);
    const ruleId = `rule-${sanitizedPhone}-${Date.now()}`;
    
    console.log('Creating dispatch rule:', ruleId);
    console.log('Phone number:', phone_number);
    
    // Temporary metadata for dispatch rule creation
    // Use existing phone number ID if updating, otherwise use temporary ID
    const phoneNumberId = existingPhoneNumber?._id?.toString() || 'temp-' + Date.now();
    const customerId = existingPhoneNumber?._id?.toString() || 'temp-customer-' + Date.now();
    
    const tempMetadata = {
      customer_id: customerId,
      org_id,
      phone_number_id: phoneNumberId,
      org_name: 'Organization',
      phone_number: phone_number,
    };
    
    const dispatchResult = await livekit.createDispatchRule({
      ruleId,
      trunkIds: [trunkResult.trunk_sid], // Use the created Twilio trunk SID
      inboundNumbers: [phone_number],
      metadata: tempMetadata,
    });
    
    console.log('Dispatch result:', dispatchResult);

    if (!dispatchResult.success || !dispatchResult.ruleId) {
      // DON'T create database record if dispatch rule creation fails
      return NextResponse.json({
        success: false,
        error: dispatchResult.error || 'Failed to create LiveKit dispatch rule',
      }, { status: 400 });
    }

    // Only create/update phone number record AFTER everything succeeds
    let phoneNumberRecord;
    
    if (isUpdate && existingPhoneNumber) {
      // Update existing record
      const actualPhoneNumberId = existingPhoneNumber._id!.toString();
      await updatePhoneNumber(actualPhoneNumberId, {
        twilio_account_sid: twilio_account_sid,
        twilio_auth_token: twilio_api_secret, // Store API Secret as auth token
        twilio_trunk_sid: trunkResult.trunk_sid,
        livekit_api_key,
        livekit_api_secret,
        livekit_url,
        livekit_sip_uri,
        livekit_dispatch_rule_id: dispatchResult.ruleId,
        status: 'active',
        error_message: undefined, // Clear any previous error
      });
      phoneNumberRecord = {
        ...existingPhoneNumber,
        _id: existingPhoneNumber._id,
      };
      
      // Update dispatch rule metadata with actual phone number ID
      const updatedMetadata = {
        customer_id: actualPhoneNumberId,
        org_id,
        phone_number_id: actualPhoneNumberId,
        org_name: 'Organization',
        phone_number: phone_number,
      };
      
      await livekit.updateDispatchRule(dispatchResult.ruleId!, {
        ruleId: dispatchResult.ruleId!,
        trunkIds: [trunkResult.trunk_sid],
        inboundNumbers: [phone_number],
        metadata: updatedMetadata,
      });
    } else {
      // Create new record
      const { createPhoneNumber } = await import('@/lib/models/phone-number');
      phoneNumberRecord = await createPhoneNumber({
        org_id,
        phone_number,
        twilio_account_sid: twilio_account_sid,
        twilio_auth_token: twilio_api_secret, // Store API Secret as auth token
      });
      
      // Update with all additional fields
      await updatePhoneNumber(phoneNumberRecord._id!.toString(), {
        twilio_trunk_sid: trunkResult.trunk_sid,
        livekit_api_key,
        livekit_api_secret,
        livekit_url,
        livekit_sip_uri,
        livekit_dispatch_rule_id: dispatchResult.ruleId,
        status: 'active',
      });
      
      // Update dispatch rule metadata with actual phone number ID
      const actualPhoneNumberId = phoneNumberRecord._id!.toString();
      const updatedMetadata = {
        customer_id: actualPhoneNumberId,
        org_id,
        phone_number_id: actualPhoneNumberId,
        org_name: 'Organization',
        phone_number: phone_number,
      };
      
      await livekit.updateDispatchRule(dispatchResult.ruleId!, {
        ruleId: dispatchResult.ruleId!,
        trunkIds: [trunkResult.trunk_sid],
        inboundNumbers: [phone_number],
        metadata: updatedMetadata,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number connected successfully with LiveKit',
      phoneNumber: {
        id: phoneNumberRecord._id!.toString(),
        phone_number,
        last_4_digits: extractLast4Digits(phone_number),
        status: 'active',
      },
    });
  } catch (error) {
    console.error('Error in POST /api/livekit/connect:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

