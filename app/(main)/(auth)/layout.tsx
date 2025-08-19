import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 -m-4 sm:-mx-6 sm:-my-4 sm:-ml-14">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[400px] gap-6">
          {children}
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
}
