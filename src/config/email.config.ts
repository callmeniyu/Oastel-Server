export const emailConfig = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '', // your email
      pass: process.env.SMTP_PASS || '', // your email password or app password
    },
    tls: {
      rejectUnauthorized: false
    }
  },
  from: {
    name: process.env.FROM_NAME || 'Oastel Travel',
    email: process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@oastel.com',
  },
  templates: {
    logo: process.env.COMPANY_LOGO || 'https://your-domain.com/logo.png',
    website: process.env.COMPANY_WEBSITE || 'https://oastel.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@oastel.com',
    supportPhone: process.env.SUPPORT_PHONE || '+60 12-345 6789',
  }
};
