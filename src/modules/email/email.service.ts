import { resend } from "@/lib/resend.client.js";
import { ConfirmationCodeEmail } from "@/emails/templates/ConfirmationCode.js";
import { emailConfig } from "@/config/index.js";

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
}
