/**
 * API route for email verification
 * GET /api/auth/verify-email?token=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, deleteVerificationToken, getUserByEmail, updateUser } from '@/lib/models/user';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      console.error('Verification: No token provided');
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 }
      );
    }

    console.log('Verification: Verifying token:', token.substring(0, 10) + '...');

    // Verify token
    const verification = await verifyToken(token, 'email_verification');

    console.log('Verification result:', { valid: verification.valid, email: verification.email });

    if (!verification.valid || !verification.email) {
      console.error('Verification: Invalid or expired token');
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Get user
    const user = await getUserByEmail(verification.email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user email verification status
    await updateUser(user._id!.toString(), {
      emailVerified: new Date(),
    });

    // Delete verification token
    await deleteVerificationToken(token);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}


