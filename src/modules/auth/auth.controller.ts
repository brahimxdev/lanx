import { HttpStatus } from "@/errors/index.js";
import type { ISignupInput } from "./auth.validation.js";
import { AuthService } from "./auth.service.js";
import type { Request, Response } from "express";

// POST - /api/v1/auth/sign-up

export class AuthController {
  // sign-up - create new account on auth_users table
  static signup = async (req: Request<unknown, unknown, ISignupInput>, res: Response) => {
    // Validation middleware already validated data!

    const { email, password } = req.body;

    const { newUser } = await AuthService.createUser({ email, password });

    res.status(HttpStatus.Created).json({
      status: "true",
      data: { user: newUser },
    });
  };
}
