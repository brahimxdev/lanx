import type { ReactElement } from "react";

export interface ISendEmailParams {
  to: string;
  subject: string;
  react: ReactElement;
  context: string;
  payload?: string;
}
