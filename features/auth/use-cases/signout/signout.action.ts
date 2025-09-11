"use server";

import { signOut } from "@/auth";
import { SIGNIN_PATH } from "../../infrastructure/auth-constants";

export async function logoutAction() {
  await signOut({
    redirectTo: SIGNIN_PATH,
  });
}
