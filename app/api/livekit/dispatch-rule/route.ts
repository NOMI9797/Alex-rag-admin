/**
 * API routes for LiveKit SIP dispatch rule management
 * POST /api/livekit/dispatch-rule - Create dispatch rule
 * DELETE /api/livekit/dispatch-rule - Delete dispatch rule
 * PATCH /api/livekit/dispatch-rule - Update dispatch rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLiveKitServiceFromPhoneNumber } from '@/lib/livekit-service';
import { getCurrentOrgId } from '@/lib/org-context';
import { getPhoneNumberById, updatePhoneNumber } from '@/lib/models/phone-number';

/**
 * POST - Create dispatch rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumberId, trunkIds, metadata } = body;

    if (!phoneNumberId) {
      return NextResponse.json(
        { success: false, error: 'Phone number ID is required' },
        { status: 400 }
      );
    }

    // Get org context
    const org_id = getCurrentOrgId();

    // Get phone number record
    const phoneNumber = await getPhoneNumberById(phoneNumberId);

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number not found' },
        { status: 404 }
      );
    }

    // Verify org ownership
    if (phoneNumber.org_id !== org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Create dispatch rule using phone number-specific config
    const livekit = await createLiveKitServiceFromPhoneNumber(phoneNumberId);
    const ruleId = `rule-${phoneNumber.last_4_digits}-${Date.now()}`;

    const result = await livekit.createDispatchRule({
      ruleId,
      trunkIds: trunkIds || [phoneNumber.twilio_trunk_sid!],
      inboundNumbers: [phoneNumber.phone_number],
      metadata: {
        customer_id: phoneNumberId,
        org_id: phoneNumber.org_id,
        phone_number_id: phoneNumberId,
        org_name: metadata?.org_name || 'Organization',
        last_4_digits: phoneNumber.last_4_digits,
        ...metadata,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create dispatch rule' },
        { status: 500 }
      );
    }

    // Update phone number record with dispatch rule ID
    await updatePhoneNumber(phoneNumberId, {
      livekit_dispatch_rule_id: result.ruleId,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: 'Dispatch rule created successfully',
      ruleId: result.ruleId,
    });

  } catch (error) {
    console.error('Error in POST /api/livekit/dispatch-rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete dispatch rule
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phoneNumberId = searchParams.get('phoneNumberId');

    if (!phoneNumberId) {
      return NextResponse.json(
        { success: false, error: 'Phone number ID is required' },
        { status: 400 }
      );
    }

    // Get org context
    const org_id = getCurrentOrgId();

    // Get phone number record
    const phoneNumber = await getPhoneNumberById(phoneNumberId);

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number not found' },
        { status: 404 }
      );
    }

    // Verify org ownership
    if (phoneNumber.org_id !== org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete dispatch rule if it exists
    if (phoneNumber.livekit_dispatch_rule_id) {
      const livekit = await createLiveKitServiceFromPhoneNumber(phoneNumberId);
      const result = await livekit.deleteDispatchRule(
        phoneNumber.livekit_dispatch_rule_id
      );

      if (!result.success) {
        console.error('Failed to delete dispatch rule:', result.error);
        // Continue anyway - update database
      }
    }

    // Update phone number record
    await updatePhoneNumber(phoneNumberId, {
      livekit_dispatch_rule_id: undefined,
      status: 'configured',
    });

    return NextResponse.json({
      success: true,
      message: 'Dispatch rule deleted successfully',
    });

  } catch (error) {
    console.error('Error in DELETE /api/livekit/dispatch-rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update dispatch rule metadata
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumberId, metadata } = body;

    if (!phoneNumberId || !metadata) {
      return NextResponse.json(
        { success: false, error: 'Phone number ID and metadata are required' },
        { status: 400 }
      );
    }

    // Get org context
    const org_id = getCurrentOrgId();

    // Get phone number record
    const phoneNumber = await getPhoneNumberById(phoneNumberId);

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number not found' },
        { status: 404 }
      );
    }

    // Verify org ownership
    if (phoneNumber.org_id !== org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update dispatch rule if it exists
    if (phoneNumber.livekit_dispatch_rule_id) {
      const livekit = await createLiveKitServiceFromPhoneNumber(phoneNumberId);
      
      // Delete and recreate with new metadata
      await livekit.deleteDispatchRule(phoneNumber.livekit_dispatch_rule_id);

      const ruleId = `rule-${phoneNumber.last_4_digits}-${Date.now()}`;
      const result = await livekit.createDispatchRule({
        ruleId,
        trunkIds: [phoneNumber.twilio_trunk_sid!],
        inboundNumbers: [phoneNumber.phone_number],
        metadata: {
          customer_id: phoneNumberId,
          org_id: phoneNumber.org_id,
          phone_number_id: phoneNumberId,
          org_name: metadata?.org_name || 'Organization',
          last_4_digits: phoneNumber.last_4_digits,
          ...metadata,
        },
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to update dispatch rule' },
          { status: 500 }
        );
      }

      // Update phone number record with new dispatch rule ID
      await updatePhoneNumber(phoneNumberId, {
        livekit_dispatch_rule_id: result.ruleId,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Dispatch rule updated successfully',
    });

  } catch (error) {
    console.error('Error in PATCH /api/livekit/dispatch-rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

