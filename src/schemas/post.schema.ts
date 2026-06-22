import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  content: z.string().trim().min(10, "Content must be at least 10 characters").max(10000),
});

export const updatePostSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    content: z.string().trim().min(10).max(10000).optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "Please enter atleast one field to update",
  });

//
export const postIdParamsSchema = z.object({ id: z.uuid("Invalid post id format") });

export const postQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  author: z.uuid().optional()
})
