import { Metadata } from 'next';
import React, { ReactNode } from 'react';
import HomeLayoutClient from '../../../components/HomeLayoutClient';

export const metadata: Metadata = {
  title: "UYAO",
  description: "Video conferencing app",
  icons:{
    icon:"/icons/kkk.png"
  }
};

const HomeLayout = ({ children }: { children: ReactNode }) => {
    return (
        <HomeLayoutClient>
            {children}
        </HomeLayoutClient>
    );
};

export default HomeLayout;
