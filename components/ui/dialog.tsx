import { cn } from '@/src/lib/utils';
import * as RadixDialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import React, { FC } from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: FC<DialogProps> = ({ open, onOpenChange, children }) => (
  <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
    {children}
  </RadixDialog.Root>
);

interface DialogContentProps {
  title?: string;
  visuallyHideTitle?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const DialogContent: FC<DialogContentProps> = ({
  title,
  visuallyHideTitle = false,
  children,
  className,
  ...props
}) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
    <RadixDialog.Content
      {...props}
      className={cn(
        'fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white p-6 rounded-lg shadow-xl mx-auto focus:outline-none',
        className
      )}
    >
      {title && visuallyHideTitle ? (
        <VisuallyHidden>
          <DialogTitle>{title}</DialogTitle>
        </VisuallyHidden>
      ) : (
        title && <DialogTitle>{title}</DialogTitle>
      )}
      {children}
    </RadixDialog.Content>
  </RadixDialog.Portal>
);

export const DialogHeader: FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <div className={cn('dialog-header', className)}>{children}</div>
);

export const DialogTitle: FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <RadixDialog.Title asChild>
    <h2 className={cn('dialog-title text-xl font-bold', className)}>{children}</h2>
  </RadixDialog.Title>
);
