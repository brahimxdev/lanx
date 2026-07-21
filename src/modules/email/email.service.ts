import { resend } from "@/lib/resend.client.js";
import { ConfirmationCodeEmail } from "@/emails/templates/ConfirmationCode.js";
import { emailConfig } from "@/config/index.js";
import { WelcomeEmailPro, type IWelcomeEmailProProps } from "@/emails/templates/WelcomeEmailPro.js";
import type { ISendEmailParams } from "./email.types.js";
import { NotificationEmail } from "@/emails/templates/NotificationEmail.js";

export class EmailService {
  private async send({ to, subject, react, context }: ISendEmailParams): Promise<void> {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to,
      subject,
      react,
    });

    if (error) {
      console.error(`Failed to send ${context} email`, { to, error });
      return;
    }

    console.info(`${context} email sent!`, { to, emailId: data.id });
  }

  async sendConfirmationCode(to: string, code: string): Promise<void> {
    return this.send({
      to,
      subject: "Your temporary Lanx verification code",
      react: ConfirmationCodeEmail({
        preview: "Your temporary Lanx verification code",
        description: "Enter this temporary verification code to continue. It expires in 10 minutes",
        code,
      }),
      context: "confirmation code",
    });
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    return this.send({
      to,
      subject: "Your Lanx password reset code",
      react: ConfirmationCodeEmail({
        preview: "Your Lanx password reset code",
        description: "Enter this code to reset your password. It expires in 10 minutes.",
        code,
      }),
      context: "password reset code",
    });
  }

  async sendWelcomeEmailPro(to: string, payload: IWelcomeEmailProProps): Promise<void> {
    return this.send({
      to,
      subject: `Welcome to Lanx ${payload.email}`,
      react: WelcomeEmailPro(payload),
      context: "welcome email (pro)",
    });
  }

  async sendPasswordResetNotification(to: string): Promise<void> {
    return this.send({
      to,
      subject: "Your Lanx password was reset",
      react: NotificationEmail({
        preview: "Your Lanx password was reset",
        title: "Password reset",
        description: "This is a confirmation that your password was just changed.",
        warning:
          "If you didn't make this change, please reset your password immediately or contact support.",
      }),
      context: "password reset notification",
    });
  }

  async sendEmailChangeNotification(to: string, newEmail: string): Promise<void> {
    return this.send({
      to,
      subject: "Your Lanx email was changed",
      react: NotificationEmail({
        preview: "Your Lanx email was changed",
        title: "Email change",
        description: `This is a confirmation that your email was just changed to ${newEmail}.`,
        warning: "If you didn't make this change, please contact support immediately.",
      }),
      context: "email change notification",
    });
  }
}

// Singleton instance
export const emailService = new EmailService();
