import React from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/other/useMediaQuery';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Checkbox } from '@/components/ui/checkbox';

interface DuplicateParams {
  id: number;
  includeFiles: boolean;
}

interface ExpenseQuotationDuplicateDialogProps {
  className?: string;
  id: number;
  open: boolean;
  duplicateQuotation: (params: { includeFiles: boolean }) => void; // Modifié ici
  isDuplicationPending?: boolean;
  onClose: () => void;
}

export const ExpenseQuotationDuplicateDialog: React.FC<ExpenseQuotationDuplicateDialogProps> = ({
  className,
  id,
  open,
  duplicateQuotation,
  isDuplicationPending = false,
  onClose,
}) => {
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');
  const isDesktop = useMediaQuery('(min-width: 1500px)');
  const [includeFiles, setIncludeFiles] = React.useState(false);

  const handleDuplicate = () => {
    duplicateQuotation({ includeFiles }); // Maintenant compatible
    setIncludeFiles(false);
  };

  const header = (
    <Label className="leading-5">
      {tInvoicing('Voulez-vous vraiment dupliquer ce devis?')}
    </Label>
  );

  const content = (
    <div className="flex gap-2 items-center">
      <Checkbox
        checked={includeFiles}
        onCheckedChange={() => setIncludeFiles(!includeFiles)}
      />
      <Label>{tInvoicing('quotation.file_duplication')}</Label>
    </div>
  );

  const footer = (
    <div className="flex gap-2 mt-2 items-center justify-center">
     <Button
      onClick={handleDuplicate}
      disabled={isDuplicationPending}className="w-1/2 flex gap-1"
      >
        {isDuplicationPending ? (
          <>
            <Spinner size="small" />
            {tCommon('status.duplicating')}
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            {tCommon('commands.duplicate')}
          </>
        )}
      </Button>
      <Button
        className="w-1/2 flex gap-1"
        variant="secondary"
        onClick={onClose}
        disabled={isDuplicationPending}
      >
        <X className="h-4 w-4" />
        {tCommon('commands.cancel')}
      </Button>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className={cn('max-w-[30vw] py-5 px-4', className)}>
          <DialogHeader className="text-left">
            <DialogTitle>{header}</DialogTitle>
            <DialogDescription className="flex gap-2 pt-4 items-center px-2">
              {content}
            </DialogDescription>
          </DialogHeader>
          {footer}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{header}</DrawerTitle>
          <DrawerDescription className="flex gap-2 items-center p-4">
            {content}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="border-t pt-2">{footer}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};