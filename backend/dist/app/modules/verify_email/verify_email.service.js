"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyEmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const api_error_1 = __importDefault(require("../../../errors/api_error"));
const config_1 = __importDefault(require("../../../config"));
const otpStore = {};
const transporter = nodemailer_1.default.createTransport({
    service: "Gmail",
    auth: {
        user: config_1.default.verify_email,
        pass: config_1.default.verify_password,
    },
});
const VerifyEmail = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, name } = payload;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        otpStore[email] = { otp, expiresAt };
        const mailOptions = {
            from: config_1.default.verify_email,
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
                .map((digit, index, arr) => `
                <span style="display: inline-block; width: 40px; height: 40px; font-size: 24px; font-weight: bold; color: #007bff; border: 2px solid #007bff; border-radius: 5px; line-height: 40px; text-align: center; ${index !== arr.length - 1 ? "margin-right: 10px;" : ""}">
                ${digit}
                </span>
            `)
                .join("")}
            </div>
          <p style="color: #666;">This code will only be valid for the next 10 minutes. If the code does not work, please request a new one and ensure you enter it correctly.</p>
          <p style="margin-top: 20px; color: #666;">Thanks,<br>Story Spark AI Team</p>
        </main>
        <footer style="margin-top: 20px; font-size: 12px; color: #aaa;">
          <p>This email was sent from ${config_1.default.verify_email} for your one-time OTP verification.</p>
          <p>&copy; ${new Date().getFullYear()} Story Spark Ai. All Rights Reserved.</p>
        </footer>
      </section>
      </body>
      </html>
      `,
        };
        if (config_1.default.verify_email && config_1.default.verify_password) {
            yield transporter.sendMail(mailOptions);
        }
        else {
            console.log("==================================================");
            console.log(`[DEVELOPMENT MOCK EMAIL] OTP for ${email} is: ${otp}`);
            console.log("==================================================");
        }
        return { otp, expiresAt };
    }
    catch (error) {
        console.error("Failed to verify email:", error);
        throw new api_error_1.default(500, "Failed to send email");
    }
});
exports.VerifyEmailService = {
    VerifyEmail,
};
