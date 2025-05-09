import React from 'react';
import { Currency } from '@/types';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ciel } from '@/utils/number.utils';
import { useExpensePaymentManager } from '../hooks/useExpensePaymentManager';
import { useExpensePaymentInvoiceManager } from '../hooks/useExpensePaymentInvoiceManager';
import { Input } from '@/components/ui/input';
import { UneditableInput } from '@/components/ui/uneditable/uneditable-input';

interface ExpensePaymentFinancialInformationProps {
  className?: string;
  currency?: Currency;
  loading?: boolean;
  disabled?: boolean; // Ajout de la prop disabled

}

export const ExpensePaymentFinancialInformation = ({
  className,
  currency,
  loading,
  disabled = false, // Valeur par défaut
}: ExpensePaymentFinancialInformationProps) => {
  const { t: tInvoicing } = useTranslation('invoicing');
  const paymentManager = useExpensePaymentManager();
  const invoiceManager = useExpensePaymentInvoiceManager();

  // Get currency details
  const currencySymbol = currency?.symbol || '$';
  const currencyDigitAfterComma = currency?.digitAfterComma || 2;

  // Calculate total amount from invoices
  const totalInvoicesAmount = React.useMemo(() => {
    return invoiceManager.getInvoices().reduce((sum, invoice) => {
      return sum + (invoice.amount || 0);
    }, 0);
  }, [invoiceManager.getInvoices()]);

  // Update payment amount when invoices change
  React.useEffect(() => {
    paymentManager.set('amount', totalInvoicesAmount);
  }, [totalInvoicesAmount]);

  // Calculate financial values
  const amountPaid = paymentManager.amount || 0;
  const fee = paymentManager.fee || 0;
  const available = ciel(amountPaid + fee, currencyDigitAfterComma + 1);
  const used = invoiceManager.calculateUsedAmount();
  const remaining_amount = ciel(available - used, currencyDigitAfterComma + 1);

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const value = parseFloat(e.target.value) || 0;
    paymentManager.set('fee', value);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Total des factures (non modifiable) */}
      <div className="grid grid-cols-2 items-center gap-4">
        <Label>{tInvoicing('payment.attributes.amount')}</Label>
        <div className="text-right font-medium">
          {totalInvoicesAmount.toFixed(currencyDigitAfterComma)} {currencySymbol}
        </div>
      </div>

      {/* Frais (modifiable) */}
      <div className="grid grid-cols-2 items-center gap-4">
        <Label>{tInvoicing('payment.attributes.fee')}</Label>
        {disabled ? (
          <UneditableInput 
            value={fee.toFixed(currencyDigitAfterComma)}
            className="text-right"
          />
        ) : (
          <Input
            type="number"
            value={fee}
            onChange={handleFeeChange}
            min="0"
            step="0.01"
            disabled={loading || disabled}
            className="text-right"
          />
        )}
      </div>
      {/* Total à payer */}
      <div className="grid grid-cols-2 items-center gap-4 pt-2 border-t">
        <Label className="font-semibold">{tInvoicing('total')}</Label>
        <div className="text-right font-bold">
          {(amountPaid + fee).toFixed(currencyDigitAfterComma)} {currencySymbol}
        </div>
      </div>

      {/* Utilisé */}
      <div className="grid grid-cols-2 items-center gap-4">
        <Label>{tInvoicing('payment.financial_status.used')}</Label>
        <div className="text-right">
          {used.toFixed(currencyDigitAfterComma)} {currencySymbol}
        </div>
      </div>

      {/* Disponible */}
      <div className="grid grid-cols-2 items-center gap-4 pt-2 border-t">
        <Label className="font-semibold">{tInvoicing('payment.financial_status.available')}</Label>
        <div className="text-right font-bold">
          {remaining_amount.toFixed(currencyDigitAfterComma)} {currencySymbol}
        </div>
      </div>
    </div>
  );
};