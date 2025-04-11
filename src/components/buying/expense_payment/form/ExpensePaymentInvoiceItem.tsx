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
}

export const ExpensePaymentInvoiceItem: React.FC<ExpensePaymentInvoiceItemProps> = ({
  className,
  invoiceEntry,
  paymentConvertionRate = 1,
  currency,
  onChange,
}) => {
  const router = useRouter();
  const { t: tInvoicing } = useTranslation('invoicing');

  const invoiceCurrency = invoiceEntry.expenseInvoice?.currency;
  const digitAfterComma = invoiceCurrency?.digitAfterComma || 2;
  const isSameCurrency = invoiceCurrency?.id === currency?.id;

  const createDinero = (amount: number, currencyCode: string = 'USD'): Dinero => {
    return dinero({
      amount: createDineroAmountFromFloatWithDynamicCurrency(
        Math.max(0, amount),
        digitAfterComma
      ),
      precision: digitAfterComma
    });
  };

  // Calcul des montants de base
  const total = React.useMemo(() => {
    return createDinero(
      invoiceEntry.expenseInvoice?.total || 0,
      invoiceCurrency?.code || 'USD'
    );
  }, [invoiceEntry.expenseInvoice?.total, invoiceCurrency?.code, digitAfterComma]);

  const amountPaid = React.useMemo(() => {
    return createDinero(
      invoiceEntry.expenseInvoice?.amountPaid || 0,
      invoiceCurrency?.code || 'USD'
    );
  }, [invoiceEntry.expenseInvoice?.amountPaid, invoiceCurrency?.code, digitAfterComma]);

  const taxWithholdingAmount = React.useMemo(() => {
    return createDinero(
      invoiceEntry.expenseInvoice?.taxWithholdingAmount || 0,
      invoiceCurrency?.code || 'USD'
    );
  }, [invoiceEntry.expenseInvoice?.taxWithholdingAmount, invoiceCurrency?.code, digitAfterComma]);

  const remainingAmount = React.useMemo(() => {
    return total.subtract(amountPaid).subtract(taxWithholdingAmount);
  }, [total, amountPaid, taxWithholdingAmount]);

  const effectiveExchangeRate = Math.max(0.0001, 
    invoiceEntry.exchangeRate || paymentConvertionRate
  );

  // Calcul du montant maximum autorisé
  const maxAllowedAmount = React.useMemo(() => {
    if (isSameCurrency) return remainingAmount.toUnit();
    
    // Conversion du remaining amount dans la devise de paiement
    return remainingAmount.toUnit() / effectiveExchangeRate;
  }, [remainingAmount, isSameCurrency, effectiveExchangeRate]);

  // Calcul du montant restant actuel après paiement
  const currentRemainingAmount = React.useMemo(() => {
    if (!invoiceEntry.amount) return remainingAmount;
    
    // Conversion du montant payé dans la devise de la facture
    const amountInInvoiceCurrency = isSameCurrency
      ? invoiceEntry.amount
      : invoiceEntry.amount * effectiveExchangeRate;

    const amount = createDinero(amountInInvoiceCurrency, invoiceCurrency?.code || 'USD');
    let newRemaining = remainingAmount.subtract(amount);
    
    // Tolérance de 0.01 comme dans le backend
    if (newRemaining.lessThanOrEqual(createDinero(0.01))) {
      newRemaining = createDinero(0, invoiceCurrency?.code || 'USD');
    }
    
    return newRemaining;
  }, [remainingAmount, invoiceEntry, isSameCurrency, effectiveExchangeRate]);

  // Gestion de la saisie du montant payé
  const handleAmountPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    if (rawValue === '') {
      onChange({ ...invoiceEntry, amount: undefined });
      return;
    }
    
    const numberValue = parseFloat(parseFloat(rawValue).toFixed(currency?.digitAfterComma || 2));
    if (isNaN(numberValue)) return;
    
    if (numberValue < 0) return;
    
    // Comparaison avec le maximum autorisé
    const roundedMax = parseFloat(maxAllowedAmount.toFixed(currency?.digitAfterComma || 2));
    if (numberValue > roundedMax) {
      onChange({ ...invoiceEntry, amount: roundedMax });
      return;
    }
    
    onChange({ ...invoiceEntry, amount: numberValue });
  };

  const handleExchangeRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    if (rawValue === '') {
      onChange({ ...invoiceEntry, exchangeRate: undefined });
      return;
    }
    
    const rate = parseFloat(rawValue);
    if (isNaN(rate) || rate <= 0) return;
    
    onChange({ ...invoiceEntry, exchangeRate: parseFloat(rate.toFixed(4)) });
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
          value={typeof invoiceEntry.exchangeRate === 'number' 
            ? invoiceEntry.exchangeRate.toFixed(4) 
            : (typeof paymentConvertionRate === 'number' 
              ? paymentConvertionRate.toFixed(4) 
              : '')
          }
          onChange={handleExchangeRateChange}
          disabled={isSameCurrency}
          className="h-8 text-sm"
        />
        {!isSameCurrency && currency && (
          <Label className="text-xs text-muted-foreground">
            1 {currency.code} = {effectiveExchangeRate.toFixed(4)} {invoiceCurrency?.code || 'USD'}
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
          value={invoiceEntry.amount?.toFixed(currency?.digitAfterComma || 2) ?? ''}
          step="0.01"
          min="0"
          max={maxAllowedAmount.toFixed(currency?.digitAfterComma || 2)}
          className="h-8 text-sm"
        />
        <Label className="text-xs text-muted-foreground">
          Max: {maxAllowedAmount.toFixed(currency?.digitAfterComma || 2)} {currency?.code || 'DEV'}
        </Label>
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