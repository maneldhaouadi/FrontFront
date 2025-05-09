// src/app/buying/expense_quotation/dialogs/ExpenseQuotationDownloadDialog.tsx
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TemplateType } from '@/types/template';
import { useQuery } from '@tanstack/react-query';
import { templateApi } from '@/api';

interface ExpenseQuotationDownloadDialogProps {
  id: number;
  open: boolean;
  onDownload: (templateId?: number) => void;
  isDownloadPending?: boolean;
  onClose: () => void;
}

export const ExpenseQuotationDownloadDialog: React.FC<ExpenseQuotationDownloadDialogProps> = ({
  id,
  open,
  onDownload,
  isDownloadPending = false,
  onClose,
}) => {
  const { t: tCommon } = useTranslation('common');
  const [selectedTemplate, setSelectedTemplate] = React.useState<number | null>(null);

  // Fetch des templates disponibles
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', TemplateType.QUOTATION],
    queryFn: async () => {
      const data = await templateApi.findByType(TemplateType.QUOTATION);
      return data;
    }
  });

  const handleDownload = () => {
    onDownload(selectedTemplate || undefined);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-[30vw] py-5 px-4')}>
        <DialogHeader className="text-left">
          <DialogTitle>Télécharger le devis</DialogTitle>
          <DialogDescription className="pt-4">
            <div className="space-y-4">
              <Label>Sélectionnez un modèle :</Label>
              
              {isLoading ? (
                <div className="flex justify-center">
                  <Spinner size="medium" />
                </div>
              ) : (
                <RadioGroup 
                  value={selectedTemplate?.toString() || ''}
                  onValueChange={(value) => setSelectedTemplate(value ? Number(value) : null)}
                >
                  
                  {templates?.map((template) => (
                    <div key={template.id} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={template.id.toString()} 
                        id={`template-${template.id}`} 
                      />
                      <Label htmlFor={`template-${template.id}`}>{template.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" /> {tCommon('commands.cancel')}
          </Button>
          <Button onClick={handleDownload} disabled={isDownloadPending}>
            <Check className="h-4 w-4 mr-2" /> 
            {tCommon('commands.download')}
            <Spinner size={'small'} show={isDownloadPending} className="ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};