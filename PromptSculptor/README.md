# PromptSculptor

A modern web application for creating, managing, and optimizing AI prompts with support for multiple AI providers including OpenAI, Anthropic Claude, and Google Gemini.

🌐 **Live at**: [https://markdownpromptcreator.com](https://markdownpromptcreator.com)

## Features

- **Multi-Model Support**: Generate prompts using OpenAI GPT, Anthropic Claude, or Google Gemini
- **Template System**: Create and manage reusable prompt templates
- **User Authentication**: Secure session-based authentication with password recovery
- **API Key Management**: Encrypted storage of user API keys with service validation
- **Favorites & History**: Save and organize your best prompts
- **Enhanced Demo Mode**: High-quality template-based generation for unauthenticated users
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Professional Email System**: Automated welcome emails and password recovery

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **shadcn/ui** components (Radix UI primitives with Tailwind CSS)
- **TanStack Query** for API state management
- **Wouter** for lightweight routing
- **Framer Motion** for animations

### Backend  
- **Express.js** with TypeScript
- **PostgreSQL** with Drizzle ORM
- **Passport.js** for authentication
- **Helmet** for security headers
- **Rate limiting** and CORS protection
- **Resend API** for email delivery

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- At least one AI service API key (optional for demo mode)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PromptSculptor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/promptsculptor"
   
   # Session Security
   SESSION_SECRET="your-secure-session-secret"
   
   # Email Service (Resend)
   RESEND_API_KEY="your-resend-api-key"
   
   # Application URL
   APP_URL="http://localhost:5001"
   
   # Optional: Admin API Keys (for enhanced demo mode)
   OPENAI_API_KEY="sk-..."
   ANTHROPIC_API_KEY="sk-ant-..."
   GOOGLE_API_KEY="AI..."
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   ```

5. **Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5001`

## Usage

### For New Users
1. **Demo Mode**: Start using the app immediately without registration
2. **Create Account**: Register for full features and data persistence
3. **Add API Keys**: Configure your AI service API keys in Settings
4. **Generate Prompts**: Use natural language to describe your needs

### API Key Setup
- **OpenAI**: Get your API key from [platform.openai.com](https://platform.openai.com/api-keys)
- **Anthropic**: Get your API key from [console.anthropic.com](https://console.anthropic.com/)
- **Google Gemini**: Get your API key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

## Architecture

### User-Centric Design
- **Primary System**: Uses user's encrypted API keys for personalized generation
- **Enhanced Demo Mode**: Template-based generation for users without API keys
- **Smart Fallback**: Graceful degradation from user keys to demo mode

### Security Features
- **Encrypted API Keys**: AES-256-GCM encryption for user API keys
- **Session Security**: Secure cookie-based authentication
- **Rate Limiting**: Protection against abuse and spam
- **Input Sanitization**: Comprehensive validation and sanitization
- **CORS Protection**: Configured for secure cross-origin requests

### Data Management
- **User Scoping**: All data properly isolated per user
- **Favorites System**: Save and organize important prompts
- **Recent History**: Track your prompt generation history
- **Template Library**: Create reusable prompt templates

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm start` - Start production server
- `npm run check` - Type checking
- `npm run db:push` - Update database schema

### Project Structure
```
PromptSculptor/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── context/      # React contexts
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilities and API client
│   │   └── pages/        # Route components
├── server/               # Express backend
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   └── storage/          # Data access layer
├── shared/               # Shared types and schemas
└── dist/                 # Production build output
```

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set secure `SESSION_SECRET`
- [ ] Configure email domain verification
- [ ] Set up HTTPS and security headers
- [ ] Configure CORS for production domains

### Environment Variables
```env
NODE_ENV=production
DATABASE_URL="your-production-db-url"
SESSION_SECRET="your-production-session-secret"
RESEND_API_KEY="your-resend-api-key"
APP_URL="https://yourdomain.com"
CORS_ORIGINS="https://yourdomain.com"
```

## Security

- **Password Recovery**: Enterprise-grade system with cryptographic tokens
- **Token Management**: Automated cleanup with 30-minute expiration
- **Security Monitoring**: Real-time event logging with IP tracking
- **Rate Limiting**: Multiple layers of protection against abuse
- **Data Validation**: Comprehensive input sanitization and validation

## Email System

- **Welcome Emails**: Automated onboarding emails for new users
- **Password Recovery**: Secure password reset with professional templates
- **Multi-format Support**: HTML and plain text email versions
- **Production Ready**: Domain verification support with Resend API

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Documentation**: Visit `/documentation` in the app for comprehensive guides
- **Support**: Contact support through the `/support` page in the app
- **Issues**: Report bugs and feature requests through GitHub issues# Trigger Vercel redeploy
