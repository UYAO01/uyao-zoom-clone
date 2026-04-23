"use client";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"; 



import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarLinks } from "./consistant";
import { cn } from "@/src/lib/utils";
import { useIsEmployee } from "@/hooks/useIsEmployee";
import { UserCheck } from "lucide-react";
import { useState, useEffect } from "react";


const MobileNav = () => {
  const pathname = usePathname();
  const isEmployee = useIsEmployee();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);


  return (
    <div className="flex-between gap-5">
      <section className="w-full max-w-[264px]">
        
        {/* LOADING OVERLAY - MOBILE */}
        {isNavigating && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-16 h-16 animate-spin">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="absolute w-4 h-4 bg-blue-500 rounded-full"
                  style={{
                    top: `${50 - 50 * Math.cos((i * Math.PI) / 4)}%`,
                    left: `${50 + 50 * Math.sin((i * Math.PI) / 4)}%`,
                    transform: 'translate(-50%, -50%)',
                    opacity: 1 - i * 0.1,
                  }}
                ></div>
              ))}
            </div>
          </div>
        )}

        <Sheet>
          <SheetTrigger asChild>
            <Image
              src="/icons/hamburger.svg"
              width={32}
              height={32}
              alt="hamburger icon"
              className="cursor-pointer lg:hidden"
            />
          </SheetTrigger>

          <SheetContent side="left" className="border-none bg-blue-950/80 backdrop-blur-xl text-white">
            <SheetTitle className="sr-only"></SheetTitle>

            <Link href="/" className="flex items-center gap-1">
              <Image
                src="/icons/kkk.png"
                width={512}
                height={512}
                alt="UYAO LOGO"
                className="max-sm:size-10"
                priority
              />
              <p className="text-[26px] font-extrabold text-white">UYAO</p>
            </Link>

            <div className="flex h-[calc(100vh-72px)] flex-col justify-between overflow-y-auto text-white">
              <section className="flex h-full flex-col gap-6 pt-16">
                {sidebarLinks.map((link) => {
                  const isActive = link.route === '/'
                    ? pathname === link.route
                    : pathname.startsWith(link.route);

                  return (
                    <SheetClose asChild key={link.label}>
                      <Link
                        onClick={() => { if (!isActive) setIsNavigating(true); }}
                        href={link.route}
                        className={cn(
                          "flex gap-4 items-center p-4 rounded-lg w-full max-w-60 transition-all duration-200 ease-in-out",
                          isActive
                          ? "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-500/30 text-white"
                          : "hover:bg-white/10 hover:scale-95 active:bg-white/20 active:scale-90"
                        )}
                      >
                        <Image
                          src={link.imgUrl}
                          alt={link.label}
                          width={20}
                          height={20}
                        />
                        <p className={cn("font-semibold", { "font-bold": isActive })}>
                          {link.label}
                        </p>
                      </Link>
                    </SheetClose>
                  );
                })}

              {/* Kitufe Kipya cha Employee Dashboard */}
              {isEmployee && (
                <SheetClose asChild>
                  <Link
                    onClick={() => setIsNavigating(true)}
                    href="/personal-room?view=employee_dashboard"
                    className={cn(
                      "flex gap-4 items-center p-4 rounded-lg w-full max-w-60 transition-all duration-200 ease-in-out",
                      "hover:bg-white/10 hover:scale-95 active:bg-white/20 active:scale-90"
                    )}
                  >
                    <UserCheck className="w-5 h-5 text-white" />
                    <p className="font-semibold">
                      Employee Dashboard
                    </p>
                  </Link>
                </SheetClose>
              )}
              </section>
            </div>
          </SheetContent>
        </Sheet>
      </section>
    </div>
  );
};

export default MobileNav;
