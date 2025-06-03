import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/common';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/other/useMediaQuery';
import { Label } from '@/components/ui/label';

interface ExpenseQuotationActionDialogProps {
  className?: string;
  id?: number;
  action?: string;
  sequential: string;
  open: boolean;
  callback: () => void;
  isCallbackPending?: boolean;
  onClose: () => void;
}

export const ExpenseQuotationActionDialog: React.FC<ExpenseQuotationActionDialogProps> = ({
  className,
  id,
  action,
  sequential,
  open,
  callback,
  isCallbackPending,
  onClose
}) => {
  const { t: tCommon } = useTranslation('common');
  const isDesktop = useMediaQuery('(min-width: 1500px)');

  const header = (
    <Label className="leading-5">
      {action === "Initialiser" 
        ? "Voulez-vous vraiment réinitialiser tous les champs du devis ?" 
        : `Voulez-vous vraiment ${action?.toLowerCase()} le Devis N° `
      }
      {action !== "Initialiser" && (
        <span className="font-semibold">{sequential}</span>
      )}
      {action !== "Initialiser" && " ?"}
    </Label>
  );

  const footer = (
    <div className="flex gap-2 mt-2 items-center justify-center">
      <Button
        className="w-1/2 flex gap-2"
        onClick={() => {
          callback();
          onClose();
        }}
        variant="default"
      >
        <Check />
        Confirmer
        <Spinner className="ml-2" size={'small'} show={isCallbackPending} />
      </Button>
      <Button
        className="w-1/2 flex gap-2"
        variant="secondary"
        onClick={onClose}
      >
        <X />
        Annuler
      </Button>
    </div>
  );

  if (isDesktop)
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className={cn('max-w-[25vw] p-8', className)}>
          <DialogHeader>
            <DialogTitle />
            <DialogDescription className="flex gap-2 pt-4 items-center px-2">
              {header}
            </DialogDescription>
          </DialogHeader>
          {footer}
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle />
          <DrawerDescription className="flex gap-2 pt-4 items-center px-2">
            {header}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="border-t pt-2">{footer}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};