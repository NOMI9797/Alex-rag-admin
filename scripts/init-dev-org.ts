/**
 * Initialize development organization
 * Run this script once to create the dev org in MongoDB
 * 
 * Usage: npm run init-dev-org
 * 
 * Note: Uses tsx --env-file flag to load .env.local automatically
 */

import { createOrganization, organizationExists } from '../lib/models/organization';

async function initDevOrg() {
  const DEV_ORG_ID = 'dev-org-001';
  const DEV_ORG_NAME = 'Development Organization';

  try {
    // Check if dev org already exists
    const exists = await organizationExists(DEV_ORG_ID);

    if (exists) {
      console.log(`✓ Development organization '${DEV_ORG_ID}' already exists`);
      process.exit(0);
    }

    // Create dev org
    const org = await createOrganization({
      org_id: DEV_ORG_ID,
      name: DEV_ORG_NAME,
    });

    console.log('✓ Successfully created development organization:');
    console.log(`  - org_id: ${org.org_id}`);
    console.log(`  - name: ${org.name}`);
    console.log(`  - created_at: ${org.created_at}`);
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error initializing development organization:', error);
    process.exit(1);
  }
}

initDevOrg();

