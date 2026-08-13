export const CacheKeys = {
  // User
  userProfile: (userId: string) => `user:profile:${userId}`,

  // Session Blocklist
  blocklistSession: (sessionId: string) => `blocklist:session:${sessionId}`,

  // Lookup Data
  lookupCountries: "lookup:countries",
  lookupCurrencies: "lookup:currencies",
  lookupProfessions: "lookup:professions",

  // Rate Limiting - tracks confirmation code guess attempts per user per type
  rateConfirm: (userId: string, type: string) => `rate:confirm:${userId}:${type}`,

  // Rate Limiting - tracks confirmation code issuance (resend/forgot-password) per user per type
  rateIssuance: (userId: string, type: string) => `rate:issuance:${userId}:${type}`,
} as const;
