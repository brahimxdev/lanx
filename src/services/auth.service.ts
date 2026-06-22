import { AppError } from "@/errors/AppError.js";
import type { RegisterInput, LoginInput } from "@/schemas/auth.schema.js";
import { db, type User } from "@/store.js";

type SafeUser = Omit<User, "password">;

const tosafeUser = (user: User): SafeUser => {
  const { password: _password, ...safe } = user;
  return safe;
};

export const authService = {
  createAccount(input: RegisterInput): { newUser: SafeUser } {
    // Check if email exists
    const emailExists = db.users.find((user) => user.email === input.email);
    if (emailExists) throw AppError.conflict("An account with this email already exists");

    const newUser: User = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      password: input.password,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    return { newUser: tosafeUser(newUser) };
  },

  login(input: LoginInput): { accessToken: string; user: SafeUser } {
    // Find user
    const user = db.users.find((user) => user.email === input.email);

    if (!user) {
      throw AppError.unauthorized("Invalid email or password");
    }
    // Check if password doesn't match
    if (user.password !== input.password) {
      throw AppError.unauthorized("Invalid email or password");
    }

    return { accessToken: user.id, user: tosafeUser(user) };
  },
};
