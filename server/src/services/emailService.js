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
    <title>Mã xác thực TechShare</title>
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
                  Nền tảng chia sẻ & cho thuê thiết bị công nghệ
                </p>
              </td>
            </tr>

            <!-- BODY CONTENT -->
            <tr>
              <td style="padding: 32px 28px;">
                <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 18px; font-weight: 700;">
                  Xác thực đăng ký tài khoản ${name ? `, ${name}` : ''}
                </h2>
                <p style="margin: 0 0 20px 0; color: #64748B; font-size: 14px; line-height: 1.6;">
                  Cảm ơn bạn đã lựa chọn TechShare. Vui lòng nhập mã OTP bên dưới vào ứng dụng để hoàn tất việc kích hoạt tài khoản của bạn.
                </p>

                <!-- OTP BOX -->
                <div style="background-color: #F0F7FF; border: 1.5px dashed #2563EB; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #2563EB; letter-spacing: 1px; display: block; margin-bottom: 8px;">
                    Mã xác thực của bạn
                  </span>
                  <span style="font-size: 34px; font-weight: 800; color: #1D4ED8; letter-spacing: 8px; font-family: 'SF Mono', Consolas, Monaco, monospace; display: block;">
                    ${otp}
                  </span>
                  <span style="display: block; margin-top: 8px; font-size: 12px; color: #64748B;">
                    (Mã này có hiệu lực trong vòng <b>5 phút</b>)
                  </span>
                </div>

                <!-- CAUTION NOTE -->
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 12px; color: #92400E; line-height: 1.5;">
                    🔒 <b>Cảnh báo bảo mật:</b> Không chia sẻ mã OTP này với bất kỳ ai, kể cả nhân viên TechShare. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
                  </p>
                </div>

                <p style="margin: 24px 0 0 0; color: #64748B; font-size: 13px; line-height: 1.5;">
                  Trân trọng,<br>
                  <b>Đội ngũ TechShare</b>
                </p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 24px; text-align: center;">
                <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                  © 2026 TechShare MMA301 Project. Mọi quyền được bảo lưu.
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
    subject: `[TechShare] ${otp} là mã xác thực OTP đăng ký tài khoản của bạn`,
    text: `Mã xác thực TechShare của bạn là: ${otp}. Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.`,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✉️ [EmailService] Sent OTP email to ${to}. MessageId: ${info.messageId}`);
  return info;
};

export default {
  sendOtpEmail,
};
