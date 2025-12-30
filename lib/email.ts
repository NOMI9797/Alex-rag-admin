/**
 * Email sending utility using nodemailer
 */

const nodemailer = require('nodemailer');

// Create reusable transporter
function createTransporter() {
  // For development, you can use ethereal.email (fake SMTP)
  // For production, use your email service (Gmail, SendGrid, etc.)
  
  if (process.env.EMAIL_SERVER) {
    // Production: Use configured SMTP server
    return nodemailer.createTransport(process.env.EMAIL_SERVER);
  } else if (process.env.SMTP_HOST) {
    // Custom SMTP configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  } else {
    // Development: Console log only
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const transporter = createTransporter();
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@alexrag.com',
    to: email,
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Alex RAG Admin!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Thank you for signing up! Please verify your email address by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size: 14px; color: #667eea; word-break: break-all;">
              ${verificationUrl}
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This link will expire in 24 hours.
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>Alex RAG Admin - AI Voice Agent Management</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hi ${name},
      
      Thank you for signing up for Alex RAG Admin!
      
      Please verify your email address by visiting this link:
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, you can safely ignore this email.
      
      Best regards,
      Alex RAG Admin Team
    `,
  };

  const info = await transporter.sendMail(mailOptions);

  // In development, log the email
  if (process.env.NODE_ENV === 'development') {
    console.log('=== Verification Email ===');
    console.log('To:', email);
    console.log('Verification URL:', verificationUrl);
    console.log('Message:', info.message?.toString());
    console.log('========================');
  }
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const transporter = createTransporter();
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@alexrag.com',
    to: email,
    subject: 'Reset your password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Password Reset Request</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size: 14px; color: #667eea; word-break: break-all;">
              ${resetUrl}
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This link will expire in 24 hours.
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>Alex RAG Admin - AI Voice Agent Management</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hi ${name},
      
      We received a request to reset your password for Alex RAG Admin.
      
      Click this link to reset your password:
      ${resetUrl}
      
      This link will expire in 24 hours.
      
      If you didn't request a password reset, you can safely ignore this email.
      
      Best regards,
      Alex RAG Admin Team
    `,
  };

  const info = await transporter.sendMail(mailOptions);

  // In development, log the email
  if (process.env.NODE_ENV === 'development') {
    console.log('=== Password Reset Email ===');
    console.log('To:', email);
    console.log('Reset URL:', resetUrl);
    console.log('Message:', info.message?.toString());
    console.log('===========================');
  }
}

