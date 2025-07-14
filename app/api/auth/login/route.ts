import { signIn } from "@/auth";

// TODO: consider removing this route and using the next-auth methods from server actions
export const GET = async () => {
  await signIn("keycloak");
};
