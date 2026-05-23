/**
 * API route for individual SMS Template operations
 * PATCH /api/sms/templates/[template_id] - Update template
 * DELETE /api/sms/templates/[template_id] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId } from '@/lib/org-context';
import {
  updateSmsTemplate,
  deleteSmsTemplate,
  toggleSmsTemplateStatus,
  getSmsTemplateById,
} from '@/lib/models/sms-template';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ template_id: string }> | { template_id: string } }
) {
  try {
    const org_id = await getCurrentOrgId();
    const resolvedParams = params instanceof Promise ? await params : params;
    const template = await getSmsTemplateById(resolvedParams.template_id, org_id);

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error fetching SMS template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ template_id: string }> | { template_id: string } }
) {
  try {
    const org_id = await getCurrentOrgId();
    const body = await request.json();
    const { action, ...updates } = body;

    // Handle both Promise and direct params (Next.js 15+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const template_id = resolvedParams.template_id;

    console.log('PATCH /api/sms/templates/[template_id]:', { template_id, org_id, action, body });

    // Handle toggle action
    if (action === 'toggle') {
      const { is_active } = body;
      
      // First verify template exists
      const existingTemplate = await getSmsTemplateById(template_id, org_id);
      if (!existingTemplate) {
        console.error('Template not found:', { template_id, org_id });
        return NextResponse.json(
          {
            success: false,
            error: 'Template not found',
          },
          { status: 404 }
        );
      }

      const success = await toggleSmsTemplateStatus(
        template_id,
        org_id,
        is_active
      );

      if (!success) {
        console.error('Failed to toggle template status:', { template_id, org_id, is_active });
        return NextResponse.json(
          {
            success: false,
            error: 'Template update failed',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Template status updated successfully',
      });
    }

    // Regular update
    // Handle both direct updates and nested updates object
    const updateData = updates.updates || updates;
    
    // First verify template exists
    const existingTemplate = await getSmsTemplateById(template_id, org_id);
    if (!existingTemplate) {
      console.error('Template not found for update:', { template_id, org_id });
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
        },
        { status: 404 }
      );
    }

    console.log('Updating template:', { template_id, org_id, updateData });
    const success = await updateSmsTemplate(template_id, org_id, updateData);

    if (!success) {
      console.error('Failed to update template:', { template_id, org_id, updateData });
      return NextResponse.json(
        {
          success: false,
          error: 'Template update failed',
        },
        { status: 500 }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ template_id: string }> | { template_id: string } }
) {
  try {
    const org_id = await getCurrentOrgId();
    const resolvedParams = params instanceof Promise ? await params : params;
    const success = await deleteSmsTemplate(resolvedParams.template_id, org_id);

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

