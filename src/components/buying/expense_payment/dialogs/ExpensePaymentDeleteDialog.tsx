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

interface ExpensePaymentDeleteDialogProps {
  className?: string;
  id?: number;
  sequential?: string;
  open: boolean;
  deletePayment: () => void;
  isDeletionPending?: boolean;
  onClose: () => void;
  hasInvoices?: boolean;
}

export const ExpensePaymentDeleteDialog: React.FC<ExpensePaymentDeleteDialogProps> = ({
  className,
  id,
  open,
  deletePayment,
  isDeletionPending,
  hasInvoices = false,
  sequential,
  onClose
}) => {
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');
  const isDesktop = useMediaQuery('(min-width: 1500px)');

  const handleConfirm = () => {
    deletePayment();
  };

  const header = (
    <div className="space-y-2">
      <Label className="leading-5">
        Voulez-vous vraiment supprimer le paiement N°{' '}
        <span className="font-semibold">{sequential}</span> ?
      </Label>
      {hasInvoices && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          {tInvoicing('payment.delete_invoices_warning')}
        </p>
      )}
    </div>
  );

  const footer = (
    <div className="flex gap-2 mt-2 items-center justify-center">
      <Button
        className="w-1/2 flex gap-2"
        onClick={onClose}
        disabled={isDeletionPending}
      >
        <X />
        Annuler
      </Button>
      <Button
        className="w-1/2 flex gap-2"
        onClick={handleConfirm}
        disabled={isDeletionPending}
      >
        <Check />
        Confirmer
        {isDeletionPending && (
          <Spinner className="ml-2" size={'small'} />
        )}
      </Button>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={!isDeletionPending ? onClose : undefined}>
        <DialogContent className={cn('max-w-[30vw] p-8', className)}>
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
  }

  return (
    <Drawer open={open} onClose={!isDeletionPending ? onClose : undefined}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle />
          <DrawerDescription className="flex gap-2 pt-4 items-center px-2">
            {header}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="border-t pt-2">
          {footer}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};