import { HttpStatus } from "@/errors/index.js";
import type { ISignupInput } from "./auth.validation.js";
import { AuthService } from "./auth.service.js";
import type { Request, Response, NextFunction } from "express";

// POST - /api/v1/auth/sign-up

export class AuthController {
  // sign-up - create new account on auth_users table
  static signup = async (req: Request<unknown, unknown, ISignupInput>, res: Response) => {
    //  1. Validate email + password - ValidateRequest(signupSchema) already doing that, just grab validated input from req.body

    // 2. Grab validated input
    const { email, password } = req.body;

    // 3. Delegate to auth service layer to create account based on request input
    // const {newUser} =
    await AuthService.createAuthUser({ email, password });

    // 4. Send success response to client
    res.status(HttpStatus.Created).json({
      status: "success",
      data: "data",
    });
  };
}
