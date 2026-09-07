import type { Job } from "bullmq";
import type { EmailService } from "@/modules/email/email.service.js";
import type { EmailJobData } from "./emailQueue.js";

export class EmailWorker {
  constructor(private readonly emailService: EmailService) {}

  processor = async (job: Job<EmailJobData>): Promise<void> => {
    const { data } = job;

    console.info(`Processing job ${String(job.id)}`, { data });

    switch (data.type) {
      case "confirmation-code":
        await this.emailService.sendConfirmationCode(data.email, data.code);
        return;
      case "welcome-email":
        await this.emailService.sendWelcomeEmailPro(data.email, { email: data.email });
        return;
      case "password-reset-code":
        await this.emailService.sendPasswordResetCode(data.email, data.code);
        return;
      case "password-reset-notification":
        await this.emailService.sendPasswordResetNotification(data.email);
        return;
      default: {
        const _exhaustive: never = data;
        throw new Error(`Unhandled email job type: ${JSON.stringify(_exhaustive)}`);
      }
    }
  };
}
