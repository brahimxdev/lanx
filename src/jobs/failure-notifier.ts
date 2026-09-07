export interface IJobFailureNotification {
  queueName: string;
  jobId: string;
  jobName: string;
  errorMessage: string;
  attemptsMade: number;
}

export interface IJobFailureNotifier {
  notify(failure: IJobFailureNotification): void | Promise<void>;
}

/**
 * Default notifier. Structured, greppable console output — swap for a
 * Slack/email/PagerDuty notifier later by implementing IJobFailureNotifier
 * and passing it into createWorker's options; nothing else here changes.
 */
export const consoleFailureNotifier: IJobFailureNotifier = {
  notify: (failure) => {
    console.error(
      `[JOB FAILURE] queue="${failure.queueName}" job=${failure.jobId} (${failure.jobName}) ` +
        `failed after ${String(failure.attemptsMade)} attempts: ${failure.errorMessage}`
    );
  },
};
