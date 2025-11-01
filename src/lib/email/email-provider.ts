/**
 * Email Provider Abstraction Layer
 * Supports multiple email providers (Resend, Nodemailer/Gmail, etc.)
 */

import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

// Email send parameters
export interface EmailParams {
  to: string
  subject: string
  body: string
  html?: string
  from?: string
  replyTo?: string
  cc?: string
}

// Email send result
export interface EmailResult {
  id: string
  success: boolean
  error?: string
}

// Email provider interface
export interface EmailProvider {
  send(params: EmailParams): Promise<EmailResult>
}

/**
 * Resend email provider
 */
class ResendProvider implements EmailProvider {
  private client: Resend

  constructor(apiKey: string) {
    this.client = new Resend(apiKey)
  }

  async send(params: EmailParams): Promise<EmailResult> {
    try {
      const { to, subject, body, html, from, replyTo, cc } = params
      const fromAddress = from || process.env.RESEND_FROM_EMAIL || 'noreply@example.com'

      const response = await this.client.emails.send({
        from: fromAddress,
        to,
        subject,
        html: html || this.convertPlainTextToHTML(body),
        text: body,
        ...(replyTo && { replyTo }),
        ...(cc && { cc })
      })

      if ('id' in response && response.id) {
        return {
          id: response.id,
          success: true
        }
      } else if ('error' in response && response.error) {
        return {
          id: '',
          success: false,
          error: response.error.message
        }
      }

      return {
        id: '',
        success: false,
        error: 'Unknown error occurred'
      }
    } catch (error) {
      console.error('Resend error:', error)
      return {
        id: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      }
    }
  }

  private convertPlainTextToHTML(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const paragraphs = escaped
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
      .join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            p {
              margin: 0 0 16px;
            }
            strong {
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          ${paragraphs}
        </body>
      </html>
    `
  }
}

/**
 * Nodemailer (Gmail SMTP) email provider
 */
class NodemailerProvider implements EmailProvider {
  private transporter: Transporter

  constructor(config: { user: string; pass: string }) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: config.pass
      }
    })
  }

  async send(params: EmailParams): Promise<EmailResult> {
    try {
      const { to, subject, body, html, from, replyTo, cc } = params
      const fromAddress = from || params.from || process.env.GMAIL_USER || 'noreply@example.com'

      const info = await this.transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: body,
        html: html || this.convertPlainTextToHTML(body),
        ...(replyTo && { replyTo }),
        ...(cc && { cc })
      })

      return {
        id: info.messageId,
        success: true
      }
    } catch (error) {
      console.error('Nodemailer error:', error)
      return {
        id: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      }
    }
  }

  private convertPlainTextToHTML(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const paragraphs = escaped
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
      .join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            p {
              margin: 0 0 16px;
            }
            strong {
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          ${paragraphs}
        </body>
      </html>
    `
  }
}

/**
 * Console/Mock email provider (for testing/development)
 */
class MockEmailProvider implements EmailProvider {
  async send(params: EmailParams): Promise<EmailResult> {
    console.log('📧 [MOCK EMAIL]')
    console.log('From:', params.from || 'default@example.com')
    console.log('To:', params.to)
    console.log('Subject:', params.subject)
    console.log('Body:', params.body)
    if (params.cc) console.log('CC:', params.cc)
    if (params.replyTo) console.log('Reply-To:', params.replyTo)
    console.log('---')

    return {
      id: `mock-${Date.now()}`,
      success: true
    }
  }
}

/**
 * Get the configured email provider
 */
export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'mock'

  switch (provider.toLowerCase()) {
    case 'resend':
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is required when using Resend provider')
      }
      return new ResendProvider(process.env.RESEND_API_KEY)

    case 'nodemailer':
    case 'gmail':
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD are required when using Nodemailer provider')
      }
      return new NodemailerProvider({
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      })

    case 'mock':
    case 'console':
      return new MockEmailProvider()

    default:
      console.warn(`Unknown email provider: ${provider}. Falling back to mock provider.`)
      return new MockEmailProvider()
  }
}
