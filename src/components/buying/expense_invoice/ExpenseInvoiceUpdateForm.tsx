import React from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import { Article, EXPENSQUOTATION_STATUS } from '@/types';
import { Spinner } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import useTax from '@/hooks/content/useTax';
import useFirmChoice from '@/hooks/content/useFirmChoice';
import useBankAccount from '@/hooks/content/useBankAccount';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/errors';
import { DISCOUNT_TYPE } from '@/types/enums/discount-types';
import { useDebounce } from '@/hooks/other/useDebounce';
import _ from 'lodash';
import useCurrency from '@/hooks/content/useCurrency';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import useDefaultCondition from '@/hooks/content/useDefaultCondition';
import { ACTIVITY_TYPE } from '@/types/enums/activity-type';
import { DOCUMENT_TYPE } from '@/types/enums/document-type';
import { useRouter } from 'next/router';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';
import useInitializedState from '@/hooks/use-initialized-state';
import useQuotationChoices from '@/hooks/content/useQuotationChoice';
import useTaxWithholding from '@/hooks/content/useTaxWitholding';
import dinero from 'dinero.js';
import { createDineroAmountFromFloatWithDynamicCurrency } from '@/utils/money.utils';
import useInvoiceRangeDates from '@/hooks/content/useInvoiceRangeDates';
import { useExpenseInvoiceManager } from './hooks/useExpenseInvoiceManager';
import { useExpenseInvoiceControlManager } from './hooks/useExpenseInvoiceControlManager';
import { useExpenseInvoiceArticleManager } from './hooks/useExpenseInvoiceArticleManager';
import { EXPENSE_INVOICE_STATUS, ExpenseArticleInvoiceEntry, ExpenseInvoice, ExpenseInvoiceUploadedFile, ExpenseUpdateInvoiceDto } from '@/types/expense_invoices';
import { ExpenseInvoiceControlSection } from './form/ExpenseInvoiceControlSection';
import { ExpenseInvoiceFinancialInformation } from './form/ExpenseInvoiceFinancialInformation';
import { ExpenseInvoiceGeneralConditions } from './form/ExpenseInvoiceGeneralConditions';
import { ExpenseInvoiceExtraOptions } from './form/ExpenseInvoiceExtraOptions';
import { ExpenseInvoiceArticleManagement } from './form/ExpenseInvoiceArticleManagement';
import { ExpenseInvoiceGeneralInformation } from './form/ExpenseInvoiceGeneralInformation';
import { useExpenseQuotationManager } from '../expense_quotation/hooks/useExpenseQuotationManager';
import useExpenseQuotationChoices from '@/hooks/content/useExpenseQuotationChoice';
import { toast } from 'sonner';

interface ExpenseInvoiceFormProps {
  className?: string;
  invoiceId: string;
}

export const ExpenseInvoiceUpdateForm = ({ className, invoiceId }: ExpenseInvoiceFormProps) => {
  const router = useRouter();
  const { t: tCommon, ready: commonReady } = useTranslation('common');
  const { t: tInvoicing, ready: invoicingReady } = useTranslation('invoicing');

  const invoiceManager = useExpenseInvoiceManager();
  const quotationManager = useExpenseQuotationManager();
  const controlManager = useExpenseInvoiceControlManager();
  const articleManager = useExpenseInvoiceArticleManager();

  const {
    isPending: isFetchPending,
    data: invoiceResp,
    refetch: refetchInvoice
  } = useQuery({
    queryKey: ['expense_invoice', invoiceId],
    queryFn: () => api.expense_invoice.findOne(parseInt(invoiceId))
  });
  const invoice = React.useMemo(() => invoiceResp || null, [invoiceResp]);

  const { setRoutes } = useBreadcrumb();
  React.useEffect(() => {
    if (invoice?.sequential)
      setRoutes([
        { title: tCommon('menu.buying'), href: '/buying' },
        { title: tInvoicing('invoice.plural'), href: '/buying/expense_invoices' },
        { title: tInvoicing('invoice.singular') + ' N° ' + invoice?.sequential }
      ]);
  }, [router.locale, invoice?.sequential]);

  const editMode = React.useMemo(() => {
    // Si le mode est 'inspect', désactiver l'édition
    if (router.query.mode === 'inspect') return false;
    
    // Sinon, utiliser la logique existante basée sur le statut
    const editModeStatuses = [EXPENSE_INVOICE_STATUS.Validated, EXPENSE_INVOICE_STATUS.Draft];
    return invoice?.status && editModeStatuses.includes(invoice.status);
  }, [invoice, router.query.mode]);

  const { firms, isFetchFirmsPending } = useFirmChoice([
    'interlocutorsToFirm',
    'interlocutorsToFirm.interlocutor',
    'invoicingAddress',
    'deliveryAddress',
    'currency'
  ]);
  const { quotations, isFetchQuotationPending } = useExpenseQuotationChoices(
    EXPENSQUOTATION_STATUS.Draft,
    invoiceManager.firm?.id,
    invoiceManager.interlocutor?.id,
    true // enabled par défaut
  );  
  const { taxes, isFetchTaxesPending } = useTax();
  const { currencies, isFetchCurrenciesPending } = useCurrency();
  const { bankAccounts, isFetchBankAccountsPending } = useBankAccount();
  const { taxWithholdings, isFetchTaxWithholdingsPending } = useTaxWithholding();
  const { defaultCondition, isFetchDefaultConditionPending } = useDefaultCondition(
    ACTIVITY_TYPE.BUYING,
    DOCUMENT_TYPE.INVOICE
  );
  const { dateRange, isFetchInvoiceRangePending } = useInvoiceRangeDates(invoiceManager.id);
  const fetching =
    isFetchPending ||
    isFetchFirmsPending ||
    isFetchTaxesPending ||
    isFetchCurrenciesPending ||
    isFetchBankAccountsPending ||
    isFetchDefaultConditionPending ||
    isFetchQuotationPending ||
    isFetchTaxWithholdingsPending ||
    isFetchInvoiceRangePending ||
    !commonReady ||
    !invoicingReady;
  const { value: debounceFetching } = useDebounce<boolean>(fetching, 500);

  const digitAfterComma = React.useMemo(() => {
    return invoiceManager.currency?.digitAfterComma || 3;
  }, [invoiceManager.currency]);

  React.useEffect(() => {
    const zero = dinero({ amount: 0, precision: digitAfterComma });
    const articles = articleManager.getArticles() || [];
    const subTotal = articles?.reduce((acc, article) => {
      return acc.add(
        dinero({
          amount: createDineroAmountFromFloatWithDynamicCurrency(
            article?.subTotal || 0,
            digitAfterComma
          ),
          precision: digitAfterComma
        })
      );
    }, zero);
    invoiceManager.set('subTotal', subTotal.toUnit());

    const total = articles?.reduce(
      (acc, article) =>
        acc.add(
          dinero({
            amount: createDineroAmountFromFloatWithDynamicCurrency(
              article?.total || 0,
              digitAfterComma
            ),
            precision: digitAfterComma
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
        amount: createDineroAmountFromFloatWithDynamicCurrency(
          invoiceManager?.discount || 0,
          digitAfterComma
        ),
        precision: digitAfterComma
      });
      finalTotal = total.subtract(discountAmount);
    }
    if (invoiceManager.taxStampId) {
      const tax = taxes.find((t) => t.id === invoiceManager.taxStampId);
      if (tax) {
        const taxAmount = dinero({
          amount: createDineroAmountFromFloatWithDynamicCurrency(tax.value || 0, digitAfterComma),
          precision: digitAfterComma
        });
        finalTotal = finalTotal.add(taxAmount);
      }
    }
    invoiceManager.set('total', finalTotal.toUnit());
  }, [
    articleManager.articles,
    invoiceManager.discount,
    invoiceManager.discountType,
    invoiceManager.taxStampId
  ]);

  const setInvoiceData = (data: Partial<ExpenseInvoice & { files: ExpenseInvoiceUploadedFile[] }>) => {
    console.log('Fichiers existants dans setInvoiceData:', data?.files); // Ajout du log
    data && invoiceManager.setInvoice(data, firms, bankAccounts);
    data?.quotation && quotationManager.set('sequential', data?.quotation?.sequential);
    controlManager.setControls({
      isBankAccountDetailsHidden: !data?.expenseInvoiceMetaData?.hasBankingDetails,
      isArticleDescriptionHidden: !data?.expenseInvoiceMetaData?.showArticleDescription,
      isGeneralConditionsHidden: !data?.expenseInvoiceMetaData?.hasGeneralConditions,
      isTaxStampHidden: !data?.expenseInvoiceMetaData?.hasTaxStamp,
      isTaxWithholdingHidden: !data?.expenseInvoiceMetaData?.hasTaxWithholding,
    });
    articleManager.setArticles(data?.articleExpenseEntries || []);
  };

  const { isDisabled, globalReset } = useInitializedState({
    data: invoice || ({} as Partial<ExpenseInvoice & { files: ExpenseInvoiceUploadedFile[] }>),
    getCurrentData: () => {
      return {
        invoice: invoiceManager.getInvoice(),
        articles: articleManager.getArticles(),
        controls: controlManager.getControls()
      };
    },
    setFormData: (data: Partial<ExpenseInvoice & { files: ExpenseInvoiceUploadedFile[] }>) => {
      setInvoiceData(data);
    },
    resetData: () => {
      invoiceManager.reset();
      articleManager.reset();
      controlManager.reset();
    },
    loading: fetching
  });

  const { mutate: updateInvoice, isPending: isUpdatingPending } = useMutation({
    mutationFn: (data: { invoice: ExpenseUpdateInvoiceDto; files: File[] }) =>
      api.expense_invoice.update(data.invoice, data.files),
    onSuccess: () => {
      refetchInvoice();
      toast.success('Facture modifiée avec succès');
    },
    onError: (error) => {
      const message = getErrorMessage(
        'invoicing',
        error,
        'Erreur lors de la modification de la facture'
      );
      toast.error(message);
    }
  });

  const onSubmit = async (status: EXPENSE_INVOICE_STATUS) => {
    try {
      // Convertir les articles en DTO
      const articlesDto: ExpenseArticleInvoiceEntry[] = articleManager.getArticles()?.map((article) => {
        // Création d'un objet article complet avec valeurs par défaut
         const mappedArticle = {
                id: article?.id,
                article: {
                  id: article?.article?.id ?? 0,
                  title: article?.article?.title || '',
                  description: article?.article?.description || '',
                  reference: article?.article?.reference || '',
                  quantityInStock: article?.article?.quantityInStock || 0,
                  status: article?.article?.status || 'draft',
                  unitPrice: article?.article?.unitPrice || 0,
                  notes: article?.article?.notes || '',
                  version: article?.article?.version || 0
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
            }) || [];
  
      // Gestion des fichiers PDF
      let pdfFileId = invoiceManager.pdfFileId; // ID du fichier PDF existant
  
      // Si un nouveau fichier PDF est uploadé, on l'upload et on récupère son ID
      if (invoiceManager.pdfFile) {
        const [uploadedPdfFileId] = await api.upload.uploadFiles([invoiceManager.pdfFile]);
        pdfFileId = uploadedPdfFileId; // Mettre à jour l'ID du fichier PDF
      }
  
      // Upload des fichiers supplémentaires (exclure le fichier PDF)
      const additionalFiles = invoiceManager.uploadedFiles
        .filter((u) => !u.upload) // Fichiers supplémentaires non encore uploadés
        .map((u) => u.file);
  
      const uploadIds = await api.upload.uploadFiles(additionalFiles);
  
      // Créer l'objet invoice avec les fichiers uploadés
      const invoice: ExpenseUpdateInvoiceDto = {
        id: invoiceManager?.id,
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
        pdfFileId, // Inclure l'ID du fichier PDF (nouveau ou existant)
        uploads: [
          ...(invoiceManager.uploadedFiles.filter((u) => !!u.upload).map((u) => ({ uploadId: u.upload.id }))), // Fichiers existants
          ...uploadIds.map((id) => ({ uploadId: id })), // Nouveaux fichiers
        ],
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
  
        // Mettre à jour la facture avec les fichiers
        updateInvoice({
          invoice,
          files: additionalFiles, // Fichiers supplémentaires
        });
  
        // Réinitialiser l'état après la mise à jour
        globalReset();
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('An error occurred while updating the invoice');
    }
  };
  if (debounceFetching) return <Spinner className="h-screen" />;
  return (
    <div className={cn('overflow-auto px-10 py-6', className)}>
      <div className={cn('block xl:flex gap-4', isUpdatingPending ? 'pointer-events-none' : '')}>
        <div className="w-full h-auto flex flex-col xl:w-9/12">
          <ScrollArea className="max-h-[calc(100vh-120px)] border rounded-lg">
            <Card className="border-0">
              <CardContent className="p-5">
                <ExpenseInvoiceGeneralInformation
                  className="my-5"
                  firms={firms}
                  edit={editMode}
                  loading={debounceFetching}
                  isInspectMode={router.query.mode === 'inspect'} 
                />
                <ExpenseInvoiceArticleManagement
                  className="my-5"
                  taxes={taxes}
                  edit={editMode}
                  isArticleDescriptionHidden={controlManager.isArticleDescriptionHidden}
                  loading={debounceFetching}
                  isInspectMode={router.query.mode === 'inspect'} 

                />
                <ExpenseInvoiceExtraOptions
                  onUploadAdditionalFiles={(files) => invoiceManager.set('uploadedFiles', files)}
                  onUploadPdfFile={(file) => invoiceManager.set('pdfFile', file)}
                  isInspectMode={router.query.mode === 'inspect'} 

                />
                <div className="flex gap-10 m-5">
                  <ExpenseInvoiceGeneralConditions
                    className="flex flex-col w-2/3 my-auto"
                    isPending={debounceFetching}
                    hidden={controlManager.isGeneralConditionsHidden}
                    defaultCondition={defaultCondition}
                    edit={editMode}
                    isInspectMode={router.query.mode === 'inspect'} 

                  />
                  <div className="w-1/3 my-auto">
                    <ExpenseInvoiceFinancialInformation
                      subTotal={invoiceManager.subTotal}
                      status={invoiceManager.status}
                      currency={invoiceManager.currency}
                      taxes={taxes.filter((tax) => !tax.isRate)}
                      taxWithholdings={taxWithholdings}
                      loading={debounceFetching}
                      edit={editMode}
                      isInspectMode={router.query.mode === 'inspect'} 

                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollArea>
        </div>
        <div className="w-full xl:mt-0 xl:w-3/12">
          <ScrollArea className="max-h-[calc(100vh-120px)] border rounded-lg">
            <Card className="border-0">
              <CardContent className="p-5">
                <ExpenseInvoiceControlSection
                  status={invoiceManager.status}
                  isDataAltered={isDisabled}
                  bankAccounts={bankAccounts}
                  currencies={currencies}
                  quotations={quotations}
                  payments={invoice?.payments || []}
                  taxWithholdings={taxWithholdings}
                  handleSubmit={() => onSubmit(invoiceManager.status)}
                  handleSubmitDraft={() => onSubmit(EXPENSE_INVOICE_STATUS.Draft)}
                  handleSubmitValidated={() => onSubmit(EXPENSE_INVOICE_STATUS.Validated)}
                  handleSubmitExpired={() => onSubmit(EXPENSE_INVOICE_STATUS.Expired)}
                  loading={debounceFetching}
                  reset={globalReset}
                  edit={editMode}
                  isInspectMode={router.query.mode === 'inspect'} 
                />
              </CardContent>
            </Card>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};