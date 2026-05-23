/**
 * API route for SMS Messages (read-only for now, written by Agent)
 * GET /api/sms/messages - List all messages with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import {
  getSmsMessagesByOrg,
  countSmsMessagesByOrg,
} from '@/lib/models/sms-message';

export async function GET(request: NextRequest) {
  try {
    const org_id = await getCurrentOrgId();
    const searchParams = request.nextUrl.searchParams;
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const direction = searchParams.get('direction') as 'inbound' | 'outbound' | undefined;
    const status = searchParams.get('status') || undefined;

    const messages = await getSmsMessagesByOrg(org_id, {
      limit,
      skip,
      direction,
      status,
    });

    const total = await countSmsMessagesByOrg(org_id, {
      direction,
      status,
    });

    return NextResponse.json({
      success: true,
      messages,
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('Error fetching SMS messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

