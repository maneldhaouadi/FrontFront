import React from 'react';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import {CreateExpensQuotationDto,ExpenseArticleQuotationEntry, EXPENSQUOTATION_STATUS} from '@/types';
import { Spinner } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import useTax from '@/hooks/content/useTax';
import useFirmChoice from '@/hooks/content/useFirmChoice';
import useBankAccount from '@/hooks/content/useBankAccount';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/errors';
import { DISCOUNT_TYPE } from '@/types/enums/discount-types';

import { useDebounce } from '@/hooks/other/useDebounce';
import useCurrency from '@/hooks/content/useCurrency';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import useCabinet from '@/hooks/content/useCabinet';
import useDefaultCondition from '@/hooks/content/useDefaultCondition';
import { ACTIVITY_TYPE } from '@/types/enums/activity-type';
import { DOCUMENT_TYPE } from '@/types/enums/document-type';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';

import dinero from 'dinero.js';
import { createDineroAmountFromFloatWithDynamicCurrency } from '@/utils/money.utils';
import { useExpenseQuotationArticleManager } from './hooks/useExpenseQuotationArticleManager';
import { useQuotationControlManager } from './hooks/useExpenseQuotationControlManager';
import { ExpenseQuotationArticleManagement } from './form/ExpenseQuotationArticleManagement';
import { ExpenseQuotationGeneralConditions } from './form/ExpenseQuotationGeneralConditions';
import { ExpenseQuotationFinancialInformation } from './form/ExpenseQuotationFinancialInformation';
import { ExpenseQuotationControlSection } from './form/ExpenseQuotationControlSection';
import { useExpenseQuotationManager } from './hooks/useExpenseQuotationManager';
import { ExpenseQuotationGeneralInformation } from './form/ExpenseQuotationGeneralInformation';
import { ExpensequotationExtraOptions } from './form/ExpenseQuotationExtraOptions';

interface ExpenseQuotationFormProps {
  className?: string;
  firmId?: string;
}

export const ExpenseQuotationCreateForm = ({ className, firmId }: ExpenseQuotationFormProps) => {
  //next-router
  const router = useRouter();
  

  //translations
  const { t: tCommon, ready: commonReady } = useTranslation('common');
  const { t: tInvoicing, ready: invoicingReady } = useTranslation('invoicing');

  // Stores
  const quotationManager = useExpenseQuotationManager();
  const articleManager = useExpenseQuotationArticleManager();
  const controlManager = useQuotationControlManager();

  //set page title in the breadcrumb
  const { setRoutes } = useBreadcrumb();
  React.useEffect(() => {
    setRoutes(
      !firmId
        ? [
            { title: tCommon('menu.buying'), href: '/buying' },
            { title: tInvoicing('quotation.plural'), href: '/buying/expense_quotations' },
            { title: tInvoicing('quotation.new') }
          ]
        : [
            { title: tCommon('menu.contacts'), href: '/contacts' },
            { title: 'Entreprises', href: '/contacts/firms' },
            {
              title: `Entreprise N°${firmId}`,
              href: `/contacts/firm/${firmId}?tab=entreprise`
            },
            { title: 'Nouveau Devis' }
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
    'currency'
  ]);
  const { cabinet, isFetchCabinetPending } = useCabinet();
  const { taxes, isFetchTaxesPending } = useTax();
  const { currencies, isFetchCurrenciesPending } = useCurrency();
  const { bankAccounts, isFetchBankAccountsPending } = useBankAccount();
  const { defaultCondition, isFetchDefaultConditionPending } = useDefaultCondition(
    ACTIVITY_TYPE.BUYING,
    DOCUMENT_TYPE.QUOTATION
  );

  //websocket to listen for server changes related to sequence number
  //handle Sequential Number
  React.useEffect(() => {
    quotationManager.set(
      'bankAccount',
      bankAccounts.find((a) => a.isMain)
    );
    quotationManager.set('currency', cabinet?.currency);
  }, []);

  // perform calculations when the financialy Information are changed
  const digitAfterComma = React.useMemo(() => {
    return quotationManager.currency?.digitAfterComma || 3;
  }, [quotationManager.currency]);

  React.useEffect(() => {
    const zero = dinero({ amount: 0, precision: digitAfterComma });
    const articles = articleManager.getArticles() || [];
    
    // Calculate subTotal
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
    quotationManager.set('subTotal', subTotal.toUnit());
    // Calculate total
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
    // Apply discount
    if (quotationManager.discount_type === DISCOUNT_TYPE.PERCENTAGE) {
      const discountAmount = total.multiply(quotationManager.discount / 100);
      finalTotal = total.subtract(discountAmount);
    } else {
      const discountAmount = dinero({
        amount: createDineroAmountFromFloatWithDynamicCurrency(
          quotationManager?.discount || 0,
          digitAfterComma
        ),
        precision: digitAfterComma
      });
      finalTotal = total.subtract(discountAmount);
    }
    quotationManager.set('total', finalTotal.toUnit());
  }, [articleManager.articles, quotationManager.discount, quotationManager.discount_type]);

  //create quotation mutator
  const { mutate: createQuotation, isPending: isCreatePending } = useMutation({
    mutationFn: (data: { quotation: CreateExpensQuotationDto; files: File[] }) =>
      api.expense_quotation.create(data.quotation, data.files),
    onSuccess: () => {
      if (!firmId) router.push('/buying/expense_quotations');
      else router.push(`/contacts/firm/${firmId}/?tab=quotations`);
      toast.success('Devis créé avec succès');
    },
    onError: (error: any) => {
      if (error.response?.status === 409) { // 409 est le code pour CONFLICT
        toast.error('Ce numéro de devis existe déjà');
      } else {
        toast.error("Erreur lors de la création du devis");
      }
    }
  });

  const loading =
    isFetchFirmsPending ||
    isFetchTaxesPending ||
    isFetchCabinetPending ||
    isFetchBankAccountsPending ||
    isFetchCurrenciesPending ||
    isFetchDefaultConditionPending ||
  !commonReady || !invoicingReady || isCreatePending;
  const { value: debounceLoading } = useDebounce<boolean>(loading, 500);

  //Reset Form
  const globalReset = () => {
    quotationManager.reset();
    articleManager.reset();
    controlManager.reset();
  };
  //side effect to reset the form when the component is mounted
  React.useEffect(() => {
    globalReset();
    articleManager.add();
  }, []);

  //create handler
  const [submitted, setSubmitted] = React.useState(false);  // Nouveau state pour gérer la soumission

  const onSubmit = async (status: EXPENSQUOTATION_STATUS) => {
    setSubmitted(true);
  
    // Convert articles to DTO
    const articlesDto: ExpenseArticleQuotationEntry[] = articleManager.getArticles()?.map((article) => {
            // Création d'un objet article complet avec valeurs par défaut
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
                    taxes: article?.articleExpensQuotationEntryTaxes?.map((entry) => entry?.tax?.id).filter(Boolean) as number[],
                    expenseArticleInvoiceEntryTaxes: article?.articleExpensQuotationEntryTaxes || []
                  };
                
                  return mappedArticle;
                }) || [];
  
    // Gestion du fichier PDF
    let pdfFileId = quotationManager.pdfFileId; // ID du fichier PDF existant
  
    // Upload du nouveau fichier PDF s'il existe
    if (quotationManager.pdfFile) {
      try {
        const [uploadedPdfFileId] = await api.upload.uploadFiles([quotationManager.pdfFile]);
        pdfFileId = uploadedPdfFileId;
        console.log('PDF File Uploaded, ID:', pdfFileId);
      } catch (error) {
        console.error('Error uploading PDF file:', error);
        toast.error('Failed to upload PDF file');
        return;
      }
    }
  
    // Upload des fichiers supplémentaires
    const additionalFiles = quotationManager.uploadedFiles
      .filter((u) => !u.upload) // Fichiers non encore uploadés
      .map((u) => u.file);
  
    const uploadIds = additionalFiles.length > 0 
      ? await api.upload.uploadFiles(additionalFiles) 
      : [];
  
    // Création de l'objet devis
    const quotation: CreateExpensQuotationDto = {
      date: quotationManager?.date?.toString(),
      dueDate: quotationManager?.dueDate?.toString(),
      object: quotationManager?.object || '',
      sequentialNumbr: quotationManager?.sequentialNumbr,
      sequential: '',
      cabinetId: quotationManager?.firm?.cabinetId,
      firmId: quotationManager?.firm?.id,
      interlocutorId: quotationManager?.interlocutor?.id,
      currencyId: quotationManager?.currency?.id,
      bankAccountId: !controlManager?.isBankAccountDetailsHidden
        ? quotationManager?.bankAccount?.id
        : undefined,
      status: status,
      generalConditions: !controlManager.isGeneralConditionsHidden
        ? quotationManager?.generalConditions || ''
        : '',
      pdfFileId, // ID du fichier PDF
      uploads: uploadIds.map((id) => ({ uploadId: id })), // IDs des fichiers supplémentaires
      notes: quotationManager?.notes || '',
      articleQuotationEntries: articlesDto,
      discount: quotationManager?.discount || 0,
      discount_type:
        quotationManager?.discount_type === 'PERCENTAGE'
          ? DISCOUNT_TYPE.PERCENTAGE
          : DISCOUNT_TYPE.AMOUNT,
      expensequotationMetaData: {
        showArticleDescription: !controlManager?.isArticleDescriptionHidden,
        hasBankingDetails: !controlManager.isBankAccountDetailsHidden,
        hasGeneralConditions: !controlManager.isGeneralConditionsHidden,
      },
    };
  
    console.log("Quotation before validation:", quotation);
  
    // Validation du devis
    const validation = api.expense_quotation.validate(quotation);
    if (validation.message) {
      toast.error(validation.message);
    } else {
      if (controlManager.isGeneralConditionsHidden) {
        delete quotation.generalConditions;
      }
  
      // Appel de la mutation pour créer le devis
      createQuotation({
        quotation,
        files: additionalFiles,
      });
  
      // Réinitialisation du formulaire
      globalReset();
    }
  };
  //component representation
  if (debounceLoading) return <Spinner className="h-screen" show={debounceLoading} />;
  return (
    <div className={cn('overflow-auto px-10 py-6', className)}>
      {/* Main Container */}
      <div className={cn('block xl:flex gap-4', isCreatePending ? 'pointer-events-none' : '')}>
        {/* First Card */}
        <div className="w-full h-auto flex flex-col xl:w-9/12">
          <ScrollArea className=" max-h-[calc(100vh-120px)] border rounded-lg">
            <Card className="border-0">
              <CardContent className="p-5">
                {/* General Information */}
                <ExpenseQuotationGeneralInformation
                  className="my-5"
                  firms={firms}
                  loading={debounceLoading}
                />
                {/* Article Management */}
                <ExpenseQuotationArticleManagement
                  className="my-5"
                  taxes={taxes}
                  isArticleDescriptionHidden={controlManager.isArticleDescriptionHidden}
                />
                {/* File Upload & Notes */}
               <ExpensequotationExtraOptions
                onUploadAdditionalFiles={(files) => quotationManager.set('uploadedFiles', files)}
                onUploadPdfFile={(file) => quotationManager.set('pdfFile', file)}
                               />
                {/* Other Information */}
                <div className="flex gap-10 mt-5">
                  <ExpenseQuotationGeneralConditions
                    className="flex flex-col w-2/3 my-auto"
                    isPending={debounceLoading}
                    hidden={controlManager.isGeneralConditionsHidden}
                    defaultCondition={defaultCondition}
                  />
                  <div className="w-1/3 my-auto">
                    {/* Final Financial Information */}
                    <ExpenseQuotationFinancialInformation
                      subTotal={quotationManager.subTotal}
                      total={quotationManager.total}
                      currency={quotationManager.currency}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollArea>
        </div>
        {/* Second Card */}
        <div className="w-full xl:mt-0 xl:w-3/12">
          <ScrollArea className=" max-h-[calc(100vh-120px)] border rounded-lg">
            <Card className="border-0">
              <CardContent className="p-5">
                {/* Control Section */}
                <ExpenseQuotationControlSection
                  bankAccounts={bankAccounts}
                  currencies={currencies}
                  invoices={[]}
                  handleSubmitDraft={() => onSubmit(EXPENSQUOTATION_STATUS.Draft)}
                  handleSubmitExpired={() => onSubmit(EXPENSQUOTATION_STATUS.Expired)}

                  reset={globalReset}
                  loading={debounceLoading}
                />
              </CardContent>
            </Card>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
