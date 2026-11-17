import { JWTPayload } from "jose";

export interface EndatixJwtPayload extends JWTPayload {
  permission?: string[];
  role?: string[];
  tid?: string;
  act?: string;
}
