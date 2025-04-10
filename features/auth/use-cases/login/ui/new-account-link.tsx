import Link from "next/link";

const NewAccountLink = () => (
  <div className="mt-4 text-center text-sm">
    Don&apos;t have an account?{" "}
    <Link
      href="/create-account"
      className="underline"
      tabIndex={5}
    >
      Create Free Account
    </Link>
  </div>
);

export default NewAccountLink;
