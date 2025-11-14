export interface JwtPayload {
  sub: string;
  username: string;
}

export interface UserFromToken {
  id: string;
  email: string;
  username: string;
}
