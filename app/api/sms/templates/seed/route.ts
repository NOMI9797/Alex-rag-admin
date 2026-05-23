/**
 * API route to seed default SMS templates
 * POST /api/sms/templates/seed - Create default templates for the organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import { getSmsTemplatesByOrg, createSmsTemplate } from '@/lib/models/sms-template';

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

export async function POST(request: NextRequest) {
  try {
    const org_id = await getCurrentOrgId();

    // Check if templates already exist
    const existingTemplates = await getSmsTemplatesByOrg(org_id);
    
    if (existingTemplates.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Templates already exist. Skipping seed.',
        templates: existingTemplates,
      });
    }

    // Create default templates
    const createdTemplates = [];
    for (const templateData of DEFAULT_TEMPLATES) {
      try {
        const template = await createSmsTemplate({
          ...templateData,
          org_id,
        });
        createdTemplates.push(template);
      } catch (error: any) {
        // If template already exists, skip it
        if (error.message?.includes('already exists')) {
          console.log(`Template ${templateData.template_id} already exists, skipping`);
        } else {
          console.error(`Error creating template ${templateData.template_id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdTemplates.length} default templates`,
      templates: createdTemplates,
    });
  } catch (error) {
    console.error('Error seeding SMS templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

