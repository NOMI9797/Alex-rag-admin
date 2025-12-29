/**
 * API route to validate Twilio credentials
 * POST /api/twilio/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { twilioService } from '@/lib/twilio-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountSid, authToken } = body;

    // Validate input
    if (!accountSid || !authToken) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Account SID and Auth Token are required' 
        },
        { status: 400 }
      );
    }

    // Validate credentials
    const result = await twilioService.validateCredentials({
      accountSid,
      authToken,
    });

    if (!result.valid) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Invalid credentials',
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials validated successfully',
    });

  } catch (error) {
    console.error('Error in /api/twilio/validate:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

