import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import { getAgentSettings, upsertAgentSettings } from '@/lib/models/agent-settings';
import { NotificationChannel } from '@/lib/models/types';

const VALID_CHANNELS: NotificationChannel[] = ['telegram', 'email', 'both'];

export async function GET() {
  try {
    const org_id = await getCurrentOrgId();
    const settings = await getAgentSettings(org_id);

    return NextResponse.json({
      success: true,
      operator_phone: settings?.operator_phone ?? null,
      // Missing/invalid value is treated as "both" — mirrors the agent's default.
      notification_channels: settings?.notification_channels ?? 'both',
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
    const body = await request.json();
    const { operator_phone, notification_channels } = body;

    const updates: { operator_phone?: string; notification_channels?: NotificationChannel } = {};

    if (operator_phone !== undefined) {
      if (typeof operator_phone !== 'string') {
        return NextResponse.json(
          { success: false, error: 'operator_phone must be a string' },
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
      updates.operator_phone = operator_phone;
    }

    if (notification_channels !== undefined) {
      if (!VALID_CHANNELS.includes(notification_channels)) {
        return NextResponse.json(
          { success: false, error: 'notification_channels must be one of: telegram, email, both' },
          { status: 400 }
        );
      }
      updates.notification_channels = notification_channels;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nothing to update' },
        { status: 400 }
      );
    }

    const ok = await upsertAgentSettings(org_id, updates);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    const status = message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
