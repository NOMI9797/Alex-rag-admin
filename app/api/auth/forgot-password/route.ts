/**
 * API route for password reset request
 * POST /api/auth/forgot-password
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createVerificationToken } from '@/lib/models/user';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await getUserByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we sent a password reset link.',
      });
    }

    // Check if user uses credentials (not OAuth)
    if (user.provider !== 'credentials' || !user.password) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we sent a password reset link.',
      });
    }

    // Create reset token
    const resetToken = await createVerificationToken(email, 'password_reset');

    // Send reset email
    try {
      await sendPasswordResetEmail(email, user.name, resetToken.token);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return NextResponse.json(
        { success: false, error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we sent a password reset link.',
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}


