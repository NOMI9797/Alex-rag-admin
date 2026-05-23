import { getDatabase } from '@/lib/mongodb';
import { AgentSettings } from './types';

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

export async function upsertAgentSettings(
  org_id: string,
  operator_phone: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    await db.collection<AgentSettings>(COLLECTION).updateOne(
      { org_id },
      { $set: { org_id, operator_phone, updated_at: new Date() } },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('Error upserting agent settings:', error);
    return false;
  }
}
