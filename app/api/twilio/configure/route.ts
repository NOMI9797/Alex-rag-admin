/**
 * API route to configure Twilio SIP trunk
 * POST /api/twilio/configure
 */

import { NextRequest, NextResponse } from 'next/server';
import { twilioService } from '@/lib/twilio-service';
import { getCurrentOrgId } from '@/lib/org-context';
import { 
  createPhoneNumber, 
  updatePhoneNumber, 
  phoneNumberExists 
} from '@/lib/models/phone-number';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountSid, authToken, phoneNumber } = body;

    // Validate input
    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Account SID, Auth Token, and Phone Number are required' 
        },
        { status: 400 }
      );
    }

    // Get org context
    const org_id = getCurrentOrgId();

    // Check if phone number already exists for this org
    const exists = await phoneNumberExists(org_id, phoneNumber);
    if (exists) {
      return NextResponse.json(
        { 
          success: false,
          error: 'This phone number is already configured' 
        },
        { status: 400 }
      );
    }

    // 1. Validate credentials
    const validationResult = await twilioService.validateCredentials({
      accountSid,
      authToken,
    });

    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        error: validationResult.error || 'Invalid credentials',
      }, { status: 401 });
    }

    // 2. Verify phone number exists in Twilio account
    const verifyResult = await twilioService.verifyPhoneNumber(
      { accountSid, authToken },
      phoneNumber
    );

    if (!verifyResult.valid) {
      return NextResponse.json({
        success: false,
        error: verifyResult.error || 'Phone number not found',
      }, { status: 400 });
    }

    // 3. Create phone number record in database
    const phoneNumberRecord = await createPhoneNumber({
      org_id,
      phone_number: phoneNumber,
      twilio_account_sid: accountSid,
      twilio_auth_token: authToken, // TODO: Encrypt in production
    });

    // 4. Get LiveKit SIP URI (from phone number config or env)
    // Note: LiveKit config will be set later in Settings, for now use env
    const livekitSipUri = process.env.LIVEKIT_SIP_URI || '';
    
    if (!livekitSipUri) {
      // Rollback: Update status to error
      await updatePhoneNumber(phoneNumberRecord._id!.toString(), {
        status: 'error',
        error_message: 'LiveKit SIP URI not configured. Please configure it in Settings.',
      });

      return NextResponse.json({
        success: false,
        error: 'LiveKit SIP URI not configured. Please configure it in Settings.',
      }, { status: 500 });
    }

    const trunkResult = await twilioService.setupSIPTrunk(
      { accountSid, authToken },
      org_id,
      phoneNumber,
      livekitSipUri
    );

    if (!trunkResult.success) {
      // Rollback: Update status to error
      await updatePhoneNumber(phoneNumberRecord._id!.toString(), {
        status: 'error',
        error_message: trunkResult.error || 'Failed to setup SIP trunk',
      });

      return NextResponse.json({
        success: false,
        error: trunkResult.error || 'Failed to setup SIP trunk',
      }, { status: 500 });
    }

    // 5. Update phone number record with trunk SID
    await updatePhoneNumber(phoneNumberRecord._id!.toString(), {
      twilio_trunk_sid: trunkResult.trunkSid,
      status: 'configured',
    });

    return NextResponse.json({
      success: true,
      message: 'Phone number configured successfully',
      phoneNumber: {
        id: phoneNumberRecord._id!.toString(),
        phone_number: phoneNumber,
        last_4_digits: phoneNumberRecord.last_4_digits,
        status: 'configured',
        trunk_sid: trunkResult.trunkSid,
      },
    });

  } catch (error) {
    console.error('Error in /api/twilio/configure:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

