#!/usr/bin/env tsx

/**
 * Test script for email service configuration
 * Run with: npx tsx server/testEmailService.ts
 */

import { sendTestEmail } from './services/emailService.js';
import { generateResetToken, validateToken } from './services/tokenService.js';
import { config } from './config/env.js';

async function testEmailService() {
  console.log('🧪 Testing Email Service Configuration\n');

  // Test 1: Environment Configuration
  console.log('1. Checking environment configuration...');
  const hasResendKey = !!config.RESEND_API_KEY && config.RESEND_API_KEY !== 're_123456789_YOUR_RESEND_API_KEY_HERE';
  const hasEmailFrom = !!config.EMAIL_FROM;
  const hasAppUrl = !!config.APP_URL;

  console.log(`   RESEND_API_KEY: ${hasResendKey ? '✅ Configured' : '❌ Missing or placeholder'}`);
  console.log(`   EMAIL_FROM: ${hasEmailFrom ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   APP_URL: ${hasAppUrl ? '✅ Configured' : '❌ Missing'}`);

  if (!hasResendKey) {
    console.log('\n⚠️  To test email sending, you need to:');
    console.log('   1. Sign up for a Resend account at https://resend.com');
    console.log('   2. Get your API key from the dashboard');
    console.log('   3. Update RESEND_API_KEY in your .env file');
    console.log('   4. Configure EMAIL_FROM with a verified domain');
  }

  // Test 2: Token Generation
  console.log('\n2. Testing token generation...');
  try {
    const tokenData = generateResetToken(5); // 5 minute test token
    console.log(`   ✅ Token generated: ${tokenData.token.substring(0, 8)}...`);
    console.log(`   ✅ Token hashed: ${tokenData.hashedToken.substring(0, 8)}...`);
    console.log(`   ✅ Expires at: ${tokenData.expiresAt.toISOString()}`);

    // Test token validation
    const validation = validateToken(tokenData.token, tokenData.hashedToken, tokenData.expiresAt, false);
    console.log(`   ✅ Token validation: ${validation.isValid ? 'Valid' : 'Invalid'}`);
  } catch (error) {
    console.log(`   ❌ Token generation failed: ${error}`);
  }

  // Test 3: Email Sending (optional - requires valid config)
  if (hasResendKey && hasEmailFrom) {
    console.log('\n3. Testing email sending...');
    console.log('   Note: This will send a real test email!');
    
    // Prompt user for test email (in a real CLI tool)
    const testEmail = process.argv[2];
    
    if (testEmail) {
      console.log(`   Sending test email to: ${testEmail}`);
      try {
        const result = await sendTestEmail(testEmail);
        if (result.success) {
          console.log(`   ✅ Test email sent successfully (ID: ${result.messageId})`);
        } else {
          console.log(`   ❌ Test email failed: ${result.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Test email error: ${error}`);
      }
    } else {
      console.log('   Skipping email test - no email address provided');
      console.log('   To test email sending, run: npx tsx server/testEmailService.ts your@email.com');
    }
  } else {
    console.log('\n3. Skipping email sending test (configuration incomplete)');
  }

  // Test 4: Configuration Summary
  console.log('\n📋 Configuration Summary:');
  console.log(`   Environment: ${config.NODE_ENV}`);
  console.log(`   App URL: ${config.APP_URL}`);
  console.log(`   Email From: ${config.EMAIL_FROM || 'Not configured'}`);
  console.log(`   Resend API Key: ${hasResendKey ? 'Configured ✅' : 'Not configured ❌'}`);

  console.log('\n🏁 Email service test completed!');
  
  if (!hasResendKey || !hasEmailFrom) {
    console.log('\n📝 Next Steps:');
    console.log('   1. Configure missing environment variables');
    console.log('   2. Test email sending with a real recipient');
    console.log('   3. Proceed to Phase 3: Backend API implementation');
  } else {
    console.log('\n✅ Email service is ready for Phase 3: Backend API implementation!');
  }
}

// Run the test
testEmailService().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});