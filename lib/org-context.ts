/**
 * Organization context management
 * Handles extracting org_id from session/auth context
 */

/**
 * TEMPORARY: Hardcoded org_id for development
 * This will be replaced with session-based org_id after authentication is implemented
 */
const DEV_ORG_ID = 'dev-org-001';
const DEV_ORG_NAME = 'Development Organization';

/**
 * Get current org_id from request context
 * 
 * In development: Returns hardcoded org_id
 * After auth implementation: Will extract from session/JWT
 * 
 * @returns org_id string
 */
export function getCurrentOrgId(): string {
  // TODO: After auth implementation, extract from session
  // Example: const session = await getServerSession();
  // return session.user.org_id;
  
  return DEV_ORG_ID;
}

/**
 * Get current org name
 * 
 * @returns org name string
 */
export function getCurrentOrgName(): string {
  // TODO: After auth implementation, fetch from database or session
  return DEV_ORG_NAME;
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
export function getOrgContext(): OrgContext {
  return {
    org_id: getCurrentOrgId(),
    org_name: getCurrentOrgName(),
  };
}

/**
 * Validate org_id format
 */
export function isValidOrgId(org_id: string): boolean {
  return typeof org_id === 'string' && org_id.length > 0;
}

