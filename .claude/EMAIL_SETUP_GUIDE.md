# Email Service Setup Guide

This guide explains how to configure email providers for the payment reminder system.

## Available Email Providers

The system supports three email providers:

1. **Mock/Console** (default) - Logs emails to console only
2. **Gmail/Nodemailer** - Uses Gmail SMTP (recommended for testing)
3. **Resend** - Professional email API (for production)

## Option 1: Mock Provider (No Setup Required)

Perfect for initial testing without sending real emails.

### Configuration
```bash
# .env.local
EMAIL_PROVIDER=mock
```

All emails will be logged to console only.

## Option 2: Gmail/Nodemailer (Recommended for Testing)

Send emails to multiple addresses without domain verification.

### Step 1: Enable 2-Factor Authentication on Gmail

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if not already enabled

### Step 2: Generate App Password

1. Visit [App Passwords](https://myaccount.google.com/apppasswords)
   - Or go to Google Account → Security → 2-Step Verification → App passwords
2. Select app: "Mail"
3. Select device: "Other" (enter "Payment Reminders")
4. Click "Generate"
5. **Copy the 16-character password** (you won't see it again)

### Step 3: Configure Environment Variables

```bash
# .env.local
EMAIL_PROVIDER=nodemailer
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
```

### Features
- ✅ Send to ANY email address
- ✅ No domain verification required
- ✅ Gmail sending limit: ~500 emails/day
- ✅ Free
- ✅ View sent emails in Gmail "Sent" folder

### Limitations
- Daily sending limit (~500 emails)
- Emails appear "from" your Gmail address
- Not suitable for high-volume production use

## Option 3: Resend (Production Use)

Professional email API with better deliverability and analytics.

### Setup

1. Create account at [resend.com](https://resend.com)
2. Verify your domain (or use `onboarding@resend.dev` for testing)
3. Get API key from dashboard

### Configuration

```bash
# .env.local
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Features
- ✅ High deliverability
- ✅ Email analytics
- ✅ Webhook support
- ✅ Better for production

### Limitations (Free Tier)
- Can only send to verified email addresses
- Need to verify recipient emails or have a verified domain
- 100 emails/day, 3,000/month

## Testing the Configuration

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Send a Test Reminder

1. Navigate to an invoice with status "sent" or "overdue"
2. Click "Herinnering versturen"
3. Select a template and send

### 3. Check Email Delivery

- **Mock**: Check console logs
- **Gmail**: Check your Gmail "Sent" folder
- **Resend**: Check Resend dashboard

## Troubleshooting

### Gmail: "Invalid credentials"
- Verify 2FA is enabled
- Generate a new app password
- Make sure you're using the app password, not your regular password
- Remove any spaces from the app password

### Gmail: "Less secure app access"
- This setting is deprecated - use App Passwords instead
- App Passwords require 2FA to be enabled

### Resend: "Failed to send email"
- Check API key is correct
- Verify the `from` email address
- Ensure recipient is verified (free tier limitation)

### Mock provider not logging
- Check console output
- Verify `EMAIL_PROVIDER=mock` in `.env.local`

## Switching Providers

You can easily switch between providers by changing the `EMAIL_PROVIDER` environment variable:

```bash
# Development/Testing
EMAIL_PROVIDER=mock           # Console logging only
EMAIL_PROVIDER=nodemailer     # Gmail SMTP

# Production
EMAIL_PROVIDER=resend         # Professional API
```

**Note**: Remember to restart the development server after changing environment variables!

## Security Best Practices

1. **Never commit `.env.local` to git** (already in `.gitignore`)
2. **Use app passwords** instead of your main Gmail password
3. **Rotate app passwords** periodically
4. **Use Resend** for production (better security and deliverability)
5. **Store API keys securely** in production environments

## Need Help?

- Gmail App Passwords: https://support.google.com/accounts/answer/185833
- Resend Docs: https://resend.com/docs
- Nodemailer Docs: https://nodemailer.com/
