// Parsed from the X-User-Id header set by middleware after JWT verification.
// Route handlers read this instead of re-verifying the token.
export type AuthContext = {
  userId: string;
};

// Shape of the JWT payload we sign in
export type TokenPayload = {
  sub: string;   // userId (cuid)
  email: string;
  iat?: number;
  exp?: number;
};