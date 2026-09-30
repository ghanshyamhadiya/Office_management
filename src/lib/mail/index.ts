import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.MAIL_HOST || !env.MAIL_PORT || !env.MAIL_USER || !env.MAIL_PASS || !env.MAIL_FROM) {
    throw new Error("SMTP is not configured. Set MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS, and MAIL_FROM.");
  }

  transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_SECURE,
    auth: {
      user: env.MAIL_USER,
      pass: env.MAIL_PASS
    }
  });

  return transporter;
}

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const smtp = getTransporter();
  return smtp.sendMail({
    from: env.MAIL_FROM,
    to,
    subject,
    html
  });
}

export function inviteEmailTemplate(name: string | null | undefined, acceptUrl: string) {
  return `<div style="font-family:Inter,sans-serif"><h2>OfficeFlow invite</h2><p>Hello ${name ?? "there"},</p><p>You have been invited to OfficeFlow.</p><p><a href="${acceptUrl}">Accept invite</a></p></div>`;
}

export function tempPasswordTemplate(name: string, email: string, tempPassword: string) {
  return `<div style="font-family:Inter,sans-serif"><h2>OfficeFlow account created</h2><p>${name}, your account is ready.</p><p>Email: ${email}</p><p>Temporary password: ${tempPassword}</p></div>`;
}
