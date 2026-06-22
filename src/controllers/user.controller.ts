// import type { Request, Response, NextFunction } from "express";
// import { asyncHandler } from "@/utils/asyncHandler.js";
// import { AppError } from "@/middlewares/errorHandler.js";
// import { users, posts } from "@/store.js";

// // GET /users/:id/posts
// export const getPostsByUser = asyncHandler((req: Request, res: Response, next: NextFunction) => {
//   // Find users
//   const user = users.find((user) => user.id === req.params.id);
//   if (!user) {
//     const err = new AppError("User not found", 404);
//     next(err);
//     return;
//   }

//   // Grab user poist based on the id
//   const userPosts = posts
//     .filter((post) => post.authorId === req.params.id)
//     .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

//   res.status(200).json({
//     status: "success",
//     data: {
//       user: { id: user.id, name: user.name, email: user.email },
//       posts: userPosts,
//       total: userPosts.length,
//     },
//   });
// });
