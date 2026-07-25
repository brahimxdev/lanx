export interface IRequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  deviceOs: string | null;
  deviceBrowser: string | null;
}

export interface IAuthenticatedUser {
  id: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: Date;
}
