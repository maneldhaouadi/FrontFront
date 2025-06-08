import React from 'react';
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
import { Spinner } from '@/components/common/Spinner';
import { Check, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/other/useMediaQuery';
import { Label } from '@/components/ui/label';

interface ArticleDeleteDialogProps {
  id?: number;
  reference?: string;
  open: boolean;
  deleteArticle: () => void;
  isDeletionPending?: boolean;
  onClose: () => void;
}

export const ArticleDeleteDialog: React.FC<ArticleDeleteDialogProps> = ({
  id,
  reference,
  open,
  deleteArticle,
  isDeletionPending,
  onClose,
}) => {
  const isDesktop = useMediaQuery('(min-width: 1500px)');

  const header = (
    <Label className="leading-5">
      Voulez-vous vraiment supprimer l'article <span className="font-semibold">{reference}</span> ?
    </Label>
  );

  const footer = (
    <div className="flex gap-2 mt-2 items-center justify-center">
      <Button
        className="w-1/2 flex gap-2"
        onClick={() => {
          id && deleteArticle();
          onClose();
        }}>
        <Check />
        Supprimer
        <Spinner className="ml-2" size={'small'} show={isDeletionPending} />
      </Button>
      <Button
        className="w-1/2 flex gap-2"
        variant={'secondary'}
        onClick={onClose}>
        <X />
        Annuler
      </Button>
    </div>
  );

  if (isDesktop)
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[30vw] p-8">
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