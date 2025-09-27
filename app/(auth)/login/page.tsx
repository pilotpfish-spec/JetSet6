"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="JetSet Direct Logo"
            width={140}
            height={40}
            priority
          />
        </div>

        {/* Title */}
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Sign in
        </h1>

        {/* Email + Password Form */}
        <form
          method="post"
          action="/api/auth/callback/credentials"
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-2 flex items-center"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-indigo-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-pink-500 py-3 text-white font-semibold transition hover:opacity-90"
          >
            Login
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 text-sm text-gray-500">or</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Google Login */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/account" })}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 py-3 text-gray-700 font-medium transition hover:bg-gray-50"
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
          >
            <path
              fill="#4285F4"
              d="M24 9.5c3.94 0 6.61 1.7 8.13 3.13l6-6C34.07 3.66 29.5 2 24 2 14.94 2 7.13 7.86 4 16.06l7.19 5.59C12.7 14.5 17.94 9.5 24 9.5z"
            />
            <path
              fill="#34A853"
              d="M46.5 24.5c0-1.63-.15-3.19-.43-4.69H24v9.38h12.69c-.55 2.88-2.19 5.31-4.69 6.94l7.19 5.59C43.7 37.94 46.5 31.75 46.5 24.5z"
            />
            <path
              fill="#FBBC05"
              d="M11.19 28.44A14.42 14.42 0 0 1 9.5 24c0-1.56.28-3.06.69-4.44L3 13.97C1.72 16.94 1 20.38 1 24s.72 7.06 2 10.03l7.19-5.59z"
            />
            <path
              fill="#EA4335"
              d="M24 47c6.5 0 11.94-2.16 15.94-5.88l-7.19-5.59C30.88 37.78 27.69 39 24 39c-6.06 0-11.3-5-12.81-11.06l-7.19 5.59C7.13 40.14 14.94 47 24 47z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <Link href="/register" className="text-indigo-600 hover:underline">
            Sign up
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-gray-400">
          You’ll be returned to your account after signing in.
        </p>
      </div>
    </div>
  );
}


