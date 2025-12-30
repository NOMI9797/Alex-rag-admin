/**
 * API route to connect phone number with LiveKit credentials
 * POST /api/livekit/connect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import { phoneNumberExists, extractLast4Digits, updatePhoneNumber } from '@/lib/models/phone-number';
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
    const exists = await phoneNumberExists(org_id, phone_number);
    if (exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'This phone number is already connected',
        },
        { status: 400 }
      );
    }

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

    // Create phone number record with Twilio credentials
    const { createPhoneNumber } = await import('@/lib/models/phone-number');
    const phoneNumberRecord = await createPhoneNumber({
      org_id,
      phone_number,
      twilio_account_sid: twilio_account_sid,
      twilio_auth_token: twilio_api_secret, // Store API Secret as auth token
    });

    // Store LiveKit credentials in phone number record (from env)
    await updatePhoneNumber(phoneNumberRecord._id!.toString(), {
      livekit_api_key,
      livekit_api_secret,
      livekit_url,
      livekit_sip_uri,
      status: 'configured',
    });

    // Validate Twilio credentials before creating trunk
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
      // Rollback: Update status to error
      await updatePhoneNumber(phoneNumberRecord._id!.toString(), {
        status: 'error',
        error_message: trunkResult.error || 'Failed to create Twilio SIP trunk',
      });

      return NextResponse.json({
        success: false,
        error: trunkResult.error || 'Failed to create Twilio SIP trunk',
      }, { status: 400 });
    }

    // Store trunk SID
    await updatePhoneNumber(phoneNumberRecord._id!.toString(), {
      twilio_trunk_sid: trunkResult.trunk_sid,
    });

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

    const last4 = extractLast4Digits(phone_number);
    const ruleId = `rule-${last4}-${Date.now()}`;
    
    console.log('Creating dispatch rule:', ruleId);
    console.log('Last 4 digits:', last4);
    
    const dispatchResult = await livekit.createDispatchRule({
      ruleId,
      trunkIds: [trunkResult.trunk_sid], // Use the created Twilio trunk SID
      inboundNumbers: [phone_number],
      metadata: {
        customer_id: phoneNumberRecord._id!.toString(),
        org_id,
        phone_number_id: phoneNumberRecord._id!.toString(),
        org_name: 'Organization',
        last_4_digits: last4,
      },
    });
    
    console.log('Dispatch result:', dispatchResult);

    if (dispatchResult.success && dispatchResult.ruleId) {
      await updatePhoneNumber(phoneNumberRecord._id!.toString(), {
        livekit_dispatch_rule_id: dispatchResult.ruleId,
        status: 'active',
      });

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
    } else {
      // Dispatch rule creation failed - update phone number with error status
      await updatePhoneNumber(phoneNumberRecord._id!.toString(), {
        status: 'error',
        error_message: dispatchResult.error || 'Failed to create LiveKit dispatch rule',
      });

      return NextResponse.json({
        success: false,
        error: dispatchResult.error || 'Failed to create LiveKit dispatch rule. Phone number was created but dispatch rule setup failed.',
        phoneNumber: {
          id: phoneNumberRecord._id!.toString(),
          phone_number,
          last_4_digits: extractLast4Digits(phone_number),
          status: 'error',
        },
      }, { status: 400 });
    }
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

