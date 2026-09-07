import type { Queue } from "bullmq";
import { QUEUE_NAMES, createQueue } from "@/jobs/index.js";

export type EmailJobData =
  | { type: "confirmation-code"; email: string; code: string }
  | { type: "welcome-email"; email: string }
  | { type: "password-reset-code"; email: string; code: string }
  | { type: "password-reset-notification"; email: string };

export interface IEmailQueueProducer {
  sendConfirmationCode(email: string, code: string): Promise<void>;
  sendWelcomeEmail(email: string): Promise<void>;
  sendPasswordResetCode(email: string, code: string): Promise<void>;
  sendPasswordResetNotification(email: string): Promise<void>;
}

class EmailQueueProducer implements IEmailQueueProducer {
  constructor(private readonly queue: Queue<EmailJobData>) {}

  async sendConfirmationCode(email: string, code: string): Promise<void> {
    await this.queue.add("confirmation-code", { type: "confirmation-code", email, code });
  }

  async sendWelcomeEmail(email: string): Promise<void> {
    await this.queue.add("welcome-email", { type: "welcome-email", email });
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    await this.queue.add("password-reset-code", { type: "password-reset-code", email, code });
  }

  async sendPasswordResetNotification(email: string): Promise<void> {
    await this.queue.add("password-reset-notification", {
      type: "password-reset-notification",
      email,
    });
  }
}

const emailQueue = createQueue<EmailJobData>(QUEUE_NAMES.EMAIL);

// Singleton instance
export const emailQueueProducer: IEmailQueueProducer = new EmailQueueProducer(emailQueue);
