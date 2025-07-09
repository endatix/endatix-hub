import { signOut } from "@/auth";

export const GET = async (req: Request) => {
  console.log("req", req);
  
  await signOut({
    redirect: true,
    redirectTo: process.env.AUTH_URL,
  });
};
