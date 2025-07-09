import { signIn } from "@/auth";

export const GET = async () => {
  await signIn("keycloak");
};
