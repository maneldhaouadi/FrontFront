import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useFirmChoices from '@/hooks/content/useFirmChoice';
import useCurrency from '@/hooks/content/useCurrency';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api';
import { useMutation } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/errors';
import { toast } from 'sonner';
import useCabinet from '@/hooks/content/useCabinet';
import dinero from 'dinero.js';
import { createDineroAmountFromFloatWithDynamicCurrency } from '@/utils/money.utils';
import { useExpensePaymentManager } from './hooks/useExpensePaymentManager';
import { useExpensePaymentInvoiceManager } from './hooks/useExpensePaymentInvoiceManager';
import { ExpenseCreatePaymentDto, ExpensePaymentInvoiceEntry } from '@/types/expense-payment';
import { ExpensePaymentGeneralInformation } from './form/ExpensePaymentGeneralInformation';
import { ExpensePaymentExtraOptions } from './form/ExpensePaymentExtraOptions';
import { ExpensePaymentFinancialInformation } from './form/ExpensePaymentFinancialInformation';
import { ExpensePaymentControlSection } from './form/ExpensePaymentControlSection';
import { Currency } from 'lucide-react';
import { ExpensePaymentInvoiceManagement } from './form/ExpensePaymentInvoiceManagement';

interface ExpensePaymentFormProps {
  className?: string;
  firmId?: string;
}

export const ExpensePaymentCreateForm = ({ className, firmId }: ExpensePaymentFormProps) => {
  const router = useRouter();
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');
  const { setRoutes } = useBreadcrumb();
  const paymentManager = useExpensePaymentManager();
  const invoiceManager = useExpensePaymentInvoiceManager();

  React.useEffect(() => {
    setRoutes(
      !firmId
        ? [
            { title: tCommon('menu.buying'), href: '/buying' },
            { title: tInvoicing('payment.plural'), href: '/buying/expense_payments' },
            { title: tInvoicing('payment.new') }
          ]
        : []
    );
  }, [router.locale, firmId]);

  // Fetch options
  const { currencies, isFetchCurrenciesPending } = useCurrency();
  const { cabinet, isFetchCabinetPending } = useCabinet();

  React.useEffect(() => {
    paymentManager.set('currencyId', cabinet?.currency?.id);
  }, [cabinet]);

  const { firms, isFetchFirmsPending } = useFirmChoices([
    'currency',
    'invoices',
    'invoices.currency'
  ]);

  const currency = React.useMemo(() => {
    return currencies.find((c) => c.id === paymentManager.currencyId);
  }, [paymentManager.currencyId, currencies]);

  const { mutate: createPayment, isPending: isCreatePending } = useMutation({
    mutationFn: (data: { payment: ExpenseCreatePaymentDto; files: File[] }) =>
      api.expensepayment.create(data.payment, data.files),
    onSuccess: () => {
      toast.success('Paiement créé avec succès');
      router.push('/buying/expense_payments');
    },
    onError: (error) => {
      const message = getErrorMessage('', error, 'Erreur lors de la création de paiement');
      toast.error(message);
    }
  });

  // Reset Form
  const globalReset = () => {
    paymentManager.reset();
    invoiceManager.reset();
  };

  React.useEffect(() => {
    globalReset();
  }, []);

  const onSubmit = async () => {
    const invoices: ExpensePaymentInvoiceEntry[] = invoiceManager
      .getInvoices()
      .map((invoice: ExpensePaymentInvoiceEntry) => ({
        expenseInvoiceId: invoice.expenseInvoice?.id,
        amount: invoice.amount,
        exchangeRate: invoice.exchangeRate // Ajoutez cette ligne
      }));

    const used = invoiceManager.calculateUsedAmount();
    const paid = dinero({
      amount: createDineroAmountFromFloatWithDynamicCurrency(
        (paymentManager.amount || 0) + (paymentManager.fee || 0),
        currency?.digitAfterComma || 3
      ),
      precision: currency?.digitAfterComma || 3
    }).toUnit();

    let pdfFileId = paymentManager.pdfFileId; // Existing PDF file ID

    // If a new PDF file is uploaded, upload it and get its ID
    if (paymentManager.pdfFile) {
      const [uploadedPdfFileId] = await api.upload.uploadFiles([paymentManager.pdfFile]);
      pdfFileId = uploadedPdfFileId; // Update the PDF file ID
    }

    // Upload additional files
    const additionalFiles = paymentManager.uploadedFiles
      .filter((u) => !u.upload) // Additional files not yet uploaded
      .map((u) => u.file);

    const uploadIds = await api.upload.uploadFiles(additionalFiles);

    const payment: ExpenseCreatePaymentDto = {
      amount: paymentManager.amount,
      fee: paymentManager.fee,
      convertionRate: paymentManager.convertionRate,
      date: paymentManager.date?.toString(),
      mode: paymentManager.mode,
      notes: paymentManager.notes,
      currencyId: paymentManager.currencyId,
      firmId: paymentManager.firmId,
      sequentialNumbr: paymentManager.sequentialNumbr,
      sequential: '', // Assurez-vous que sequentialNumbr est bien défini ici
      // Include sequential number
      pdfFileId, // Include PDF file ID
      uploads: uploadIds.map((id) => ({ uploadId: id })), // Include upload IDs
      invoices,
      targetCurrency: undefined,
      targetCurrencyId: 0
    };

    const validation = api.expensepayment.validate(payment, used, paid);
    if (validation.message) {
      toast.error(validation.message);
    } else {
      createPayment({
        payment,
        files: additionalFiles
      });
      globalReset();
    }
  };

  const loading = isFetchFirmsPending || isFetchCurrenciesPending || isFetchCabinetPending;
  return (
    <div className={cn('overflow-auto px-10 py-6', className)}>
      {/* Main Container */}
      <div className={cn('block xl:flex gap-4', false ? 'pointer-events-none' : '')}>
        {/* First Card */}
        <div className="w-full h-auto flex flex-col xl:w-9/12">
          <ScrollArea className=" max-h-[calc(100vh-120px)] border rounded-lg">
            <Card className="border-0 p-2">
              <CardContent className="p-5">
                {/* General Information */}
                <ExpensePaymentGeneralInformation
                  className="pb-5 border-b"
                  firms={firms}
                  currencies={currencies.filter(
                    (c) => c.id == cabinet?.currencyId || c.id == paymentManager?.firm?.currencyId
                  )}
                  loading={loading}
                />
                {/* Invoice Management */}
                {paymentManager.firmId && (
                  <ExpensePaymentInvoiceManagement className="pb-5 border-b" loading={loading} />
                )}
                {/* Extra Options (files) */}
                <div>
                  <ExpensePaymentExtraOptions
                    onUploadAdditionalFiles={(files) => paymentManager.set('uploadedFiles', files)}
                    onUploadPdfFile={(file) => paymentManager.set('pdfFile', file)}
                  />
                </div>
                <div className="flex gap-10 mt-5">
                  <Textarea
                    placeholder={tInvoicing('payment.attributes.notes')}
                    className="resize-none w-2/3"
                    rows={7}
                  />
                  <div className="w-1/3 my-auto">
                    {/* Final Financial Information */}
                    <ExpensePaymentFinancialInformation/>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollArea>
        </div>
        {/* Second Card */}
        <div className="w-full xl:mt-0 xl:w-3/12">
          <ScrollArea className=" h-fit border rounded-lg">
            <Card className="border-0">
              <CardContent className="p-5 ">
                <ExpensePaymentControlSection
                  handleSubmit={onSubmit}
                  reset={globalReset}
                  loading={false}
                />
              </CardContent>
            </Card>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};