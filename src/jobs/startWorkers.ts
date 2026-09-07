import { startEmailWorker } from "@/modules/auth/jobs/startEmailWorker.js";

export const startAllWorkers = () => {
  const emailWorker = startEmailWorker();

  return {
    emailWorker,
  };
};
