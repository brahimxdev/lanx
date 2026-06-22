// import type { Request, Response, NextFunction } from "express";
// import { asyncHandler } from "@/utils/asyncHandler.js";
// import { AppError } from "@/middlewares/errorHandler.js";
// import { posts } from "@/store.js";
// import { createPostSchema, updatePostSchema } from "@/schemas/post.schema.js";
// import type { z } from "zod";
// import { postQuerySchema } from "@/schemas/post.schema.js";

// type PostQueryBody = z.infer<typeof postQuerySchema>;

// export const getAllPosts = asyncHandler((req: Request, res: Response, next: NextFunction) => {
//   // Grab parse data from req query
//   // Destructure object from result, no validation needed, validate() middleware already guaranteed shape and types
//   const result = postQuerySchema.safeParse(req.query);

//   if (!result.success) {
//     const err = new AppError(result.error.issues[0]?.message ?? "Invalid input", 400);
//     next(err);
//     return;
//   }

//   const {limit, offset, author} = result.data;

//   let returnResult = posts;

//   if (limit) {
//     returnResult = posts.filter((post) => pos)
//   }

//   res.status(200).json({
//     status: "success",
//     data: { posts },
//   });
// });

// export const getPostById = asyncHandler((req: Request, res: Response, next: NextFunction) => {
//   // Find matched post based on id from req paramas
//   const post = posts.find((post) => post.id === req.params.id);
//   if (!post) {
//     const err = new AppError("Post not found", 404);
//     next(err);
//     return;
//   }

//   res.status(200).json({
//     status: "success",
//     data: { post },
//   });
// });

// type CreatePostBody = z.infer<typeof createPostSchema>;

// // POST - /api/v1/posts
// export const createPost = asyncHandler((req: Request, res: Response, next: NextFunction) => {
//   // Grab parse data from req body
//   // Destructure object from result, no validation needed, validate() middleware already guaranteed shape and types
//   const { title, content } = req.body as CreatePostBody;

//   // Authentication - check if user exists first
//   if (!req.user) {
//     const err = new AppError("Authentication. required", 401);
//     next(err);
//     return;
//   }

//   const now = new Date().toISOString();

//   // Create post object
//   const newPost = {
//     id: crypto.randomUUID(),
//     authorId: req.user.id,
//     title,
//     content,
//     createdAt: now,
//     updatedAt: now,
//   };

//   // push to posts
//   posts.push(newPost);

//   res.status(201).json({
//     status: "success",
//     data: {
//       post: newPost,
//     },
//   });
// });

// export const updatePost = asyncHandler((req: Request, res: Response, next: NextFunction) => {
//   // Get post index in the posts
//   const postIndex = posts.findIndex((post) => post.id === req.params.id);
//   if (postIndex === -1) {
//     const err = new AppError("Post not found", 404);
//     next(err);
//     return;
//   }

//   // Grab the post from posts based on the index
//   const post = posts[postIndex];

//   if (!post) {
//     const err = new AppError("Post not found", 404);
//     next(err);
//     return;
//   }

//   // Authentication - check if user exists first
//   if (!req.user) {
//     const err = new AppError("Authentication. required", 401);
//     next(err);
//     return;
//   }

//   // Check if author id matches user id
//   if (post.authorId !== req.user.id) {
//     const err = new AppError("You are not authorized to edit this post", 403);
//     next(err);
//     return;
//   }
//   // get safeParse schema from req body
//   const result = updatePostSchema.safeParse(req.body);
//   if (!result.success) {
//     const err = new AppError(result.error.issues[0]?.message ?? "Invalid input", 400);
//     next(err);
//     return;
//   }

//   // Create updated post object
//   const updatedPost = {
//     ...post,
//     title: result.data.title ?? post.title,
//     content: result.data.content ?? post.content,
//     updatedAt: new Date().toISOString(),
//   };

//   posts.splice(postIndex, 1, updatedPost);

//   res.status(200).json({
//     status: "success",
//     data: { post: updatedPost },
//   });
// });

// export const deletePost = asyncHandler((req: Request, res: Response, next: NextFunction) => {
//   // Get post index in the posts
//   const postIndex = posts.findIndex((post) => post.id === req.params.id);
//   if (postIndex === -1) {
//     const err = new AppError("Post not found", 404);
//     next(err);
//     return;
//   }

//   // Grab the post from posts based on the index
//   const post = posts[postIndex];

//   if (!post) {
//     const err = new AppError("Post not found", 404);
//     next(err);
//     return;
//   }

//   // Authentication - check if user exists first
//   if (!req.user) {
//     const err = new AppError("Authentication. required", 401);
//     next(err);
//     return;
//   }

//   // Check if author id matches user id
//   if (post.authorId !== req.user.id) {
//     const err = new AppError("You are not authorized to edit this post", 403);
//     next(err);
//     return;
//   }

//   posts.splice(postIndex, 1);
//   res.status(204).send();
// });
