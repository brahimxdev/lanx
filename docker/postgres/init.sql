-- Enable UUID generation (Drizzle uses gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
