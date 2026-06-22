// Temporary in-memory storing

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
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

export const db = {
  users: [
    {
      id: "1",
      name: "Ibrahim",
      email: "IB@gmail.com",
      password: "IBRahim123!!!",
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
  ] as Post[],
};

// export const users: User[] = [
//   {
//     id: "1",
//     name: "Ibrahim",
//     email: "IB@gmail.com",
//     password: "IBRahim123!!!",
//     createdAt: now,
//   },
// ];

// export const posts: Post[] = [
//   {
//     id: "1",
//     authorId: "1",
//     title: "Learn Express in 2 weeks",
//     content: "This article provides how to learn express in two weeks",
//     createdAt: now,
//     updatedAt: now,
//   },
// ];
