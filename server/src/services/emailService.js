import nodemailer from 'nodemailer';

/**
 * Configure Nodemailer Transporter with Gmail SMTP
 */
const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  // Gmail app passwords can be provided with or without spaces
  const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  if (!user || !pass) {
    console.warn('⚠️ [EmailService] EMAIL_USER or EMAIL_PASS is not configured in .env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Send an OTP verification email for account registration
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit OTP string
 * @param {string} name - Optional recipient name
 * @returns {Promise<object>} Send mail response
 */
export const sendOtpEmail = async (to, otp, name = '') => {
  const transporter = getTransporter();
  const senderEmail = process.env.EMAIL_USER || 'phainon33m5@gmail.com';

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TechShare Verification Code</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;">
            
            <!-- HEADER -->
            <tr>
              <td style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">
                  TechShare
                </h1>
                <p style="margin: 6px 0 0 0; color: #DBEAFE; font-size: 13px; font-weight: 500;">
                  Peer-to-Peer Tech Sharing & Rental Platform
                </p>
              </td>
            </tr>

            <!-- BODY CONTENT -->
            <tr>
              <td style="padding: 32px 28px;">
                <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 18px; font-weight: 700;">
                  Account Registration Verification${name ? `, ${name}` : ''}
                </h2>
                <p style="margin: 0 0 20px 0; color: #64748B; font-size: 14px; line-height: 1.6;">
                  Thank you for joining TechShare. Please enter the OTP verification code below into the app to complete your account activation.
                </p>

                <!-- OTP BOX -->
                <div style="background-color: #F0F7FF; border: 1.5px dashed #2563EB; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #2563EB; letter-spacing: 1px; display: block; margin-bottom: 8px;">
                    Your Verification Code
                  </span>
                  <span style="font-size: 34px; font-weight: 800; color: #1D4ED8; letter-spacing: 8px; font-family: 'SF Mono', Consolas, Monaco, monospace; display: block;">
                    ${otp}
                  </span>
                  <span style="display: block; margin-top: 8px; font-size: 12px; color: #64748B;">
                    (This code expires in <b>5 minutes</b>)
                  </span>
                </div>

                <!-- CAUTION NOTE -->
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 12px; color: #92400E; line-height: 1.5;">
                    🔒 <b>Security Notice:</b> Never share this verification code with anyone, including TechShare staff. If you did not make this request, please safely ignore this email.
                  </p>
                </div>

                <p style="margin: 24px 0 0 0; color: #64748B; font-size: 13px; line-height: 1.5;">
                  Best regards,<br>
                  <b>The TechShare Team</b>
                </p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 24px; text-align: center;">
                <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                  © 2026 TechShare MMA301 Project. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const mailOptions = {
    from: `"TechShare" <${senderEmail}>`,
    to,
    subject: `[TechShare] ${otp} is your account verification code`,
    text: `Your TechShare verification code is: ${otp}. This code is valid for 5 minutes. Please do not share this code with anyone.`,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✉️ [EmailService] Sent OTP email to ${to}. MessageId: ${info.messageId}`);
  return info;
};

/**
 * Send an OTP verification email for forgot password / password reset
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit OTP string
 * @param {string} name - Optional recipient name / username
 * @returns {Promise<object>} Send mail response
 */
export const sendForgotPasswordOtpEmail = async (to, otp, name = '') => {
  const transporter = getTransporter();
  const senderEmail = process.env.EMAIL_USER || 'phainon33m5@gmail.com';

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Verification - TechShare</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;">
            
            <!-- HEADER -->
            <tr>
              <td style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">
                  TechShare
                </h1>
                <p style="margin: 6px 0 0 0; color: #DBEAFE; font-size: 13px; font-weight: 500;">
                  Peer-to-Peer Tech Sharing & Rental Platform
                </p>
              </td>
            </tr>

            <!-- BODY CONTENT -->
            <tr>
              <td style="padding: 32px 28px;">
                <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 18px; font-weight: 700;">
                  Password Reset Request${name ? ` for ${name}` : ''}
                </h2>
                <p style="margin: 0 0 20px 0; color: #64748B; font-size: 14px; line-height: 1.6;">
                  We received a request to reset the password for your TechShare account. Please use the OTP code below to establish a new password.
                </p>

                <!-- OTP BOX -->
                <div style="background-color: #EFF6FF; border: 1.5px dashed #2563EB; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #2563EB; letter-spacing: 1px; display: block; margin-bottom: 8px;">
                    Your OTP Reset Code
                  </span>
                  <span style="font-size: 34px; font-weight: 800; color: #1D4ED8; letter-spacing: 8px; font-family: 'SF Mono', Consolas, Monaco, monospace; display: block;">
                    ${otp}
                  </span>
                  <span style="display: block; margin-top: 8px; font-size: 12px; color: #64748B;">
                    (This code expires in <b>5 minutes</b>)
                  </span>
                </div>

                <!-- CAUTION NOTE -->
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 12px; color: #92400E; line-height: 1.5;">
                    🔒 <b>Security Notice:</b> Never share this OTP code with anyone. If you did not request a password reset, your account is secure and you can safely ignore this email.
                  </p>
                </div>

                <p style="margin: 24px 0 0 0; color: #64748B; font-size: 13px; line-height: 1.5;">
                  Best regards,<br>
                  <b>TechShare Security Team</b>
                </p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 24px; text-align: center;">
                <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                  © 2026 TechShare MMA301 Project. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const mailOptions = {
    from: `"TechShare Security" <${senderEmail}>`,
    to,
    subject: `[TechShare] ${otp} is your password reset verification code`,
    text: `Your TechShare password reset code is: ${otp}. This code is valid for 5 minutes. Never share this code with anyone.`,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✉️ [EmailService] Sent Forgot Password OTP email to ${to}. MessageId: ${info.messageId}`);
  return info;
};

export default {
  sendOtpEmail,
  sendForgotPasswordOtpEmail,
};
