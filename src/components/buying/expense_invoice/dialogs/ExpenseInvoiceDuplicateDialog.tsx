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
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface ExpenseInvoiceDuplicateDialogProps {
  className?: string;
  id: number;
  open: boolean;
  duplicateInvoice: (includeFiles: boolean) => void; // Fonction pour dupliquer la facture
  isDuplicationPending?: boolean; // Indique si la duplication est en cours
  onClose: () => void; // Fonction pour fermer la boîte de dialogue
}

export const ExpenseInvoiceDuplicateDialog: React.FC<ExpenseInvoiceDuplicateDialogProps> = ({
  className,
  id,
  open,
  duplicateInvoice,
  isDuplicationPending = false,
  onClose,
}) => {
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');
  const [includeFiles, setIncludeFiles] = React.useState(false); // État pour inclure les fichiers

  const header = (
    <Label className="leading-5">
      Voulez-vous vraiment dupliquer cette facture ?
    </Label>
  );

  const content = (
    <div className="flex gap-2 items-center">
      {/* Case à cocher pour inclure les fichiers */}
      <Checkbox
        checked={includeFiles}
        onCheckedChange={() => setIncludeFiles(!includeFiles)}
      />{' '}
      <Label>Voulez-vous également dupliquer les fichiers ?</Label>
    </div>
  );

  const footer = (
    <div className="flex gap-2 mt-2 items-center justify-center">
      {/* Bouton pour confirmer la duplication */}
      <Button
        className="w-1/2 flex gap-1"
        onClick={() => {
          duplicateInvoice(includeFiles); // Appeler la fonction de duplication avec l'état includeFiles
          setIncludeFiles(false); // Réinitialiser l'état après la duplication
        }}
      >
        <Check className="h-4 w-4" />
        {tCommon('commands.duplicate')}
        {/* Afficher un spinner pendant la duplication */}
        <Spinner size={'small'} show={isDuplicationPending} />
      </Button>
      {/* Bouton pour annuler */}
      <Button
        className="w-1/2 flex gap-1"
        variant={'secondary'}
        onClick={() => onClose()}
      >
        <X className="h-4 w-4" /> {tCommon('commands.cancel')}
      </Button>
    </div>
  );

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
};