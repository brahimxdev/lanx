// import type { Request, Response, NextFunction } from "express";
// import { asyncHandler } from "@/utils/asyncHandler.js";
// import { AppError, HttpStatus } from "@/errors/AppError.js";
// import { registerSchema, loginSchema } from "@/schemas/auth.schema.js";
// import { authService } from "@/services/auth.service.js";
// import { isProd } from "@/config/env.js";
// import type { RegisterInput, LoginInput } from "@/schemas/auth.schema.js";

// // POST - /api/v1/auth/register
// export const authController = {
//   register: asyncHandler(async (req: Request, res: Response) => {
//     // 1. Validate input already done by middleware, just grab input from request
//     const { ...request } = req.body as RegisterInput;

//     // 2. Use the auth service to create account based on request input
//     const { newUser } = await authService.createAccount(request);

//     res.status(HttpStatus.Created).json({
//       status: "success",
//       data: {
//         user: newUser,
//       },
//     });
//   }),

//   // POST - /api/v1/auth/login
//   login: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
//     // 1. Validate input
//     const request = loginSchema.safeParse(req.body);

//     if (!request.success) {
//       const errorMessage = request.error.issues[0]?.message ?? "Invalid input";
//       throw AppError.badRequest(
//         errorMessage,
//         "The input field you provided doesn't follow the sepecified shape, please check API doc"
//       );
//     }

//     // 2. User auth service for login
//     const { accessToken, refreshToken, user } = await authService.login(request.data);

//     // Set the access and refresh token in HttpOnly cookies
//     res.cookie("accessToken", accessToken, {
//       httpOnly: true,
//       secure: isProd,
//       maxAge: 15 * 60 * 1000, // 15 minutes
//       sameSite: "strict",
//     });

//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       secure: isProd,
//       maxAge: 24 * 60 * 1000, // 24 hrs
//       sameSite: "strict",
//     });

//     // Return a success response with user basic info without sending token to the response
//     res.status(HttpStatus.OK).json({
//       status: "success",
//       data: { user },
//     });
//   }),
// };
