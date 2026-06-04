/**
 * SMTP client for Gmail using nodemailer.
 * Server-side only.
 */

import nodemailer from "nodemailer";
import { getCredentials } from "@/lib/gmail/imap-client";

// Hardcoded intentionally — never user-configurable.
const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 587;

export function createTransport() {
  const creds = getCredentials();
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // STARTTLS
    auth: {
      user: creds.email,
      pass: creds.password,
    },
  });
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  replyToMessageId?: string;
}

export interface SendResult {
  messageId: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendResult> {
  const creds = getCredentials();
  const transport = createTransport();

  const mailOptions: nodemailer.SendMailOptions = {
    from: creds.email,
    to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
    subject: options.subject,
    text: options.body,
  };

  if (options.replyToMessageId) {
    mailOptions.inReplyTo = options.replyToMessageId;
    mailOptions.references = options.replyToMessageId;
  }

  const info = await transport.sendMail(mailOptions);
  return { messageId: info.messageId as string };
}

export interface ReplyOptions {
  messageId: string;
  threadId: string;
  body: string;
  subject?: string;
  to?: string;
}

export async function replyToThread(options: ReplyOptions): Promise<SendResult> {
  return sendEmail({
    to: options.to ?? "",
    subject: options.subject ?? "",
    body: options.body,
    replyToMessageId: options.messageId,
  });
}
