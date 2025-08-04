# Clerk Setup Instructions

After creating your Clerk application, follow these steps to complete the integration:

## 1. Update Environment Variables

Replace the placeholder values in your `.env` file with your actual Clerk keys:

```bash
# Get these from Clerk Dashboard > API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key
CLERK_SECRET_KEY=sk_test_your_actual_secret_key

# Keep these as-is
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# You'll get this after setting up webhooks
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 2. Enable Organizations

In your Clerk Dashboard:
1. Go to **Organizations** in the sidebar
2. **Enable Organizations** - This is crucial for multi-tenancy
3. Configure organization settings as needed

## 3. Create JWT Template for Supabase

1. Go to **JWT Templates** in Clerk Dashboard
2. Click **New Template**
3. **Template name**: `supabase`
4. **Claims**:
```json
{
  "aud": "authenticated",
  "exp": "{{date.now_plus_seconds(3600)}}",
  "iat": "{{date.now}}",
  "iss": "{{env.CLERK_JWT_ISSUER_DOMAIN}}",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "app_metadata": {
    "provider": "clerk",
    "tenant_id": "{{user.public_metadata.tenant_id}}",
    "role": "{{user.public_metadata.role}}"
  },
  "user_metadata": {
    "first_name": "{{user.first_name}}",
    "last_name": "{{user.last_name}}",
    "avatar_url": "{{user.image_url}}"
  }
}
```

## 4. Configure Webhooks

### For Development (Local Testing)

1. **Install ngrok** (if not already installed):
   ```bash
   # Using npm
   npm install -g ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start your Next.js development server**:
   ```bash
   npm run dev
   ```

3. **In a new terminal, expose your local server**:
   ```bash
   ngrok http 3001
   ```
   
   This will give you a public URL like: `https://abc123.ngrok.io`

4. **Configure webhook in Clerk Dashboard**:
   - Go to **Webhooks** in Clerk Dashboard
   - Click **Add Endpoint**
   - **Endpoint URL**: `https://abc123.ngrok.io/api/webhooks/clerk` (replace with your ngrok URL)
   - **Subscribe to events**:
     - ✅ `user.created`
     - ✅ `user.updated` 
     - ✅ `user.deleted`
     - ✅ `organization.created`
     - ✅ `organizationMembership.created`
     - ✅ `organizationMembership.updated`
     - ✅ `organizationMembership.deleted`

5. **Copy the Signing Secret**:
   - After creating the webhook, copy the **Signing Secret**
   - Update your `.env` file:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_your_actual_webhook_secret
   ```

6. **Restart your development server** to load the new environment variable

### For Production

1. **Deploy your application** to your hosting platform
2. **Add webhook endpoint**: `https://your-domain.com/api/webhooks/clerk`
3. **Use the same event subscriptions** as development
4. **Update production environment variables** with the webhook secret

### Testing Webhooks

1. **Create a test user** in your application
2. **Check your console logs** - you should see:
   ```
   User profile created successfully for: user_xxxxx
   ```
3. **Verify in Supabase** - check the `profiles` table for the new user
4. **Test organization creation** using the organization switcher
5. **Monitor webhook delivery** in Clerk Dashboard > Webhooks > View webhook

### Webhook Security

- **Always verify webhook signatures** (already implemented in the route handler)
- **Use HTTPS in production** for secure webhook delivery
- **Keep webhook secrets secure** and rotate them periodically
- **Monitor failed webhook attempts** in Clerk Dashboard

### Troubleshooting Webhooks

**Common Issues:**

1. **Webhook timeout (504)**:
   - Ensure your endpoint responds within 10 seconds
   - Check for database connection issues

2. **Invalid signature (400)**:
   - Verify `CLERK_WEBHOOK_SECRET` is correct
   - Ensure no extra whitespace in environment variable

3. **ngrok connection issues**:
   - Restart ngrok if tunnel expires
   - Update webhook URL in Clerk Dashboard with new ngrok URL

4. **Database errors**:
   - Check Supabase connection and credentials
   - Verify database tables exist (run migrations first)

**Debug Steps:**

1. **Check webhook logs** in Clerk Dashboard
2. **Monitor console output** in your development server
3. **Verify environment variables** are loaded correctly
4. **Test webhook manually** using tools like Postman or curl

## 5. Configure Allowed Redirect URLs

In **Paths** settings:
- **Sign-in URL**: `/sign-in`
- **Sign-up URL**: `/sign-up`
- **After sign-in URL**: `/dashboard`
- **After sign-up URL**: `/onboarding`

## 6. Basic Integration Testing

### Quick Verification Tests

1. **Start your development server**: `npm run dev`
2. **Navigate to**: `http://localhost:3001/sign-up`
3. **Create a test account** using an email address you can access (required for email verification)
4. **Complete email verification** by checking your inbox and entering the verification code
5. **Check your Supabase database** - you should see a new profile record
6. **Test organization creation** using the OrganizationSwitcher
7. **Access protected dashboard**: `http://localhost:3001/dashboard`

**Important**: Use your own email address for testing as Clerk requires email verification for new accounts.

### Manual Test Checklist

- [ ] User sign-up creates profile in Supabase
- [ ] User sign-in works and redirects to dashboard
- [ ] Dashboard shows user information correctly
- [ ] Organization switcher functions properly
- [ ] Role-based permissions work (buttons disabled/enabled)
- [ ] User profile updates sync between Clerk and Supabase
- [ ] Sign-out works and redirects appropriately

**Note**: For comprehensive testing (unit, integration, E2E), see **Task 10: Comprehensive Testing Strategy** in the project TO_DO.md. This includes the full testing suite with Vitest, React Testing Library, and Playwright as specified in the project requirements.

## 7. SSO Configuration (Optional)

### Supported SSO Providers

Clerk supports enterprise SSO providers for B2B applications:

- **SAML 2.0** - Enterprise SSO standard
- **Google Workspace** - Google OAuth for organizations
- **Microsoft Azure AD** - Microsoft enterprise accounts
- **Okta** - Enterprise identity provider
- **Custom OIDC** - Any OpenID Connect provider

### Setting Up SSO

#### 1. Enable SSO in Clerk Dashboard
1. Go to **User & Authentication** > **Social Connections**
2. Enable desired providers (Google, Microsoft, etc.)
3. For enterprise SAML, go to **SSO Connections**

#### 2. Configure OAuth Providers

**Google Workspace:**
```bash
# Add to .env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Microsoft Azure:**
```bash
# Add to .env  
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
```

#### 3. SAML Configuration

For enterprise customers, configure SAML in Clerk Dashboard:
1. **SSO Connections** > **Add Connection**
2. **Connection type**: SAML
3. **Provider**: Choose or add custom
4. **Configure metadata**: XML or manual configuration
5. **Attribute mapping**: Map SAML attributes to Clerk user fields

#### 4. Domain-based SSO Routing

Configure automatic SSO routing by email domain:
```typescript
// Optional: Custom domain routing logic
const getSSOprovider = (email: string) => {
  const domain = email.split('@')[1]
  
  switch (domain) {
    case 'company.com':
      return 'saml_company'
    case 'partner.org':
      return 'saml_partner'
    default:
      return null
  }
}
```

### Testing SSO

1. **Configure test accounts** in your SSO provider
2. **Test sign-in flow** with SSO credentials
3. **Verify user data mapping** in Supabase profiles table
4. **Test organization assignment** for SSO users

### SSO Security Considerations

- **Certificate validation** - Ensure SAML certificates are valid
- **Attribute mapping** - Map only necessary user attributes
- **Session management** - Configure appropriate session timeouts
- **JIT provisioning** - Just-in-time user creation from SSO
- **Domain verification** - Verify domain ownership for security

## 7. Production Considerations

### Security
- Ensure webhook endpoints are properly secured
- Use HTTPS in production
- Validate webhook signatures

### Environment Variables
- Update URLs for production domain
- Use production Clerk keys
- Configure production webhook endpoints

### Database
- Run all Supabase migrations in production
- Set up proper RLS policies
- Configure production database backups

## Troubleshooting

### Common Issues

1. **"Invalid JWT"**: Check that your JWT template is correctly configured
2. **Webhook failures**: Verify the webhook secret and endpoint URL
3. **RLS errors**: Ensure user profiles exist in Supabase before accessing protected data
4. **Organization not found**: Make sure organizations are enabled in Clerk

### Debug Steps

1. Check browser console for errors
2. Verify webhook delivery in Clerk Dashboard
3. Check server logs for authentication issues
4. Use React Query Devtools to inspect query state

## Next Steps

After completing setup:
1. Create an onboarding flow for new users
2. Implement tenant assignment logic
3. Add role-based access controls
4. Create organization management interface
5. Set up proper error handling and monitoring