/**
 * API route for user registration
 * POST /api/auth/signup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, createVerificationToken } from '@/lib/models/user';
import { createOrganization, organizationExists } from '@/lib/models/organization';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, organizationName } = body;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check password requirements: at least one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create organization for new user
    const orgName = organizationName || name || email.split('@')[0];
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Check if organization exists (shouldn't, but just in case)
    const orgExistsFlag = await organizationExists(orgId);
    if (!orgExistsFlag) {
      await createOrganization({
        org_id: orgId,
        name: orgName,
      });
    }

    // Create user
    const user = await createUser({
      name,
      email,
      password,
      provider: 'credentials',
      org_id: orgId,
      role: 'owner',
    });

    // Create verification token
    const verificationToken = await createVerificationToken(email, 'email_verification');

    // Send verification email
    try {
      await sendVerificationEmail(email, name, verificationToken.token);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      userId: user._id!.toString(),
    });
  } catch (error) {
    console.error('Error in signup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}


