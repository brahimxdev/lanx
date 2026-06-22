import type { User } from "@/store.js";

export type SafeUser = Omit<User, "passwordHash">;
