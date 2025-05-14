import { Firm, Interlocutor } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectShimmer,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import React from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { UneditableCalendarDayPicker } from '@/components/ui/uneditable/uneditable-calendar-day-picker';
import { UneditableInput } from '@/components/ui/uneditable/uneditable-input';
import { DatePicker } from '@/components/ui/date-picker';
import { useExpenseInvoiceManager } from '../hooks/useExpenseInvoiceManager';
import { Card } from '@/components/ui/card';
import { UploadCloud, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/api';

interface ExpenseInvoiceGeneralInformationProps {
  className?: string;
  firms: any[];
  edit?: boolean;
  loading?: boolean;
  isInspectMode?: boolean;
  includeFiles?: boolean;
}

export const ExpenseInvoiceGeneralInformation = ({
  className,
  firms,
  edit = true,
  loading,
  isInspectMode = false,
  includeFiles = true, // Par défaut à true pour la rétro-compatibilité
}: ExpenseInvoiceGeneralInformationProps) => {
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');
  const router = useRouter();
  const invoiceManager = useExpenseInvoiceManager();
  const mainInterlocutor = invoiceManager.firm?.interlocutorsToFirm?.find((entry) => entry?.isMain);

  const validateSequentialNumber = (value: string) => {
    const sequentialNumberRegex = /^INV-\d{4,5}$/;
    return sequentialNumberRegex.test(value);
  };

  const handlePdfFileChange = (files: File[]) => {
    if (isInspectMode || !includeFiles) return;
    if (files.length > 0) {
      if (invoiceManager.pdfFile || invoiceManager.uploadPdfField) {
        toast.warning(tInvoicing('invoice.pdf_file_cannot_be_modified'));
        return;
      }
      const newFile = files[0];
      invoiceManager.set('pdfFile', newFile);
      invoiceManager.set('uploadPdfField', { filename: newFile.name, file: newFile });
    }
  };

  const handleDownload = async () => {
    if (isInspectMode || !includeFiles) return;
    try {
      let fileToDownload: File | Blob | undefined;

      if (invoiceManager.pdfFile) {
        fileToDownload = invoiceManager.pdfFile;
      } else if (invoiceManager.uploadPdfField?.filename) {
        const response = await fetch(invoiceManager.uploadPdfField.filename);
        if (!response.ok) throw new Error('Failed to fetch the file');
        const blob = await response.blob();
        fileToDownload = blob;
      } else {
        toast.error(tInvoicing('invoice.no_file_to_download'));
        return;
      }

      const url = URL.createObjectURL(fileToDownload);
      const link = document.createElement('a');
      link.href = url;
      link.download = invoiceManager.uploadPdfField?.filename || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error(tInvoicing('invoice.download_failed'));
    }
  };

  const handleRemovePdfFile = async () => {
    if (isInspectMode || !includeFiles) return;
    try {
      if (invoiceManager.pdfFileId) {
        if (typeof invoiceManager.id === 'number') {
          await api.expense_invoice.deletePdfFile(invoiceManager.id);
          invoiceManager.set('pdfFile', null);
          invoiceManager.set('pdfFileId', null);
          invoiceManager.set('uploadPdfField', null);
          toast.success(tInvoicing('invoice.pdf_file_removed_successfully'));
        } else {
          throw new Error('invoice ID is undefined');
        }
      } else {
        toast.warning(tInvoicing('invoice.no_pdf_file_to_remove'));
      }
    } catch (error) {
      console.error('Error removing PDF file:', error);
      toast.error(tInvoicing('invoice.pdf_file_removal_failed'));
    }
  };

  return (
    <div className={cn(className, 'space-y-2')}>
      <div className="flex gap-4">
        {/* Section Pièces jointes - Conditionnée par includeFiles */}
        {includeFiles && (
          <div className="w-1/2">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="file-upload" className="text-xs font-semibold mb-1">
                {tInvoicing('invoice.attributes.files')}
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept="application/pdf, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, image/png, image/jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const newFile = e.target.files[0];
                    handlePdfFileChange([newFile]);
                  }
                }}
                disabled={!!invoiceManager.pdfFile || !!invoiceManager.uploadPdfField || !includeFiles}
              />
            </div>

            {/* Affichage conditionnel du fichier PDF */}
            {includeFiles && invoiceManager.uploadPdfField && (
              <div className="mt-2 grid grid-cols-1 gap-1">
                <div className="flex flex-col items-center p-2 border rounded-md bg-white max-w-[200px]">
                  <div className="w-full h-12 overflow-hidden mb-1">
                    <div className="flex justify-center items-center w-full h-full bg-gray-200 text-gray-500 text-xs">
                      <p>PDF</p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-600 truncate">
                    {invoiceManager.uploadPdfField.filename}
                  </p>
                  <div className="mt-1 flex justify-between gap-1 w-full">
                    <Button
                      variant="outline"
                      className="text-gray-500 border-gray-300 text-xs p-1 h-6"
                      onClick={handleRemovePdfFile}
                      disabled={!includeFiles}
                    >
                      Remove
                    </Button>
                    <Button
                      variant="outline"
                      className="text-gray-500 border-gray-300 text-xs p-1 h-6"
                      onClick={handleDownload}
                      disabled={!includeFiles}
                    >
                      <Download className="mr-1" size={14} /> Download
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section Date et Échéance */}
        <div className="w-1/2 flex flex-col gap-2">
          <div>
            <Label className="text-xs font-semibold mb-1">{tInvoicing('invoice.attributes.date')} (*)</Label>
            {edit ? (
              <DatePicker
                className="w-full h-8"
                value={invoiceManager?.date || new Date()}
                onChange={(value: Date) => invoiceManager.set('date', value)}
                isPending={loading}
              />
            ) : (
              <UneditableCalendarDayPicker value={invoiceManager?.date} />
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1">{tInvoicing('invoice.attributes.due_date')} (*)</Label>
            {edit ? (
              <DatePicker
                className="w-full h-8"
                value={invoiceManager?.dueDate || undefined}
                onChange={(value: Date) => invoiceManager.set('dueDate', value)}
                isPending={loading}
              />
            ) : (
              <UneditableCalendarDayPicker value={invoiceManager?.date} />
            )}
          </div>
        </div>
      </div>

      {/* Section Object et Numéro de Facture */}
      <div className="flex gap-1">
        <div className="w-2/3">
          <Label className="text-xs font-semibold mb-1">{tInvoicing('invoice.attributes.object')} (*)</Label>
          {edit ? (
            <Input
              className="w-full h-8"
              placeholder="Ex. Facture pour le 1er trimestre 2024"
              value={invoiceManager.object || ''}
              onChange={(e) => invoiceManager.set('object', e.target.value)}
              isPending={loading}
            />
          ) : (
            <UneditableInput value={invoiceManager.object} />
          )}
        </div>
        <div className="w-1/3">
  <Label className="text-xs font-semibold mb-1">{tInvoicing('invoice.singular')} N°</Label>
  {edit ? (
    <>
      <Input
        className={cn(
          "w-full h-8",
          (!invoiceManager.sequentialNumbr || 
          (invoiceManager.sequentialNumbr && 
          (!validateSequentialNumber(invoiceManager.sequentialNumbr))) && 
          "border-red-500 focus-visible:ring-red-500"
        ))}
        placeholder="Format: INV-1234"
        value={invoiceManager.sequentialNumbr || ''}
        onChange={async (e) => {
          const value = e.target.value;
          invoiceManager.set('sequentialNumbr', value);
          
          // Vérifier si le numéro existe seulement quand le format est valide
          if (validateSequentialNumber(value)) {
            try {
              const { exists } = await api.expense_invoice.checkSequentialNumber(value);
              if (exists) {
                toast.error(tInvoicing('invoice.sequential_number_exists'));
              }
            } catch (error) {
              console.error("Error checking sequential number:", error);
            }
          }
        }}
        isPending={loading}
      />
      {!invoiceManager.sequentialNumbr ? (
        <p className="text-xs text-red-500 mt-1">
          Le numéro de facture est requis
        </p>
      ) : invoiceManager.sequentialNumbr && 
         !validateSequentialNumber(invoiceManager.sequentialNumbr) ? (
        <p className="text-xs text-red-500 mt-1">
          Format invalide. Format attendu: INV-12345
        </p>
      ) : null}
    </>
  ) : (
    <UneditableInput value={invoiceManager.sequentialNumbr || ''} />
  )}
</div>
</div>

      {/* Section Firm et Interlocutor */}
      <div className="flex gap-1">
        <div className="w-1/2">
          <Label className="text-xs font-semibold mb-1">{tInvoicing('invoice.attributes.firm')} (*)</Label>
          {edit ? (
            <SelectShimmer isPending={loading}>
              <Select
                onValueChange={(e) => {
                  const firm = firms?.find((firm) => firm.id === parseInt(e));
                  invoiceManager.setFirm(firm);
                  invoiceManager.set('currency', firm?.currency);
                }}
                value={invoiceManager.firm?.id?.toString()}
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder={tInvoicing('invoice.associate_firm')} />
                </SelectTrigger>
                <SelectContent>
                  {firms?.map((firm: Partial<Firm>) => (
                    <SelectItem key={firm.id} value={firm.id?.toString() || ''}>
                      {firm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SelectShimmer>
          ) : (
            <UneditableInput value={invoiceManager?.firm?.name} />
          )}
        </div>
        <div className="w-1/2">
          <Label className="text-xs font-semibold mb-1">{tInvoicing('invoice.attributes.interlocutor')} (*)</Label>
          {edit ? (
            <SelectShimmer isPending={loading}>
              <Select
                disabled={!invoiceManager?.firm?.id}
                onValueChange={(e) => invoiceManager.setInterlocutor({ id: parseInt(e) } as Interlocutor)}
                value={invoiceManager.interlocutor?.id?.toString()}
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder={tInvoicing('invoice.associate_interlocutor')} />
                </SelectTrigger>
                <SelectContent>
                  {invoiceManager.firm?.interlocutorsToFirm?.map((entry: any) => (
                    <SelectItem key={entry.interlocutor?.id} value={entry.interlocutor?.id?.toString()}>
                      {entry.interlocutor?.name} {entry.interlocutor?.surname}{' '}
                      {entry.isMain && <span className="font-bold">({tCommon('words.main_m')})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SelectShimmer>
          ) : (
            <UneditableInput
              value={
                <div>
                  {invoiceManager?.interlocutor?.name} {invoiceManager.interlocutor?.surname}{' '}
                  {invoiceManager?.interlocutor?.id == mainInterlocutor?.interlocutor?.id && (
                    <span className="font-bold"> ({tCommon('words.main_m')})</span>
                  )}
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};