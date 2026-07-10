/**
 * Cleanup orphaned dispatch rules
 * GET /api/livekit/cleanup-rules - List all dispatch rules and identify orphans
 * DELETE /api/livekit/cleanup-rules - Delete orphaned dispatch rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import { getPhoneNumbersByOrg } from '@/lib/models/phone-number';
import { createLiveKitService } from '@/lib/livekit-service';
import { SipClient } from 'livekit-server-sdk';

export async function GET() {
  try {
    const org_id = await getCurrentOrgId();
    
    // Get all phone numbers for this org
    const phoneNumbers = await getPhoneNumbersByOrg(org_id);
    const validRuleIds = new Set(
      phoneNumbers
        .map(pn => pn.livekit_dispatch_rule_id)
        .filter((id): id is string => !!id)
    );

    // Get all dispatch rules from LiveKit
    const livekit = createLiveKitService({
      apiKey: process.env.LIVEKIT_API_KEY!,
      apiSecret: process.env.LIVEKIT_API_SECRET!,
      wsUrl: process.env.LIVEKIT_URL!,
    });

    const sipClient = new SipClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );

    const allRules = await sipClient.listSipDispatchRule();

    // Categorize rules
    const rules = allRules.map(rule => {
      const metadata = rule.metadata ? JSON.parse(rule.metadata) : {};
      const isOrphan = !validRuleIds.has(rule.sipDispatchRuleId);
      const belongsToOrg = metadata.org_id === org_id;
      const hasAgentConfig = !!(rule.roomConfig?.agents && rule.roomConfig.agents.length > 0);

      return {
        ruleId: rule.sipDispatchRuleId,
        name: rule.name,
        roomName: rule.rule?.rule?.case === 'dispatchRuleDirect' ? rule.rule.rule.value.roomName : undefined,
        trunkIds: rule.trunkIds || [],
        metadata: metadata,
        belongsToOrg,
        isOrphan,
        hasAgentConfig,
        phoneNumber: metadata.phone_number,
        phoneNumberId: metadata.phone_number_id,
      };
    });

    const orphanedRules = rules.filter(r => r.isOrphan && r.belongsToOrg);
    const activeRules = rules.filter(r => !r.isOrphan && r.belongsToOrg);
    const otherOrgRules = rules.filter(r => !r.belongsToOrg);

    return NextResponse.json({
      success: true,
      summary: {
        total: rules.length,
        active: activeRules.length,
        orphaned: orphanedRules.length,
        otherOrg: otherOrgRules.length,
      },
      activeRules: activeRules,
      orphanedRules: orphanedRules,
      otherOrgRules: otherOrgRules,
      allRules: rules,
    });
  } catch (error) {
    console.error('Error in GET /api/livekit/cleanup-rules:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const org_id = await getCurrentOrgId();
    
    // Get all phone numbers for this org
    const phoneNumbers = await getPhoneNumbersByOrg(org_id);
    const validRuleIds = new Set(
      phoneNumbers
        .map(pn => pn.livekit_dispatch_rule_id)
        .filter((id): id is string => !!id)
    );

    // Get all dispatch rules from LiveKit
    const sipClient = new SipClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );

    const allRules = await sipClient.listSipDispatchRule();

    // Find orphaned rules (not in database but belong to this org)
    const deletedRules: string[] = [];
    const errors: string[] = [];

    for (const rule of allRules) {
      const metadata = rule.metadata ? JSON.parse(rule.metadata) : {};
      const isOrphan = !validRuleIds.has(rule.sipDispatchRuleId);
      const belongsToOrg = metadata.org_id === org_id;

      if (isOrphan && belongsToOrg) {
        try {
          await sipClient.deleteSipDispatchRule(rule.sipDispatchRuleId);
          deletedRules.push(rule.sipDispatchRuleId);
          console.log(`Deleted orphaned dispatch rule: ${rule.sipDispatchRuleId}`);
        } catch (error: any) {
          errors.push(`${rule.sipDispatchRuleId}: ${error.message}`);
          console.error(`Failed to delete rule ${rule.sipDispatchRuleId}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedRules.length} orphaned dispatch rule(s)`,
      deletedRules,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in DELETE /api/livekit/cleanup-rules:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

