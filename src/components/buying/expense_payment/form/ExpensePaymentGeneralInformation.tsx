import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectShimmer,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Currency, Firm } from '@/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import React from 'react';
import { CalendarDatePicker } from '@/components/ui/calendar-day-picker';
import { useExpensePaymentManager } from '../hooks/useExpensePaymentManager';
import { EXPENSE_PAYMENT_MODE } from '@/types/expense-payment';
import { useExpensePaymentInvoiceManager } from '../hooks/useExpensePaymentInvoiceManager';
import { EXPENSE_INVOICE_STATUS, ExpenseInvoice } from '@/types/expense_invoices';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';
import { FileUploader } from '@/components/ui/file-uploader';
import { toast } from 'sonner';
import { api } from '@/api';
import { Card } from '@/components/ui/card';
import { UneditableInput } from '@/components/ui/uneditable/uneditable-input';

interface ExpensePaymentGeneralInformationProps {
  className?: string;
  firms: Firm[];
  currencies: Currency[];
  loading?: boolean;
  disabled?: boolean; // Ajout de la prop disabled
  onUploadPdfFile?: (file: File) => void;
  onRemovePdfFile?: () => void;
}

export const ExpensePaymentGeneralInformation = ({
  className,
  firms,
  currencies,
  loading,
  disabled = false, // Valeur par défaut
  onUploadPdfFile,
  onRemovePdfFile,
}: ExpensePaymentGeneralInformationProps) => {
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');
  const { t: tCurrency } = useTranslation('currency');

  const paymentManager = useExpensePaymentManager();
  const invoiceManager = useExpensePaymentInvoiceManager();

  // Gestion du fichier PDF
  const handlePdfFileChange = (files: File[]) => {
    if (disabled) return; // Ne rien faire si désactivé
    
    if (files.length > 0) {
      if (paymentManager.pdfFile || paymentManager.uploadPdfField) {
        toast.warning(tInvoicing('payment.pdf_file_cannot_be_modified'));
        return;
      }
      const newFile = files[0];
      paymentManager.set('pdfFile', newFile);
      paymentManager.set('uploadPdfField', { filename: newFile.name, file: newFile });
      if (onUploadPdfFile) onUploadPdfFile(newFile);
    }
  };

  const handleRemovePdfFile = async () => {
    if (disabled) return; // Ne rien faire si désactivé
    
    try {
      if (paymentManager.pdfFileId) {
        if (typeof paymentManager.id === 'number') {
          await api.expensepayment.remove(paymentManager.id);
          paymentManager.set('pdfFile', null);
          paymentManager.set('pdfFileId', null);
          paymentManager.set('uploadPdfField', null);
          toast.success(tInvoicing('payment.pdf_file_removed_successfully'));
          if (onRemovePdfFile) onRemovePdfFile();
        } else {
          throw new Error('Payment ID is undefined');
        }
      } else {
        toast.warning(tInvoicing('payment.no_pdf_file_to_remove'));
      }
    } catch (error) {
      console.error('Error removing PDF file:', error);
      toast.error(tInvoicing('payment.pdf_file_removal_failed'));
    }
  };

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {/* Section Pièces jointes et Date */}
      <div className="grid grid-cols-2 gap-4">
        {/* Date */}
        <div className="flex flex-col gap-2">
          <Label>{tInvoicing('invoice.attributes.date')} (*)</Label>
          <CalendarDatePicker
            label={tCommon('pick_date')}
            date={
              paymentManager?.date
                ? { from: paymentManager?.date, to: undefined }
                : { from: undefined, to: undefined }
            }
            onDateSelect={({ from, to }) => {
              if (!disabled) paymentManager.set('date', from);
            }}
            variant="outline"
            numberOfMonths={1}
            className="w-full py-4 mt-1"
            isPending={loading}
            disabled={disabled} // Désactivation du date picker
          />
        </div>
      </div>

      {/* Firm et Currency */}
      <div className="grid grid-cols-2 gap-4">
        {/* Firm */}
        <div className="flex flex-col gap-2">
          <Label>{tCommon('submenu.firms')} (*)</Label>
          <SelectShimmer isPending={loading}>
            <Select
              onValueChange={(e) => {
                if (disabled) return;
                const firm = firms?.find((firm) => firm.id === parseInt(e));
                paymentManager.set('firmId', firm?.id);
                paymentManager.set('firm', firm);
                paymentManager.set('currencyId', firm?.currency?.id);
                paymentManager.set('currency', firm?.currency);
                invoiceManager.reset();
                firm?.invoices?.forEach((invoice: ExpenseInvoice) => {
                  if (
                    invoice?.status &&
                    [
                      EXPENSE_INVOICE_STATUS.PartiallyPaid,
                      EXPENSE_INVOICE_STATUS.Validated,
                      EXPENSE_INVOICE_STATUS.Unpaid,
                    ].includes(invoice.status as EXPENSE_INVOICE_STATUS)
                  ) {
                    invoiceManager.add({
                      amount: 0,
                      expenseInvoiceId: invoice.id,
                      expenseInvoice: invoice,
                      exchangeRate: 0,
                      originalAmount: 0,
                      originalCurrencyId: 0,
                      digitAfterComma: 0
                    });
                  }
                });
              }}
              value={paymentManager.firmId?.toString()}
              disabled={disabled} // Désactivation du select
            >
              <SelectTrigger>
                <SelectValue placeholder={tInvoicing('invoice.associate_firm')} />
              </SelectTrigger>
              <SelectContent>
                {firms?.map((firm: Partial<Firm>) => (
                  <SelectItem key={firm.id} value={firm.id?.toString() || ''} className="mx-1">
                    {firm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SelectShimmer>
        </div>

        {/* Currency */}
        <div className="flex flex-col gap-2">
          <Label>{tInvoicing('payment.attributes.currency')}</Label>
          <SelectShimmer isPending={loading}>
            <Select
              key={paymentManager.currencyId || 'currency'}
              onValueChange={(e) => {
                if (disabled) return;
                const currency = currencies.find((currency) => currency.id == parseInt(e));
                paymentManager.set('currencyId', currency?.id);
                paymentManager.set('currency', currency);
                invoiceManager.init();
              }}
              disabled={disabled || currencies.length == 1} // Désactivation du select
              defaultValue={
                paymentManager?.currencyId ? paymentManager?.currencyId?.toString() : undefined
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={tInvoicing('controls.currency_select_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {currencies?.map((currency: Currency) => {
                  return (
                    <SelectItem key={currency.id} value={currency?.id?.toString() || ''}>
                      {currency?.code && tCurrency(currency?.code)} ({currency.symbol})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </SelectShimmer>
        </div>
      </div>

      {/* Mode */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>{tInvoicing('payment.attributes.mode')} (*)</Label>
          <SelectShimmer isPending={loading || false}>
            <Select
              onValueChange={(e) => {
                if (disabled) return;
                paymentManager.set('mode', e);
              }}
              value={paymentManager?.mode || ''}
              disabled={disabled} // Désactivation du select
            >
              <SelectTrigger>
                <SelectValue placeholder={tInvoicing('payment.attributes.mode')} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(EXPENSE_PAYMENT_MODE).map((title) => (
                  <SelectItem key={title} value={title}>
                    {tInvoicing(title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SelectShimmer>
        </div>
      </div>

      {/* Amount et Fee */}
      <div className="grid grid-cols-2 gap-4">
        {/* Amount */}
        <div className="flex flex-col gap-2">
          <Label>{tInvoicing('payment.attributes.amount')}</Label>
          {disabled ? (
            <UneditableInput value={paymentManager.amount?.toString() || '0'} />
          ) : (
            <Input
              type="number"
              placeholder="0"
              value={paymentManager.amount}
              onChange={(e) => {
                if (disabled) return;
                paymentManager.set('amount', parseFloat(e.target.value));
              }}
              disabled={disabled}
            />
          )}
        </div>

        {/* Fee */}
        <div className="flex flex-col gap-2">
          <Label>{tInvoicing('payment.attributes.fee')}</Label>
          {disabled ? (
            <UneditableInput value={paymentManager.fee?.toString() || '0'} />
          ) : (
            <Input
              type="number"
              placeholder="0"
              value={paymentManager.fee}
              onChange={(e) => {
                if (disabled) return;
                paymentManager.set('fee', parseFloat(e.target.value));
              }}
              disabled={disabled}
            />
          )}
        </div>
      </div>
    </div>
  );
};