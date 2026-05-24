/**
 * API routes for LiveKit configuration management
 * GET /api/livekit/config?phoneNumberId={id} - Get LiveKit config for phone number
 * POST /api/livekit/config - Update LiveKit config for phone number
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import {
  getPhoneNumberLiveKitConfig,
  updatePhoneNumberLiveKitConfig,
  getPhoneNumberById,
} from '@/lib/models/phone-number';
import { createLiveKitService } from '@/lib/livekit-service';

/**
 * GET - Get LiveKit configuration for a phone number
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phoneNumberId = searchParams.get('phoneNumberId');

    if (!phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error: 'phoneNumberId is required',
        },
        { status: 400 }
      );
    }

    const org_id = await getCurrentOrgId();

    // Verify phone number belongs to current org
    const phoneNumber = await getPhoneNumberById(phoneNumberId);
    if (!phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number not found',
        },
        { status: 404 }
      );
    }

    if (phoneNumber.org_id !== org_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 }
      );
    }

    const config = await getPhoneNumberLiveKitConfig(phoneNumberId);

    // Don't expose full secrets - only show if configured
    return NextResponse.json({
      success: true,
      phoneNumber: {
        id: phoneNumber._id?.toString(),
        phone_number: phoneNumber.phone_number,
        last_4_digits: phoneNumber.last_4_digits,
      },
      config: {
        livekit_url: config?.livekit_url || process.env.LIVEKIT_URL || '',
        livekit_api_key: config?.livekit_api_key
          ? `${config.livekit_api_key.substring(0, 8)}...` // Masked
          : process.env.LIVEKIT_API_KEY
          ? `${process.env.LIVEKIT_API_KEY.substring(0, 8)}...`
          : '',
        livekit_api_secret: config?.livekit_api_secret ? '***configured***' : '',
        livekit_sip_uri: config?.livekit_sip_uri || process.env.LIVEKIT_SIP_URI || '',
        is_configured: !!(config?.livekit_api_key && config?.livekit_api_secret && config?.livekit_url),
        using_env_vars: !config?.livekit_api_key, // If no phone number config, using env vars
      },
    });
  } catch (error) {
    console.error('Error in GET /api/livekit/config:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle MongoDB connection errors specifically
      if (error.message.includes('ESERVFAIL') || error.message.includes('querySrv')) {
        errorMessage = 'Database connection issue. Please refresh the page or try again.';
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

/**
 * POST - Update LiveKit configuration for a phone number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumberId, livekit_url, livekit_api_key, livekit_api_secret, livekit_sip_uri } = body;

    if (!phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error: 'phoneNumberId is required',
        },
        { status: 400 }
      );
    }

    const org_id = await getCurrentOrgId();

    // Verify phone number belongs to current org
    const phoneNumber = await getPhoneNumberById(phoneNumberId);
    if (!phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number not found',
        },
        { status: 404 }
      );
    }

    if (phoneNumber.org_id !== org_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 }
      );
    }

    // Get existing config to preserve secret if not provided
    const existingConfig = await getPhoneNumberLiveKitConfig(phoneNumberId);

    // Validate required fields
    if (!livekit_url || !livekit_api_key) {
      return NextResponse.json(
        {
          success: false,
          error: 'livekit_url and livekit_api_key are required',
        },
        { status: 400 }
      );
    }

    // Use existing secret if new one not provided
    const finalSecret = livekit_api_secret || existingConfig?.livekit_api_secret;
    
    if (!finalSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'livekit_api_secret is required (or must be configured previously)',
        },
        { status: 400 }
      );
    }

    // Test the credentials by creating a service instance with provided credentials
    try {
      const testService = createLiveKitService({
        apiKey: livekit_api_key,
        apiSecret: finalSecret,
        wsUrl: livekit_url,
        sipUri: livekit_sip_uri,
      });
      // If we can create the service, credentials format is valid
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid LiveKit credentials. Please check your API Key, Secret, and URL.',
        },
        { status: 400 }
      );
    }

    // Update configuration for this phone number
    const updated = await updatePhoneNumberLiveKitConfig(phoneNumberId, {
      livekit_url,
      livekit_api_key,
      livekit_api_secret: finalSecret,
      livekit_sip_uri,
    });

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update LiveKit configuration',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'LiveKit configuration updated successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/livekit/config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

