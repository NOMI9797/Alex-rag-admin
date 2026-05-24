/**
 * Seed default SMS templates for an organization
 * Run this script to create default templates in MongoDB
 * 
 * Usage: npm run seed-sms-templates
 * Or: tsx --env-file=.env.local scripts/seed-sms-templates.ts
 * 
 * Note: Uses tsx --env-file flag to load .env.local automatically
 */

import { getDatabase } from '../lib/mongodb';
import { SmsTemplate } from '../lib/models/types';

const DEFAULT_TEMPLATES = [
  {
    template_id: 'order_confirmed',
    template_name: 'Order Confirmation',
    message_body: 'Hi {customer_name}, your order #{order_id} has been confirmed! Thank you for your business. If you have any questions, please reply to this message.',
    trigger_condition: 'order_confirmed',
  },
  {
    template_id: 'appointment_scheduled',
    template_name: 'Appointment Scheduled',
    message_body: 'Hi {customer_name}, your appointment has been scheduled for {appointment_date} at {appointment_time}. We look forward to seeing you! Reply to this message if you need to reschedule.',
    trigger_condition: 'appointment_scheduled',
  },
  {
    template_id: 'general_followup',
    template_name: 'General Follow-up',
    message_body: 'Hi {customer_name}, thank you for contacting us today. We hope we were able to help. If you have any further questions, please reply to this message.',
    trigger_condition: 'general_inquiry',
  },
];

async function seedSmsTemplates() {
  // Get org_id from command line argument or use default
  const org_id = process.argv[2] || 'dev-org-001';

  try {
    const db = await getDatabase();
    const collection = db.collection<SmsTemplate>('sms_templates');

    // Check if templates already exist for this org
    const existingTemplates = await collection.find({ org_id }).toArray();

    if (existingTemplates.length > 0) {
      console.log(`✓ Templates already exist for org_id: ${org_id}`);
      console.log(`  Found ${existingTemplates.length} existing template(s):`);
      existingTemplates.forEach(t => {
        console.log(`    - ${t.template_id}: ${t.template_name}`);
      });
      console.log('\n  To re-seed, delete existing templates first or use a different org_id.');
      process.exit(0);
    }

    // Create default templates
    console.log(`Creating default SMS templates for org_id: ${org_id}...\n`);

    const templatesToInsert = DEFAULT_TEMPLATES.map(templateData => ({
      ...templateData,
      org_id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    const result = await collection.insertMany(templatesToInsert);

    console.log(`✓ Successfully created ${result.insertedCount} default templates:\n`);
    DEFAULT_TEMPLATES.forEach((template, index) => {
      console.log(`  ${index + 1}. ${template.template_name}`);
      console.log(`     ID: ${template.template_id}`);
      console.log(`     Trigger: ${template.trigger_condition}`);
      console.log(`     Message: ${template.message_body.substring(0, 60)}...`);
      console.log('');
    });

    console.log(`✓ All templates saved to MongoDB collection: sms_templates`);
    console.log(`✓ org_id: ${org_id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding SMS templates:', error);
    process.exit(1);
  }
}

seedSmsTemplates();

