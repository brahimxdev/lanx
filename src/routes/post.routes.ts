// import { Router } from "express";
// import { requireAuth } from "@/middlewares/requireAuth.js";
// import {
//   getAllPosts,
//   getPostById,
//   createPost,
//   updatePost,
//   deletePost,
// } from "@/controllers/post.controller.js";
// import { validate } from "@/middlewares/validate.js";
// import {
//   createPostSchema,
//   postIdParamsSchema,
//   postQuerySchema,
//   updatePostSchema,
// } from "@/schemas/post.schema.js";

// export const router = Router();

// // public — validate query string for pagination
// router.get("/", validate(postQuerySchema), getAllPosts);

// // validate route param is a UUID
// router.get("/:id", validate(postIdParamsSchema), getPostById);

// // Routes with auth access
// router.post("/", requireAuth, validate(createPostSchema), createPost);
// router.patch(
//   "/:id",
//   requireAuth,
//   validate(postIdParamsSchema),
//   validate(updatePostSchema),
//   updatePost
// );
// router.delete("/:id", requireAuth, validate(postIdParamsSchema), deletePost);

// // router.route("/")
// //   .get(getAllPosts)
// //   .post(requireAuth, createPost)

// // //
// // router.route("/:id")
// //   .get(getPostById)
// //   .patch(requireAuth, updatePost)
// //   .delete(requireAuth, deletePost)
