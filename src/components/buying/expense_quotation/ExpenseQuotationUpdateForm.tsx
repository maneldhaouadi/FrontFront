import React from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import {
  ExpenseArticleQuotationEntry,
  ExpenseQuotation,
  EXPENSQUOTATION_STATUS,
  ExpensQuotationUploadedFile,
  UpdateExpensQuotationDto,
} from '@/types';
import { Spinner } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import useTax from '@/hooks/content/useTax';
import useFirmChoice from '@/hooks/content/useFirmChoice';
import useBankAccount from '@/hooks/content/useBankAccount';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/errors';
import { DISCOUNT_TYPE } from '@/types/enums/discount-types';
import { useDebounce } from '@/hooks/other/useDebounce';
import _ from 'lodash';
import useCurrency from '@/hooks/content/useCurrency';
import { useTranslation } from 'react-i18next';
import useDefaultCondition from '@/hooks/content/useDefaultCondition';
import { ACTIVITY_TYPE } from '@/types/enums/activity-type';
import { DOCUMENT_TYPE } from '@/types/enums/document-type';
import { useRouter } from 'next/router';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';
import useInitializedState from '@/hooks/use-initialized-state';
import dinero from 'dinero.js';
import { createDineroAmountFromFloatWithDynamicCurrency } from '@/utils/money.utils';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useQuotationControlManager } from './hooks/useExpenseQuotationControlManager';
import { useExpenseQuotationArticleManager } from './hooks/useExpenseQuotationArticleManager';
import { ExpenseQuotationGeneralInformation } from './form/ExpenseQuotationGeneralInformation';
import { ExpenseQuotationArticleManagement } from './form/ExpenseQuotationArticleManagement';
import { ExpenseQuotationGeneralConditions } from './form/ExpenseQuotationGeneralConditions';
import { ExpenseQuotationFinancialInformation } from './form/ExpenseQuotationFinancialInformation';
import { ExpenseQuotationControlSection } from './form/ExpenseQuotationControlSection';
import { useExpenseQuotationManager } from './hooks/useExpenseQuotationManager';
import { ExpensequotationExtraOptions } from './form/ExpenseQuotationExtraOptions';

interface ExpenseQuotationFormProps {
  className?: string;
  expensequotationId: string;
}

export const ExpenseQuotationUpdateForm = ({ className, expensequotationId }: ExpenseQuotationFormProps) => {
  const router = useRouter();
  const { t: tCommon, ready: commonReady } = useTranslation('common');
  const { t: tInvoicing, ready: invoicingReady } = useTranslation('invoicing');

  // Stores
  const quotationManager = useExpenseQuotationManager();
  const controlManager = useQuotationControlManager();
  const articleManager = useExpenseQuotationArticleManager();

  // Fetch options
  const {
    isPending: isFetchPending,
    data: quotationResp,
    refetch: refetchQuotation,
  } = useQuery({
    queryKey: ['quotation', expensequotationId],
    queryFn: () => api.expense_quotation.findOne(parseInt(expensequotationId)),
  });
  const quotation = React.useMemo(() => quotationResp || null, [quotationResp]);

  // Set page title in the breadcrumb
  const { setRoutes } = useBreadcrumb();
  React.useEffect(() => {
    if (quotation?.sequential) {
      setRoutes([
        { title: tCommon('menu.buying'), href: '/buying' },
        { title: tInvoicing('quotation.plural'), href: '/buying/expense_quotations' },
        { title: tInvoicing('quotation.singular') + ' N° ' + quotation?.sequential },
      ]);
    }
  }, [router.locale, quotation?.sequential]);

  // Recognize if the form can be edited
  const editMode = React.useMemo(() => {
    const editModeStatuses = [EXPENSQUOTATION_STATUS.Draft];
    return quotation?.status && editModeStatuses.includes(quotation.status);
  }, [quotation]);

  // Fetch options
  const { firms, isFetchFirmsPending } = useFirmChoice([
    'interlocutorsToFirm',
    'interlocutorsToFirm.interlocutor',
    'invoicingAddress',
    'deliveryAddress',
    'currency',
  ]);
  const { taxes, isFetchTaxesPending } = useTax();
  const { currencies, isFetchCurrenciesPending } = useCurrency();
  const { bankAccounts, isFetchBankAccountsPending } = useBankAccount();
  const { defaultCondition, isFetchDefaultConditionPending } = useDefaultCondition(
    ACTIVITY_TYPE.BUYING,
    DOCUMENT_TYPE.QUOTATION,
  );

  const fetching =
    isFetchPending ||
    isFetchFirmsPending ||
    isFetchTaxesPending ||
    isFetchCurrenciesPending ||
    isFetchBankAccountsPending ||
    isFetchDefaultConditionPending ||
    !commonReady ||
    !invoicingReady;
  const { value: debounceFetching } = useDebounce<boolean>(fetching, 500);

  const digitAfterComma = React.useMemo(() => quotationManager.currency?.digitAfterComma || 3, [quotationManager.currency]);

  // Perform calculations when financial information changes
  React.useEffect(() => {
    const zero = dinero({ amount: 0, precision: digitAfterComma });
    const subTotal = articleManager.getArticles()?.reduce((acc, article) => {
      return acc.add(
        dinero({
          amount: createDineroAmountFromFloatWithDynamicCurrency(article?.subTotal || 0, digitAfterComma),
          precision: digitAfterComma,
        }),
      );
    }, zero);
    quotationManager.set('subTotal', subTotal.toUnit());

    const total = articleManager.getArticles()?.reduce((acc, article) => {
      return acc.add(
        dinero({
          amount: createDineroAmountFromFloatWithDynamicCurrency(article?.total || 0, digitAfterComma),
          precision: digitAfterComma,
        }),
      );
    }, zero);

    let finalTotal = total;
    if (quotationManager.discount_type === DISCOUNT_TYPE.PERCENTAGE) {
      const discountAmount = total.multiply(quotationManager.discount / 100);
      finalTotal = total.subtract(discountAmount);
    } else {
      const discountAmount = dinero({
        amount: createDineroAmountFromFloatWithDynamicCurrency(quotationManager?.discount || 0, digitAfterComma),
        precision: digitAfterComma,
      });
      finalTotal = total.subtract(discountAmount);
    }
    quotationManager.set('total', finalTotal.toUnit());
  }, [articleManager.articles, quotationManager.discount, quotationManager.discount_type]);

  // Full quotation setter across multiple stores
  const setQuotationData = (data: Partial<ExpenseQuotation & { files: ExpensQuotationUploadedFile[] }>) => {
    if (!data) return;

    // Update quotation info
    quotationManager.setQuotation(data, firms, bankAccounts);

    // Update meta info
    controlManager.setControls({
      isBankAccountDetailsHidden: !data?.expensequotationMetaData?.hasBankingDetails,
      isArticleDescriptionHidden: !data?.expensequotationMetaData?.showArticleDescription,
      isGeneralConditionsHidden: !data?.expensequotationMetaData?.hasGeneralConditions,
    });

    // Update articles
    const articles = data?.expensearticleQuotationEntries || [];
    if (articles.length === 0) {
      toast.error('Les données des articles sont vides.', { position: 'bottom-right' });
    }
    articleManager.setArticles(articles);
  };

  // Initialized value to detect changes while modifying the quotation
  const { isDisabled, globalReset } = useInitializedState({
    data: quotation || ({} as Partial<ExpenseQuotation & { files: ExpensQuotationUploadedFile[] }>),
    getCurrentData: () => ({
      quotation: quotationManager.getQuotation(),
      articles: articleManager.getArticles(),
      controls: controlManager.getControls(),
    }),
    setFormData: (data: Partial<ExpenseQuotation & { files: ExpensQuotationUploadedFile[] }>) => {
      setQuotationData(data);
    },
    resetData: () => {
      quotationManager.reset();
      articleManager.reset();
      controlManager.reset();
    },
    loading: fetching,
  });

  // Update quotation mutator
  const { mutate: updateQuotation, isPending: isUpdatingPending } = useMutation({
    mutationFn: (data: { quotation: UpdateExpensQuotationDto; files: File[] }) => {
      return api.expense_quotation.update(data.quotation, data.files);
    },
    onSuccess: (data) => {
      if (data.status === EXPENSQUOTATION_STATUS.Draft) {
        toast.success('Devis modifié avec succès');
      }
      refetchQuotation();
    },
    onError: (error) => {
      const message = getErrorMessage('contacts', error, 'Erreur lors de la modification de devis');
      toast.error(message);
    },
  });

  // Update handler
  const onSubmit = async (status: EXPENSQUOTATION_STATUS) => {
    try {
      const articlesDto = articleManager.getArticles()?.map((article) => {
        // Garantir que l'ID est toujours défini (0 si nouvel article)
        const articleId = article?.article?.id ?? 0;
        
        const articleUpdateData = {
            id: articleId, // <-- Maintenant toujours un nombre
            title: article?.article?.title || '',
            description: article?.article?.description || '',
            reference: article?.article?.reference || article?.reference || '',
            unitPrice: article?.unit_price || article?.article?.unitPrice || 0,
            quantityInStock: article?.quantity || article?.article?.quantityInStock || 0,
            status: article?.article?.status || 'draft',
            version: article?.article?.version || 0
        };
    
        return {
            ...article,
            article: articleUpdateData,
            taxes: article?.articleExpensQuotationEntryTaxes?.map(t => t.tax?.id).filter(Boolean) as number[]
        };
    }) || [];
  
      // 2. Gestion du fichier PDF
      let pdfFileId = quotationManager.pdfFileId;
      if (quotationManager.pdfFile) {
        const [uploadedPdfFileId] = await api.upload.uploadFiles([quotationManager.pdfFile]);
        pdfFileId = uploadedPdfFileId;
        
        if (quotationManager.pdfFileId && quotationManager.pdfFileId !== pdfFileId) {
          await api.upload.delete(quotationManager.pdfFileId);
        }
      }
  
      // 3. Gestion des fichiers supplémentaires
      const additionalFiles = quotationManager.uploadedFiles
        .filter((u) => !u.upload)
        .map((u) => u.file);
  
      let uploadIds: number[] = [];
      if (additionalFiles.length > 0) {
        uploadIds = await api.upload.uploadFiles(additionalFiles);
      }
  
      // 4. Construction de l'objet quotation
      const quotation: UpdateExpensQuotationDto = {
        id: quotationManager.id,
        date: quotationManager.date?.toISOString().split('T')[0],
        dueDate: quotationManager.dueDate?.toISOString().split('T')[0],
        sequentialNumbr: quotationManager.sequentialNumbr,
        sequential: quotationManager.sequentialNumbr,
        object: quotationManager.object,
        cabinetId: quotationManager.firm?.cabinetId,
        firmId: quotationManager.firm?.id,
        interlocutorId: quotationManager.interlocutor?.id,
        currencyId: quotationManager.currency?.id,
        bankAccountId: !controlManager.isBankAccountDetailsHidden ? quotationManager.bankAccount?.id : null,
        status,
        generalConditions: !controlManager.isGeneralConditionsHidden ? quotationManager.generalConditions : '',
        notes: quotationManager.notes,
        articleQuotationEntries: articlesDto,
        discount: quotationManager.discount,
        discount_type: quotationManager.discount_type === 'PERCENTAGE' 
          ? DISCOUNT_TYPE.PERCENTAGE 
          : DISCOUNT_TYPE.AMOUNT,
        pdfFileId,
        uploads: [
          ...(quotationManager.uploadedFiles
            .filter((u) => u.upload?.id)
            .map((u) => ({
              id: u.upload.id,
              uploadId: u.upload.id
            })) || []),
          ...uploadIds.map((uploadId) => ({ uploadId }))
        ],
        expensequotationMetaData: {
          showArticleDescription: !controlManager.isArticleDescriptionHidden,
          hasBankingDetails: !controlManager.isBankAccountDetailsHidden,
          hasGeneralConditions: !controlManager.isGeneralConditionsHidden,
        },
      };
  
      // 5. Validation avant envoi
      const validation = api.expense_quotation.validate(quotation);
      if (validation.message) {
        toast.error(validation.message);
        return;
      }
  
      // 6. Envoi au backend
      await updateQuotation({ 
        quotation, 
        files: additionalFiles 
      });
  
      toast.success('Devis mis à jour avec succès');
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };
  // Component representation
  if (debounceFetching) return <Spinner className="h-screen" />;
  return (
    <div className={cn('overflow-auto px-10 py-6', className)}>
      <div className={cn('block xl:flex gap-4', isUpdatingPending ? 'pointer-events-none' : '')}>
        <div className="w-full h-auto flex flex-col xl:w-9/12">
          <ScrollArea className="max-h-[calc(100vh-120px)] border rounded-lg">
            <Card className="border-0">
              <CardContent className="p-5">
                <ExpenseQuotationGeneralInformation
                  className="my-5"
                  firms={firms}
                  edit={editMode}
                  loading={debounceFetching}
                  isInspectMode={router.query.mode === 'inspect'} 

                />
                <ExpenseQuotationArticleManagement
                  className="my-5"
                  taxes={taxes}
                  edit={editMode}
                  isArticleDescriptionHidden={controlManager.isArticleDescriptionHidden}
                  loading={debounceFetching}
                  isInspectMode={router.query.mode === 'inspect'} 

                />
                <ExpensequotationExtraOptions
                  onUploadAdditionalFiles={(files) => quotationManager.set('uploadedFiles', files)}
                  onUploadPdfFile={(file) => quotationManager.set('pdfFile', file)}
                  isInspectMode={router.query.mode === 'inspect'} 
                />
                <div className="flex gap-10 m-5">
                  <ExpenseQuotationGeneralConditions
                    className="flex flex-col w-2/3 my-auto"
                    isPending={debounceFetching}
                    hidden={controlManager.isGeneralConditionsHidden}
                    defaultCondition={defaultCondition}
                    edit={editMode}
                    isInspectMode={router.query.mode === 'inspect'} 

                  />
                  <div className="w-1/3 my-auto">
                    <ExpenseQuotationFinancialInformation
                      subTotal={quotationManager.subTotal}
                      total={quotationManager.total}
                      currency={quotationManager.currency}
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
                <ExpenseQuotationControlSection
                  status={quotationManager.status}
                  isDataAltered={isDisabled}
                  bankAccounts={bankAccounts}
                  currencies={currencies}
                  invoices={quotation?.invoices || []}
                  handleSubmit={() => onSubmit(quotationManager.status)}
                  handleSubmitDraft={() => onSubmit(EXPENSQUOTATION_STATUS.Draft)}
                  handleSubmitExpired={() => onSubmit(EXPENSQUOTATION_STATUS.Expired)}
                  loading={debounceFetching}
                  refetch={refetchQuotation}
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