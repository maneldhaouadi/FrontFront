import { Firm, Interlocutor } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectShimmer,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { UneditableCalendarDayPicker } from '@/components/ui/uneditable/uneditable-calendar-day-picker';
import { UneditableInput } from '@/components/ui/uneditable/uneditable-input';
import { DatePicker } from '@/components/ui/date-picker';
import { useExpenseQuotationManager } from '../hooks/useExpenseQuotationManager';
import { Download, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/api';

interface ExpenseQuotationGeneralInformationProps {
  className?: string;
  firms: Firm[];
  loading?: boolean;
  edit?: boolean;
  isInspectMode?: boolean;
}

export const ExpenseQuotationGeneralInformation = ({
  className,
  firms,
  edit = true,
  loading,
  isInspectMode = false
}: ExpenseQuotationGeneralInformationProps) => {
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');
  const router = useRouter();
  const quotationManager = useExpenseQuotationManager();
  const mainInterlocutor = quotationManager.firm?.interlocutorsToFirm?.find(
    (entry) => entry?.isMain
  );

  const [isValidating, setIsValidating] = useState(false);

  
  const validationTimeout = useRef<NodeJS.Timeout>();

  const validateSequentialNumber = useCallback(async (value: string) => {
    const sequentialNumberRegex = /^QUO-\d{4,5}$/;
    
    // Validation du format
    if (!sequentialNumberRegex.test(value)) {
      quotationManager.setError(
        'sequentialNumbr', 
        tInvoicing('quotation.invalid_sequential_number_format')
      );
      return false;
    }
  
    setIsValidating(true);
    try {
      // Appel à l'API pour vérifier l'existence du numéro
      const { exists } = await api.expense_quotation.checkSequentialNumber(value);
      
      if (exists) {
        quotationManager.setError(
          'sequentialNumbr', 
          tInvoicing('ce numero sequentiel existe deja')
        );
        return false;
      }
      
      // Si tout est OK, on efface les erreurs
      quotationManager.setError('sequentialNumbr', null);
      return true;
    } catch (error) {
      console.error('Error checking sequential number:', error);
      quotationManager.setError(
        'sequentialNumbr', 
        tInvoicing('quotation.sequential_number_check_failed')
      );
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [quotationManager, tInvoicing]);

  const handleSequentialNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    quotationManager.set('sequentialNumbr', value);
    quotationManager.setError('sequentialNumbr', null);
  
    if (validationTimeout.current) {
      clearTimeout(validationTimeout.current);
    }
  
    if (value.length >= 7) { // "QUO-123" = 7 caractères minimum
      validationTimeout.current = setTimeout(() => {
        validateSequentialNumber(value);
      }, 500); // Délai de 500ms après le dernier changement
    }
  }, [quotationManager, validateSequentialNumber]);
  
  const SequentialNumberError = () => {
    if (!quotationManager.sequentialNumbr) {
      return (
        <p className="text-xs text-red-500 mt-1">
          {tInvoicing('quotation.sequential_number_required')}
        </p>
      );
    }
  
    if (quotationManager.errors?.sequentialNumbr) {
      return (
        <p className="text-xs text-red-500 mt-1">
          {quotationManager.errors.sequentialNumbr}
        </p>
      );
    }
  
    return null;
  };

  const handlePdfFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isInspectMode) return;

    const files = event.target.files;
    if (files && files.length > 0) {
      const newFile = files[0];
  
      if (newFile.type !== 'application/pdf') {
        toast.error(tInvoicing('quotation.only_pdf_files_allowed'));
        return;
      }
  
      if (quotationManager.pdfFile || quotationManager.uploadPdfField || quotationManager.pdfFileId) {
        toast.warning(tInvoicing('quotation.pdf_file_cannot_be_modified'));
        return;
      }
  
      quotationManager.set('pdfFile', newFile);
      quotationManager.set('uploadPdfField', { filename: newFile.name, file: newFile });
    }
  };

  const handleRemovePdfFile = async () => {
    if (isInspectMode) return;

    try {
      if (quotationManager.pdfFileId) {
        if (typeof quotationManager.id === 'number') {
          await api.expense_quotation.deletePdfFile(quotationManager.id);
          quotationManager.set('pdfFile', null);
          quotationManager.set('pdfFileId', null);
          quotationManager.set('uploadPdfField', null);
          toast.success(tInvoicing('quotation.pdf_file_removed_successfully'));
        }
      } else if (quotationManager.pdfFile) {
        quotationManager.set('pdfFile', null);
        quotationManager.set('uploadPdfField', null);
        toast.success(tInvoicing('quotation.pdf_file_removed_successfully'));
      } else {
        toast.warning(tInvoicing('quotation.no_pdf_file_to_remove'));
      }
    } catch (error) {
      console.error('Error removing PDF file:', error);
      toast.error(tInvoicing('quotation.pdf_file_removal_failed'));
    }
  };

  const handleDownload = async () => {
    try {
      if (!quotationManager.id) {
        toast.error(tInvoicing('quotation.invalid_quotation_id'));
        return;
      }
  
      if (quotationManager.pdfFileId) {
        const template = 'default';
        const response = await api.expense_quotation.download(quotationManager.id, template);
        
        const blob = new Blob([response.data], { 
          type: response.headers['content-type'] || 'application/pdf' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quotation_${quotationManager.sequentialNumbr || quotationManager.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        return;
      }
  
      if (quotationManager.pdfFile) {
        const url = URL.createObjectURL(quotationManager.pdfFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = quotationManager.uploadPdfField?.filename || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
  
      if (quotationManager.uploadPdfField?.filename) {
        const response = await fetch(quotationManager.uploadPdfField.filename);
        if (!response.ok) throw new Error('Failed to fetch the file');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = quotationManager.uploadPdfField.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
  
      toast.error(tInvoicing('quotation.no_file_to_download'));
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error(tInvoicing('quotation.download_failed'));
    }
  };

  const hasPdfFile = Boolean(
    quotationManager.pdfFile || 
    quotationManager.uploadPdfField || 
    quotationManager.pdfFileId
  );

  return (
    <div className={cn(className, 'space-y-2')}>
      <div className="flex gap-4">
        <div className="w-1/2">
          <Label className="text-xs font-semibold mb-1">
            {tInvoicing('quotation.attributes.files')}
          </Label>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            {edit && !isInspectMode && (
              <Input
                id="pdfFile"
                type="file"
                accept="application/pdf"
                onChange={handlePdfFileChange}
                disabled={hasPdfFile}
              />
            )}
            
            {hasPdfFile && (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-sm text-gray-600 truncate">
                  {quotationManager.uploadPdfField?.filename || 
                   tInvoicing('quotation.pdf_file')}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownload}
                  disabled={loading}
                >
                  <Download className="mr-2" size={14} />
                  {tCommon('download')}
                </Button>
                {edit && !isInspectMode && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRemovePdfFile}
                    disabled={loading}
                  >
                    <Trash className="mr-2" size={14} />
                    {tCommon('remove')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="w-1/2 flex flex-col gap-2">
          <div>
            <Label className="text-xs font-semibold mb-1">
              {tInvoicing('quotation.attributes.date')} (*)
            </Label>
            {edit && !isInspectMode ? (
              <DatePicker
                className="w-full h-8"
                value={quotationManager?.date || new Date()}
                onChange={(value: Date) => quotationManager.set('date', value)}
                isPending={loading}
              />
            ) : (
              <UneditableCalendarDayPicker value={quotationManager?.date} />
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1">
              {tInvoicing('quotation.attributes.due_date')} (*)
            </Label>
            {edit && !isInspectMode ? (
              <DatePicker
                className="w-full h-8"
                value={quotationManager?.dueDate || undefined}
                onChange={(value: Date) => quotationManager.set('dueDate', value)}
                isPending={loading}
              />
            ) : (
              <UneditableCalendarDayPicker value={quotationManager?.dueDate} />
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1">
        <div className="w-2/3">
          <Label className="text-xs font-semibold mb-1">
            {tInvoicing('quotation.attributes.object')} (*)
          </Label>
          {edit && !isInspectMode ? (
            <Input
              className="w-full h-8"
              placeholder="Ex. devis pour le 1er trimestre 2024"
              value={quotationManager.object || ''}
              onChange={(e) => quotationManager.set('object', e.target.value)}
              isPending={loading}
            />
          ) : (
            <UneditableInput value={quotationManager.object} />
          )}
        </div>
        <div className="w-1/3">
  <Label className="text-xs font-semibold mb-1">
    {tInvoicing('quotation.singular')} N° *
  </Label>
  {edit && !isInspectMode ? (
    <div className="relative">
      <Input
        className={cn(
          "w-full h-8",
          quotationManager.errors?.sequentialNumbr && 
          "border-red-500 focus-visible:ring-red-500"
        )}
        placeholder="Format: QUO-12345"
        value={quotationManager.sequentialNumbr || ''}
        onChange={handleSequentialNumberChange}
        isPending={isValidating || loading}
      />
      {/* Afficher le message d'erreur sous le champ */}
      {quotationManager.errors?.sequentialNumbr && (
        <p className="text-xs text-red-500 mt-1 animate-fade-in">
          {quotationManager.errors.sequentialNumbr}
        </p>
      )}
    </div>
  ) : (
    <UneditableInput value={quotationManager.sequentialNumbr || ''} />
  )}
</div>
      </div>

      <div className="flex gap-1">
        <div className="w-1/2">
          <Label className="text-xs font-semibold mb-1">
            {tInvoicing('quotation.attributes.firm')} (*)
          </Label>
          {edit && !isInspectMode ? (
            <SelectShimmer isPending={loading}>
              <Select
                onValueChange={(e) => {
                  const firm = firms?.find((firm) => firm.id === parseInt(e));
                  quotationManager.setFirm(firm);
                  quotationManager.set('currency', firm?.currency);
                }}
                value={quotationManager.firm?.id?.toString()}
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder={tInvoicing('quotation.associate_firm')} />
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
            <UneditableInput value={quotationManager?.firm?.name} />
          )}
        </div>
        <div className="w-1/2">
          <Label className="text-xs font-semibold mb-1">
            {tInvoicing('quotation.attributes.interlocutor')} (*)
          </Label>
          {edit && !isInspectMode ? (
            <SelectShimmer isPending={loading}>
              <Select
                disabled={!quotationManager?.firm?.id}
                onValueChange={(e) => quotationManager.setInterlocutor({ id: parseInt(e) } as Interlocutor)}
                value={quotationManager.interlocutor?.id?.toString()}
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder={tInvoicing('quotation.associate_interlocutor')} />
                </SelectTrigger>
                <SelectContent>
                  {quotationManager.firm?.interlocutorsToFirm?.map((entry: any) => (
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
                  {quotationManager?.interlocutor?.name} {quotationManager.interlocutor?.surname}{' '}
                  {quotationManager?.interlocutor?.id == mainInterlocutor?.interlocutor?.id && (
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