import { emailService } from "@/modules/email/email.service.js";
import { EmailWorker } from "./emailWorker.js";
import { createWorker } from "@/jobs/create-worker.js";
import type { EmailJobData } from "./emailQueue.js";
import { QUEUE_NAMES } from "@/jobs/index.js";

export const startEmailWorker = () => {
  const emailWorker = new EmailWorker(emailService);

  return createWorker<EmailJobData>(QUEUE_NAMES.EMAIL, emailWorker.processor);
};
