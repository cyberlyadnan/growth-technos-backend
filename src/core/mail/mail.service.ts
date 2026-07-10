import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '@core/config';
import { loggers } from '@core/logger';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class MailService {
  private transporter: Transporter | null = null;

  isConfigured(): boolean {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async send(options: SendMailOptions): Promise<void> {
    if (!this.isConfigured()) {
      loggers.auth.warn('Mail not configured — email not sent', {
        to: options.to,
        subject: options.subject,
      });
      return;
    }

    await this.getTransporter().sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}

export const mailService = new MailService();
