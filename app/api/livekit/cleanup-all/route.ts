/**
 * Comprehensive cleanup endpoint
 * DELETE /api/livekit/cleanup-all - Clean up ALL orphaned resources
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import { getPhoneNumbersByOrg } from '@/lib/models/phone-number';
import { createLiveKitService } from '@/lib/livekit-service';
import { SipClient, RoomServiceClient } from 'livekit-server-sdk';

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
    
    const validInboundTrunkIds = new Set(
      phoneNumbers
        .map(pn => pn.livekit_inbound_trunk_id)
        .filter((id): id is string => !!id)
    );

    // Initialize LiveKit clients
    const sipClient = new SipClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );
    
    const roomService = new RoomServiceClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );

    const results = {
      dispatchRules: { deleted: [] as string[], errors: [] as string[] },
      inboundTrunks: { deleted: [] as string[], errors: [] as string[] },
      rooms: { deleted: [] as string[], errors: [] as string[] },
    };

    // 1. Clean up orphaned dispatch rules
    console.log('=== Cleaning up dispatch rules ===');
    const allRules = await sipClient.listSipDispatchRule();
    
    for (const rule of allRules) {
      const metadata = rule.metadata ? JSON.parse(rule.metadata) : {};
      const isOrphan = !validRuleIds.has(rule.sipDispatchRuleId);
      const belongsToOrg = metadata.org_id === org_id;

      if (isOrphan && belongsToOrg) {
        try {
          await sipClient.deleteSipDispatchRule(rule.sipDispatchRuleId);
          results.dispatchRules.deleted.push(rule.sipDispatchRuleId);
          console.log(`✅ Deleted dispatch rule: ${rule.sipDispatchRuleId}`);
        } catch (error: any) {
          results.dispatchRules.errors.push(`${rule.sipDispatchRuleId}: ${error.message}`);
          console.error(`❌ Failed to delete rule ${rule.sipDispatchRuleId}:`, error);
        }
      }
    }

    // 2. Clean up orphaned inbound trunks
    console.log('=== Cleaning up inbound trunks ===');
    const allTrunks = await sipClient.listSipInboundTrunk();
    
    for (const trunk of allTrunks) {
      const metadata = trunk.metadata ? JSON.parse(trunk.metadata) : {};
      const isOrphan = !validInboundTrunkIds.has(trunk.sipTrunkId);
      const belongsToOrg = metadata.org_id === org_id;

      if (isOrphan && belongsToOrg) {
        try {
          await sipClient.deleteSipTrunk(trunk.sipTrunkId);
          results.inboundTrunks.deleted.push(trunk.sipTrunkId);
          console.log(`✅ Deleted inbound trunk: ${trunk.sipTrunkId}`);
        } catch (error: any) {
          results.inboundTrunks.errors.push(`${trunk.sipTrunkId}: ${error.message}`);
          console.error(`❌ Failed to delete trunk ${trunk.sipTrunkId}:`, error);
        }
      }
    }

    // 3. Clean up old/closed rooms (older than 1 hour)
    console.log('=== Cleaning up old rooms ===');
    const rooms = await roomService.listRooms();
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const room of rooms) {
      // Parse room metadata to check org ownership
      const roomMetadata = room.metadata ? JSON.parse(room.metadata) : {};
      const belongsToOrg = roomMetadata.org_id === org_id;
      
      // Only delete rooms that:
      // 1. Belong to this org
      // 2. Have 0 participants (call ended)
      // 3. Are older than 1 hour
      const roomAge = room.creationTime ? Date.now() - (room.creationTime * 1000) : 0;
      
      if (belongsToOrg && room.numParticipants === 0 && roomAge > (60 * 60 * 1000)) {
        try {
          await roomService.deleteRoom(room.name);
          results.rooms.deleted.push(room.name);
          console.log(`✅ Deleted room: ${room.name}`);
        } catch (error: any) {
          results.rooms.errors.push(`${room.name}: ${error.message}`);
          console.error(`❌ Failed to delete room ${room.name}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      results: {
        dispatchRules: {
          deleted: results.dispatchRules.deleted.length,
          errors: results.dispatchRules.errors.length,
          deletedIds: results.dispatchRules.deleted,
          errorDetails: results.dispatchRules.errors.length > 0 ? results.dispatchRules.errors : undefined,
        },
        inboundTrunks: {
          deleted: results.inboundTrunks.deleted.length,
          errors: results.inboundTrunks.errors.length,
          deletedIds: results.inboundTrunks.deleted,
          errorDetails: results.inboundTrunks.errors.length > 0 ? results.inboundTrunks.errors : undefined,
        },
        rooms: {
          deleted: results.rooms.deleted.length,
          errors: results.rooms.errors.length,
          deletedIds: results.rooms.deleted,
          errorDetails: results.rooms.errors.length > 0 ? results.rooms.errors : undefined,
        },
      },
    });
  } catch (error) {
    console.error('Error in DELETE /api/livekit/cleanup-all:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

