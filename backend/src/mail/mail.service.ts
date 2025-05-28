import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Mailjet from 'node-mailjet';

@Injectable()
export class MailService {
  private mailjetClient: Mailjet.Client | undefined;
  private readonly logger = new Logger(MailService.name);
  private fromEmail!: string;
  private fromName!: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MAILJET_API_KEY');
    const apiSecret = this.configService.get<string>('MAILJET_API_SECRET');
    const fromEmailConfig = this.configService.get<string>('FROM_EMAIL');
    const fromNameConfig = this.configService.get<string>('FROM_NAME');

    if (!apiKey || !apiSecret || !fromEmailConfig || !fromNameConfig) {
      this.logger.error(
        'Mailjet API Key, Secret, From Email, or From Name not configured. Emailing will be disabled.',
      );
      return;
    }

    this.fromEmail = fromEmailConfig;
    this.fromName = fromNameConfig;

    this.mailjetClient = new Mailjet.Client({ apiKey, apiSecret });
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<void> {
    if (!this.mailjetClient) {
      this.logger.error(
        'Mailjet client is not initialized. Cannot send email.',
      );
      throw new Error('Mailjet client not initialized. Check configuration.');
    }

    const request = this.mailjetClient
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: this.fromEmail,
              Name: this.fromName,
            },
            To: [
              {
                Email: to,
              },
            ],
            Subject: subject,
            TextPart: textContent || 'Please view this email in HTML format.',
            HTMLPart: htmlContent,
          },
        ],
      });

    try {
      const result = await request;
      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
      this.logger.debug('Mailjet response:', result.body);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}`, err.stack);
      this.logger.error(
        'Mailjet error details:',
        err.ErrorMessage || err.message,
        err.response?.data,
      );
      throw err;
    }
  }
}
