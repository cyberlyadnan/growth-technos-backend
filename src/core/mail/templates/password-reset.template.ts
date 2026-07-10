import { env } from '@core/config';

interface PasswordResetEmailParams {
  name: string;
  resetUrl: string;
  expiresIn: string;
}

export function buildPasswordResetEmail(params: PasswordResetEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Reset your ${env.APP_NAME} password`;

  const text = [
    `Hi ${params.name},`,
    '',
    'We received a request to reset your password.',
    `Reset your password using this link (expires in ${params.expiresIn}):`,
    params.resetUrl,
    '',
    'If you did not request this, you can safely ignore this email.',
    '',
    `— ${env.APP_NAME} Team`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="margin-bottom:8px">Reset your password</h2>
      <p>Hi ${params.name},</p>
      <p>We received a request to reset your password for your ${env.APP_NAME} admin account.</p>
      <p>
        <a href="${params.resetUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px">
          Reset Password
        </a>
      </p>
      <p style="font-size:14px;color:#555">This link expires in ${params.expiresIn}.</p>
      <p style="font-size:14px;color:#555">If you did not request this, you can safely ignore this email.</p>
      <p style="font-size:12px;color:#888;margin-top:24px">— ${env.APP_NAME} Team</p>
    </div>
  `;

  return { subject, html, text };
}
