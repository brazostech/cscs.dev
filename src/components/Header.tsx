"use client";

import { useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../stores/authStore";
import { Avatar } from "./catalyst/avatar";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Blog", href: "/blog" },
  { name: "Book Club", href: "/book-club" },
  { name: "Schedule", href: "/schedule" },
];

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const initials = getInitials(user?.name, user?.email);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
      >
        <div className="flex lg:flex-1">
          <a href="/" className="-m-1.5 flex items-center gap-2 p-1.5">
            <img
              alt="CSCS Logo"
              src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
              className="h-8 w-auto"
            />
            <span className="hidden font-semibold text-zinc-900 sm:block dark:text-white">
              CSCS
            </span>
          </a>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-zinc-700 dark:text-zinc-300"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-sm font-semibold text-zinc-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
            >
              {item.name}
            </a>
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-end lg:gap-x-2">
          {isAuthenticated ? (
            <a
              href="/account"
              className="flex items-center gap-x-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800"
            >
              <Avatar
                initials={initials}
                alt={user?.name || user?.email || "User"}
                className="size-6 bg-indigo-600 text-white"
              />
              <span className="max-w-[120px] truncate">{user?.name || user?.email}</span>
            </a>
          ) : (
            <div className="flex items-center gap-x-2">
              <a
                href="/login"
                className="text-sm font-semibold text-zinc-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
              >
                Sign in
              </a>
              <a
                href="/register"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Sign up
              </a>
            </div>
          )}
        </div>
      </nav>
      <Dialog
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
        className="lg:hidden"
      >
        <div className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-sm" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white p-6 sm:max-w-sm sm:ring-1 sm:ring-zinc-900/10 dark:bg-zinc-900 dark:sm:ring-white/10">
          <div className="flex items-center justify-between">
            <a href="/" className="-m-1.5 flex items-center gap-2 p-1.5">
              <img
                alt="CSCS Logo"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
                className="h-8 w-auto"
              />
              <span className="font-semibold text-zinc-900 dark:text-white">
                CSCS
              </span>
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-zinc-700 dark:text-zinc-300"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-zinc-500/10 dark:divide-white/10">
              <div className="space-y-2 py-6">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
              <div className="space-y-2 py-6">
                {isAuthenticated ? (
                  <a
                    href="/account"
                    className="-mx-3 flex items-center gap-x-3 rounded-lg px-3 py-2 text-base font-semibold text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800"
                  >
                    <Avatar
                      initials={initials}
                      alt={user?.name || user?.email || "User"}
                      className="size-8 bg-indigo-600 text-white"
                    />
                    <span>{user?.name || user?.email}</span>
                  </a>
                ) : (
                  <>
                    <a
                      href="/login"
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800"
                    >
                      Sign in
                    </a>
                    <a
                      href="/register"
                      className="-mx-3 block rounded-lg bg-indigo-600 px-3 py-2 text-base font-semibold text-white hover:bg-indigo-500"
                    >
                      Sign up
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
}
