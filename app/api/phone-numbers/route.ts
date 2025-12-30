/**
 * API routes for phone number management
 * GET /api/phone-numbers - List phone numbers for current org
 */

import { NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import { getPhoneNumbersByOrg } from '@/lib/models/phone-number';

export async function GET() {
  try {
    const org_id = await getCurrentOrgId();

    const phoneNumbers = await getPhoneNumbersByOrg(org_id);

    // Don't expose sensitive data like auth tokens
    const sanitizedPhoneNumbers = phoneNumbers.map(pn => ({
      id: pn._id?.toString(),
      phone_number: pn.phone_number,
      last_4_digits: pn.last_4_digits,
      status: pn.status,
      error_message: pn.error_message,
      has_trunk: !!pn.twilio_trunk_sid,
      has_dispatch_rule: !!pn.livekit_dispatch_rule_id,
      created_at: pn.created_at,
      updated_at: pn.updated_at,
    }));

    return NextResponse.json({
      success: true,
      phoneNumbers: sanitizedPhoneNumbers,
    });

  } catch (error) {
    console.error('Error in GET /api/phone-numbers:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle MongoDB connection errors specifically
      if (error.message.includes('ESERVFAIL') || error.message.includes('querySrv')) {
        errorMessage = 'MongoDB connection failed. Please check your connection string and network.';
      } else if (error.message.includes('MongoServerError') || error.message.includes('MongoNetworkError')) {
        errorMessage = 'Database connection error. Please try again.';
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

