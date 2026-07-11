import "../config/load-env.js";
import { db } from "./client.js";
import { authUsers, emailConfirmations, sessions } from "./schema/index.js";
import * as schema from "./schema/index.js";
import { reset, seed } from "drizzle-seed";

const seedData = async (): Promise<void> => {
  await reset(db, schema);
  console.log("🌱 Seeding data");

  await seed(db, { authUsers, emailConfirmations, sessions }).refine((func) => ({
    // auth users seeding
    authUsers: {
      columns: {
        email: func.email(),
        passwordHash: func.string({ isUnique: false }),
        isEmailVerified: false,
        deletedAt: false,
      },
      count: 3,
      with: { emailConfirmations: 1, sessions: 1 },
    },
    // email confirmations seeding
    emailConfirmations: {
      columns: {
        codeHash: func.string({ isUnique: false }),
        confirmationType: func.valuesFromArray({
          values: ["sign_up", "change_email", "password_reset"],
        }),
        expiresAt: func.date({
          minDate: new Date(),
          maxDate: new Date(Date.now() + 15 * 60 * 1000),
        }),
        usedAt: false,
        attemptCount: func.int({ minValue: 0, maxValue: 5 }),
        createdAt: false
      },
    },

    // Sessions seeding
    sessions: {
      columns: {
        refreshTokenHash: func.string({ isUnique: false }),
        expiresAt: func.date({
          minDate: new Date(),
          maxDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
        revokedAt: false,
        location: func.country(),
        userAgent: func.valuesFromArray({
          values: [
            "Mozile/5.0 (seed script)",
            "Brave (seed script)",
            "Chrome Canary (seed script)",
          ],
        }),
        deviceType: func.valuesFromArray({ values: ["desktop", "mobile", "tablet"] }),
        deviceOs: func.valuesFromArray({ values: ["macOS", "windows", "linux", "iOS", "android"] }),
        deviceBrowser: func.valuesFromArray({ values: ["Opera Mini", "Chrome", "Safari", "Arc"] }),
        lastUsedAt: func.date({minDate: new Date(), maxDate: new Date()}),
      },
    },
  }));

  console.log("✅ Seed complete");
  process.exit(0);
};

seedData().catch((err: unknown) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
