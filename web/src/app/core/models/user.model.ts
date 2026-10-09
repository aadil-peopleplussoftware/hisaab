export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: 'User' | 'Admin';
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

