"use server";

import { signIn as rawSignIn } from "@/auth";

export const signIn = rawSignIn.bind(null, "keycloak");
