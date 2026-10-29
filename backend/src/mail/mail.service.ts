import { Inject, Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { APP_CONFIG, type AppConfig } from '../config/configuration';

// Sends emails through the SMTP server set in the environment (SMTP_HOST, ...).
// Without one (local development), the email is written to the server log instead, so codes can still be read.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: nodemailer.Transporter | null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    const { host, port, user, pass } = config.smtp;
    this.transport = host
      ? nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass } : undefined })
      : null;
  }

  async send(to: string, subject: string, text: string) {
    if (!this.transport) {
      this.logger.warn(`SMTP is not configured; the email below was not sent.\nTo: ${to}\nSubject: ${subject}\n${text}`);
      return;
    }
    await this.transport.sendMail({ from: this.config.smtp.from, to, subject, text });
  }
}
