#!/usr/bin/env tsx

/**
 * Simple email-only test script that doesn't require full environment setup
 * Tests just the email service functionality
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

async function testEmailOnly() {
  console.log('🧪 Testing Email Service Only\n');

  // Check email environment variables
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = process.env.EMAIL_FROM;
  const APP_URL = process.env.APP_URL || 'http://localhost:5001';

  console.log('1. Checking email environment configuration...');
  const hasResendKey = !!RESEND_API_KEY && RESEND_API_KEY !== 're_123456789_YOUR_RESEND_API_KEY_HERE' && RESEND_API_KEY !== 'your-resend-api-key-here';
  const hasEmailFrom = !!EMAIL_FROM && EMAIL_FROM !== 'noreply@yourdomain.com';
  const hasAppUrl = !!APP_URL;

  console.log(`   RESEND_API_KEY: ${hasResendKey ? '✅ Configured' : '❌ Missing or placeholder'}`);
  console.log(`   EMAIL_FROM: ${hasEmailFrom ? '✅ Configured' : '❌ Missing or placeholder'}`);
  console.log(`   APP_URL: ${hasAppUrl ? '✅ Configured' : '❌ Missing'}`);

  if (!hasResendKey) {
    console.log('\n⚠️  To test email sending, you need to:');
    console.log('   1. Sign up for a Resend account at https://resend.com');
    console.log('   2. Get your API key from the dashboard');
    console.log('   3. Update RESEND_API_KEY in your .env file');
    console.log('   4. Configure EMAIL_FROM with a verified domain');
    console.log('\n   Current RESEND_API_KEY value:', RESEND_API_KEY ? `"${RESEND_API_KEY.substring(0, 10)}..."` : 'undefined');
    return;
  }

  if (!hasEmailFrom) {
    console.log('\n⚠️  To test email sending, you need to:');
    console.log('   1. Configure EMAIL_FROM with a valid email address');
    console.log('   2. Make sure the domain is verified in your Resend account');
    console.log('\n   Current EMAIL_FROM value:', EMAIL_FROM || 'undefined');
    return;
  }

  // Test email sending
  console.log('\n2. Testing email delivery...');
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.log('   ❌ No test email address provided');
    console.log('   Usage: npx tsx server/testEmailOnly.ts your@email.com');
    return;
  }

  const resend = new Resend(RESEND_API_KEY);
  
  try {
    console.log(`   Sending test email to: ${testEmail}`);
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM!,
      to: testEmail,
      subject: 'Test Email - PromptSculptor Password Recovery',
      html: generateTestHtml(),
      text: generateTestText(),
    });

    if (error) {
      console.log(`   ❌ Test email failed: ${error.message}`);
      console.log('   Full error:', error);
    } else {
      console.log(`   ✅ Test email sent successfully (ID: ${data?.id})`);
    }
  } catch (error) {
    console.log(`   ❌ Test email error: ${error}`);
  }

  // Test password reset email template
  console.log('\n3. Testing password reset email template...');
  const resetToken = 'test-token-12345';
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM!,
      to: testEmail,
      subject: 'Password Reset Test - PromptSculptor',
      html: generatePasswordResetHtml({ userName: 'Test User', resetUrl, expiryMinutes: 30 }),
      text: generatePasswordResetText({ userName: 'Test User', resetUrl, expiryMinutes: 30 }),
    });

    if (error) {
      console.log(`   ❌ Password reset email failed: ${error.message}`);
    } else {
      console.log(`   ✅ Password reset email sent successfully (ID: ${data?.id})`);
    }
  } catch (error) {
    console.log(`   ❌ Password reset email error: ${error}`);
  }

  console.log('\n✅ Email testing completed!');
}

function generateTestHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4F46E5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎨 PromptSculptor</div>
          </div>
          <h1>Email Configuration Test</h1>
          <p>This is a test email to verify that your PromptSculptor email configuration is working correctly.</p>
          <p>If you received this email, your Resend integration is properly configured!</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
      </body>
    </html>
  `;
}

function generateTestText(): string {
  return `
Email Configuration Test - PromptSculptor

This is a test email to verify that your PromptSculptor email configuration is working correctly.

If you received this email, your Resend integration is properly configured!

Timestamp: ${new Date().toISOString()}

---
This is an automated message from PromptSculptor.
  `.trim();
}

function generatePasswordResetHtml(params: {
  userName?: string;
  resetUrl: string;
  expiryMinutes: number;
}): string {
  const { userName, resetUrl, expiryMinutes } = params;
  const greeting = userName ? `Hello ${userName},` : 'Hello,';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4F46E5;
          }
          h1 {
            color: #1F2937;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #4338CA;
          }
          .warning {
            background-color: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #6B7280;
            text-align: center;
          }
          .link {
            color: #4F46E5;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎨 PromptSculptor</div>
          </div>
          
          <h1>Reset Your Password (TEST)</h1>
          
          <p>${greeting}</p>
          
          <p>This is a test of the password reset email template. In a real scenario, you would click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password (TEST)</a>
          </div>
          
          <div class="warning">
            <strong>⏰ This would expire in ${expiryMinutes} minutes</strong><br>
            This is a test email - the link above is not functional.
          </div>
          
          <p>Test URL: <span class="link">${resetUrl}</span></p>
          
          <div class="footer">
            <p>This is a test email from PromptSculptor.<br>
            Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generatePasswordResetText(params: {
  userName?: string;
  resetUrl: string;
  expiryMinutes: number;
}): string {
  const { userName, resetUrl, expiryMinutes } = params;
  const greeting = userName ? `Hello ${userName},` : 'Hello,';

  return `
${greeting}

This is a test of the password reset email template.

In a real scenario, you would use this link to reset your password:
${resetUrl}

⏰ IMPORTANT: This would expire in ${expiryMinutes} minutes.

This is a test email - the link above is not functional.

---
This is a test email from PromptSculptor.
Please do not reply to this email.
  `.trim();
}

// Run the test
testEmailOnly().catch((error) => {
  console.error('❌ Email test failed:', error);
  process.exit(1);
});