import { z } from "zod";

/**
 * Shared parse helper — keeps error reporting identical across every
 * scoped env schema (db, app, future scopes) without duplicating the
 * treeifyError formatting logic in each file.
 */

export const parseEnv = <T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  label: string
): z.infer<T> => {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    console.error(`❌ Invalid environment variables (${label}):\n`);

    const tree = z.treeifyError(parsed.error);

    for (const [key, node] of Object.entries(tree.properties ?? {})) {
      if (node?.errors.length) {
        console.error(`  ${key}: ${node.errors.join(", ")}`);
      }
    }

    console.error("\nCheck your .env.development file against .env.example\n");
    process.exit(1);
  }

  return parsed.data;
};
