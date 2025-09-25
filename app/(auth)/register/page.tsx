import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Suspense } from "react"
import { UserAuthForm } from "@/components/forms/user-auth-form"

export const metadata = {
  title: "Register",
  description: "Create a new JetSet Direct account.",
}

export default function RegisterPage() {
  return (
    <div className="container grid h-screen w-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Login link in top corner */}
      <Link
        href="/login"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute right-4 top-4 md:right-8 md:top-8"
        )}
      >
        Login
      </Link>

      {/* Left side (hidden on mobile) */}
      <div className="hidden h-full bg-muted lg:block" />

      {/* Right side (form content) */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            {/* JetSet logo */}
            <Image
              src="/logo.png"
              alt="JetSet Direct"
              width={120}
              height={120}
              className="mx-auto"
              priority
            />
            <h1 className="text-2xl font-semibold tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Use Google or sign up with your email and password
            </p>
          </div>

          {/* Auth form (supports registration) */}
          <Suspense>
            <UserAuthForm type="register" />
          </Suspense>

          {/* Terms footer */}
          <p className="px-8 text-center text-sm text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link
              href="/terms"
              className="hover:text-brand underline underline-offset-4"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="hover:text-brand underline underline-offset-4"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
