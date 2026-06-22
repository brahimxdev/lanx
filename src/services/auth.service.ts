import { AppError } from "@/errors/AppError.js";
import type { RegisterInput, LoginInput } from "@/schemas/auth.schema.js";
import { db, type User } from "@/store.js";
import bcrypt from "bcryptjs";
import type { SafeUser } from "@/types/index.js";
import jwt from "jsonwebtoken";
import { authConfig } from "@/config/index.js";

const tosafeUser = (user: User): SafeUser => {
  const { passwordHash: _password, ...safe } = user;
  return safe;
};

export const authService = {
  async createAccount(input: RegisterInput): Promise<{ newUser: SafeUser }> {
    console.log("Existing users", db.users);
    // 1. Check if email exists
    const emailExists = db.users.find((user) => user.email === input.email);
    if (emailExists) throw AppError.conflict("An account with this email already exists");

    // 2. Hash password before storing
    const hashedPassword = await bcrypt.hash(input.password, 12);

    // 3. Create the new user in db with hashed password
    const newUser: User = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    console.log("New Users:", db.users);

    return { newUser: tosafeUser(newUser) };
  },

  async login(
    input: LoginInput
  ): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
    // Find user
    const user = db.users.find((user) => user.email === input.email);

    if (!user) {
      throw AppError.unauthorized("Invalid email or password");
    }

    // Check if password match
    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    console.log("Password Match:", passwordMatch);
    if (!passwordMatch) {
      throw AppError.unauthorized("Invalid email or password");
    }

    // Sign token, generate an access token with short expiration time (15min)
    const accessToken = jwt.sign({ userId: user.id }, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiresIn,
    });

    // Refresh token - Generate a refresh token with longer expiration (7d)
    const refreshToken = jwt.sign({ userId: user.id }, authConfig.refreshSecret, {
      expiresIn: authConfig.refreshExpiresIn,
    });

    // Set the access token and refresh token in HttpOnly cookies

    console.log("Access Token:", accessToken);

    return { accessToken, refreshToken, user: tosafeUser(user) };
  },
};
