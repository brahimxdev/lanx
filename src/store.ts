// Temporary in-memory storing

import bcrypt from "bcryptjs";

export interface User {
  id: string;
  name: string;
  email: string;
  plainPass?: string;
  passwordHash: string;
  role?: string | undefined;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const now = new Date().toISOString();

const hashPassword = (pass: string): string => {
  const hash = bcrypt.hashSync(pass, 10);
  return hash;
};

export const db = {
  users: [
    {
      id: crypto.randomUUID(),
      name: "Ibrahim",
      email: "ib@gmail.com",
      plainPass: "IBRahim123!!!",
      passwordHash: hashPassword("IBRahim123!!!"),
      role: "BE Engineer",
      createdAt: now,
    },

    {
      id: crypto.randomUUID(),
      name: "Olalekan",
      email: "ola@gmail.com",
      plainPass: "IBRahim123!!!",
      passwordHash: hashPassword("IBRahim123!!!"),
      role: "Cloud Engineer",
      createdAt: now,
    },
  ] as User[],
  posts: [
    {
      id: "1",
      authorId: "1",
      title: "Learn Express in 2 weeks",
      content: "This article provides how to learn express in two weeks",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "2",
      authorId: "2",
      title: "Learn JAva in 2 weeks",
      content: "This article provides how to learn Java in two weeks",
      createdAt: now,
      updatedAt: now,
    },

    {
      id: "3",
      authorId: "3",
      title: "Learn Go in 2 weeks",
      content: "This article provides how to learn Go in two weeks",
      createdAt: now,
      updatedAt: now,
    },
  ] as Post[],
};
