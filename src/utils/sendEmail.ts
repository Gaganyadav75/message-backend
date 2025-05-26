import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { EmailSendingOption } from '../types/types.js';

dotenv.config();

export const VerificationEmail = (token:string,email:string)=>{

return `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f7f7f7;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background-color: #4CAF50;
            color: #ffffff;
            text-align: center;
            padding: 20px 10px;
            font-size: 24px;
            font-weight: bold;
        }
        .body {
            padding: 20px 30px;
            color: #333333;
            line-height: 1.6;
        }
        .cta-button {
            display: block;
            width: 80%;
            margin: 20px auto;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: #ffffff;
            text-align: center;
            text-decoration: none;
            font-weight: bold;
            border-radius: 5px;
        }
        .cta-button:hover {
            background-color: #45a049;
        }
        .footer {
            background-color: #f7f7f7;
            text-align: center;
            padding: 10px 20px;
            font-size: 12px;
            color: #888888;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            HII HELLO - Email Verification
        </div>
        <div class="body">
            <p>Hi there,</p>
            <p>Thank you for signing up with <strong>HII HELLO</strong>! To complete your registration and start using our app, please verify your email address by clicking the button below:</p>
            <a href="${process.env.FRONTEND_URL}?token=${token}&email=${email}" class="cta-button">Verify My Email</a>
            <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
            <p><a href="${process.env.FRONTEND_URL}?token=${token}&email=${email}" style="color: #4CAF50;">${process.env.FRONTEND_URL}?token=${token}&email=${email}</a></p>
            <p>If you didn't sign up for an account, please ignore this email. Your account will not be created unless you verify your email address.</p>
            <p>Welcome aboard!</p>
            <p>Best regards,<br>The HII HELLO Team</p>
        </div>
        <div class="footer">
            © 2024 HII HELLO. All rights reserved.<br>
            If you have any questions, contact us at support@hiihello.app.
        </div>
    </div>
</body>
</html>
`;

};


export const OtpCodeEmail = (code:string)=>{

return `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f7f7f7;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background-color: #4CAF50;
            color: #ffffff;
            text-align: center;
            padding: 20px 10px;
            font-size: 24px;
            font-weight: bold;
        }
        .body {
            padding: 20px 30px;
            color: #333333;
            line-height: 1.6;
        }
        .otp-box {
            display: block;
            width: fit-content;
            margin: 20px auto;
            padding: 15px 30px;
            background-color: #e8f5e9;
            border: 2px dashed #4CAF50;
            color: #2e7d32;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            border-radius: 6px;
            letter-spacing: 4px;
        }
        .footer {
            background-color: #f7f7f7;
            text-align: center;
            padding: 10px 20px;
            font-size: 12px;
            color: #888888;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            HII HELLO - Password Reset OTP
        </div>
        <div class="body">
            <p>Hi there,</p>
            <p>We received a request to reset your password for your <strong>HII HELLO</strong> account.</p>
            <p>Please use the following One-Time Password (OTP) to reset your password:</p>
            <div class="otp-box">
                ${code}
            </div>
            <p>This OTP is valid for the next 10 minutes. Do not share it with anyone.</p>
            <p>If you didn’t request a password reset, you can safely ignore this email.</p>
            <p>Stay safe,<br>The HII HELLO Team</p>
        </div>
        <div class="footer">
            © 2024 HII HELLO. All rights reserved.<br>
            If you have any questions, contact us at support@hiihello.app.
        </div>
    </div>
</body>
</html>

`;

};


export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}






const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    auth: {
        user: process.env.EMAIL_USERNAME, // Your Gmail address
        pass: process.env.EMAIL_PASSWORD  // App Password
    }
});


/**
 * Sends an email using the configured transporter.
 *
 * @param {EmailSendingOption} mailOpt - The email options (to, subject, text, html, etc.).
 * @returns {Promise<boolean>} Resolves true if email sent successfully, rejects with error otherwise.
 */

export const SendEmail = (mailOpt:EmailSendingOption) => {

    return new Promise((resolve, reject) => {
        transporter.sendMail({ ...mailOpt, from: process.env.EMAIL_USERNAME }, (err: Error | null) => {
          if (err) {
            console.error('Error while sending email:', err);
            return reject(err);
          }
          resolve(true);
        }); 
    });

};



