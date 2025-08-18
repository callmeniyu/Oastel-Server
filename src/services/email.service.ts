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

export interface CartBookingEmailData {
  customerName: string;
  customerEmail: string;
  bookings: Array<{
    bookingId: string;
    packageId: string;
    packageName: string;
    packageType: 'tour' | 'transfer';
    from?: string;
    to?: string;
    date: string;
    time: string;
    adults: number;
    children: number;
    pickupLocation?: string;
    total: number;
  }>;
  totalAmount: number;
  currency: string;
}

export interface ReviewEmailData {
  customerName: string;
  customerEmail: string;
  bookingId: string;
  packageName: string;
  packageType: 'tour' | 'transfer';
  date: string;
  time: string;
  reviewFormUrl: string;
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
   * Send cart booking confirmation email
   */
  async sendCartBookingConfirmation(cartData: CartBookingEmailData): Promise<boolean> {
    try {
      // Validate required environment variables
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ Missing required email environment variables:');
        console.error('SMTP_USER:', process.env.SMTP_USER ? '✓ Set' : '✗ Missing');
        console.error('SMTP_PASS:', process.env.SMTP_PASS ? '✓ Set' : '✗ Missing');
        throw new Error('Missing SMTP credentials in environment variables');
      }

      // Test connection first
      await EmailService.transporter.verify();
      console.log('✅ SMTP connection verified successfully for cart booking');

      const html = this.generateCartBookingConfirmationHTML(cartData);
      
      const mailOptions = {
        from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
        to: cartData.customerEmail,
        subject: `🎉 Booking Confirmation - ${cartData.bookings.length} Bookings`,
        html,
      };

      await EmailService.transporter.sendMail(mailOptions);
      console.log(`Cart confirmation email sent to ${cartData.customerEmail} for ${cartData.bookings.length} bookings`);
      return true;
    } catch (error) {
      console.error('Error sending cart confirmation email:', error);
      return false;
    }
  }

  /**
   * Send review request email 12 hours after departure
   */
  async sendReviewRequest(reviewData: ReviewEmailData): Promise<boolean> {
    try {
      // Validate required environment variables
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ Missing required email environment variables for review email');
        throw new Error('Missing SMTP credentials in environment variables');
      }

      // Test connection first
      await EmailService.transporter.verify();
      console.log('✅ SMTP connection verified successfully for review email');

      const html = this.generateReviewRequestHTML(reviewData);
      
      const mailOptions = {
        from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
        to: reviewData.customerEmail,
        subject: `🌟 Thank you for choosing us! Share your experience`,
        html,
      };

      await EmailService.transporter.sendMail(mailOptions);
      console.log(`Review request email sent to ${reviewData.customerEmail} for booking ${reviewData.bookingId}`);
      return true;
    } catch (error) {
      console.error('Error sending review request email:', error);
      return false;
    }
  }

  /**
   * Generate modern HTML email template for booking confirmation
   */
  private generateBookingConfirmationHTML(booking: BookingEmailData): string {
    const formatDate = (dateString: string) => {
      try {
        if (!dateString) return "Invalid Date";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid Date";
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return "Invalid Date";
      }
    };

    const formatTime = (timeString: string) => {
      try {
        if (!timeString) return "Invalid Time";
        const [hours, minutes] = timeString.split(':');
        if (!hours || !minutes) return timeString;
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        if (isNaN(date.getTime())) return timeString;
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        return timeString;
      }
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
            .icon { width: 16px; height: 16px; display: inline-block; margin-right: 8px; vertical-align: text-top; }
            .success-icon { color: #22c55e; }
            .calendar-icon { color: #3b82f6; }
            .clock-icon { color: #8b5cf6; }
            .location-icon { color: #ef4444; }
            .users-icon { color: #f59e0b; }
            .price-icon { color: #10b981; }
            .info-icon { color: #0ea5e9; }
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
                    <h1>
                        <svg class="icon success-icon" style="width: 24px; height: 24px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        Booking Confirmed!
                    </h1>
                    <p>Your adventure awaits</p>
                </div>
            </div>

            <!-- Content -->
            <div class="content">
                <div class="greeting">
                    <svg class="icon users-icon" style="width: 18px; height: 18px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                    Hello ${booking.customerName}!
                </div>

                <p class="email-text">Thank you for choosing ${emailConfig.from.name}! We're excited to confirm your booking for an amazing experience.</p>

                <!-- Package header merged into booking details for tighter layout -->
                <div class="booking-details" style="padding-top: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                        <div>
                            <div style="font-size:18px; font-weight:700; color:#0C7157; margin-bottom:6px;">${booking.packageName}</div>
                            <div style="color:#666; font-size:13px;">Booking ID: <strong>#${booking.bookingId.slice(-8).toUpperCase()}</strong></div>
                        </div>
                        <div style="text-align:right;">
                            <div style="background: #0C7157; color: white; padding: 8px 12px; border-radius: 8px; display: inline-block; min-width: 100px;">
                                <div style="font-size:12px; opacity:0.9;">Amount</div>
                                <div style="font-size:18px; font-weight:700;">${booking.currency} ${booking.total.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:14px; background:#f9f9f9; padding:14px; border-radius:8px;">
                    <div class="detail-row">
                        <span class="detail-label">
                            <svg class="icon calendar-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                            </svg>
                            Date:
                        </span>
                        <span class="detail-value">${formatDate(booking.date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">
                            <svg class="icon clock-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                            </svg>
                            Time:
                        </span>
                        <span class="detail-value">${formatTime(booking.time)}</span>
                    </div>
                    ${booking.packageType === 'transfer' && booking.from && booking.to ? `
                    <div class="detail-row">
                        <span class="detail-label">
                            <svg class="icon location-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                            </svg>
                            From:
                        </span>
                        <span class="detail-value">${booking.from}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">
                            <svg class="icon location-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                            </svg>
                            To:
                        </span>
                        <span class="detail-value">${booking.to}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">
                            <svg class="icon users-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                            </svg>
                            Adults:
                        </span>
                        <span class="detail-value">${booking.adults}</span>
                    </div>
                    ${booking.children > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">
                            <svg class="icon users-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                            </svg>
                            Children:
                        </span>
                        <span class="detail-value">${booking.children}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">
                            <svg class="icon info-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                            </svg>
                            Type:
                        </span>
                        <span class="detail-value">${booking.packageType === 'tour' ? 'Tour Package' : 'Transfer Service'}</span>
                    </div>
                    ${booking.pickupLocation ? `
                    <div class="detail-row">
                        <span class="detail-label">
                            <svg class="icon location-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                            </svg>
                            Pickup:
                        </span>
                        <span class="detail-value">${booking.pickupLocation}</span>
                    </div>
                    ` : ''}
                    </div>
                    </div>
                    <div class="detail-row total-row" style="margin-top:18px;">
                        <span class="detail-label">
                            <svg class="icon price-icon" style="width: 20px; height: 20px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
                            </svg>
                            Total Amount:
                        </span>
                        <span class="detail-value">${booking.currency} ${booking.total.toFixed(2)}</span>
                    </div>
                </div>

                <div style="text-align: center; margin: 36px 0;">
                    <a href="${tourDetailsUrl}" class="detail-value">
                        <svg class="icon" style="width: 18px; height: 18px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                        </svg>
                        View ${booking.packageType === 'tour' ? 'Tour' : 'Transfer'}
                    </a>
                </div>

                <div class="info-box">
                    <h3>
                        <svg class="icon info-icon" style="width: 18px; height: 18px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                        </svg>
                        Important Information:
                    </h3>
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
                    Safe travels and see you soon!
                    <svg class="icon" style="width: 16px; height: 16px; margin-left: 8px;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
                    </svg>
                </p>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p><strong>${emailConfig.from.name}</strong></p>
                <p>Your trusted travel partner</p>
                <div class="social-links">
                    <a href="mailto:${emailConfig.templates.supportEmail}">
                        <svg class="icon" style="width: 16px; height: 16px; margin-right: 4px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                        </svg>
                        Email
                    </a>
                    <a href="tel:${emailConfig.templates.supportPhone}">
                        <svg class="icon" style="width: 16px; height: 16px; margin-right: 4px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                        </svg>
                        Call
                    </a>
                    <a href="${emailConfig.templates.website}">
                        <svg class="icon" style="width: 16px; height: 16px; margin-right: 4px;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd"/>
                        </svg>
                        Website
                    </a>
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

  /**
   * Generate modern HTML email template for cart booking confirmation
   */
  private generateCartBookingConfirmationHTML(cartData: CartBookingEmailData): string {
    const formatDate = (dateString: string) => {
      try {
        if (!dateString) return "Invalid Date";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid Date";
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return "Invalid Date";
      }
    };

    const formatTime = (timeString: string) => {
      try {
        if (!timeString) return "Invalid Time";
        const [hours, minutes] = timeString.split(':');
        if (!hours || !minutes) return timeString;
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        if (isNaN(date.getTime())) return timeString;
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        return timeString;
      }
    };

    const logoUrl = emailConfig.templates.logo;
    const bannerUrl = `${emailConfig.templates.website}/images/email-banner.jpg`;
    const baseUrl = emailConfig.templates.website;

    const totalBookings = cartData.bookings.length;
    const totalGuests = cartData.bookings.reduce((total, booking) => total + booking.adults + booking.children, 0);

    // Generate booking rows HTML
    const bookingRows = cartData.bookings.map((booking, index) => {
      const tourDetailsUrl = booking.packageType === 'tour' ? `${baseUrl}/tours/${booking.packageId}` : `${baseUrl}/transfers/${booking.packageId}`;
      
            // Use a compact table layout for more horizontal alignment in most mail clients
            const formattedDate = booking.date ? formatDate(booking.date) : 'Invalid Date';
            const formattedTime = booking.time ? formatTime(booking.time) : 'Invalid Time';
            const formattedTotal = typeof booking.total === 'number' ? booking.total.toFixed(2) : Number(booking.total || 0).toFixed(2);

            return `
                <div style="background: #f9f9f9; border-radius: 8px; padding: 12px; margin: 12px 0; border-left: 4px solid #0C7157;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: top; padding: 6px 8px;">
                                <div style="font-size: 16px; color: #0C7157; font-weight: 600;">Booking #${index + 1} - ${booking.packageName}</div>
                                <div style="color: #666; font-size: 13px; margin-top:6px;">Booking ID: <strong>#${String(booking.bookingId || '').slice(-8).toUpperCase()}</strong></div>
                            </td>
                            <td style="vertical-align: top; padding: 6px 8px; text-align: right; width: 160px;">
                                <div style="background: #0C7157; color: white; padding: 10px; border-radius: 8px; display: inline-block; min-width: 120px;">
                                    <div style="font-size: 12px; opacity: 0.9;">Amount</div>
                                    <div style="font-size: 18px; font-weight: 700;">${cartData.currency} ${formattedTotal}</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding-top: 10px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td style="width: 50%; padding: 6px 8px; vertical-align: top; color: #444; font-size: 13px;">
                                            <div><strong>Date:</strong> ${formattedDate}</div>
                                            <div style="margin-top:4px;"><strong>Time:</strong> ${formattedTime}</div>
                                            <div style="margin-top:4px;"><strong>Guests:</strong> ${booking.adults} adult${booking.adults > 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} child${booking.children > 1 ? 'ren' : ''}` : ''}</div>
                                        </td>
                                        <td style="width: 50%; padding: 6px 8px; vertical-align: top; color: #444; font-size: 13px;">
                                            ${booking.pickupLocation ? `<div><strong>Pickup:</strong> ${booking.pickupLocation}</div>` : ''}
                                            <div style="margin-top:6px;"><strong>Type:</strong> ${booking.packageType === 'tour' ? 'Tour' : 'Transfer'}</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </div>
            `;
     }).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cart Booking Confirmation</title>
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
            .summary-box { background: #e8f8f5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #0C7157; }
            /* Use inline-table/flex friendly layout for email clients on wide screens */
            .summary-grid { display: flex; flex-direction: row; justify-content: space-between; gap: 12px; text-align: center; }
            .summary-item { display: inline-block; min-width: 28%; }
            .summary-number { font-size: 28px; font-weight: 700; color: #0C7157; margin-bottom: 5px; font-family: 'Poppins', sans-serif; }
            .summary-label { font-size: 14px; color: #666; font-family: 'Poppins', sans-serif; }
            .total-row { background: #0C7157; color: #fff; margin: 25px -30px -30px -30px; padding: 25px 30px; border-radius: 0 0 12px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
            .total-row .detail-label { color: #fff; font-size: 18px; font-family: 'Poppins', sans-serif; }
            .total-row .detail-value { color: #fff; font-size: 24px; font-weight: 700; font-family: 'Poppins', sans-serif; }
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
            .icon { width: 16px; height: 16px; display: inline-block; margin-right: 8px; vertical-align: text-top; }
            @media (max-width: 600px) {
                .container { border-radius: 0; }
                .content { padding: 20px 15px; }
                .header-content { padding: 30px 15px; }
                .header h1 { font-size: 22px; }
                .text-logo { font-size: 24px; }
                .summary-grid { display: block; gap: 15px; }
                .summary-item { display: block; padding: 12px; background: #f9f9f9; border-radius: 8px; margin-bottom: 10px; }
                .total-row { font-size: 18px; padding: 20px 15px; margin: 25px -15px -15px -15px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="header-content">
                    <div class="text-logo">Oastel</div>
                    <h1>
                        <svg style="width: 24px; height: 24px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        Bookings Confirmed!
                    </h1>
                    <p>${totalBookings} booking${totalBookings > 1 ? 's' : ''} successfully booked</p>
                </div>
            </div>

            <!-- Content -->
            <div class="content">
                <div class="greeting">
                    <svg style="width: 18px; height: 18px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                    Hello ${cartData.customerName}!
                </div>

                <p class="email-text">Thank you for choosing ${emailConfig.from.name}! We're excited to confirm your ${totalBookings} booking${totalBookings > 1 ? 's' : ''} for amazing experiences.</p>

                <div class="summary-box">
                    <h2 style="color: #0C7157; margin-bottom: 20px; font-size: 20px; font-family: 'Poppins', sans-serif; font-weight: 600; text-align: center;">
                        <svg style="width: 20px; height: 20px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        Booking Summary
                    </h2>
                    
                    <div class="summary-grid" role="presentation">
                        <div class="summary-item" role="presentation">
                            <div class="summary-number">${totalBookings}</div>
                            <div class="summary-label">Total Bookings</div>
                        </div>
                        <div class="summary-item" role="presentation">
                            <div class="summary-number">${totalGuests}</div>
                            <div class="summary-label">Total Guests</div>
                        </div>
                        <div class="summary-item" role="presentation">
                            <div class="summary-number">${cartData.currency} ${cartData.totalAmount.toFixed(2)}</div>
                            <div class="summary-label">Total Amount</div>
                        </div>
                    </div>
                </div>

                <!-- Individual Bookings -->
                <h3 style="color: #0C7157; margin: 30px 0 20px 0; font-size: 18px; font-family: 'Poppins', sans-serif; font-weight: 600;">
                    Your Booking Details:
                </h3>
                
                ${bookingRows}

                <div class="total-row">
                    <span class="detail-label">
                        <svg style="width: 20px; height: 20px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
                        </svg>
                        Grand Total:
                    </span>
                    <span class="detail-value">${cartData.currency} ${cartData.totalAmount.toFixed(2)}</span>
                </div>

                <div class="info-box">
                    <h3>
                        <svg style="width: 18px; height: 18px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                        </svg>
                        Important Information:
                    </h3>
                    <ul>
                        <li>Please arrive 15 minutes before each scheduled time</li>
                        <li>Bring a valid ID and this confirmation email for each booking</li>
                        <li>Each booking may have different pickup locations and times</li>
                        <li>For any changes, contact us at least 24 hours in advance</li>
                        <li>Weather conditions may affect outdoor activities</li>
                    </ul>
                </div>

                <p class="email-text" style="margin-top: 30px; color: #444;">
                    If you have any questions or need to make changes to any of your bookings, please don't hesitate to contact us. We're here to make all your experiences unforgettable!
                </p>

                <p class="email-text" style="margin-top: 20px; color: #0C7157; font-weight: 600;">
                    Safe travels and see you soon!
                    <svg style="width: 16px; height: 16px; margin-left: 8px;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
                    </svg>
                </p>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p><strong>${emailConfig.from.name}</strong></p>
                <p>Your trusted travel partner</p>
                <div class="social-links">
                    <a href="mailto:${emailConfig.templates.supportEmail}">
                        <svg style="width: 16px; height: 16px; margin-right: 4px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                        </svg>
                        Email
                    </a>
                    <a href="tel:${emailConfig.templates.supportPhone}">
                        <svg style="width: 16px; height: 16px; margin-right: 4px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                        </svg>
                        Call
                    </a>
                    <a href="${emailConfig.templates.website}">
                        <svg style="width: 16px; height: 16px; margin-right: 4px;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd"/>
                        </svg>
                        Website
                    </a>
                </div>
                <p style="font-size: 12px; color: #bbb; margin-top: 20px; font-family: 'Poppins', sans-serif;">
                    This email was sent to ${cartData.customerEmail}<br>
                    © ${new Date().getFullYear()} ${emailConfig.from.name}. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate review request email HTML template
   */
  generateReviewRequestHTML(reviewData: ReviewEmailData): string {
    const formatDate = (dateString: string) => {
      try {
        if (!dateString) return "Invalid Date";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid Date";
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return "Invalid Date";
      }
    };

    const formatTime = (timeString: string) => {
      try {
        if (!timeString) return "Invalid Time";
        const [hours, minutes] = timeString.split(':');
        if (!hours || !minutes) return timeString;
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        if (isNaN(date.getTime())) return timeString;
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        return timeString;
      }
    };

    const logoUrl = emailConfig.templates.logo;
    const baseUrl = emailConfig.templates.website;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Share Your Experience</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Poppins', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #0C7157 0%, #0C7157 100%);
                color: white;
                text-align: center;
                padding: 40px 20px;
            }
            .logo {
                width: 120px;
                height: auto;
                margin-bottom: 20px;
            }
            .company-name {
                font-size: 28px;
                font-weight: 700;
                margin: 10px 0;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .tagline {
                font-size: 16px;
                opacity: 0.9;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .greeting {
                font-size: 24px;
                color: #0C7157;
                margin-bottom: 20px;
                font-weight: 600;
            }
            .message {
                font-size: 16px;
                margin-bottom: 30px;
                line-height: 1.8;
                color: #555;
            }
            .booking-summary {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-left: 4px solid #0C7157;
                padding: 20px;
                margin: 30px 0;
                border-radius: 8px;
            }
            .booking-summary h3 {
                color: #0C7157;
                margin-bottom: 15px;
                font-size: 18px;
                font-weight: 600;
            }
            .booking-detail {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 15px;
            }
            .booking-detail strong {
                color: #333;
                font-weight: 600;
            }
            .review-section {
                background: linear-gradient(135deg, #0C7157 0%, #0a5d4a 100%);
                color: white;
                padding: 30px;
                margin: 30px 0;
                border-radius: 12px;
                text-align: center;
            }
            .review-title {
                font-size: 22px;
                font-weight: 600;
                margin-bottom: 15px;
            }
            .review-description {
                font-size: 16px;
                margin-bottom: 25px;
                opacity: 0.9;
                line-height: 1.6;
            }
            .review-button {
                display: inline-block;
                background: white;
                color: #0C7157;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            .review-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }
            .stars {
                font-size: 24px;
                margin-bottom: 15px;
            }
            .footer {
                background-color: #f8f9fa;
                text-align: center;
                padding: 30px 20px;
                color: #666;
            }
            .footer p {
                margin-bottom: 10px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                margin: 0 10px;
                color: #0C7157;
                text-decoration: none;
                font-weight: 500;
                transition: color 0.3s ease;
            }
            .social-links a:hover {
                color: #0a5d4a;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 0;
                }
                .content {
                    padding: 20px;
                }
                .header {
                    padding: 30px 20px;
                }
                .company-name {
                    font-size: 24px;
                }
                .greeting {
                    font-size: 20px;
                }
                .booking-detail {
                    flex-direction: column;
                    gap: 5px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <img src="${logoUrl}" alt="Company Logo" class="logo">
                <div class="company-name">${emailConfig.from.name}</div>
                <div class="tagline">Your trusted travel partner</div>
            </div>

            <!-- Content -->
            <div class="content">
                <div class="greeting">
                    Thank you, ${reviewData.customerName}! 🙏
                </div>

                <div class="message">
                    We hope you had an amazing experience with our ${reviewData.packageType}! 
                    Your journey with us has come to an end, and we'd love to hear about your experience.
                </div>

                <div class="booking-summary">
                    <h3>📋 Your Booking Summary</h3>
                    <div class="booking-detail">
                        <span><strong>Booking ID:</strong></span>
                        <span>#${reviewData.bookingId}</span>
                    </div>
                    <div class="booking-detail">
                        <span><strong>Service:</strong></span>
                        <span>${reviewData.packageName}</span>
                    </div>
                    <div class="booking-detail">
                        <span><strong>Date:</strong></span>
                        <span>${formatDate(reviewData.date)}</span>
                    </div>
                    <div class="booking-detail">
                        <span><strong>Time:</strong></span>
                        <span>${formatTime(reviewData.time)}</span>
                    </div>
                </div>

                <div class="message">
                    Your feedback helps us improve our services and assists future travelers in making informed decisions. 
                    It only takes a few minutes and means the world to us! 🌟
                </div>

                <div class="review-section">
                    <div class="stars">⭐⭐⭐⭐⭐</div>
                    <div class="review-title">Share Your Experience</div>
                    <div class="review-description">
                        Click the button below to share your thoughts about our service. 
                        Your honest feedback is invaluable to us and other travelers!
                    </div>
                    <a href="${reviewData.reviewFormUrl}" class="review-button">
                        📝 Leave a Review
                    </a>
                </div>

                <div class="message">
                    Thank you for choosing ${emailConfig.from.name}. We look forward to serving you again soon! 
                    <br><br>
                    Warm regards,<br>
                    <strong>The ${emailConfig.from.name} Team</strong>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p><strong>${emailConfig.from.name}</strong></p>
                <p>Your trusted travel partner</p>
                <div class="social-links">
                    <a href="mailto:${emailConfig.templates.supportEmail}">
                        <svg style="width: 16px; height: 16px; margin-right: 4px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                        </svg>
                        Email
                    </a>
                    <a href="tel:${emailConfig.templates.supportPhone}">
                        <svg style="width: 16px; height: 16px; margin-right: 4px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                        </svg>
                        Call
                    </a>
                    <a href="${emailConfig.templates.website}">
                        <svg style="width: 16px; height: 16px; margin-right: 4px;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd"/>
                        </svg>
                        Website
                    </a>
                </div>
                <p style="font-size: 12px; color: #bbb; margin-top: 20px; font-family: 'Poppins', sans-serif;">
                    This email was sent to ${reviewData.customerEmail}<br>
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
