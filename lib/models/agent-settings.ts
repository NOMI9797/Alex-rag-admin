import { getDatabase } from '@/lib/mongodb';
import { AgentSettings, NotificationChannel } from './types';

const COLLECTION = 'agent_settings';

export async function getAgentSettings(org_id: string): Promise<AgentSettings | null> {
  try {
    const db = await getDatabase();
    return await db.collection<AgentSettings>(COLLECTION).findOne({ org_id });
  } catch (error) {
    console.error('Error fetching agent settings:', error);
    return null;
  }
}

// Partial update — save operator_phone and/or notification_channels independently.
// Always bumps updated_at so the agent reads the latest doc (it sorts by updated_at desc).
export async function upsertAgentSettings(
  org_id: string,
  updates: { operator_phone?: string; notification_channels?: NotificationChannel }
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const set: Partial<AgentSettings> = { org_id, updated_at: new Date() };
    if (updates.operator_phone !== undefined) set.operator_phone = updates.operator_phone;
    if (updates.notification_channels !== undefined)
      set.notification_channels = updates.notification_channels;

    await db.collection<AgentSettings>(COLLECTION).updateOne(
      { org_id },
      { $set: set },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('Error upserting agent settings:', error);
    return false;
  }
}
