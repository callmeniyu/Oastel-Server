import nodemailer from 'nodemailer';
import { emailConfig } from '../config/email.config';
import { Types } from 'mongoose';

export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  bookingId: string;
  packageId: string;
  packageName: string;
  packageType: 'tour' | 'transfer';
  // Transfer-specific details
  from?: string;
  to?: string;
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
    const baseUrl = emailConfig.templates.website;

    // Build tour details link
    const tourDetailsUrl = booking.packageType === 'tour' ? `${baseUrl}/tours/${booking.packageId}` : `${baseUrl}/transfers/${booking.packageId}`;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #222; background: #f6f6f6; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px rgba(12,113,87,0.08); }
            .header { background: linear-gradient(135deg, #0C7157, #0C7157); padding: 0; position: relative; overflow: hidden; }
            .header-content { position: relative; z-index: 2; padding: 40px 30px; text-align: center; color: white; }
            .text-logo { font-family: 'Poppins', sans-serif; font-weight: 500; font-size: 32px; margin-bottom: 20px; letter-spacing: 1px; color: white; }
            .header h1 { font-family: 'Poppins', sans-serif; font-size: 28px; font-weight: 600; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.18); }
            .header p { font-family: 'Poppins', sans-serif; font-size: 16px; opacity: 0.95; font-weight: 400; }
            .content { padding: 40px 30px; }
            .greeting { font-family: 'Poppins', sans-serif; font-size: 18px; color: #0C7157; margin-bottom: 20px; font-weight: 600; }
            .confirmation-box { background: #e8f8f5; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #0C7157; }
            .booking-details { background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-family: 'Poppins', sans-serif; font-weight: 500; color: #444; }
            .detail-value { font-family: 'Poppins', sans-serif; color: #0C7157; font-weight: 600; }
            .total-row { background: #0C7157; color: #fff; margin: 15px -20px -20px -20px; padding: 18px 20px; border-radius: 0 0 8px 8px; display: flex; justify-content: space-between; align-items: center; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
            .total-row .detail-label { color: #fff; font-size: 18px; }
            .total-row .detail-value { color: #fff; font-size: 22px; font-weight: 700; }
            .cta-button { display: inline-block; background: #0C7157; color: #fff; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-family: 'Poppins', sans-serif; font-weight: 600; margin: 24px 0; text-align: center; box-shadow: 0 4px 12px rgba(12, 113, 87, 0.18); transition: transform 0.2s; font-size: 18px; letter-spacing: 0.5px; }
            .cta-button:hover { transform: translateY(-2px); background: #0a5c47; }
            .footer { background: #222; color: #fff; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; }
            .footer a { color: #0C7157; text-decoration: none; }
            .footer p { font-family: 'Poppins', sans-serif; }
            .social-links { margin: 15px 0; }
            .social-links a { display: inline-block; margin: 0 10px; color: #0C7157; text-decoration: none; font-family: 'Poppins', sans-serif; }
            .info-box { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0; }
            .info-box h3 { font-family: 'Poppins', sans-serif; color: #8c7a00; margin-bottom: 10px; font-weight: 600; }
            .info-box ul { color: #8c7a00; padding-left: 20px; line-height: 1.8; font-family: 'Poppins', sans-serif; }
            .email-text { font-family: 'Poppins', sans-serif; }
            @media (max-width: 600px) {
                .container { border-radius: 0; }
                .content { padding: 20px 10px; }
                .header-content { padding: 30px 10px; }
                .header h1 { font-size: 22px; }
                .text-logo { font-size: 24px; }
                .detail-row { flex-direction: column; align-items: flex-start; gap: 5px; }
                .total-row { font-size: 18px; padding: 12px 10px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="header-content">
                    <div class="text-logo">Oastel</div>
                    <h1>🎉 Booking Confirmed!</h1>
                    <p>Your adventure awaits</p>
                </div>
            </div>

            <!-- Content -->
            <div class="content">
                <div class="greeting">
                    Hello ${booking.customerName}! 👋
                </div>

                <p class="email-text">Thank you for choosing ${emailConfig.from.name}! We're excited to confirm your booking for an amazing experience.</p>

                <div class="confirmation-box">
                    <h2 style="color: #0C7157; margin-bottom: 15px; font-size: 20px; font-family: 'Poppins', sans-serif; font-weight: 600;">
                        ✅ ${booking.packageName}
                    </h2>
                    <p style="color: #444; font-size: 14px; font-family: 'Poppins', sans-serif;">
                        Booking ID: <strong>#${booking.bookingId.slice(-8).toUpperCase()}</strong>
                    </p>
                </div>

                <div class="booking-details">
                    <div class="detail-row">
                        <span class="detail-label">📅 Date:</span>
                        <span class="detail-value">${formatDate(booking.date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🕐 Time:</span>
                        <span class="detail-value">${booking.time}</span>
                    </div>
                    ${booking.packageType === 'transfer' && booking.from && booking.to ? `
                    <div class="detail-row">
                        <span class="detail-label">🚗 From:</span>
                        <span class="detail-value">${booking.from}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🎯 To:</span>
                        <span class="detail-value">${booking.to}</span>
                    </div>
                    ` : ''}
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
                        <span class="detail-label">📍 Pickup:</span>
                        <span class="detail-value">${booking.pickupLocation}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row total-row">
                        <span class="detail-label">💰 Total Amount:</span>
                        <span class="detail-value">${booking.currency} ${booking.total.toFixed(2)}</span>
                    </div>
                </div>

                <div style="text-align: center; margin: 36px 0;">
                    <a href="${tourDetailsUrl}" class="cta-button">
                        🎫 View My Bookings
                    </a>
                </div>

                <div class="info-box">
                    <h3>📋 Important Information:</h3>
                    <ul>
                        <li>Please arrive 15 minutes before your scheduled time</li>
                        <li>Bring a valid ID and this confirmation email</li>
                        <li>For any changes, contact us at least 24 hours in advance</li>
                        <li>Weather conditions may affect outdoor activities</li>
                    </ul>
                </div>

                <p class="email-text" style="margin-top: 30px; color: #444;">
                    If you have any questions or need to make changes to your booking, please don't hesitate to contact us. We're here to make your experience unforgettable!
                </p>

                <p class="email-text" style="margin-top: 20px; color: #0C7157; font-weight: 600;">
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
                <p style="font-size: 12px; color: #bbb; margin-top: 20px; font-family: 'Poppins', sans-serif;">
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
