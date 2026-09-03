"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "?";

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
            {session.user.role === "ADMIN" && (
              <Link href="/admin" className="hover:text-rose-600">
                Admin
              </Link>
            )}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 hover:shadow"
              >
                <span className="h-6 w-6 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center">
                  {initial}
                </span>
                <span className="text-gray-700">{session.user?.name}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border rounded-xl shadow-lg py-1 z-20">
                  <Link
                    href="/account"
                    className="block px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
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
