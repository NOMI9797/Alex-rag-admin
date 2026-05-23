import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import { getAgentSettings, upsertAgentSettings } from '@/lib/models/agent-settings';

export async function GET() {
  try {
    const org_id = await getCurrentOrgId();
    const settings = await getAgentSettings(org_id);

    return NextResponse.json({
      success: true,
      operator_phone: settings?.operator_phone ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settings';
    const status = message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const org_id = await getCurrentOrgId();
    const { operator_phone } = await request.json();

    if (!operator_phone || typeof operator_phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'operator_phone is required' },
        { status: 400 }
      );
    }

    // Basic E.164 validation
    if (!/^\+[1-9]\d{6,14}$/.test(operator_phone)) {
      return NextResponse.json(
        { success: false, error: 'Phone number must be in E.164 format (e.g. +15034448659)' },
        { status: 400 }
      );
    }

    const ok = await upsertAgentSettings(org_id, operator_phone);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, operator_phone });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    const status = message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
