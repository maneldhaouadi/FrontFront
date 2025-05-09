import React from 'react';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import { Spinner } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import useTax from '@/hooks/content/useTax';
import useFirmChoice from '@/hooks/content/useFirmChoice';
import useBankAccount from '@/hooks/content/useBankAccount';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/errors';
import { DISCOUNT_TYPE } from '@/types/enums/discount-types';
import useCurrency from '@/hooks/content/useCurrency';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import useCabinet from '@/hooks/content/useCabinet';
import useDefaultCondition from '@/hooks/content/useDefaultCondition';
import { ACTIVITY_TYPE } from '@/types/enums/activity-type';
import { DOCUMENT_TYPE } from '@/types/enums/document-type';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';
import useQuotationChoices from '@/hooks/content/useQuotationChoice';
import useTaxWithholding from '@/hooks/content/useTaxWitholding';
import dinero from 'dinero.js';
import { createDineroAmountFromFloatWithDynamicCurrency } from '@/utils/money.utils';
import { useExpenseInvoiceManager } from './hooks/useExpenseInvoiceManager';
import { useExpenseInvoiceArticleManager } from './hooks/useExpenseInvoiceArticleManager';
import { useExpenseInvoiceControlManager } from './hooks/useExpenseInvoiceControlManager';
import { EXPENSE_INVOICE_STATUS, ExpenseArticleInvoiceEntry, ExpenseCreateInvoiceDto } from '@/types/expense_invoices';
import { useDebounce } from '@/hooks/other/useDebounce';
import { ExpenseInvoiceGeneralInformation } from './form/ExpenseInvoiceGeneralInformation';
import { ExpenseInvoiceArticleManagement } from './form/ExpenseInvoiceArticleManagement';
import { ExpenseInvoiceFinancialInformation } from './form/ExpenseInvoiceFinancialInformation';
import { ExpenseInvoiceGeneralConditions } from './form/ExpenseInvoiceGeneralConditions';
import { ExpenseInvoiceExtraOptions } from './form/ExpenseInvoiceExtraOptions';
import { ExpenseInvoiceControlSection } from './form/ExpenseInvoiceControlSection';
import useInvoiceRangeDates from '@/hooks/content/useInvoiceRangeDates';
import { EXPENSQUOTATION_STATUS } from '@/types';
import useExpenseQuotationChoices from '@/hooks/content/useExpenseQuotationChoice';

interface ExpenseInvoiceFormProps {
  className?: string;
  firmId?: string;
}

export const ExpenseInvoiceCreateForm = ({ className, firmId }: ExpenseInvoiceFormProps) => {
  const router = useRouter();
  const { t: tCommon, ready: commonReady } = useTranslation('common');
  const { t: tInvoicing, ready: invoicingReady } = useTranslation('invoicing');

  const invoiceManager = useExpenseInvoiceManager();
  const articleManager = useExpenseInvoiceArticleManager();
  const controlManager = useExpenseInvoiceControlManager();

  const { setRoutes } = useBreadcrumb();
  React.useEffect(() => {
    setRoutes(
      !firmId
        ? [
            { title: tCommon('menu.buying'), href: '/buying' },
            { title: tInvoicing('invoice.plural'), href: '/buying/expense_invoices' },
            { title: tInvoicing('invoice.new') },
          ]
        : [
            { title: tCommon('menu.contacts'), href: '/contacts' },
            { title: 'Entreprises', href: '/contacts/firms' },
            { title: `Entreprise N°${firmId}`, href: `/contacts/firm/${firmId}?tab=entreprise` },
            { title: 'Nouvelle Facture' },
          ]
    );
  }, [router.locale, firmId]);

  // Fetch options
  const { firms, isFetchFirmsPending } = useFirmChoice([
    'interlocutorsToFirm',
    'interlocutorsToFirm.interlocutor',
    'paymentCondition',
    'invoicingAddress',
    'deliveryAddress',
    'currency',
  ]);
  const { quotations, isFetchQuotationPending } = useExpenseQuotationChoices(
    EXPENSQUOTATION_STATUS.Draft,
    invoiceManager.firm?.id,
    invoiceManager.interlocutor?.id,
    true // enabled par défaut
  );  const { cabinet, isFetchCabinetPending } = useCabinet();
  const { taxes, isFetchTaxesPending } = useTax();
  const { currencies, isFetchCurrenciesPending } = useCurrency();
  const { bankAccounts, isFetchBankAccountsPending } = useBankAccount();
  const { defaultCondition, isFetchDefaultConditionPending } = useDefaultCondition(
    ACTIVITY_TYPE.BUYING,
    DOCUMENT_TYPE.INVOICE
  );
  const { taxWithholdings, isFetchTaxWithholdingsPending } = useTaxWithholding();
  const { dateRange, isFetchInvoiceRangePending } = useInvoiceRangeDates(invoiceManager.id);

  // Handle Sequential Number
  React.useEffect(() => {
    invoiceManager.set('bankAccount', bankAccounts.find((a) => a.isMain));
    invoiceManager.set('currency', cabinet?.currency);
  }, [bankAccounts, cabinet]);

  const digitAfterComma = React.useMemo(() => {
    return invoiceManager.currency?.digitAfterComma || 3;
  }, [invoiceManager.currency]);

  React.useEffect(() => {
    const zero = dinero({ amount: 0, precision: digitAfterComma });
    const articles = articleManager.getArticles() || [];
    const subTotal = articles.reduce((acc, article) => {
      return acc.add(
        dinero({
          amount: createDineroAmountFromFloatWithDynamicCurrency(article?.subTotal || 0, digitAfterComma),
          precision: digitAfterComma,
        })
      );
    }, zero);
    invoiceManager.set('subTotal', subTotal.toUnit());
    const total = articles.reduce(
      (acc, article) =>
        acc.add(
          dinero({
            amount: createDineroAmountFromFloatWithDynamicCurrency(article?.total || 0, digitAfterComma),
            precision: digitAfterComma,
          })
        ),
      zero
    );

    let finalTotal = total;
    if (invoiceManager.discountType === DISCOUNT_TYPE.PERCENTAGE) {
      const discountAmount = total.multiply(invoiceManager.discount / 100);
      finalTotal = total.subtract(discountAmount);
    } else {
      const discountAmount = dinero({
        amount: createDineroAmountFromFloatWithDynamicCurrency(invoiceManager?.discount || 0, digitAfterComma),
        precision: digitAfterComma,
      });
      finalTotal = total.subtract(discountAmount);
    }
    if (invoiceManager.taxStampId) {
      const tax = taxes.find((t) => t.id === invoiceManager.taxStampId);
      if (tax) {
        const taxAmount = dinero({
          amount: createDineroAmountFromFloatWithDynamicCurrency(tax.value || 0, digitAfterComma),
          precision: digitAfterComma,
        });
        finalTotal = finalTotal.add(taxAmount);
      }
    }
    invoiceManager.set('total', finalTotal.toUnit());
  }, [
    articleManager.articles,
    invoiceManager.discount,
    invoiceManager.discountType,
    invoiceManager.taxStampId,
  ]);

  const { mutate: createInvoice, isPending: isCreatePending } = useMutation({
    mutationFn: (data: { invoice: ExpenseCreateInvoiceDto; files: File[] }) =>
      api.expense_invoice.create(data.invoice, data.files),
    onSuccess: () => {
      if (!firmId) router.push('/buying/expense_invoices');
      else router.push(`/contacts/firm/${firmId}/?tab=invoices`);
      toast.success('Facture créée avec succès');
    },
    onError: (error) => {
      const message = getErrorMessage('invoicing', error, 'Erreur lors de la création de facture');
      toast.error(message);
    },
  });

  const loading =
    isFetchFirmsPending ||
    isFetchTaxesPending ||
    isFetchCabinetPending ||
    isFetchBankAccountsPending ||
    isFetchCurrenciesPending ||
    isFetchDefaultConditionPending ||
    isCreatePending ||
    isFetchQuotationPending ||
    isFetchTaxWithholdingsPending ||
    isFetchInvoiceRangePending ||
    !commonReady ||
    !invoicingReady;

  const { value: debounceLoading } = useDebounce<boolean>(loading, 500);

  const globalReset = () => {
    invoiceManager.reset();
    articleManager.reset();
    controlManager.reset();
  };

  React.useEffect(() => {
    globalReset();
    articleManager.add();
  }, []);

  const onSubmit = async (status: EXPENSE_INVOICE_STATUS) => {
    // Convertir les articles en DTO
    const articlesDto: ExpenseArticleInvoiceEntry[] = articleManager.getArticles()?.map((article) => {
      // Créez l'objet article avec les propriétés requises
      const mappedArticle = {
        id: article?.id,
        article: {
          id: article?.article?.id ?? 0,
          title: article?.article?.title || '',
          description: article?.article?.description || '',
          reference: article?.article?.reference || '', // Ajout de la référence obligatoire
          quantityInStock: article?.article?.quantityInStock || 0,
          status: article?.article?.status || 'draft', // Valeur par défaut
          unitPrice: article?.article?.unitPrice || 0,// Ajout du prix unitaire,
          version:article?.article?.version || 0
           

        },
        quantity: article?.quantity || 0,
        unit_price: article?.unit_price || 0,
        discount: article?.discount || 0,
        discount_type: article?.discount_type === 'PERCENTAGE' 
          ? DISCOUNT_TYPE.PERCENTAGE 
          : DISCOUNT_TYPE.AMOUNT,
        taxes: article?.expenseArticleInvoiceEntryTaxes?.map((entry) => entry?.tax?.id).filter(Boolean) as number[],
        expenseArticleInvoiceEntryTaxes: article?.expenseArticleInvoiceEntryTaxes || []
      };
    
      return mappedArticle;
    }) || []; // Gestion du cas où getArticles() retourne undefined
  
    // Gestion des fichiers uploadés
    let pdfFileId = invoiceManager.pdfFileId; // ID du fichier PDF existant
  
    // Si un nouveau fichier PDF est uploadé, on l'upload et on récupère son ID
    if (invoiceManager.pdfFile) {
      const [uploadedPdfFileId] = await api.upload.uploadFiles([invoiceManager.pdfFile]);
      pdfFileId = uploadedPdfFileId; // Mettre à jour l'ID du fichier PDF
    }
  
    // Upload des fichiers supplémentaires
    const additionalFiles = invoiceManager.uploadedFiles
      .filter((u) => !u.upload) // Fichiers supplémentaires non encore uploadés
      .map((u) => u.file);
  
    const uploadIds = await api.upload.uploadFiles(additionalFiles);
  
    // Créer l'objet invoice avec les fichiers uploadés
    const invoice: ExpenseCreateInvoiceDto = {
      date: invoiceManager?.date?.toString(),
      dueDate: invoiceManager?.dueDate?.toString(),
      object: invoiceManager?.object,
      sequentialNumbr: invoiceManager?.sequentialNumbr,
      sequential: '', // Assurez-vous que sequentialNumbr est bien défini ici
      cabinetId: invoiceManager?.firm?.cabinetId,
      firmId: invoiceManager?.firm?.id,
      interlocutorId: invoiceManager?.interlocutor?.id,
      currencyId: invoiceManager?.currency?.id,
      bankAccountId: !controlManager?.isBankAccountDetailsHidden ? invoiceManager?.bankAccount?.id : undefined,
      status,
      generalConditions: !controlManager.isGeneralConditionsHidden ? invoiceManager?.generalConditions : '',
      notes: invoiceManager?.notes,
      articleInvoiceEntries: articlesDto,
      discount: invoiceManager?.discount,
      discount_type: invoiceManager?.discountType === 'PERCENTAGE' ? DISCOUNT_TYPE.PERCENTAGE : DISCOUNT_TYPE.AMOUNT,
      quotationId: invoiceManager?.quotationId,
      taxStampId: invoiceManager?.taxStampId,
      taxWithholdingId: invoiceManager?.taxWithholdingId,
      pdfFileId, // ID du fichier PDF
      uploads: uploadIds.map((id) => ({ uploadId: id })), // IDs des fichiers supplémentaires
      expenseInvoiceMetaData: {
        showArticleDescription: !controlManager?.isArticleDescriptionHidden,
        hasBankingDetails: !controlManager.isBankAccountDetailsHidden,
        hasGeneralConditions: !controlManager.isGeneralConditionsHidden,
        hasTaxWithholding: !controlManager.isTaxWithholdingHidden,
      },
    };
  
    // Validation de la facture
    const validation = api.expense_invoice.validate(invoice, dateRange);
    if (validation.message) {
      toast.error(validation.message);
    } else {
      if (controlManager.isGeneralConditionsHidden) delete invoice.generalConditions;
  
      // Créer la facture avec les fichiers
      createInvoice({
        invoice,
        files: additionalFiles, // Fichiers supplémentaires
      });
  
      // Réinitialiser l'état après la création
      globalReset();
    }
  };
  // Component representation
  if (debounceLoading) return <Spinner className="h-screen" show={loading} />;
  return (
    <div className={cn('overflow-auto px-10 py-6', className)}>
      {/* Main Container */}
      <div className={cn('block xl:flex gap-4', isCreatePending ? 'pointer-events-none' : '')}>
        {/* First Card */}
        <div className="w-full h-auto flex flex-col xl:w-9/12">
          <ScrollArea className="max-h-[calc(100vh-120px)] border rounded-lg">
            <Card className="border-0">
              <CardContent className="p-5">
                {/* General Information */}
                <ExpenseInvoiceGeneralInformation
                  className="my-5"
                  firms={firms}
                  loading={isFetchFirmsPending}
                />
                {/* Article Management */}
                <ExpenseInvoiceArticleManagement
                  className="my-5"
                  taxes={taxes}
                  isArticleDescriptionHidden={controlManager.isArticleDescriptionHidden}
                />
                {/* File Upload & Notes */}
                <ExpenseInvoiceExtraOptions
                  onUploadAdditionalFiles={(files) => invoiceManager.set('uploadedFiles', files)}
                  onUploadPdfFile={(file) => invoiceManager.set('pdfFile', file)}
                />
                {/* Other Information */}
                <div className="flex gap-10 mt-5">
                  <ExpenseInvoiceGeneralConditions
                    className="flex flex-col w-2/3 my-auto"
                    isPending={debounceLoading}
                    hidden={controlManager.isGeneralConditionsHidden}
                    defaultCondition={defaultCondition}
                  />
                  <div className="w-1/3 my-auto">
                    {/* Final Financial Information */}
                    <ExpenseInvoiceFinancialInformation
                      subTotal={invoiceManager.subTotal}
                      status={EXPENSE_INVOICE_STATUS.Nonexistent}
                      currency={invoiceManager.currency}
                      taxes={taxes.filter((tax) => !tax.isRate)}
                      taxWithholdings={taxWithholdings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollArea>
        </div>
        {/* Second Card */}
        <div className="w-full xl:mt-0 xl:w-3/12">
          <ScrollArea className="max-h-[calc(100vh-120px)] border rounded-lg">
            <Card className="border-0">
              <CardContent className="p-5">
                {/* Control Section */}
                <ExpenseInvoiceControlSection
                  quotations={quotations}
                  bankAccounts={bankAccounts}
                  currencies={currencies}
                  taxWithholdings={taxWithholdings}
                  handleSubmitDraft={() => onSubmit(EXPENSE_INVOICE_STATUS.Draft)}
                  reset={globalReset}
                  hideValidateButton={true}
                  loading={debounceLoading} handleSubmitValidated={function (): void {
                    throw new Error('Function not implemented.');
                  } }                />
              </CardContent>
            </Card>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};