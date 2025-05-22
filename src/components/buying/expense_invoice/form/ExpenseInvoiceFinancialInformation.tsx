import React, { useEffect } from 'react';
import { Currency, Tax, TaxWithholding } from '@/types';
import { DISCOUNT_TYPE } from '@/types/enums/discount-types';
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
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ciel } from '@/utils/number.utils';
import { EXPENSE_INVOICE_STATUS } from '@/types/expense_invoices';
import { useExpenseInvoiceArticleManager } from '../hooks/useExpenseInvoiceArticleManager';
import { useExpenseInvoiceManager } from '../hooks/useExpenseInvoiceManager';
import { useExpenseInvoiceControlManager } from '../hooks/useExpenseInvoiceControlManager';

interface ExpenseInvoiceFinancialInformationProps {
  className?: string;
  status: EXPENSE_INVOICE_STATUS;
  subTotal?: number;
  discount?: number;
  currency?: Currency;
  taxes: Tax[];
  taxWithholdings?: TaxWithholding[];
  loading?: boolean;
  edit?: boolean;
  isInspectMode?: boolean;
}

export const ExpenseInvoiceFinancialInformation = ({
  className,
  subTotal,
  status,
  currency,
  taxes,
  taxWithholdings,
  loading,
  edit = true,
  isInspectMode = false
}: ExpenseInvoiceFinancialInformationProps) => {
  const { t: tInvoicing } = useTranslation('invoicing');

  const invoiceArticleManager = useExpenseInvoiceArticleManager();
  const invoiceManager = useExpenseInvoiceManager();
  const controlManager = useExpenseInvoiceControlManager();

  const isInvoiceExpired = (dueDate: string | undefined): boolean => {
    if (!dueDate) {
      console.error("Due Date is undefined or empty.");
      return false;
    }

    try {
      const dueDateObj = new Date(dueDate); // Convertit la chaîne en objet Date
      const currentDate = new Date();
      currentDate.setUTCHours(0, 0, 0, 0); // Réinitialise l'heure pour une comparaison précise

      return dueDateObj < currentDate; // Retourne true si la date d'échéance est dépassée
    } catch (error) {
      console.error("Error parsing dueDate:", error);
      return false;
    }
  };

  useEffect(() => {
    if (invoiceManager.dueDate) {
      const dueDateString = invoiceManager.dueDate.toISOString(); // Convertit en chaîne au format ISO
      if (isInvoiceExpired(dueDateString) && status !== EXPENSE_INVOICE_STATUS.Expired) {
        invoiceManager.set('status', EXPENSE_INVOICE_STATUS.Expired);
        console.log("Invoice status updated to Expired");
      }
    }
  }, [invoiceManager.dueDate, status, invoiceManager]);

  const taxWithholdingAmount = React.useMemo(() => {
    if (invoiceManager.taxWithholdingId) {
      const taxWithholding = taxWithholdings?.find((t) => t.id === invoiceManager.taxWithholdingId);
      const taxWithholdingAmount = invoiceManager.total * ((taxWithholding?.rate || 0) / 100);
      return ciel(taxWithholdingAmount, currency?.digitAfterComma || 3);
    }
    return 0;
  }, [
    invoiceManager.taxWithholdingId,
    invoiceManager.total,
    taxWithholdings,
    currency?.digitAfterComma
  ]);

  const currencySymbol = currency?.symbol || '$';
  const digitAfterComma = currency?.digitAfterComma || 3;
  const discount = invoiceManager.discount ?? 0;
  const discountType =
    invoiceManager.discountType === DISCOUNT_TYPE.PERCENTAGE ? 'PERCENTAGE' : 'AMOUNT';
  const remaining_amount =
    (invoiceManager.total || 0) - (invoiceManager.amountPaid || 0) - taxWithholdingAmount;

  return (
    <div className={cn(className)}>
      {/* Subtotal */}
      <div className="flex flex-col w-full border-b">
        <div className="flex my-2">
          <Label className="mr-auto">{tInvoicing('invoice.attributes.sub_total')}</Label>
          <Label className="ml-auto" isPending={loading || false}>
            {subTotal?.toFixed(digitAfterComma)} {currencySymbol}
          </Label>
        </div>

        {invoiceArticleManager.taxSummary.map((ts) => {
          return (
            <div key={ts.tax.id} className="flex my-2">
              <Label className="mr-auto">{ts.tax.label}</Label>
              <Label className="ml-auto" isPending={loading || false}>
                {ts.amount?.toFixed(digitAfterComma)} {currencySymbol}
              </Label>
            </div>
          );
        })}

        {/* discount */}
        {edit && (
          <div className="flex items-center my-2">
            <Label className="mr-auto">{tInvoicing('quotation.attributes.discount')}</Label>
            <div className="flex items-center gap-2">
              <Input
                className="ml-auto w-2/5 text-right"
                type="number"
                value={discount}
                onChange={(e) => invoiceManager.set('discount', parseFloat(e.target.value))}
                isPending={loading || false}
              />
              <SelectShimmer isPending={loading || false} className="-mt-0.5 w-1/5">
                <Select
                  onValueChange={(value: string) => {
                    invoiceManager.set(
                      'discountType',
                      value === 'PERCENTAGE' ? DISCOUNT_TYPE.PERCENTAGE : DISCOUNT_TYPE.AMOUNT
                    );
                  }}
                  value={discountType}>
                  <SelectTrigger className="w-fit">
                    <SelectValue placeholder="%" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="PERCENTAGE">%</SelectItem>
                    <SelectItem value="AMOUNT">{currencySymbol} </SelectItem>
                  </SelectContent>
                </Select>
              </SelectShimmer>
            </div>
          </div>
        )}
        {!edit && discount != 0 && (
          <div className="flex flex-col w-full">
            <div className="flex my-2">
              <Label className="mr-auto">{tInvoicing('quotation.attributes.discount')}</Label>
              <Label className="ml-auto" isPending={loading || false}>
                {discount?.toFixed(digitAfterComma)}{' '}
                <span>
                  {discountType === DISCOUNT_TYPE.PERCENTAGE ? '%' : currency?.symbol || '$'}
                </span>
              </Label>
            </div>
          </div>
        )}
        {/* tax stamp */}
      </div>
      <div className="flex flex-col w-full mt-2">
        <div className="flex my-2">
          <Label className="mr-auto">{tInvoicing('invoice.attributes.total')}</Label>
          <Label className="ml-auto" isPending={loading || false}>
            {invoiceManager.total?.toFixed(digitAfterComma)} {currencySymbol}
          </Label>
        </div>
      </div>
      {!controlManager.isTaxWithholdingHidden && (
        <div className="flex flex-col w-full">
          <div className="flex my-2">
            <Label className="mr-auto">{tInvoicing('invoice.attributes.withholding')}</Label>
            <Label className="ml-auto" isPending={loading || false}>
              {taxWithholdingAmount?.toFixed(digitAfterComma)} {currencySymbol}
            </Label>
          </div>
        </div>
      )}
      {[EXPENSE_INVOICE_STATUS.PartiallyPaid, EXPENSE_INVOICE_STATUS.Unpaid].includes(
        status
      ) && (
        <div>
          <div className="flex flex-col w-full">
            <div className="flex my-2">
              <Label className="mr-auto">{tInvoicing('invoice.attributes.amount_paid')}</Label>
              <Label className="ml-auto" isPending={loading || false}>
                {invoiceManager.amountPaid?.toFixed(digitAfterComma)} {currencySymbol}
              </Label>
            </div>
          </div>
          <div className="flex flex-col w-full">
            <div className="flex my-2">
              <Label className="mr-auto">{tInvoicing('invoice.attributes.remaining_amount')}</Label>
              <Label className="ml-auto" isPending={loading || false}>
                {remaining_amount?.toFixed(digitAfterComma)} {currencySymbol}
              </Label>
            </div>
          </div>
        </div>
      )}
      {/* Expired status check */}
      {
        // Vérification si le statut est "Expired" ou si la date d'échéance est passée
        (invoiceManager.status === EXPENSE_INVOICE_STATUS.Expired || 
         (invoiceManager.dueDate && isInvoiceExpired(invoiceManager.dueDate.toISOString()))) && (
          <div className="flex flex-col w-full mt-2">
            <div className="flex my-2">
              <Label className="mr-auto">{tInvoicing('invoice.attributes.status')}</Label>
              <Label className="ml-auto text-red-500">{tInvoicing('invoice.status.expired')}</Label>
            </div>
          </div>
        )
      }
    </div>
  );
};