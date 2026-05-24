/**
 * API route to list Twilio phone numbers
 * GET /api/twilio/numbers
 */

import { NextRequest, NextResponse } from 'next/server';
import { twilioService } from '@/lib/twilio-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountSid = searchParams.get('accountSid');
    const authToken = searchParams.get('authToken');

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

    // List phone numbers
    const result = await twilioService.listPhoneNumbers({
      accountSid,
      authToken,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to list phone numbers',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      phoneNumbers: result.phoneNumbers || [],
    });

  } catch (error) {
    console.error('Error in /api/twilio/numbers:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}


