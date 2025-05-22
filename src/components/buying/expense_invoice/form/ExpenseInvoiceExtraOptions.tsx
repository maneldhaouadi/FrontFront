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
import { useExpenseInvoiceManager } from '../hooks/useExpenseInvoiceManager';


interface ExpenseInvoiceExtraOptionsProps {
  className?: string;
  loading?: boolean;
  onUploadAdditionalFiles: (files: File[]) => void;
  onUploadPdfFile?: (file: File | undefined) => void;
  isInspectMode?: boolean;
}

export const ExpenseInvoiceExtraOptions = ({
  className,
  loading,
  isInspectMode = false
}: ExpenseInvoiceExtraOptionsProps) => {
  const { t: tInvoicing } = useTranslation('invoicing');
  const invoiceManager = useExpenseInvoiceManager();

  // Gestion du fichier PDF unique
  

  // Gestion des fichiers supplémentaires
  const handleAdditionalFilesChange = (files: File[]) => {
    if (isInspectMode) return;
    if (files.length > invoiceManager.uploadedFiles.length) {
      // Ajouter de nouveaux fichiers
      const newFiles = files.filter(
        (file) => !invoiceManager.uploadedFiles.some((uploadedFile) => uploadedFile.file === file)
      );
      invoiceManager.set('uploadedFiles', [
        ...invoiceManager.uploadedFiles,
        ...newFiles.map((file) => ({ file })),
      ]);
    } else {
      // Supprimer les fichiers désélectionnés
      const updatedFiles = invoiceManager.uploadedFiles.filter((uploadedFile) =>
        files.some((file) => file === uploadedFile.file)
      );
      invoiceManager.set('uploadedFiles', updatedFiles);
    }
  };

  return (
    <Accordion type="multiple" className={cn(className, 'mx-1 border-b')}>
      {/* Section pour le fichier PDF */}
      

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
            maxFileCount={Infinity} // Permettre plusieurs fichiers
            value={invoiceManager.uploadedFiles?.map((d) => d.file)} // Afficher les fichiers existants
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
            <Label>{tInvoicing('invoice.attributes.notes')}</Label>
          </div>
        </AccordionTrigger>
        <AccordionContent className="m-5">
          <Textarea
            placeholder={tInvoicing('invoice.attributes.notes')}
            className="resize-none"
            value={invoiceManager.notes}
            onChange={(e) => invoiceManager.set('notes', e.target.value)}
            isPending={loading}
            rows={7}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};