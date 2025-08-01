import nodemailer from 'nodemailer';
import { emailConfig } from '../config/email.config';
import { Types } from 'mongoose';

export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  bookingId: string;
  packageName: string;
  packageType: 'tour' | 'transfer';
  date: string;
  time: string;
  adults: number;
  children: number;
  pickupLocation?: string;
  total: number;
  currency: string;
}

export class EmailService {
  private static transporter = nodemailer.createTransport(emailConfig.smtp);

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(booking: BookingEmailData): Promise<boolean> {
    try {
      // Validate required environment variables
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ Missing required email environment variables:');
        console.error('SMTP_USER:', process.env.SMTP_USER ? '✓ Set' : '✗ Missing');
        console.error('SMTP_PASS:', process.env.SMTP_PASS ? '✓ Set' : '✗ Missing');
        throw new Error('Missing SMTP credentials in environment variables');
      }

      // Debug: Log configuration (without password)
      console.log('📧 Email Configuration Check:');
      console.log('SMTP Host:', emailConfig.smtp.host);
      console.log('SMTP Port:', emailConfig.smtp.port);
      console.log('SMTP Secure:', emailConfig.smtp.secure);
      console.log('SMTP User:', emailConfig.smtp.auth.user);
      console.log('SMTP Pass Length:', emailConfig.smtp.auth.pass ? emailConfig.smtp.auth.pass.length : 0);
      console.log('From Email:', emailConfig.from.email);

      // Test connection first
      await EmailService.transporter.verify();
      console.log('✅ SMTP connection verified successfully');

      const html = this.generateBookingConfirmationHTML(booking);
      
      const mailOptions = {
        from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
        to: booking.customerEmail,
        subject: `🎉 Booking Confirmation - ${booking.packageName}`,
        html,
      };

      await EmailService.transporter.sendMail(mailOptions);
      console.log(`Confirmation email sent to ${booking.customerEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return false;
    }
  }

  /**
   * Generate modern HTML email template for booking confirmation
   */
  private generateBookingConfirmationHTML(booking: BookingEmailData): string {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const logoUrl = emailConfig.templates.logo;
    const bannerUrl = `${emailConfig.templates.website}/images/email-banner.jpg`;
    const packageImageUrl = `${emailConfig.templates.website}/images/default-${booking.packageType}.jpg`;
    const baseUrl = emailConfig.templates.website;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #2e7d32, #4caf50); padding: 0; position: relative; overflow: hidden; }
            .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('${bannerUrl}') center/cover; opacity: 0.3; }
            .header-content { position: relative; z-index: 2; padding: 40px 30px; text-align: center; color: white; }
            .logo { max-width: 150px; margin-bottom: 20px; }
            .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
            .header p { font-size: 16px; opacity: 0.95; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 18px; color: #2e7d32; margin-bottom: 20px; font-weight: 600; }
            .confirmation-box { background: linear-gradient(135deg, #e8f5e8, #f1f8e9); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #4caf50; }
            .package-image { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin: 20px 0; }
            .booking-details { background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: 600; color: #555; }
            .detail-value { color: #2e7d32; font-weight: 600; }
            .total-row { background: #2e7d32; color: white; margin: 15px -20px -20px -20px; padding: 15px 20px; border-radius: 0 0 8px 8px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #2e7d32, #4caf50); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; margin: 20px 0; text-align: center; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3); transition: transform 0.2s; }
            .cta-button:hover { transform: translateY(-2px); }
            .footer { background: #2e2e2e; color: #ffffff; padding: 30px; text-align: center; }
            .footer a { color: #4caf50; text-decoration: none; }
            .social-links { margin: 15px 0; }
            .social-links a { display: inline-block; margin: 0 10px; color: #4caf50; text-decoration: none; }
            @media (max-width: 600px) {
                .content { padding: 20px 15px; }
                .header-content { padding: 30px 15px; }
                .header h1 { font-size: 24px; }
                .detail-row { flex-direction: column; align-items: flex-start; gap: 5px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="header-content">
                    <img src="${logoUrl}" alt="Oastel Tours" class="logo">
                    <h1>🎉 Booking Confirmed!</h1>
                    <p>Your adventure awaits</p>
                </div>
            </div>

            <!-- Content -->
            <div class="content">
                <div class="greeting">
                    Hello ${booking.customerName}! 👋
                </div>

                <p>Thank you for choosing ${emailConfig.from.name}! We're excited to confirm your booking for an amazing experience.</p>

                <div class="confirmation-box">
                    <h2 style="color: #2e7d32; margin-bottom: 15px; font-size: 20px;">
                        ✅ ${booking.packageName}
                    </h2>
                    <p style="color: #666; font-size: 14px;">
                        Booking ID: <strong>#${booking.bookingId.slice(-8).toUpperCase()}</strong>
                    </p>
                </div>

                <img src="${packageImageUrl}" alt="${booking.packageName}" class="package-image">

                <div class="booking-details">
                    <div class="detail-row">
                        <span class="detail-label">📅 Date:</span>
                        <span class="detail-value">${formatDate(booking.date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🕐 Time:</span>
                        <span class="detail-value">${booking.time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">👥 Adults:</span>
                        <span class="detail-value">${booking.adults}</span>
                    </div>
                    ${booking.children > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">👶 Children:</span>
                        <span class="detail-value">${booking.children}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">🎯 Type:</span>
                        <span class="detail-value">${booking.packageType === 'tour' ? 'Tour Package' : 'Transfer Service'}</span>
                    </div>
                    ${booking.pickupLocation ? `
                    <div class="detail-row">
                        <span class="detail-label">� Pickup:</span>
                        <span class="detail-value">${booking.pickupLocation}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row total-row">
                        <span class="detail-label">💰 Total Amount:</span>
                        <span class="detail-value" style="color: white; font-size: 18px;">${booking.currency} ${booking.total.toFixed(2)}</span>
                    </div>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${baseUrl}/profile/bookings" class="cta-button">
                        🎫 View My Bookings
                    </a>
                </div>

                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #8c7a00; margin-bottom: 10px;">📋 Important Information:</h3>
                    <ul style="color: #8c7a00; padding-left: 20px; line-height: 1.8;">
                        <li>Please arrive 15 minutes before your scheduled time</li>
                        <li>Bring a valid ID and this confirmation email</li>
                        <li>For any changes, contact us at least 24 hours in advance</li>
                        <li>Weather conditions may affect outdoor activities</li>
                    </ul>
                </div>

                <p style="margin-top: 30px; color: #666;">
                    If you have any questions or need to make changes to your booking, please don't hesitate to contact us. We're here to make your experience unforgettable!
                </p>

                <p style="margin-top: 20px; color: #2e7d32; font-weight: 600;">
                    Safe travels and see you soon! 🌟
                </p>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p><strong>${emailConfig.from.name}</strong></p>
                <p>Your trusted travel partner</p>
                
                <div class="social-links">
                    <a href="mailto:${emailConfig.templates.supportEmail}">✉️ Email</a>
                    <a href="tel:${emailConfig.templates.supportPhone}">📞 Call</a>
                    <a href="${emailConfig.templates.website}">🌐 Website</a>
                </div>
                
                <p style="font-size: 12px; color: #999; margin-top: 20px;">
                    This email was sent to ${booking.customerEmail}<br>
                    © ${new Date().getFullYear()} ${emailConfig.from.name}. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

export default new EmailService();
