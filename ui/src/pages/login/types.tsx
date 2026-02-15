export type UserData = {
  email: string;
  password: string;
};

export type LogoutData = {
  refresh_token: string;
};

export interface DecodedToken {
  ID?: number;
  Rol?: number;
  Username?: string;
  sub?: string;
  email?: string;
  exp: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}
