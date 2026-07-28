'use client';

import React, { ReactNode } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  
} from '@/components/ui/dialog';
import { cn } from '@/src/lib/utils';
import { DialogDescription } from '@radix-ui/react-dialog';


interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  className?: string;
  children?: ReactNode;
  handleClick?: () => void;
  buttonText?: string;
  image?: string;
  buttonIcon?: string;
  disabled?: boolean;
}

const MeetingModal = ({
  isOpen,
  onClose,
  title,
  className,
  children,
  handleClick,
  buttonText,
  image,
  buttonIcon,
  disabled = false,
}: MeetingModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex w-full max-w-[520px] flex-col gap-6 border-none bg-black px-6 py-9 text-white">
        <DialogTitle className={cn('text-3xl font-bold leading-[42px]', className)}>
          {title}
        </DialogTitle>
        <DialogDescription className="hidden">
          Dialog containing meeting details and actions.
        </DialogDescription>

        <div className="flex flex-col gap-6">
          {image && (
            <div className="flex justify-center">
              <Image src={image} alt="Modal image" width={72} height={72} />
            </div>
          )}

          {children}

          {buttonText && (
            <button
              className="bg-blue-600 px-4 py-2 rounded-md flex items-center justify-center gap-2 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
              onClick={handleClick}
              disabled={disabled}
            >
              {buttonIcon && (
                <Image src={buttonIcon} alt="Button icon" width={13} height={13} />
              )}
              {buttonText}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingModal;
