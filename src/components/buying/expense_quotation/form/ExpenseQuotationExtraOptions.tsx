import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FileUploader } from '@/components/ui/file-uploader';
import { Textarea } from '@/components/ui/textarea';
import { Files, NotebookTabs } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import React from 'react';
import { useExpenseQuotationManager } from '../hooks/useExpenseQuotationManager';

interface ExpensequotationExtraOptionsProps {
  className?: string;
  loading?: boolean;
  onUploadAdditionalFiles: (files: File[]) => void;
  onUploadPdfFile?: (file: File | undefined) => void;
  isInspectMode?: boolean; // Ajout de la nouvelle prop
}

export const ExpensequotationExtraOptions = ({
  className,
  loading,
  isInspectMode = false, // Valeur par défaut
}: ExpensequotationExtraOptionsProps) => {
  const { t: tInvoicing } = useTranslation('invoicing');
  const quotationManager = useExpenseQuotationManager();

  const handleAdditionalFilesChange = (files: File[]) => {
    if (isInspectMode) return; // Ne rien faire en mode inspection
    
    if (files.length > quotationManager.uploadedFiles.length) {
      // Ajouter de nouveaux fichiers
      const newFiles = files.filter(
        (file) => !quotationManager.uploadedFiles.some((uploadedFile) => uploadedFile.file === file)
      );
      quotationManager.set('uploadedFiles', [
        ...quotationManager.uploadedFiles,
        ...newFiles.map((file) => ({ file })),
      ]);
    } else {
      // Supprimer les fichiers désélectionnés
      const updatedFiles = quotationManager.uploadedFiles.filter((uploadedFile) =>
        files.some((file) => file === uploadedFile.file)
      );
      quotationManager.set('uploadedFiles', updatedFiles);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isInspectMode) {
      quotationManager.set('notes', e.target.value);
    }
  };

  return (
    <Accordion type="multiple" className={cn(className, 'mx-1 border-b')}>
      {/* Section pour les fichiers supplémentaires */}
      <AccordionItem value="item-2">
        <AccordionTrigger>
          <div className="flex gap-2 justify-center items-center">
            <Files />
            <Label>Pièces jointes</Label>
          </div>
        </AccordionTrigger>
        <AccordionContent className="m-5">
          <FileUploader
            accept={{
              'image/*': [],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
              'application/msword': [],
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [],
              'application/vnd.ms-excel': [],
            }}
            className="my-5"
            maxFileCount={Infinity}
            value={quotationManager.uploadedFiles?.map((d) => d.file)}
            onValueChange={handleAdditionalFilesChange}
            disabled={isInspectMode || loading} // Désactiver en mode inspection ou pendant le chargement
          />
        </AccordionContent>
      </AccordionItem>

      {/* Section pour les notes */}
      <AccordionItem value="item-3">
        <AccordionTrigger>
          <div className="flex gap-2 justify-center items-center">
            <NotebookTabs />
            <Label>{tInvoicing('quotation.attributes.notes')}</Label>
          </div>
        </AccordionTrigger>
        <AccordionContent className="m-5">
          <Textarea
            placeholder={tInvoicing('quotation.attributes.notes')}
            className="resize-none"
            value={quotationManager.notes}
            onChange={handleNotesChange}
            disabled={isInspectMode || loading} // Désactiver en mode inspection ou pendant le chargement
            rows={7}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};