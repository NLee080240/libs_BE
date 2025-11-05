require('dotenv').config();
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

// OAuth2 credentials from environment variables
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN, USER_EMAIL } = process.env;

// Initialize OAuth2 client
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

/**
 * Gửi email chứa mã OTP đặt lại mật khẩu
 * @param {string} recipientEmail - Email người nhận
 * @param {string} otp - Mã OTP
 */
const sendMailForgotPassword = async (recipientEmail, otp) => {
    try {
        const accessToken = await oAuth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: USER_EMAIL,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken,
            },
        });

        const mailOptions = {
            from: `"PCM Books" <${USER_EMAIL}>`,
            to: recipientEmail,
            subject: 'Yêu cầu đặt lại mật khẩu',
            text: `Bạn đã yêu cầu đặt lại mật khẩu. Mã OTP của bạn là: ${otp}. Vui lòng làm theo hướng dẫn trong email.`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #e67e22; margin: 0;">PCM Books</h2>
                        <p style="color: #555; font-size: 14px; margin: 5px 0;">Yêu cầu đặt lại mật khẩu</p>
                    </div>
                    <p>Xin chào <strong>${recipientEmail}</strong>,</p>
                    <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                    <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
                    <p>Mã OTP của bạn là:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="font-size: 22px; font-weight: bold; color: #e67e22;">${otp}</span>
                    </div>
                    <p>Lưu ý: mã OTP này sẽ hết hạn sau <strong>15 phút</strong>.</p>
                    <p>Nếu bạn gặp sự cố, vui lòng liên hệ với chúng tôi qua email: 
                        <a href="mailto:${USER_EMAIL}" style="color: #3498db;">${USER_EMAIL}</a>.
                    </p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
                    <p style="text-align: center; font-size: 14px; color: #777;">Trân trọng,</p>
                    <p style="text-align: center; font-weight: bold; color: #e67e22;">Đội ngũ PCM Books</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email đã gửi đến ${recipientEmail}`);
    } catch (error) {
        console.error('Lỗi khi gửi email đặt lại mật khẩu:', error.message);
    }
};

module.exports = sendMailForgotPassword;
