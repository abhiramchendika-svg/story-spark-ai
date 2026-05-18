import nodemailer from "nodemailer";
import { IEmailBody } from "./verify_email.interface";
import ApiError from "../../../errors/api_error";
import config from "../../../config";

interface OTPStore {
  [email: string]: { otp: string; expiresAt: number };
}

const otpStore: OTPStore = {};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: config.verify_email,
    pass: config.verify_password,
  },
});

const VerifyEmail = async (payload: IEmailBody) => {
  try {
    const { email, name } = payload;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore[email] = { otp, expiresAt };
    const mailOptions = {
      from: config.verify_email,
      to: email,
      subject: "OTP Verify Email Address",
      html: `
        <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="background-color: #f9f9f9; font-family: Arial, sans-serif; padding: 20px; text-align: start;">
      <section style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border-radius: 10px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
        <header>
          <a href="/">
            <h1 style="font-size: 22px;">Story Spark AI</h1>
          </a>
        </header>
        <main style="margin-top: 20px;">
          <h2 style="color: #333;">Hi ${name},</h2>
          <p style="color: #666;">This is your verification code:</p>
          <div style="display: flex; justify-content: center; margin: 20px 0;">
            ${otp
              .split("")
              .map(
                (digit, index, arr) => `
                <span style="display: inline-block; width: 40px; height: 40px; font-size: 24px; font-weight: bold; color: #007bff; border: 2px solid #007bff; border-radius: 5px; line-height: 40px; text-align: center; ${
                  index !== arr.length - 1 ? "margin-right: 10px;" : ""
                }">
                ${digit}
                </span>
            `
              )
              .join("")}
            </div>
          <p style="color: #666;">This code will only be valid for the next 10 minutes. If the code does not work, please request a new one and ensure you enter it correctly.</p>
          <p style="margin-top: 20px; color: #666;">Thanks,<br>Story Spark AI Team</p>
        </main>
        <footer style="margin-top: 20px; font-size: 12px; color: #aaa;">
          <p>This email was sent from ${
            config.verify_email
          } for your one-time OTP verification.</p>
          <p>&copy; ${new Date().getFullYear()} Story Spark Ai. All Rights Reserved.</p>
        </footer>
      </section>
      </body>
      </html>
      `,
    };
    if (config.verify_email && config.verify_password) {
      await transporter.sendMail(mailOptions);
    } else {
      console.log("==================================================");
      console.log(`[DEVELOPMENT MOCK EMAIL] OTP for ${email} is: ${otp}`);
      console.log("==================================================");
    }
    return { otp, expiresAt };
  } catch (error) {
    console.error("Failed to verify email:", error);
    throw new ApiError(500, "Failed to send email");
  }
};

export const VerifyEmailService = {
  VerifyEmail,
};
