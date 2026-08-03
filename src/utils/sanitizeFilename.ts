import path from "node:path";

export const sanitizeFilename = (filename: string): string => {
  const base = path.basename(filename);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
};
