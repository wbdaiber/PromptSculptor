import { Resend } from 'resend';
import { config } from '../config/env.js';

// Initialize Resend client
const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

export interface SendPasswordResetEmailParams {
  email: string;
  resetToken: string;
  expiresAt: Date;
  userName?: string;
}

export interface SendWelcomeEmailParams {
  email: string;
  userName: string;
}

export interface EmailServiceResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends a password reset email to the user
 * @param params - Email parameters including recipient, token, and expiry
 * @returns Promise with send status and message ID or error
 */
export async function sendPasswordResetEmail(
  params: SendPasswordResetEmailParams
): Promise<EmailServiceResponse> {
  const { email, resetToken, expiresAt, userName } = params;

  // Check if Resend is configured
  if (!resend) {
    console.error('❌ Email service not configured: RESEND_API_KEY is missing');
    return {
      success: false,
      error: 'Email service not configured'
    };
  }

  if (!config.EMAIL_FROM) {
    console.error('❌ EMAIL_FROM is not configured');
    return {
      success: false,
      error: 'Email sender not configured'
    };
  }

  // Construct reset URL
  const resetUrl = `${config.APP_URL}/reset-password/${resetToken}`;
  
  // Calculate expiry time in minutes
  const expiryMinutes = Math.round((expiresAt.getTime() - Date.now()) / 60000);

  try {
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: config.EMAIL_FROM,
      to: email,
      subject: 'Reset Your Password - PromptSculptor',
      html: generateHtmlEmail({ userName, resetUrl, expiryMinutes }),
      text: generateTextEmail({ userName, resetUrl, expiryMinutes }),
    });

    if (error) {
      console.error('❌ Failed to send password reset email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }

    console.log(`✅ Password reset email sent to ${email} (ID: ${data?.id})`);
    return {
      success: true,
      messageId: data?.id
    };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generates HTML email content
 */
function generateHtmlEmail(params: {
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
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #4338CA;
            color: white !important;
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
          
          <h1>Reset Your Password</h1>
          
          <p>${greeting}</p>
          
          <p>We received a request to reset your password for your PromptSculptor account. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button" style="color: white !important; text-decoration: none !important;">Reset Password</a>
          </div>
          
          <div class="warning">
            <strong>⏰ This link expires in ${expiryMinutes} minutes</strong><br>
            For security reasons, this password reset link will expire soon. If it expires, you can request a new one.
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p class="link">${resetUrl}</p>
          
          <p>If you didn't request this password reset, you can safely ignore this email. Your password won't be changed unless you click the link above and create a new one.</p>
          
          <div class="footer">
            <p>This is an automated message from PromptSculptor.<br>
            Please do not reply to this email.</p>
            <p>Need help? Contact our support team at support@promptsculptor.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates plain text email content
 */
function generateTextEmail(params: {
  userName?: string;
  resetUrl: string;
  expiryMinutes: number;
}): string {
  const { userName, resetUrl, expiryMinutes } = params;
  const greeting = userName ? `Hello ${userName},` : 'Hello,';

  return `
${greeting}

We received a request to reset your password for your PromptSculptor account.

To reset your password, click the link below:
${resetUrl}

⏰ IMPORTANT: This link expires in ${expiryMinutes} minutes.

If you didn't request this password reset, you can safely ignore this email. Your password won't be changed unless you click the link above and create a new one.

If you're having trouble clicking the link, copy and paste it into your browser.

---
This is an automated message from PromptSculptor.
Please do not reply to this email.

Need help? Contact our support team at support@promptsculptor.com
  `.trim();
}

/**
 * Sends a welcome email to new users after successful registration
 * @param params - Email parameters including recipient and user name
 * @returns Promise with send status and message ID or error
 */
export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams
): Promise<EmailServiceResponse> {
  const { email, userName } = params;

  // Check if Resend is configured
  if (!resend) {
    console.error('❌ Email service not configured: RESEND_API_KEY is missing');
    return {
      success: false,
      error: 'Email service not configured'
    };
  }

  if (!config.EMAIL_FROM) {
    console.error('❌ EMAIL_FROM is not configured');
    return {
      success: false,
      error: 'Email sender not configured'
    };
  }

  try {
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: config.EMAIL_FROM,
      to: email,
      subject: 'Welcome to PromptSculptor! 🎨',
      html: generateWelcomeHtmlEmail({ userName, appUrl: config.APP_URL }),
      text: generateWelcomeTextEmail({ userName, appUrl: config.APP_URL }),
    });

    if (error) {
      console.error('❌ Failed to send welcome email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }

    console.log(`✅ Welcome email sent to ${email} (ID: ${data?.id})`);
    return {
      success: true,
      messageId: data?.id
    };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generates HTML welcome email content
 */
function generateWelcomeHtmlEmail(params: {
  userName: string;
  appUrl: string;
}): string {
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
          .button:hover {
            background-color: #4338CA;
            color: white !important;
          }
          .button-secondary {
            background-color: #6B7280;
          }
          .button-secondary:hover {
            background-color: #4B5563;
          }
          .features {
            background-color: #F9FAFB;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          }
          .features h3 {
            color: #1F2937;
            margin-top: 0;
            margin-bottom: 15px;
          }
          .features ul {
            margin: 0;
            padding-left: 20px;
          }
          .features li {
            margin-bottom: 8px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #6B7280;
            text-align: center;
          }
          .cta-section {
            text-align: center;
            margin: 30px 0;
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
            <a href="${appUrl}/settings" class="button button-secondary" style="color: white !important; text-decoration: none !important;">Setup API Keys</a>
          </div>
          
          <p><strong>💡 Quick Tip:</strong> To unlock the full power of PromptSculptor, add your API keys in Settings. This enables personalized AI-powered prompt generation tailored to your needs.</p>
          
          <p>If you have any questions or need assistance getting started, don't hesitate to reach out. We're here to help you make the most of your prompt engineering journey!</p>
          
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

/**
 * Generates plain text welcome email content
 */
function generateWelcomeTextEmail(params: {
  userName: string;
  appUrl: string;
}): string {
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

/**
 * Test email configuration by sending a test email
 * @param recipientEmail - Email address to send test to
 * @returns Promise with send status
 */
export async function sendTestEmail(recipientEmail: string): Promise<EmailServiceResponse> {
  if (!resend) {
    return {
      success: false,
      error: 'Email service not configured'
    };
  }

  if (!config.EMAIL_FROM) {
    return {
      success: false,
      error: 'Email sender not configured'
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: config.EMAIL_FROM,
      to: recipientEmail,
      subject: 'Test Email - PromptSculptor',
      html: '<p>This is a test email from PromptSculptor. If you received this, your email configuration is working correctly!</p>',
      text: 'This is a test email from PromptSculptor. If you received this, your email configuration is working correctly!',
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to send test email'
      };
    }

    return {
      success: true,
      messageId: data?.id
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Health check for email service - tests configuration without sending emails
 * @returns Promise with health status
 */
export async function checkEmailHealth(): Promise<{
  status: 'pass' | 'fail';
  details?: string;
}> {
  try {
    // Check if Resend is configured
    if (!resend) {
      return {
        status: 'fail',
        details: 'Email service not configured: RESEND_API_KEY is missing'
      };
    }

    if (!config.EMAIL_FROM) {
      return {
        status: 'fail',
        details: 'Email sender not configured: EMAIL_FROM is missing'
      };
    }

    // Optional: Test API connectivity (without sending emails)
    // For now, just check configuration
    return {
      status: 'pass',
      details: 'Email service is properly configured'
    };
  } catch (error) {
    return {
      status: 'fail',
      details: error instanceof Error ? error.message : 'Email service health check failed'
    };
  }
}