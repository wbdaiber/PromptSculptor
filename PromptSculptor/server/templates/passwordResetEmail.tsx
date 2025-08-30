import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface PasswordResetEmailProps {
  userName?: string;
  resetUrl: string;
  expiryMinutes: number;
}

export function PasswordResetEmail({
  userName,
  resetUrl,
  expiryMinutes,
}: PasswordResetEmailProps) {
  const greeting = userName ? `Hello ${userName},` : 'Hello,';

  return (
    <Html>
      <Head>
        <title>Reset Your Password - PromptSculptor</title>
      </Head>
      <Body style={main}>
        <Container style={container}>
          {/* Header with logo */}
          <Section style={header}>
            <Text style={logo}>🎨 PromptSculptor</Text>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Text style={title}>Reset Your Password</Text>
            
            <Text style={paragraph}>{greeting}</Text>
            
            <Text style={paragraph}>
              We received a request to reset your password for your PromptSculptor 
              account. Click the button below to create a new password:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>

            <Section style={warning}>
              <Text style={warningText}>
                <strong>⏰ This link expires in {expiryMinutes} minutes</strong>
              </Text>
              <Text style={warningSubtext}>
                For security reasons, this password reset link will expire soon. 
                If it expires, you can request a new one.
              </Text>
            </Section>

            <Text style={paragraph}>
              If the button doesn't work, you can copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>{resetUrl}</Text>

            <Text style={paragraph}>
              If you didn't request this password reset, you can safely ignore this email. 
              Your password won't be changed unless you click the link above and create a new one.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated message from PromptSculptor.
              <br />
              Please do not reply to this email.
            </Text>
            <Text style={footerText}>
              Need help? Contact our support team at support@promptsculptor.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f4f4f4',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  margin: '40px auto',
  padding: '30px',
  maxWidth: '600px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
};

const header = {
  textAlign: 'center' as const,
  marginBottom: '30px',
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#4F46E5',
  margin: '0',
};

const content = {
  margin: '0',
};

const title = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1F2937',
  margin: '0 0 20px 0',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#4F46E5',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 30px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
};

const warning = {
  backgroundColor: '#FEF3C7',
  borderLeft: '4px solid #F59E0B',
  padding: '16px',
  margin: '20px 0',
  borderRadius: '4px',
};

const warningText = {
  fontSize: '16px',
  color: '#92400E',
  margin: '0 0 8px 0',
};

const warningSubtext = {
  fontSize: '14px',
  color: '#92400E',
  margin: '0',
  lineHeight: '1.4',
};

const linkText = {
  fontSize: '14px',
  color: '#4F46E5',
  wordBreak: 'break-all' as const,
  margin: '8px 0 16px 0',
  padding: '8px',
  backgroundColor: '#F3F4F6',
  borderRadius: '4px',
  border: '1px solid #E5E7EB',
};

const hr = {
  borderColor: '#E5E7EB',
  margin: '30px 0 20px 0',
};

const footer = {
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '8px 0',
  lineHeight: '1.4',
};

export default PasswordResetEmail;