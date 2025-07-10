import Image from "next/image";
import CreateAccountForm from "@/features/auth/use-cases/create-account/ui/create-account-form";
import { Metadata } from "next";
import SignInLink from "@/features/auth/use-cases/create-account/ui/sign-in-link";
import { getSession } from "@/features/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Create account | Endatix Hub",
  description:
    "Create a new account in the Endatix Hub form management portal.",
  authors: [
    {
      name: "Endatix Team",
      url: "https://endatix.com",
    },
  ],
  openGraph: {
    description:
      "Create a new account in the Endatix Hub form management portal.",
    images: [
      {
        url: "/assets/endatix-og-image.jpg",
      },
    ],
  },
};

const CreateAccountPage = async () => {
  const user = await getSession();
  if (user.isLoggedIn) {
    redirect("/forms");
  }

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 -m-4 sm:-mx-6 sm:-my-4 sm:-ml-14">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[400px] gap-6">
          <>
            <CreateAccountForm />
            <SignInLink />
          </>
        </div>
      </div>
      <div className="hidden lg:flex lg:flex-col lg:justify-center lg:items-center lg:h-full">
        <div className="h-[60%] w-full flex items-center justify-center">
          <Image
            src="/assets/lines-and-stuff.svg"
            alt="Lines and dots pattern"
            width="600"
            height="600"
            className="w-auto h-full max-w-full max-h-full object-contain dark:brightness-[0.6] dark:grayscale"
          />
        </div>
      </div>
    </div>
  );
};

export default CreateAccountPage;
