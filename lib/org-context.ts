/**
 * Organization context management
 * Handles extracting org_id from session/auth context
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Get current org_id from authenticated session
 * 
 * @returns org_id string
 * @throws Error if no session or org_id
 */
export async function getCurrentOrgId(): Promise<string> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('Unauthorized: No active session');
  }

  const orgId = (session.user as any).org_id;

  if (!orgId) {
    throw new Error('Unauthorized: No organization associated with user');
  }

  return orgId;
}

/**
 * Get current org name from session
 * 
 * @returns org name string (or fallback)
 */
export async function getCurrentOrgName(): Promise<string> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.name) {
    return 'Organization';
  }

  return `${session.user.name}'s Organization`;
}

/**
 * Middleware helper to attach org context to API routes
 * Usage in API routes:
 * 
 * const org_id = getCurrentOrgId();
 * // Use org_id for database queries
 */
export interface OrgContext {
  org_id: string;
  org_name: string;
}

/**
 * Get full org context
 */
export async function getOrgContext(): Promise<OrgContext> {
  return {
    org_id: await getCurrentOrgId(),
    org_name: await getCurrentOrgName(),
  };
}

/**
 * Get current user ID from session
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('Unauthorized: No active session');
  }

  const userId = (session.user as any).id;

  if (!userId) {
    throw new Error('Unauthorized: No user ID in session');
  }

  return userId;
}

/**
 * Get current user role from session
 */
export async function getCurrentUserRole(): Promise<string> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('Unauthorized: No active session');
  }

  const role = (session.user as any).role || 'member';

  return role;
}

/**
 * Validate org_id format
 */
export function isValidOrgId(org_id: string): boolean {
  return typeof org_id === 'string' && org_id.length > 0;
}

