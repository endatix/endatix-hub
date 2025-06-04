import Link from "next/link";

const SignInLink = () => (
  <div className="mt-4 text-center text-sm">
    Already have an account?{" "}
    <Link href="/login" className="underline" tabIndex={4}>
      Sign in
    </Link>
  </div>
);

export default SignInLink;
