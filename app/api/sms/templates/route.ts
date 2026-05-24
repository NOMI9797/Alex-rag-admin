/**
 * API route for SMS Template management
 * GET /api/sms/templates - List all templates
 * POST /api/sms/templates - Create new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import {
  getSmsTemplatesByOrg,
  createSmsTemplate,
  updateSmsTemplate,
  deleteSmsTemplate,
  toggleSmsTemplateStatus,
} from '@/lib/models/sms-template';

export async function GET(request: NextRequest) {
  try {
    const org_id = await getCurrentOrgId();
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active_only') === 'true';

    const templates = activeOnly
      ? await getSmsTemplatesByOrg(org_id)
      : await getSmsTemplatesByOrg(org_id);

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error fetching SMS templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const org_id = await getCurrentOrgId();
    const body = await request.json();
    const { template_id, template_name, message_body, trigger_condition } = body;

    // Validation
    if (!template_id || !template_name || !message_body) {
      return NextResponse.json(
        {
          success: false,
          error: 'template_id, template_name, and message_body are required',
        },
        { status: 400 }
      );
    }

    // Check if template_id already exists for this org
    const { getSmsTemplateById } = await import('@/lib/models/sms-template');
    const existing = await getSmsTemplateById(template_id, org_id);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Template with ID "${template_id}" already exists`,
        },
        { status: 400 }
      );
    }

    const template = await createSmsTemplate({
      template_id,
      org_id,
      template_name,
      message_body,
      trigger_condition,
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error creating SMS template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const org_id = await getCurrentOrgId();
    const body = await request.json();
    const { template_id, updates } = body;

    if (!template_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'template_id is required',
        },
        { status: 400 }
      );
    }

    const success = await updateSmsTemplate(template_id, org_id, updates);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found or update failed',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('Error updating SMS template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const org_id = await getCurrentOrgId();
    const searchParams = request.nextUrl.searchParams;
    const template_id = searchParams.get('template_id');

    if (!template_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'template_id is required',
        },
        { status: 400 }
      );
    }

    const success = await deleteSmsTemplate(template_id, org_id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found or deletion failed',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting SMS template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

