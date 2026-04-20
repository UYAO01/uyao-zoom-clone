'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { sidebarLinks } from './consistant';
import { cn } from '@/src/lib/utils';
import { useIsEmployee } from '@/hooks/useIsEmployee';
import { UserCheck } from 'lucide-react';


const Sidebar = () => {
  const pathname = usePathname();
  const isEmployee = useIsEmployee();
  const [isNavigating, setIsNavigating] = useState(false);

  // Ficha loading ukifika kwenye page mpya
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  return (
    <section className="sticky left-0 top-0 flex h-screen w-fit flex-col  justify-between  bg-card p-6 pt-28 text-foreground max-lg:hidden lg:w-[264px]">
      <div className="flex flex-1 flex-col gap-6">
        
        {/* LOADING OVERLAY - INAONYESHA KUFIFIA NA SPINNER YENYE VIDUARA */}
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

        {sidebarLinks.map((link) => {
          const isActive = link.route === '/'
            ? pathname === link.route
            : pathname.startsWith(link.route);

          return (
            <Link
              href={link.route}
              key={link.label}
              onClick={() => { if (!isActive) setIsNavigating(true); }}
              className={cn(
                'flex gap-4 items-center p-4 rounded-lg justify-start transition-transform duration-200 ease-in-out hover:bg-muted hover:scale-95 active:bg-muted/80 active:scale-90',
                isActive && 'bg-primary'
              )}
            >
             <Image
               src= {link.imgUrl}
             alt={link.label} 
             width={24} 
             height={24} 
             />

              <p className="text-lg font-semibold">
                {link.label}
              </p>
            </Link>
          );
        })}

        {/* Kitufe Kipya cha Employee (Kinaonekana tu kama ni Muajiriwa) */}
        {isEmployee && (
          <Link
            onClick={() => setIsNavigating(true)}
            href="/personal-room?view=employee_dashboard"
            className={cn(
              'flex gap-4 items-center p-4 rounded-lg justify-start transition-transform duration-200 ease-in-out hover:bg-muted hover:scale-95 active:bg-muted/80 active:scale-90'
            )}
          >
            <UserCheck className="w-6 h-6 text-white" />
            <p className="text-lg font-semibold">
              Employee Dashboard
            </p>
          </Link>
        )}
      </div>
    </section>
  );
};

export default Sidebar;
