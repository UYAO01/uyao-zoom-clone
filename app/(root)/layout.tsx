import { Metadata } from "next";

import { ClerkProvider } from '@clerk/nextjs';
import React, { ReactNode } from "react";
import StreamVideoProviderWrapper from "@/providers/StreamClientProvider";

export const metadata: Metadata = {
  title: "UYAO",
  description: "Video conferencing app",
  icons:{
    icon:"/icons/kkk.png"
  }
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <ClerkProvider>
      <main>
        <StreamVideoProviderWrapper>
          {children}
        </StreamVideoProviderWrapper>
      </main>
    </ClerkProvider>
  );
};

export default RootLayout;
