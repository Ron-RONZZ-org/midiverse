export interface JwtPayload {
  sub: string;
  username: string;
  role: 'user' | 'content_manager' | 'administrator';
}

export interface UserFromToken {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'content_manager' | 'administrator';
  status: 'active' | 'suspended';
  suspendedUntil: Date | null;
}
