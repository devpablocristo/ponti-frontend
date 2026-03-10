import { createContext } from "react";
import { DecodedToken, UserData } from "../types";

export interface AuthContextType {
  loading: boolean;
  isAuthenticated: boolean;
  user: DecodedToken | null;
  login: (data: UserData) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
