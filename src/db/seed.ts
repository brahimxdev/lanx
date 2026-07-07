import "../config/load-env.js";
import { sql } from "drizzle-orm";
import { db } from "./client.js";
import { authUsers, emailConfirmations, sessions } from "./schema/index.js";
import bcrypt from "bcryptjs";

// Normal insert sql
// INSERT INTO auth_users (email, password_hash, is_email_verified) values ('ib@gmail.com', 'IBRahim123!!!')

const seedData = async (): Promise<void> => {
  console.log("🌱 Seeding database...");

  // Clean slate - always clear table whenever this file run
  await db.execute(
    sql`TRUNCATE TABLE sessions, email_confirmations, auth_users RESTART IDENTITY CASCADE`
  );

  // Seed authuser
  const passwordHash = await bcrypt.hash("IBRahim123!!!", 10);

  const insertedUsers = await db
    .insert(authUsers)
    .values([
      { email: "admin@example.com", passwordHash, isEmailVerified: true },
      { email: "unverified@example.com", passwordHash, isEmailVerified: false },
    ])
    .returning();

  // Seed email_confirmation
  const [admin, unverified] = insertedUsers;

  const codeHash = await bcrypt.hash("12345", 10);

  await db.insert(emailConfirmations).values([
    {
      authUserId: unverified.id,
      codeHash,
      confirmationType: "sign_up",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      attemptCount: 0,
    },
  ]);

  // Seed sessions
  const refreshTokenHash = await bcrypt.hash("some-refresh-token", 10);

  await db.insert(sessions).values([
    {
      authUserId: admin.id,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: "127.0.0.1",
      location: { city: "kaduna south", state: "Kaduna", country: "Nigeria" },
      userAgent: "Mozila/5.0 (seed script)",
      deviceType: "Desktop",
      deviceOs: "macOS",
      deviceBrowser: "Chrome Canary",
    },
  ]);

  console.log("✅ Seed complete");

  process.exit(0);
};

seedData().catch((err: unknown) => {
  console.error("❌ Seed failed", err);
  process.exit(1);
});
