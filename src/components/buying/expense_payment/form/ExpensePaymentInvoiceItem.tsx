import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Currency } from '@/types';
import { transformDate } from '@/utils/date.utils';
import { useRouter } from 'next/router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import dinero, { Dinero } from 'dinero.js';
import { createDineroAmountFromFloatWithDynamicCurrency } from '@/utils/money.utils';
import { ExpensePaymentInvoiceEntry } from '@/types/expense-payment';

interface ExpensePaymentInvoiceItemProps {
  className?: string;
  invoiceEntry: ExpensePaymentInvoiceEntry;
  currency?: Currency;
  paymentConvertionRate?: number;
  onChange: (item: ExpensePaymentInvoiceEntry) => void;
  disabled?: boolean;
}

export const ExpensePaymentInvoiceItem: React.FC<ExpensePaymentInvoiceItemProps> = ({
  className,
  invoiceEntry,
  paymentConvertionRate = 1,
  currency,
  onChange,
  disabled = false,
}) => {
  const router = useRouter();
  const { t: tInvoicing } = useTranslation('invoicing');
  const [error, setError] = React.useState<string | null>(null);

  const invoiceCurrency = invoiceEntry.expenseInvoice?.currency;
  const digitAfterComma = invoiceCurrency?.digitAfterComma || 2;
  const isSameCurrency = invoiceCurrency?.id === currency?.id;

  const createDinero = (amount: number): Dinero => {
    return dinero({
      amount: createDineroAmountFromFloatWithDynamicCurrency(
        Math.max(0, amount),
        digitAfterComma
      ),
      precision: digitAfterComma
    });
  };

  // Calcul des montants de base
  const [total, amountPaid, taxWithholdingAmount] = React.useMemo(() => {
    return [
      createDinero(invoiceEntry.expenseInvoice?.total || 0),
      createDinero(invoiceEntry.expenseInvoice?.amountPaid || 0),
      createDinero(invoiceEntry.expenseInvoice?.taxWithholdingAmount || 0)
    ];
  }, [invoiceEntry.expenseInvoice, digitAfterComma]);

  const remainingAmount = React.useMemo(() => {
    return total.subtract(amountPaid).subtract(taxWithholdingAmount);
  }, [total, amountPaid, taxWithholdingAmount]);

  const effectiveExchangeRate = Math.max(0.0001, 
    invoiceEntry.exchangeRate || paymentConvertionRate || 1
  );

  const exchangeRateValue = invoiceEntry.exchangeRate ?? paymentConvertionRate ?? 1;

  // Calcul du montant maximum autorisé dans la devise de paiement
  const maxAllowedAmount = React.useMemo(() => {
    if (isSameCurrency) return remainingAmount.toUnit();
    
    return remainingAmount.multiply(effectiveExchangeRate).toUnit();
  }, [remainingAmount, isSameCurrency, effectiveExchangeRate]);

  // Calcul du nouveau montant restant après paiement
  const currentRemainingAmount = React.useMemo(() => {
    if (!invoiceEntry.amount) return remainingAmount;
    
    const paymentAmount = createDinero(invoiceEntry.amount);
    
    if (isSameCurrency) {
      return remainingAmount.subtract(paymentAmount);
    } else {
      const amountInInvoiceCurrency = paymentAmount.divide(effectiveExchangeRate);
      return remainingAmount.subtract(amountInInvoiceCurrency);
    }
  }, [remainingAmount, invoiceEntry, effectiveExchangeRate, isSameCurrency, digitAfterComma]);

  const validateAmount = (amount: number): boolean => {
    if (amount > maxAllowedAmount) {
      setError(`Le montant payé (${amount.toFixed(digitAfterComma)} ${currency?.code || 'DEV'}) dépasse le montant restant à payer (${maxAllowedAmount.toFixed(digitAfterComma)} ${currency?.code || 'DEV'})`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleAmountPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      onChange({ 
        ...invoiceEntry, 
        amount: undefined, 
        originalAmount: undefined 
      });
      setError(null);
      return;
    }

    const numberValue = parseFloat(rawValue);
    if (isNaN(numberValue)) return;

    const roundedValue = parseFloat(numberValue.toFixed(digitAfterComma));
    
    // Validation du montant
    if (!validateAmount(roundedValue)) {
      return;
    }

    const newEntry = { ...invoiceEntry, amount: roundedValue };

    if (isSameCurrency) {
      newEntry.originalAmount = roundedValue;
      newEntry.exchangeRate = 1;
    } else {
      newEntry.originalAmount = parseFloat((roundedValue / effectiveExchangeRate).toFixed(digitAfterComma));
      newEntry.exchangeRate = effectiveExchangeRate;
    }

    onChange(newEntry);
  };

  const handleExchangeRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    if (rawValue === '') {
      onChange({ ...invoiceEntry, exchangeRate: undefined });
      return;
    }
    
    const rate = parseFloat(rawValue);
    if (isNaN(rate) || rate <= 0) return;
    
    const newRate = parseFloat(rate.toFixed(6));
    
    // Revalider le montant si le taux change
    if (invoiceEntry.amount && !validateAmount(invoiceEntry.amount)) {
      return;
    }
    
    onChange({ 
      ...invoiceEntry, 
      exchangeRate: newRate,
      originalAmount: invoiceEntry.amount ? parseFloat((invoiceEntry.amount / newRate).toFixed(digitAfterComma)) : undefined
    });
  };

  return (
    <div className={cn('grid grid-cols-7 gap-4 items-center', className)}>
      {/* Invoice Sequential */}
      <div className="flex flex-col gap-1">
        <Label className="font-thin text-xs">{tInvoicing('invoice.singular')} N°</Label>
        <Label
          className="underline cursor-pointer text-sm"
          onClick={() => router.push(`/buying/expense_invoice/${invoiceEntry.expenseInvoice?.id}`)}
        >
          {invoiceEntry.expenseInvoice?.sequential || 'N/A'}
        </Label>
      </div>

      {/* Invoice Due Date */}
      <div className="flex flex-col gap-1">
        <Label className="font-thin text-xs">{tInvoicing('invoice.attributes.due_date')}</Label>
        <Label className="text-sm">
          {invoiceEntry.expenseInvoice?.dueDate
            ? transformDate(invoiceEntry.expenseInvoice.dueDate)
            : <span className="text-muted-foreground">Sans date</span>}
        </Label>
      </div>

      {/* Total */}
      <div className="flex flex-col gap-1">
        <Label className="font-thin text-xs">{tInvoicing('invoice.attributes.total')}</Label>
        <Label className="text-sm">
          {total.toFormat('0,0.00')} {invoiceCurrency?.symbol || '$'}
        </Label>
      </div>

      {/* Exchange Rate */}
      <div className="flex flex-col gap-1">
        <Label className="font-thin text-xs">Taux de change</Label>
        <Input 
          type="number" 
          step="0.0001"
          min="0.0001"
          value={typeof exchangeRateValue === 'number' ? exchangeRateValue.toFixed(4) : ''}
          onChange={handleExchangeRateChange}
          disabled={isSameCurrency || disabled}
          className="h-8 text-sm"
        />
        {!isSameCurrency && currency && (
          <Label className="text-xs text-muted-foreground">
            1 {invoiceCurrency?.code || 'USD'} = {effectiveExchangeRate.toFixed(4)} {currency?.code || 'DEV'}
          </Label>
        )}
      </div>

      {/* Amount Paid */}
      <div className="flex flex-col gap-1">
        <Label className="font-thin text-xs">
          {tInvoicing('invoice.attributes.payment')} ({currency?.code || 'DEV'})
        </Label>
        <Input 
          type="number"
          onChange={handleAmountPaidChange}
          value={invoiceEntry.amount?.toFixed(digitAfterComma) ?? ''}
          step="0.01"
          min="0"
          max={maxAllowedAmount.toFixed(digitAfterComma)}
          disabled={disabled}
          className={cn("h-8 text-sm", {
            "border-red-500": error
          })}
        />
        <Label className="text-xs text-muted-foreground">
          Max: {maxAllowedAmount.toFixed(digitAfterComma)} {currency?.code || 'DEV'}
        </Label>
        {error && (
          <Label className="text-xs text-red-500">
            {error}
          </Label>
        )}
      </div>

      {/* Remaining Amount */}
      <div className="flex flex-col gap-1">
        <Label className="font-thin text-xs">{tInvoicing('invoice.attributes.remaining_amount')}</Label>
        <Label className={cn("text-sm", {
          "text-green-600 font-bold": currentRemainingAmount.toUnit() === 0,
          "text-orange-500": currentRemainingAmount.toUnit() > 0 && currentRemainingAmount.toUnit() < total.toUnit(),
          "text-red-500": currentRemainingAmount.toUnit() >= total.toUnit()
        })}>
          {currentRemainingAmount.toFormat('0,0.00')} {invoiceCurrency?.symbol || '$'}
          {currentRemainingAmount.toUnit() === 0 && " (Payé)"}
        </Label>
      </div>
    </div>
  );
};