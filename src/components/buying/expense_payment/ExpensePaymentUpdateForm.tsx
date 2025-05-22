import React from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/errors';
import useCurrency from '@/hooks/content/useCurrency';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/router';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';
import useInitializedState from '@/hooks/use-initialized-state';
import useFirmChoices from '@/hooks/content/useFirmChoice';
import { Textarea } from '@/components/ui/textarea';
import dinero from 'dinero.js';
import { createDineroAmountFromFloatWithDynamicCurrency } from '@/utils/money.utils';
import { useExpensePaymentManager } from './hooks/useExpensePaymentManager';
import { useExpensePaymentInvoiceManager } from './hooks/useExpensePaymentInvoiceManager';
import useCabinet from '@/hooks/content/useCabinet';
import { ExpensePayment, ExpensePaymentInvoiceEntry, ExpenseUpdatePaymentDto } from '@/types/expense-payment';
import { ExpensePaymentGeneralInformation } from './form/ExpensePaymentGeneralInformation';
import { ExpensePaymentInvoiceManagement } from './form/ExpensePaymentInvoiceManagement';
import { ExpensePaymentExtraOptions } from './form/ExpensePaymentExtraOptions';
import { ExpensePaymentFinancialInformation } from './form/ExpensePaymentFinancialInformation';
import { ExpensePaymentControlSection } from './form/ExpensePaymentControlSection';

interface ExpensePaymentFormProps {
  className?: string;
  paymentId: string;
  isInspectMode?: boolean; // Nouvelle prop pour le mode inspection
}

export const ExpensePaymentUpdateForm = ({ className, paymentId}: ExpensePaymentFormProps) => {
  const router = useRouter();
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');
  const { setRoutes } = useBreadcrumb();
  const paymentManager = useExpensePaymentManager();
  const invoiceManager = useExpensePaymentInvoiceManager();
  const isInspectMode = router.query.mode === 'inspect'; // Ajoutez cette ligne
  const [invoicesLoaded, setInvoicesLoaded] = React.useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = React.useState(false);

  // Fetch payment data
  const {
    isPending: isFetchPending,
    data: paymentResp,
    refetch: refetchPayment,
  } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => api.expensepayment.findOne(parseInt(paymentId)),
  });

  const payment = React.useMemo(() => {
    return paymentResp || null;
  }, [paymentResp]);

  React.useEffect(() => {
    if (payment?.id) {
      setRoutes([
        { title: tCommon('menu.buying'), href: '/buying' },
        { title: tInvoicing('payment.plural'), href: '/buying/expense_payments' },
        { title: tInvoicing('payment.singular') + ' N° ' + payment?.id },
      ]);
    }
  }, [router.locale, payment?.id]);

  // Fetch options
  const { currencies, isFetchCurrenciesPending } = useCurrency();
  const { cabinet, isFetchCabinetPending } = useCabinet();

  React.useEffect(() => {
    if (cabinet?.currency?.id) {
      paymentManager.set('currencyId', cabinet.currency.id);
    }
  }, [cabinet]);

  const { firms, isFetchFirmsPending } = useFirmChoices([
    'currency',
    'invoices',
    'invoices.currency',
  ]);

  const fetching =
    isFetchPending || isFetchFirmsPending || isFetchCurrenciesPending || isFetchCabinetPending;

    
    
    const setPaymentData = (data: Partial<ExpensePayment>) => {
      if (!data) return;
      
      paymentManager.setPayment({
        ...data,
        firm: firms?.find((firm) => firm.id === data.firmId),
        sequentialNumbr: data.sequentialNumbr,
        uploadPdfField: data.uploadPdfField,
        uploads: data.uploads || [],
        convertionRate: data.convertionRate || 1,
      });
    
      if (!isInspectMode && data?.invoices) {
        const processedInvoices = data.invoices.map(invoice => {
          const invoiceCurrencyId = invoice?.expenseInvoice?.currency?.id;
          const paymentCurrencyId = data?.currencyId;
          const isSameCurrency = invoiceCurrencyId === paymentCurrencyId;
          
          // Calculer le montant restant à payer
          const remainingAmount = (invoice.expenseInvoice?.total || 0) - 
                               (invoice.expenseInvoice?.amountPaid || 0) -
                               (invoice.expenseInvoice?.taxWithholdingAmount || 0);
    
          return {
            ...invoice,
            amount: isSameCurrency 
              ? remainingAmount // Par défaut, proposer de payer le reste
              : (invoice?.originalAmount || remainingAmount),
            originalAmount: invoice?.originalAmount || remainingAmount,
            exchangeRate: invoice?.exchangeRate || data?.convertionRate || 1,
            originalCurrencyId: paymentCurrencyId
          };
        });
      
        invoiceManager.setInvoices(
          processedInvoices,
          data.currency, 
          data.convertionRate || 1,
          isInspectMode ? 'INSPECT' : 'EDIT'
        );
      }
    };
    

    const { isDisabled, globalReset } = useInitializedState({
      data: payment || ({} as Partial<ExpensePayment>),
      getCurrentData: () => {
        return {
          payment: paymentManager.getPayment(),
          invoices: invoiceManager.getInvoices(),
        };
      },
      setFormData: (data: Partial<ExpensePayment>) => {
        setPaymentData(data);
      },
      resetData: () => {
        if (!isInspectMode) {
          paymentManager.reset();
          invoiceManager.reset();
        }
      },
      loading: fetching,
    });

   React.useEffect(() => {
  if (payment && payment.firmId && firms && !invoicesLoaded) {
    setPaymentData(payment);
    setInvoicesLoaded(true);
    
    // Pré-remplir avec le montant restant à payer
    if (!isInspectMode && payment.invoices && payment.invoices.length > 0) {
      const updatedInvoices = payment.invoices.map(invoice => {
        const remaining = (invoice.expenseInvoice?.total || 0) - 
                        (invoice.expenseInvoice?.amountPaid || 0) -
                        (invoice.expenseInvoice?.taxWithholdingAmount || 0);
        
        return {
          ...invoice,
          amount: remaining > 0 ? remaining : 0
        };
      });
      
      invoiceManager.setInvoices(
        updatedInvoices,
        payment.currency || undefined,
        payment.convertionRate || 1,
        'EDIT'
      );
    }
  }
}, [payment, firms, isInspectMode]);
    // Ajoutez un useEffect pour forcer le rechargement des factures lorsque le payment change
    React.useEffect(() => {
      if (payment && payment.firmId && firms) {
        // Charge les données du paiement
        setPaymentData(payment);
        
        // Charge explicitement les factures associées seulement si nécessaire
        if (!isInspectMode && payment.invoices && payment.invoices.length > 0) {
          invoiceManager.setInvoices(
            payment.invoices,
            payment.currency || undefined,
            payment.convertionRate || 1,
            'EDIT'
          );
        }
      }
    }, [payment, firms, isInspectMode]);


  const currency = React.useMemo(() => {
    return currencies?.find((c) => c.id === paymentManager.currencyId);
  }, [paymentManager.currencyId, currencies]);

  const { mutate: updatePayment, isPending: isUpdatePending } = useMutation({
    mutationFn: (data: { payment: ExpenseUpdatePaymentDto; files: File[] }) =>
      api.expensepayment.update(data.payment, data.files),
    onSuccess: () => {
      toast.success('Paiement modifié avec succès');
      router.push('/buying/expense_payments');
    },
    onError: (error) => {
      const message = getErrorMessage('', error, 'Erreur lors de la mise à jour de paiement');
      toast.error(message);
    },
  });
  // Ajoutez cette fonction dans votre composant ou dans un fichier utilitaire
const validatePayment = (
  payment: Partial<ExpensePayment>,
  used: number,
  paid: number,
  invoices: Array<{
    amount: number;
    expenseInvoice: {
      currencyId: number;
      total: number;
      amountPaid: number;
    };
    exchangeRate?: number;
  }> = [],
  paymentCurrencyId?: number,
  allCurrencies: Array<{id: number, code: string}> = []
): {message: string, position?: string} => {
  // Validations de base
  if (!payment.date) return { message: 'La date doit être définie' };
  if (!payment?.amount || payment?.amount <= 0)
    return { message: 'Le montant doit être supérieur à 0' };
  if (payment?.fee == null || payment?.fee < 0)
    return { message: 'Les frais doivent être supérieurs ou égaux à 0' };
  if (payment?.fee > payment?.amount) 
    return { message: 'Les frais doivent être inférieurs au montant total' };

  // Validation des montants des factures
  if (invoices.length > 0) {
    for (const invoiceEntry of invoices) {
      const invoice = invoiceEntry.expenseInvoice;
      const remainingAmount = invoice.total - (invoice.amountPaid || 0);
      
      // Trouver les devises
      const invoiceCurrency = allCurrencies.find(c => c.id === invoice.currencyId);
      const paymentCurrency = paymentCurrencyId 
        ? allCurrencies.find(c => c.id === paymentCurrencyId)
        : null;

      // Si devises différentes, vérifier le taux de change
      if (paymentCurrencyId && invoice.currencyId !== paymentCurrencyId) {
        if (!invoiceEntry.exchangeRate || invoiceEntry.exchangeRate <= 0) {
          return { 
            message: `Un taux de change valide est requis pour la facture en ${invoiceCurrency?.code || 'devise inconnue'}`
          };
        }

        const maxAllowed = remainingAmount / invoiceEntry.exchangeRate;
        if (invoiceEntry.amount > maxAllowed + 0.01) {
          return {
            message: `Le montant pour la facture (${invoiceEntry.amount} ${paymentCurrency?.code || ''}) ` +
                     `dépasse le maximum autorisé (${maxAllowed.toFixed(2)} ${paymentCurrency?.code || ''}) ` +
                     `pour un reste de ${remainingAmount} ${invoiceCurrency?.code || ''} ` +
                     `au taux de ${invoiceEntry.exchangeRate}`
          };
        }
      } else {
        // Même devise - validation simple
        if (invoiceEntry.amount > remainingAmount + 0.01) {
          return {
            message: `Le montant pour la facture (${invoiceEntry.amount}) ` +
                     `dépasse le reste à payer (${remainingAmount})`
          };
        }
      }
    }
  }

  // Validation du montant total
  if (Math.abs(paid - used) > 0.01) {
    return { 
      message: `Le montant total (${paid}) doit correspondre à la somme des factures (${used})`,
      position: 'bottom-right'
    };
  }

  return { message: '', position: 'bottom-right' };
};

const onSubmit = async () => {
  if (isInspectMode) return;

  try {
    // 1. Préparer les données des factures
    const invoiceEntries = invoiceManager
    .getInvoices()
    .map((invoice: ExpensePaymentInvoiceEntry) => {
      const invoiceCurrencyId = invoice.expenseInvoice?.currency?.id;
      const paymentCurrencyId = paymentManager.currencyId;
      const isSameCurrency = invoiceCurrencyId === paymentCurrencyId;

      return {
        expenseInvoiceId: invoice.expenseInvoice?.id,
        amount: isSameCurrency
          ? invoice.amount
          : (invoice.amount ?? 0 / (invoice.exchangeRate || 1)), // Conversion TND→EUR
        originalAmount: invoice.amount,
        exchangeRate: isSameCurrency ? undefined : invoice.exchangeRate,
        originalCurrencyId: isSameCurrency ? undefined : paymentCurrencyId,
        digitAfterComma: invoice.expenseInvoice?.currency?.digitAfterComma
      };
      })
      .filter(entry => entry.amount ||  0 > 0 && entry.expenseInvoiceId);

    if (invoiceEntries.length === 0) {
      throw new Error('Aucune facture valide avec montant positif');
    }

    // 2. Calcul du montant total du paiement
    const totalAmount = invoiceEntries.reduce(
      (sum, entry) => sum + (entry.originalAmount || entry.amount),
      0
    );

    // 3. Préparation des données du paiement
    const paymentData: ExpenseUpdatePaymentDto = {
      id: paymentManager.id,
      sequential: paymentManager.sequentialNumbr || '',
      sequentialNumbr: paymentManager.sequentialNumbr || '',
      amount: totalAmount,
      fee: Number(paymentManager.fee) || 0,
      convertionRate: Number(paymentManager.convertionRate) || 1,
      date: paymentManager.date?.toISOString().split('T')[0],
      mode: paymentManager.mode,
      notes: paymentManager.notes || '',
      currencyId: paymentManager.currencyId,
      firmId: paymentManager.firmId,
      invoices: invoiceEntries,
    };

    // 4. Envoi de la requête
    await updatePayment({
      payment: paymentData,
      files: [] // Tableau vide si aucun fichier n'est uploadé
    })
    toast.success('Paiement mis à jour avec succès');
    router.push('/buying/expense_payments');

  } catch (error) {
    console.error('Erreur de mise à jour:', error);
    toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
  }
};
  // Dans ExpensePaymentUpdateForm
  return (
    <div className={cn('overflow-auto px-10 py-6', className)}>
      {/* Retirez pointer-events-none du conteneur principal */}
      <div className={cn('block xl:flex gap-4')}>
        {/* First Card */}
        <div className="w-full h-auto flex flex-col xl:w-9/12">
          <ScrollArea className="max-h-[calc(100vh-120px)] border rounded-lg">
            <Card className="border-0 p-2">
              <CardContent className="p-5">
                <ExpensePaymentGeneralInformation
                  className="pb-5 border-b"
                  firms={firms || []}
                  currencies={currencies?.filter(
                    (c) => c.id === cabinet?.currency?.id || c.id === paymentManager?.firm?.currencyId
                  ) || []}
                  loading={fetching}
                  disabled={isInspectMode}
                  />
                {paymentManager.firmId && (
                  <ExpensePaymentInvoiceManagement 
                  className="pb-5 border-b" 
                  loading={fetching}
                  disabled={isInspectMode || isDisabled}
                  mode={isInspectMode ? 'INSPECT' : 'EDIT'}
                  initialInvoices={isInspectMode ? [] : payment?.invoices || []}
                />
                )}
                <div className="flex gap-10 mt-5">
                  <Textarea
                    placeholder={tInvoicing('payment.attributes.notes')}
                    className="resize-none w-2/3"
                    rows={7}
                    value={paymentManager.notes || ''}
                    onChange={(e) => !isInspectMode && paymentManager.set('notes', e.target.value)}
                    disabled={isInspectMode} // Uniquement isInspectMode
                  />
                  <div className="w-1/3 my-auto">
                    <ExpensePaymentFinancialInformation 
                      currency={currency} 
                      disabled={isInspectMode} // Uniquement isInspectMode
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollArea>
        </div>
        {/* Second Card */}
        <div className="w-full xl:mt-0 xl:w-3/12">
          <ScrollArea className="h-fit border rounded-lg">
            <Card className="border-0">
              <CardContent className="p-5">
                <ExpensePaymentControlSection
                  handleSubmit={onSubmit}
                  reset={globalReset}
                  loading={isUpdatePending}
                  isInspectMode={isInspectMode}
                />
              </CardContent>
            </Card>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};