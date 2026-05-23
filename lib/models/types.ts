import { ObjectId } from 'mongodb';

export interface AgentSettings {
  _id?: ObjectId;
  org_id: string;
  operator_phone: string;
  updated_at: Date;
}
