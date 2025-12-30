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
    const org_id = await getCurrentOrgId();

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
      // DON'T create database record if phone number doesn't exist in Twilio
      return NextResponse.json({
        success: false,
        error: verifyResult.error || 'Phone number not found in your Twilio account',
      }, { status: 400 });
    }

    // 3. Get LiveKit SIP URI first (before creating DB record)
    const livekitSipUri = process.env.LIVEKIT_SIP_URI || '';
    
    if (!livekitSipUri) {
      return NextResponse.json({
        success: false,
        error: 'LiveKit SIP URI not configured in environment variables',
      }, { status: 500 });
    }

    // 4. Setup SIP trunk BEFORE creating database record
    const trunkResult = await twilioService.setupSIPTrunk(
      { accountSid, authToken },
      org_id,
      phoneNumber,
      livekitSipUri
    );

    if (!trunkResult.success) {
      // DON'T create database record if SIP trunk setup fails
      return NextResponse.json({
        success: false,
        error: trunkResult.error || 'Failed to setup SIP trunk',
      }, { status: 500 });
    }

    // 5. Only NOW create phone number record in database (after all validations pass)
    const phoneNumberRecord = await createPhoneNumber({
      org_id,
      phone_number: phoneNumber,
      twilio_account_sid: accountSid,
      twilio_auth_token: authToken, // TODO: Encrypt in production
    });

    // Update with trunk_sid and status
    if (trunkResult.trunk_sid) {
      await updatePhoneNumber(phoneNumberRecord._id!.toString(), {
        twilio_trunk_sid: trunkResult.trunk_sid,
        status: 'configured',
      });
    }

    // 6. Return success
    return NextResponse.json({
      success: true,
      message: 'Phone number configured successfully',
      phoneNumber: {
        id: phoneNumberRecord._id!.toString(),
        phone_number: phoneNumber,
        last_4_digits: phoneNumberRecord.last_4_digits,
        status: 'configured',
        trunk_sid: trunkResult.trunk_sid,
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

