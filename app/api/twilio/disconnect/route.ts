/**
 * API route to disconnect Twilio phone number (delete SIP trunk)
 * DELETE /api/twilio/disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { twilioService } from '@/lib/twilio-service';
import { getCurrentOrgId } from '@/lib/org-context';
import { 
  getPhoneNumberById, 
  deletePhoneNumber, 
  updatePhoneNumber 
} from '@/lib/models/phone-number';
import { createLiveKitService } from '@/lib/livekit-service';
import { getKnowledgeBasesByPhoneNumber, deleteKnowledgeBase } from '@/lib/models/knowledge-base';
import { createQdrantManager } from '@/lib/qdrant';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phoneNumberId = searchParams.get('id');

    if (!phoneNumberId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Phone number ID is required' 
        },
        { status: 400 }
      );
    }

    // Get org context
    const org_id = await getCurrentOrgId();

    // Get phone number record
    const phoneNumber = await getPhoneNumberById(phoneNumberId);

    if (!phoneNumber) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Phone number not found' 
        },
        { status: 404 }
      );
    }

    // Verify org ownership
    if (phoneNumber.org_id !== org_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized' 
        },
        { status: 403 }
      );
    }

    // Delete LiveKit dispatch rule if it exists
    if (phoneNumber.livekit_dispatch_rule_id) {
      try {
        const livekit = createLiveKitService({
          apiKey: phoneNumber.livekit_api_key || process.env.LIVEKIT_API_KEY!,
          apiSecret: phoneNumber.livekit_api_secret || process.env.LIVEKIT_API_SECRET!,
          wsUrl: phoneNumber.livekit_url || process.env.LIVEKIT_URL!,
        });
        
        const deleteRuleResult = await livekit.deleteDispatchRule(phoneNumber.livekit_dispatch_rule_id);
        if (deleteRuleResult.success) {
          console.log('Deleted LiveKit dispatch rule:', phoneNumber.livekit_dispatch_rule_id);
        } else {
          console.error('Failed to delete LiveKit dispatch rule:', deleteRuleResult.error);
        }
      } catch (error) {
        console.error('Error deleting LiveKit dispatch rule:', error);
        // Continue with disconnect even if rule deletion fails
      }
    }

    // Delete LiveKit inbound trunk if it exists
    if (phoneNumber.livekit_inbound_trunk_id) {
      try {
        const livekit = createLiveKitService({
          apiKey: phoneNumber.livekit_api_key || process.env.LIVEKIT_API_KEY!,
          apiSecret: phoneNumber.livekit_api_secret || process.env.LIVEKIT_API_SECRET!,
          wsUrl: phoneNumber.livekit_url || process.env.LIVEKIT_URL!,
        });
        
        const deleteTrunkResult = await livekit.deleteInboundTrunk(phoneNumber.livekit_inbound_trunk_id);
        if (deleteTrunkResult.success) {
          console.log('Deleted LiveKit inbound trunk:', phoneNumber.livekit_inbound_trunk_id);
        } else {
          console.error('Failed to delete LiveKit inbound trunk:', deleteTrunkResult.error);
        }
      } catch (error) {
        console.error('Error deleting LiveKit inbound trunk:', error);
        // Continue with disconnect even if trunk deletion fails
      }
    }

    // Delete all associated knowledge bases BEFORE deleting phone number
    console.log('Deleting associated knowledge bases...');
    try {
      const knowledgeBases = await getKnowledgeBasesByPhoneNumber(phoneNumberId);
      
      for (const kb of knowledgeBases) {
        console.log(`Deleting knowledge base: ${kb.name} (${kb.collection_name})`);
        
        // Delete Qdrant collection
        try {
          const qdrant = createQdrantManager(kb.collection_name);
          const qdrantDeleted = await qdrant.deleteCollection();
          
          if (qdrantDeleted) {
            console.log(`✅ Deleted Qdrant collection: ${kb.collection_name}`);
          } else {
            console.error(`⚠️ Failed to delete Qdrant collection: ${kb.collection_name}`);
          }
        } catch (error) {
          console.error(`Error deleting Qdrant collection ${kb.collection_name}:`, error);
        }
        
        // Delete knowledge base from database
        try {
          const kbDeleted = await deleteKnowledgeBase(kb._id!.toString());
          if (kbDeleted) {
            console.log(`✅ Deleted knowledge base from database: ${kb.name}`);
          } else {
            console.error(`⚠️ Failed to delete knowledge base from database: ${kb.name}`);
          }
        } catch (error) {
          console.error(`Error deleting knowledge base ${kb.name}:`, error);
        }
      }
      
      console.log(`Deleted ${knowledgeBases.length} knowledge base(s) associated with phone number`);
    } catch (error) {
      console.error('Error deleting associated knowledge bases:', error);
      // Continue with phone number deletion even if KB deletion fails
    }

    // Note: We're not deleting the SIP trunk from Twilio because:
    // 1. The trunk is working and user might want to reuse it
    // 2. We don't have the original Account SID (we stored API Key in that field)
    // 3. Manual cleanup can be done in Twilio console if needed
    
    // Delete from our database
    console.log('Disconnecting phone number:', phoneNumber.phone_number);

    // Delete phone number record from database
    const deleted = await deletePhoneNumber(phoneNumberId);

    if (!deleted) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to delete phone number record' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number disconnected successfully',
    });

  } catch (error) {
    console.error('Error in /api/twilio/disconnect:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

