"use client";

import { signIn } from "../sign-in.action";

export default function SignInButton() {
  return (
    <form action={signIn}>
      <button type="submit">Sign in</button>
    </form>
  );
}
