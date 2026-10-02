import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';

let transporter: Transporter | null = null;

export function isMailerConfigured(): boolean {
  return Boolean(env.SMTP_HOST);
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(
  to: { email: string; name?: string | null },
  subject: string,
  html: string,
): Promise<void> {
  if (!isMailerConfigured()) throw new Error('SMTP não configurado');

  await getTransporter().sendMail({
    from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_EMAIL}>`,
    to: to.name ? `"${to.name}" <${to.email}>` : to.email,
    subject,
    html,
  });
}
