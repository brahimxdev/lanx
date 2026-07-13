import { emailConfig } from "@/config/index.js";
import { Resend } from "resend";

export const resend = new Resend(emailConfig.apiKey);
