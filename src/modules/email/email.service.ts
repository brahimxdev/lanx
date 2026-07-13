import { resend } from "@/lib/resend.client.js";
import { ConfirmationCodeEmail } from "@/emails/templates/ConfirmationCode.js";
import { emailConfig } from "@/config/index.js";
import { WelcomeEmailPro, type IWelcomeEmailProProps } from "@/emails/templates/WelcomeEmailPro.js";
import {
  WelcomeEmailWarm,
  type IWelcomeEmailWarmProps,
} from "@/emails/templates/WelcomeEmailWarm.js";

export class EmailService {
  static async sendConfirmationCode(to: string, code: string): Promise<void> {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to,
      subject: "Your temporary Lanx verification code",
      react: ConfirmationCodeEmail({ code }),
    });

    if (error) {
      console.error("Failed to send code", { to, error });
      return;
    }

    console.info("Code sent!", { to, emailId: data.id });
  }

  // Send welcome email
  static async sendWelcomeEmailPro(to: string, paylod: IWelcomeEmailProProps): Promise<void> {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to,
      subject: `Welcome to Lanx ${paylod.firstName}`,
      react: WelcomeEmailPro(paylod),
    });

    if (error) {
      console.error("Failed to send welcome email pro", { to, error });
      return;
    }

    console.info("Welcome email pro sent!", { to, emailId: data.id });
  }

  static async sendWelcomeEmailWarm(to: string, paylod: IWelcomeEmailWarmProps): Promise<void> {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to,
      subject: `Welcome to Lanx ${paylod.firstName}`,
      react: WelcomeEmailWarm(paylod),
    });

    if (error) {
      console.error("Failed to welcome email warm", { to, error });
      return;
    }

    console.info("Welcome email warm sent!", { to, emailId: data.id });
  }
}
