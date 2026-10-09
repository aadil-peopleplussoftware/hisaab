export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: 'User' | 'Admin';
  timezone: string;
  locale: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: User;
}
