#!/usr/bin/env tsx

/**
 * Test script for welcome email functionality
 * Usage: npx tsx server/testWelcomeEmail.ts <test-email>
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testWelcomeEmail() {
  console.log('🧪 Testing Welcome Email Functionality\n');

  // Check email environment variables
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = process.env.EMAIL_FROM;
  const APP_URL = process.env.APP_URL || 'http://localhost:5001';

  console.log('1. Checking email environment configuration...');
  const hasResendKey = !!RESEND_API_KEY && RESEND_API_KEY !== 'your-resend-api-key-here';
  const hasEmailFrom = !!EMAIL_FROM && EMAIL_FROM !== 'noreply@yourdomain.com';
  const hasAppUrl = !!APP_URL;

  console.log(`   RESEND_API_KEY: ${hasResendKey ? '✅ Configured' : '❌ Missing or placeholder'}`);
  console.log(`   EMAIL_FROM: ${hasEmailFrom ? '✅ Configured' : '❌ Missing or placeholder'}`);
  console.log(`   APP_URL: ${hasAppUrl ? '✅ Configured' : '❌ Missing'}`);

  if (!hasResendKey || !hasEmailFrom) {
    console.log('\n⚠️  Email configuration incomplete. Please check your .env file.');
    return;
  }

  // Test email sending
  console.log('\n2. Testing welcome email delivery...');
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.log('   ❌ No test email address provided');
    console.log('   Usage: npx tsx server/testWelcomeEmail.ts your@email.com');
    return;
  }

  const resend = new Resend(RESEND_API_KEY);
  
  try {
    console.log(`   Sending welcome email to: ${testEmail}`);
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM!,
      to: testEmail,
      subject: 'Welcome to PromptSculptor! 🎨',
      html: generateWelcomeHtml({ userName: 'Test User', appUrl: APP_URL }),
      text: generateWelcomeText({ userName: 'Test User', appUrl: APP_URL }),
    });

    if (error) {
      console.log(`   ❌ Welcome email failed: ${error.message}`);
      console.log('   Full error:', error);
    } else {
      console.log(`   ✅ Welcome email sent successfully (ID: ${data?.id})`);
      console.log('   📧 Check your email inbox for the welcome message.');
      console.log('   💡 If you don\'t see it in your inbox, check your spam folder.');
    }
  } catch (error) {
    console.log(`   ❌ Welcome email error: ${error}`);
  }

  console.log('\n✅ Welcome email testing completed!');
}

function generateWelcomeHtml(params: { userName: string; appUrl: string }): string {
  const { userName, appUrl } = params;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PromptSculptor!</title>
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
            font-size: 28px;
            font-weight: bold;
            color: #4F46E5;
          }
          h1 {
            color: #1F2937;
            font-size: 28px;
            margin-bottom: 20px;
            text-align: center;
          }
          .welcome-message {
            text-align: center;
            font-size: 18px;
            color: #4F46E5;
            margin-bottom: 25px;
            padding: 15px;
            background-color: #F0F4FF;
            border-radius: 8px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4F46E5;
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 10px 5px;
          }
          .features {
            background-color: #F9FAFB;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          }
          .cta-section {
            text-align: center;
            margin: 30px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #6B7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎨 PromptSculptor</div>
          </div>
          
          <h1>Welcome to PromptSculptor!</h1>
          
          <div class="welcome-message">
            <strong>🎉 Hello ${userName}!</strong><br>
            Your account has been successfully created and you're ready to start crafting amazing prompts.
          </div>
          
          <p>Welcome to PromptSculptor - your intelligent prompt engineering companion! We're excited to help you create, refine, and optimize prompts for all your AI projects.</p>
          
          <div class="features">
            <h3>🚀 What you can do with PromptSculptor:</h3>
            <ul>
              <li><strong>Smart Prompt Generation:</strong> Create professional prompts using natural language input</li>
              <li><strong>Multi-Model Support:</strong> Work with OpenAI GPT, Anthropic Claude, and Google Gemini</li>
              <li><strong>Template Library:</strong> Access pre-built templates for common use cases</li>
              <li><strong>Favorites & History:</strong> Save and organize your best prompts</li>
              <li><strong>Advanced Options:</strong> Fine-tune complexity, examples, and constraints</li>
            </ul>
          </div>
          
          <div class="cta-section">
            <a href="${appUrl}" class="button" style="color: white !important; text-decoration: none !important;">Start Creating Prompts</a>
            <a href="${appUrl}/settings" class="button" style="color: white !important; text-decoration: none !important; background-color: #6B7280;">Setup API Keys</a>
          </div>
          
          <p><strong>💡 Quick Tip:</strong> To unlock the full power of PromptSculptor, add your API keys in Settings. This enables personalized AI-powered prompt generation tailored to your needs.</p>
          
          <div class="footer">
            <p>Welcome aboard!<br>
            The PromptSculptor Team</p>
            <p>Need help? Contact our support team at support@promptsculptor.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateWelcomeText(params: { userName: string; appUrl: string }): string {
  const { userName, appUrl } = params;

  return `
🎨 Welcome to PromptSculptor!

Hello ${userName}!

🎉 Your account has been successfully created and you're ready to start crafting amazing prompts.

Welcome to PromptSculptor - your intelligent prompt engineering companion! We're excited to help you create, refine, and optimize prompts for all your AI projects.

🚀 What you can do with PromptSculptor:

• Smart Prompt Generation: Create professional prompts using natural language input
• Multi-Model Support: Work with OpenAI GPT, Anthropic Claude, and Google Gemini  
• Template Library: Access pre-built templates for common use cases
• Favorites & History: Save and organize your best prompts
• Advanced Options: Fine-tune complexity, examples, and constraints

Ready to get started?
• Start creating prompts: ${appUrl}
• Setup your API keys: ${appUrl}/settings

💡 Quick Tip: To unlock the full power of PromptSculptor, add your API keys in Settings. This enables personalized AI-powered prompt generation tailored to your needs.

If you have any questions or need assistance getting started, don't hesitate to reach out. We're here to help you make the most of your prompt engineering journey!

Welcome aboard!
The PromptSculptor Team

Need help? Contact our support team at support@promptsculptor.com
  `.trim();
}

// Run the test
testWelcomeEmail().catch((error) => {
  console.error('❌ Welcome email test failed:', error);
  process.exit(1);
});