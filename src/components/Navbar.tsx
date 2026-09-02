"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b bg-white sticky top-0 z-10">
      <Link href="/" className="flex items-center gap-2 text-xl font-bold text-rose-600">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" alt="" className="h-7 w-7" />
        roomsalike
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-rose-600">
          Browse
        </Link>
        {session ? (
          <>
            <Link href="/host/dashboard" className="hover:text-rose-600">
              Host
            </Link>
            <Link href="/bookings" className="hover:text-rose-600">
              My Bookings
            </Link>
            <Link href="/messages" className="hover:text-rose-600">
              Messages
            </Link>
            <Link href="/verify" className="hover:text-rose-600">
              Verify ID
            </Link>
            {session.user.role === "ADMIN" && (
              <Link href="/admin" className="hover:text-rose-600">
                Admin
              </Link>
            )}
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{session.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full border px-3 py-1.5 hover:shadow"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full border px-3 py-1.5 hover:shadow"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-rose-600 text-white px-3 py-1.5 hover:bg-rose-700"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
