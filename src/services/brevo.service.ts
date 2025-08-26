import fetch from 'node-fetch';
import { emailConfig } from '../config/email.config';
import { BookingEmailData, CartBookingEmailData, ReviewEmailData } from './email.service';

export class BrevoEmailService {
  private static readonly API_URL = 'https://api.brevo.com/v3/smtp/email';
  private static readonly API_KEY = process.env.BREVO_API_KEY;

  /**
   * Send booking confirmation email via Brevo API
   */
  static async sendBookingConfirmation(booking: BookingEmailData): Promise<boolean> {
    try {
      if (!this.API_KEY) {
        console.error('❌ BREVO_API_KEY is not set in environment variables');
        return false;
      }

      console.log('📧 Sending booking confirmation via Brevo API...');
      console.log('To:', booking.customerEmail);
      console.log('Package:', booking.packageName);

      const html = this.generateBookingConfirmationHTML(booking);
      
      const payload = {
        sender: {
          name: emailConfig.from.name,
          email: emailConfig.from.email,
        },
        to: [{ email: booking.customerEmail }],
        subject: `🎉 Booking Confirmation - ${booking.packageName}`,
        htmlContent: html,
      };

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Brevo API error:', response.status, errorBody);
        return false;
      }

      const result = await response.json();
      console.log('✅ Booking confirmation email sent successfully via Brevo');
      console.log('Message ID:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending booking confirmation via Brevo:', error);
      return false;
    }
  }

  /**
   * Send cart booking confirmation email via Brevo API
   */
  static async sendCartBookingConfirmation(cartData: CartBookingEmailData): Promise<boolean> {
    try {
      if (!this.API_KEY) {
        console.error('❌ BREVO_API_KEY is not set in environment variables');
        return false;
      }

      console.log('📧 Sending cart booking confirmation via Brevo API...');
      console.log('To:', cartData.customerEmail);
      console.log('Bookings count:', cartData.bookings.length);

      const html = this.generateCartBookingConfirmationHTML(cartData);
      
      const payload = {
        sender: {
          name: emailConfig.from.name,
          email: emailConfig.from.email,
        },
        to: [{ email: cartData.customerEmail }],
        subject: `🎉 Booking Confirmation - ${cartData.bookings.length} Bookings`,
        htmlContent: html,
      };

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Brevo API error:', response.status, errorBody);
        return false;
      }

      const result = await response.json();
      console.log('✅ Cart booking confirmation email sent successfully via Brevo');
      console.log('Message ID:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending cart booking confirmation via Brevo:', error);
      return false;
    }
  }

  /**
   * Send review request email via Brevo API
   */
  static async sendReviewRequest(reviewData: ReviewEmailData): Promise<boolean> {
    try {
      if (!this.API_KEY) {
        console.error('❌ BREVO_API_KEY is not set in environment variables');
        return false;
      }

      console.log('📧 Sending review request via Brevo API...');
      console.log('To:', reviewData.customerEmail);

      const html = this.generateReviewRequestHTML(reviewData);
      
      const payload = {
        sender: {
          name: emailConfig.from.name,
          email: emailConfig.from.email,
        },
        to: [{ email: reviewData.customerEmail }],
        subject: `🌟 Thank you for choosing us! Share your experience`,
        htmlContent: html,
      };

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Brevo API error:', response.status, errorBody);
        return false;
      }

      const result = await response.json();
      console.log('✅ Review request email sent successfully via Brevo');
      console.log('Message ID:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending review request via Brevo:', error);
      return false;
    }
  }

  /**
   * Send a test email to verify Brevo configuration
   */
  static async sendTestEmail(toEmail: string): Promise<boolean> {
    try {
      if (!this.API_KEY) {
        console.error('❌ BREVO_API_KEY is not set in environment variables');
        return false;
      }

      console.log('📧 Sending test email via Brevo API to:', toEmail);

      const payload = {
        sender: {
          name: emailConfig.from.name,
          email: emailConfig.from.email,
        },
        to: [{ email: toEmail }],
        subject: '✅ Brevo Email Test - Configuration Successful',
        htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Test</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #0C7157; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✅ Email Configuration Test</h1>
            <p style="margin: 10px 0 0 0;">Brevo API integration is working!</p>
          </div>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #0C7157; margin-top: 0;">Test Results:</h2>
            <ul style="background: white; padding: 20px; border-radius: 6px; margin: 15px 0;">
              <li><strong>✓ Brevo API Connection:</strong> Successful</li>
              <li><strong>✓ Email Delivery:</strong> Working</li>
              <li><strong>✓ HTML Content:</strong> Rendering properly</li>
              <li><strong>✓ Sender Configuration:</strong> ${emailConfig.from.name} &lt;${emailConfig.from.email}&gt;</li>
            </ul>
            <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin-top: 20px; padding: 15px; background: #e8f8f5; border-left: 4px solid #0C7157; border-radius: 4px;">
              <strong>✅ Your booking confirmation emails will now be delivered successfully!</strong><br>
              The SMTP port blocking issue has been resolved using Brevo's HTTP API.
            </p>
          </div>
        </body>
        </html>
        `,
      };

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Brevo API error:', response.status, errorBody);
        return false;
      }

      const result = await response.json();
      console.log('✅ Test email sent successfully via Brevo');
      console.log('Message ID:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending test email via Brevo:', error);
      return false;
    }
  }

  /**
   * Generate booking confirmation HTML - reusing the existing template
   */
  private static generateBookingConfirmationHTML(booking: BookingEmailData): string {
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

    const baseUrl = emailConfig.templates.website;
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
            /* Booking details improvements */
            .booking-details { background: #ffffff; border-radius: 10px; padding: 0; margin: 20px 0; border: 1px solid #e6e9eb; overflow: hidden; }
            .booking-header { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:18px 20px; background: linear-gradient(90deg, rgba(12,113,87,0.03), rgba(12,113,87,0.02)); }
            .booking-header-left { flex:1; }
            .package-title { font-size:18px; font-weight:700; color:#0C7157; margin-bottom:6px; }
            .booking-ref { color:#6b7280; font-size:13px; }
            .amount-badge { text-align:right; min-width:130px; }
            .amount-badge .label { font-size:12px; color:rgba(255,255,255,0.9); text-transform:uppercase; letter-spacing:0.6px; }
            .amount-badge .amount { font-size:20px; font-weight:800; color:#0C7157; background: #e8faf5; padding:10px 12px; border-radius:8px; display:inline-block; }
            .booking-footer { padding: 12px 20px 20px; display:flex; justify-content:flex-end; align-items:center; }
            .booking-footer .paid { font-size:12px; color:#6b7280; margin-right:12px; }
            .booking-footer .total { font-size:20px; font-weight:800; color:#0C7157; }
            .booking-body { padding: 16px 20px 20px 20px; background: #f9fafb; }
            /* make each detail row span full width so label is left and value is right */
            /* Use table layout for maximum email-client compatibility */
            .details-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .details-table td.label { width: 48%; padding: 8px 0; font-family: 'Poppins', sans-serif; font-weight: 600; color: #374151; font-size:13px; vertical-align: top; }
            .details-table td.value { width: 52%; padding: 8px 0; font-family: 'Poppins', sans-serif; color: #0C7157; font-weight: 700; font-size:13px; text-align: right; vertical-align: top; }
            .details-table tr + tr td { border-top: 1px solid #eef2f4; }
            .total-row { background: #0C7157; color: #fff; margin: 15px -20px -20px -20px; padding: 18px 20px; border-radius: 0 0 8px 8px; display: flex; justify-content: space-between; align-items: center; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
            .info-box { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0; }
            .footer { background: #222; color: #fff; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; }
            .footer a { color: #0C7157; text-decoration: none; }
            .email-text { font-family: 'Poppins', sans-serif; }
            @media (max-width: 600px) {
                .container { border-radius: 0; }
                .content { padding: 20px 10px; }
                .header-content { padding: 30px 10px; }
                .detail-row { flex-direction: column; align-items: flex-start; gap: 5px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-content">
                    <div class="text-logo">Oastel</div>
                    <h1>✅ Booking Confirmed!</h1>
                    <p>Your adventure awaits</p>
                </div>
            </div>

            <div class="content">
                <div class="greeting">Hello ${booking.customerName}!</div>
                <p class="email-text">Thank you for choosing ${emailConfig.from.name}! We're excited to confirm your booking for an amazing experience.</p>

        <div class="booking-details">
          <div class="booking-header">
            <div class="booking-header-left">
              <div class="package-title">${booking.packageName}</div>
              <div class="booking-ref">Booking ID: <strong>#${booking.bookingId.slice(-8).toUpperCase()}</strong></div>
            </div>
          </div>
            <div class="booking-body">
            <table class="details-table" role="presentation">
              <tr>
                <td class="label">Customer</td>
                <td class="value">${booking.customerName}</td>
              </tr>
              <tr>
                <td class="label">Date</td>
                <td class="value">${formatDate(booking.date)}</td>
              </tr>
              <tr>
                <td class="label">Time</td>
                <td class="value">${formatTime(booking.time)}</td>
              </tr>
              ${booking.packageType === 'transfer' && booking.from && booking.to ? `
              <tr>
                <td class="label">From</td>
                <td class="value">${booking.from}</td>
              </tr>
              <tr>
                <td class="label">To</td>
                <td class="value">${booking.to}</td>
              </tr>
              ` : ''}
              <tr>
                <td class="label">Adults</td>
                <td class="value">${booking.adults}</td>
              </tr>
              ${booking.children > 0 ? `
              <tr>
                <td class="label">Children</td>
                <td class="value">${booking.children}</td>
              </tr>
              <tr>
                <td class="label" style="font-size:12px; color:#6b7280; font-weight:600; font-family: 'Poppins', sans-serif;">Age between 3 to 7 years</td>
                <td class="value"></td>
              </tr>
              ` : ''}
              <tr>
                <td class="label">Service Type</td>
                <td class="value">${booking.packageType === 'tour' ? 'Tour Package' : 'Transfer Service'}</td>
              </tr>
              ${booking.pickupLocation ? `
              <tr>
                <td class="label">Pickup</td>
                <td class="value">${booking.pickupLocation}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          <div class="booking-footer">
            <div class="paid">Paid online</div>
            <div class="total">${booking.currency} ${booking.total.toFixed(2)}</div>
          </div>
        </div>

        <div class="info-box">
          <h3 style="color: #8c7a00; margin-bottom: 10px; font-weight: 600;">Important Information:</h3>
          <ul style="color: #8c7a00; padding-left: 20px; line-height: 1.8;">
            <li>Be ready at your hotel's main gate 5 minutes before pick-up.</li>
            <li>No child seats are available. Children must always be with an adult.</li>
            <li>Pick-up times and locations may vary for each booking.</li>
            <li>Cancellation Policy:
              <ul style="margin-top:8px; padding-left:18px;">
                <li>Cancel at least 72 hours in advance for a full refund.</li>
                <li>No refund, cancellation, or date change within 72 hours.</li>
              </ul>
            </li>
            <li>Bring enough cash for entrance fees and food.</li>
            <li>Luggage and large backpacks cannot be brought on the tour.</li>
            <li>Views depend on the weather and cannot be guaranteed.</li>
          </ul>
        </div>

                <p class="email-text" style="margin-top: 30px; color: #444;">
                    If you have any questions please don't hesitate to contact us. We're here to make your experience unforgettable!
                </p>

                <p class="email-text" style="margin-top: 20px; color: #0C7157; font-weight: 600;">
                    Safe travels and see you soon!
                </p>
            </div>

            <div class="footer">
                <p><strong>${emailConfig.from.name}</strong></p>
                <p>Your trusted travel partner</p>
                <div style="margin: 15px 0;">
                    <a href="mailto:${emailConfig.templates.supportEmail}">Email</a> |
                    <a href="http://wa.me/60196592141">Call</a> |
                    <a href="${emailConfig.templates.website}">Website</a>
                </div>
                <p style="font-size: 12px; color: #bbb; margin-top: 20px;">
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
   * Generate cart booking confirmation HTML - simplified version of the existing template
   */
  private static generateCartBookingConfirmationHTML(cartData: CartBookingEmailData): string {
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

    const totalBookings = cartData.bookings.length;
    const totalGuests = cartData.bookings.reduce((total, booking) => total + booking.adults + booking.children, 0);

    const bookingRows = cartData.bookings.map((booking, index) => {
      const formattedDate = booking.date ? formatDate(booking.date) : 'Invalid Date';
      const formattedTime = booking.time ? formatTime(booking.time) : 'Invalid Time';
      const formattedTotal = typeof booking.total === 'number' ? booking.total.toFixed(2) : Number(booking.total || 0).toFixed(2);

      return `
        <div style="background: #f9f9f9; border-radius: 8px; padding: 15px; margin: 15px 0; border-left: 4px solid #0C7157;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <div style="font-size: 16px; color: #0C7157; font-weight: 600;">Booking #${index + 1} - ${booking.packageName}</div>
              <div style="color: #666; font-size: 13px;">ID: #${String(booking.bookingId || '').slice(-8).toUpperCase()}</div>
            </div>
            <div style="background: #0C7157; color: white; padding: 8px 12px; border-radius: 6px;">
              <div style="font-size: 16px; font-weight: 700;">${cartData.currency} ${formattedTotal}</div>
            </div>
          </div>
          <div style="color: #444; font-size: 14px;">
            <div><strong>Date:</strong> ${formattedDate}</div>
            <div><strong>Time:</strong> ${formattedTime}</div>
            <div><strong>Guests:</strong> ${booking.adults} adult${booking.adults > 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} child${booking.children > 1 ? 'ren' : ''}` : ''}</div>
            ${booking.pickupLocation ? `<div><strong>Pickup:</strong> ${booking.pickupLocation}</div>` : ''}
          </div>
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
            body { font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #222; background: #f6f6f6; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px rgba(12,113,87,0.08); }
            .header { background: linear-gradient(135deg, #0C7157, #0C7157); padding: 40px 30px; text-align: center; color: white; border-radius: 12px 12px 0 0; }
            .text-logo { font-size: 32px; font-weight: 500; margin-bottom: 20px; letter-spacing: 1px; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 18px; color: #0C7157; margin-bottom: 20px; font-weight: 600; }
            .summary-box { background: #e8f8f5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #0C7157; }
            .summary-grid { display: flex; justify-content: space-between; text-align: center; }
            .summary-item { flex: 1; }
            .summary-number { font-size: 28px; font-weight: 700; color: #0C7157; margin-bottom: 5px; }
            .summary-label { font-size: 14px; color: #666; }
            .total-row { background: #0C7157; color: #fff; margin: 25px -30px -30px -30px; padding: 25px 30px; border-radius: 0 0 12px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 20px; font-weight: 700; }
            .footer { background: #222; color: #fff; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; }
            .footer a { color: #0C7157; text-decoration: none; }
            @media (max-width: 600px) {
                .container { border-radius: 0; }
                .content { padding: 20px 15px; }
                .header { padding: 30px 15px; }
                .summary-grid { flex-direction: column; gap: 15px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="text-logo">Oastel</div>
                <h1 style="font-size: 28px; font-weight: 600; margin-bottom: 10px;">✅ Multiple Bookings Confirmed!</h1>
                <p style="font-size: 16px; opacity: 0.95;">Your adventures await</p>
            </div>

            <div class="content">
                <div class="greeting">Hello ${cartData.customerName}!</div>
                <p>Thank you for choosing ${emailConfig.from.name}! We're excited to confirm your ${totalBookings} booking${totalBookings > 1 ? 's' : ''} for amazing experiences.</p>

                <div class="summary-box">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-number">${totalBookings}</div>
                            <div class="summary-label">Booking${totalBookings > 1 ? 's' : ''}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-number">${totalGuests}</div>
                            <div class="summary-label">Total Guest${totalGuests > 1 ? 's' : ''}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-number">${cartData.currency} ${cartData.totalAmount.toFixed(2)}</div>
                            <div class="summary-label">Total Amount</div>
                        </div>
                    </div>
                </div>

                <h3 style="color: #0C7157; margin: 30px 0 15px 0;">Your Bookings:</h3>
                ${bookingRows}

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #8c7a00; margin-bottom: 10px;">Important Information:</h3>
          <ul style="color: #8c7a00; padding-left: 20px; line-height: 1.8;">
            <li>Be ready at your hotel's main gate 5 minutes before pick-up.</li>
            <li>No child seats are available. Children must always be with an adult.</li>
            <li>Pick-up times and locations may vary for each booking.</li>
            <li>Cancellation Policy:
              <ul style="margin-top:8px; padding-left:18px;">
                <li>Cancel at least 72 hours in advance for a full refund.</li>
                <li>No refund, cancellation, or date change within 72 hours.</li>
              </ul>
            </li>
            <li>Bring enough cash for entrance fees and food.</li>
            <li>Luggage and large backpacks cannot be brought on the tour.</li>
            <li>Views depend on the weather and cannot be guaranteed.</li>
          </ul>
        </div>

                <p style="margin-top: 30px; color: #444;">
                    If you have any questions please don't hesitate to contact us. We're here to make your experience unforgettable!
                </p>

                <p style="margin-top: 20px; color: #0C7157; font-weight: 600;">
                    Safe travels and see you soon!
                </p>
            </div>

            <div class="total-row">
                <span>Total Amount:</span>
                <span>${cartData.currency} ${cartData.totalAmount.toFixed(2)}</span>
            </div>

            <div class="footer">
                <p><strong>${emailConfig.from.name}</strong></p>
                <p>Your trusted travel partner</p>
                <div style="margin: 15px 0;">
                    <a href="mailto:${emailConfig.templates.supportEmail}">Email</a> |
                    <a href="tel:${emailConfig.templates.supportPhone}">Call</a> |
                    <a href="${emailConfig.templates.website}">Website</a>
                </div>
                <p style="font-size: 12px; color: #bbb; margin-top: 20px;">
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
   * Generate review request HTML - simplified version
   */
  private static generateReviewRequestHTML(reviewData: ReviewEmailData): string {
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

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Share Your Experience</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #222; background: #f6f6f6; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px rgba(12,113,87,0.08); }
            .header { background: linear-gradient(135deg, #0C7157, #0C7157); padding: 40px 30px; text-align: center; color: white; border-radius: 12px 12px 0 0; }
            .content { padding: 40px 30px; }
            .cta-button { display: inline-block; background: #0C7157; color: #fff; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: 600; margin: 24px 0; text-align: center; font-size: 18px; }
            .footer { background: #222; color: #fff; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div style="font-size: 32px; font-weight: 500; margin-bottom: 20px;">Oastel</div>
                <h1 style="font-size: 28px; margin-bottom: 10px;">🌟 How was your experience?</h1>
                <p>We'd love to hear from you!</p>
            </div>

            <div class="content">
                <div style="font-size: 18px; color: #0C7157; margin-bottom: 20px; font-weight: 600;">Hello ${reviewData.customerName}!</div>
                
                <p>Thank you for choosing ${emailConfig.from.name} for your recent ${reviewData.packageType === 'tour' ? 'tour' : 'transfer'}: <strong>${reviewData.packageName}</strong> on ${formatDate(reviewData.date)}.</p>

                <p style="margin-top: 20px;">Your feedback helps us improve our services and helps other travelers make informed decisions. Would you mind taking a few minutes to share your experience?</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${reviewData.reviewFormUrl}" class="cta-button">Share Your Review</a>
                </div>

                <div style="background: #e8f8f5; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #0C7157; margin-bottom: 10px;">Booking Details:</h3>
                    <p><strong>Service:</strong> ${reviewData.packageName}</p>
                    <p><strong>Date:</strong> ${formatDate(reviewData.date)}</p>
                    <p><strong>Booking ID:</strong> #${reviewData.bookingId.slice(-8).toUpperCase()}</p>
                </div>

                <p style="margin-top: 20px;">Thank you for being a valued customer. We look forward to serving you again!</p>
            </div>

            <div class="footer">
                <p><strong>${emailConfig.from.name}</strong></p>
                <p>Your trusted travel partner</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}
