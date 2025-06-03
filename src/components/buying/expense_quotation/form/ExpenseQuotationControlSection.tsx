import React, { useEffect } from 'react';
import { api } from '@/api';
import { BankAccount, Currency, DuplicateQuotationDto, EXPENSQUOTATION_STATUS } from '@/types';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectShimmer,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/common';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errors';
import { useRouter } from 'next/router';
import { UneditableInput } from '@/components/ui/uneditable/uneditable-input';
import { useQuotationControlManager } from '../hooks/useExpenseQuotationControlManager';
import { useExpenseQuotationArticleManager } from '../hooks/useExpenseQuotationArticleManager';
import { EXPENSE_QUOTATION_LIFECYCLE_ACTIONS } from '@/constants/expensequotation.lifecycle';
import { ExpenseQuotationActionDialog } from '../dialogs/ExpenseQuotationActionDialog';
import { ExpenseQuotationDuplicateDialog } from '../dialogs/ExpenseQuotationDuplicateDialog';
import { ExpenseQuotationDeleteDialog } from '../dialogs/ExpenseQuotationDeleteDialog';
import { ExpenseQuotationInvoiceDialog } from '../dialogs/ExpenseQuotationInvoiceDialog';
import { QuotationInvoiceList } from './ExpenseQuotationInvoiceList';
import { useExpenseQuotationManager } from '../hooks/useExpenseQuotationManager';
import { ExpenseInvoice } from '@/types/expense_invoices';

interface ExpenseQuotationLifecycle {
  label: string;
  key: string;
  variant: 'default' | 'outline';
  icon: React.ReactNode;
  onClick?: () => void;
  loading: boolean;
  when: {
    membership: 'IN' | 'OUT';
    set: (EXPENSQUOTATION_STATUS | undefined)[];
  };
}

interface ExpenseQuotationControlSectionProps {
  className?: string;
  status?: EXPENSQUOTATION_STATUS;
  isDataAltered?: boolean;
  bankAccounts: BankAccount[];
  currencies: Currency[];
  invoices: ExpenseInvoice[];
  handleSubmit?: () => void;
  handleSubmitDraft: () => void;
  handleSubmitExpired?: () => void;
  handleSubmitDuplicate?: () => void;
  reset: () => void;
  refetch?: () => void;
  loading?: boolean;
  edit?: boolean;
  expirationDate?: Date;
  isInspectMode?: boolean; // Ajoutez cette ligne
}

export const ExpenseQuotationControlSection = ({
  className,
  status = undefined,
  isDataAltered,
  bankAccounts,
  currencies,
  invoices,
  handleSubmit,
  handleSubmitDraft,
  handleSubmitExpired,
  reset,
  refetch,
  loading,
  edit = true,
  expirationDate,
  isInspectMode = false // Ajoutez cette ligne avec une valeur par défaut
}: ExpenseQuotationControlSectionProps) => { const router = useRouter();
  const { t: tInvoicing } = useTranslation('invoicing');
  const { t: tCommon } = useTranslation('common');
  const { t: tCurrency } = useTranslation('currency');

  const quotationManager = useExpenseQuotationManager();
  const controlManager = useQuotationControlManager();
  const articleManager = useExpenseQuotationArticleManager();

  // Vérifiez si la date d'échéance est dépassée
  useEffect(() => {
    if (expirationDate && new Date(expirationDate) < new Date() && status !== EXPENSQUOTATION_STATUS.Expired) {
      handleSubmitExpired?.();
    }
  }, [expirationDate, status, handleSubmitExpired]);

  //action dialog
  const [actionDialog, setActionDialog] = React.useState<boolean>(false);
  const [actionName, setActionName] = React.useState<string>();
  const [action, setAction] = React.useState<() => void>(() => {});

  //duplicate dialog
  const [duplicateDialog, setDuplicateDialog] = React.useState(false);

  //Duplicate Quotation
  const { mutate: duplicateQuotation, isPending: isDuplicationPending } = useMutation({
    mutationFn: (duplicateQuotationDto: DuplicateQuotationDto) =>
      api.expense_quotation.duplicate(duplicateQuotationDto),
    onSuccess: async (data) => {
      toast.success(tInvoicing('quotation.action_duplicate_success'));
      await router.push('/buying/expense_quotation/' + data.id);
      setDuplicateDialog(false);
    },
    onError: (error) => {
      toast.error(
        getErrorMessage('invoicing', error, tInvoicing('quotation.action_duplicate_failure'))
      );
    }
  });

  //delete dialog
  const [deleteDialog, setDeleteDialog] = React.useState(false);

  //Delete Quotation
  const { mutate: removeQuotation, isPending: isDeletePending } = useMutation({
    mutationFn: (id: number) => api.expense_quotation.remove(id),
    onSuccess: () => {
      toast.success(tInvoicing('quotation.action_remove_success'));
      router.push('/buying/expense_quotations');
    },
    onError: (error) => {
      toast.error(getErrorMessage('', error, tInvoicing('quotation.action_remove_failure')));
    }
  });

  //invoice dialog
  const [invoiceDialog, setInvoiceDialog] = React.useState(false);

  //Invoice quotation
  const { mutate: invoiceQuotation, isPending: isInvoicingPending } = useMutation({
    mutationFn: (data: { id?: number; createInvoice: boolean }) =>
      api.quotation.invoice(data.id, data.createInvoice),
    onSuccess: (data) => {
      toast.success('Devis facturé avec succès');
      refetch?.();
      router.push(`/buying/expense_invoice/${data.invoices[data?.invoices?.length - 1].id}`);
    },
    onError: (error) => {
      const message = getErrorMessage('contacts', error, 'Erreur lors de la facturation de devis');
      toast.error(message);
    }
  });

  // Dans la partie des boutons
const buttonsWithHandlers: ExpenseQuotationLifecycle[] = [
  {
    ...EXPENSE_QUOTATION_LIFECYCLE_ACTIONS.draft,
    key: 'draft',
    onClick: () => {
      setActionName(tCommon('commands.save'));
      !!handleSubmitDraft &&
        setAction(() => {
          return () => handleSubmitDraft();
        });
      setActionDialog(true);
    },
    loading: false
  },
  // Ne pas inclure 'save' et 'reset' en mode inspection
  ...(!isInspectMode ? [
    {
      ...EXPENSE_QUOTATION_LIFECYCLE_ACTIONS.save,
      key: 'save',
      onClick: () => {
        setActionName(tCommon('commands.save'));
        !!handleSubmit &&
          setAction(() => {
            return () => handleSubmit();
          });
        setActionDialog(true);
      },
      loading: false
    },
    {
      ...EXPENSE_QUOTATION_LIFECYCLE_ACTIONS.reset,
      key: 'reset',
      onClick: () => {
        setActionName(tCommon('commands.initialize'));
        !!reset &&
          setAction(() => {
            return () => reset();
          });
        setActionDialog(true);
      },
      loading: false
    }
  ] : [])
].filter(Boolean); // Filtrer pour supprimer les éléments undefined

  const sequential = quotationManager.sequentialNumbr;
  return (
    <>
      <ExpenseQuotationActionDialog
        id={quotationManager?.id || 0}
        sequential={sequential}
        action={actionName}
        open={actionDialog}
        callback={action}
        isCallbackPending={loading}
        onClose={() => setActionDialog(false)}
      />
      <ExpenseQuotationDuplicateDialog
        id={quotationManager?.id || 0}
        open={duplicateDialog}
        duplicateQuotation={(includeFiles: boolean) => {
          quotationManager?.id &&
            duplicateQuotation({
              id: quotationManager?.id,
              includeFiles: includeFiles
            });
        }}
        isDuplicationPending={isDuplicationPending}
        onClose={() => setDuplicateDialog(false)}
      />

      <ExpenseQuotationDeleteDialog
        id={quotationManager?.id || 0}
        sequential={sequential}
        open={deleteDialog}
        deleteQuotation={() => {
          quotationManager?.id && removeQuotation(quotationManager?.id);
        }}
        isDeletionPending={isDeletePending}
        onClose={() => setDeleteDialog(false)}
      />
      <ExpenseQuotationInvoiceDialog
        id={quotationManager?.id || 0}
        status={quotationManager?.status}
        sequential={sequential}
        open={invoiceDialog}
        isInvoicePending={isInvoicingPending}
        invoice={(id: number, createInvoice: boolean) => {
          invoiceQuotation({ id, createInvoice });
        }}
        onClose={() => setInvoiceDialog(false)}
      />
      <div className={cn(className)}>
        <div className="flex flex-col border-b w-full gap-2 pb-5">
          {/* quotation status */}
          {status && (
            <Label className="text-base my-2 text-center">
              <span className="font-bold">{tInvoicing('quotation.attributes.status')} :</span>
              <span className="font-extrabold text-gray-500 ml-2 mr-1">{tInvoicing(status)}</span>
              {status === EXPENSQUOTATION_STATUS.Draft && invoices?.length != 0 && (
                <span className="font-extrabold text-gray-500">({invoices?.length})</span>
              )}
            </Label>
          )}
          {/* quotation lifecycle actions */}
          {buttonsWithHandlers.map((lifecycle: ExpenseQuotationLifecycle) => {
            const idisplay = lifecycle.when?.set?.includes(status);
            const display = lifecycle.when?.membership == 'IN' ? idisplay : !idisplay;
            const disabled =
              isDataAltered && (lifecycle.key === 'save' || lifecycle.key === 'reset');
            return (
              display && (
                <Button
                  disabled={disabled}
                  variant={lifecycle.variant}
                  key={lifecycle.label}
                  className="flex items-center"
                  onClick={lifecycle.onClick}>
                  {lifecycle.icon}
                  <span className="mx-1">{tCommon(lifecycle.label)}</span>
                  <Spinner className="ml-2" size={'small'} show={lifecycle.loading} />
                </Button>
              )
            );
          })}
        </div>
        {/* Invoice list */}
        <div className={cn('w-full mt-5 border-b')}>
          {/* bank account choices */}
          <div>
            {!controlManager.isBankAccountDetailsHidden && (
              <React.Fragment>
                {bankAccounts.length == 0 && (
                  <div>
                    <h1 className="font-bold">{tInvoicing('controls.bank_details')}</h1>
                    <Label className="flex p-5 items-center justify-center gap-2 underline ">
                      <AlertCircle />
                      {tInvoicing('controls.no_bank_accounts')}
                    </Label>
                  </div>
                )}
                {bankAccounts.length != 0 && (
                  <div>
                    <h1 className="font-bold">{tInvoicing('controls.bank_details')}</h1>
                    <div className="my-5">
                      <SelectShimmer isPending={loading}>
                      <Select
  key={quotationManager.bankAccount?.id || 'bankAccount'}
  onValueChange={(e) => {
    if (isInspectMode) return; // Empêche la modification en mode inspection
    quotationManager.set(
      'bankAccount',
      bankAccounts.find((account) => account.id == parseInt(e))
    );
  }}
  disabled={!edit || isInspectMode} // Désactive en mode inspection
  defaultValue={quotationManager?.bankAccount?.id?.toString() || ''}
>
                          <SelectTrigger className="mty1 w-full">
                            <SelectValue
                              placeholder={tInvoicing('controls.bank_select_placeholder')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts?.map((account: BankAccount) => {
                              return (
                                <SelectItem key={account.id} value={account?.id?.toString() || ''}>
                                  <span className="font-bold">{account?.name}</span> - (
                                  {account?.currency?.code && tCurrency(account?.currency?.code)}(
                                  {account?.currency?.symbol})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </SelectShimmer>
                    </div>
                  </div>
                )}
              </React.Fragment>
            )}
            {/* currency choices */}
            {/* currency choices */}
<h1 className="font-bold">{tInvoicing('controls.currency_details')}</h1>
{edit ? (
  <div>
    {currencies.length != 0 && (
      <div className="my-5">
        <SelectShimmer isPending={loading}>
          <Select
            key={quotationManager.currency?.id || 'currency'}
            onValueChange={(e) => {
              if (isInspectMode) return; // Empêche la modification en mode inspection
              quotationManager.set(
                'currency',
                currencies.find((currency) => currency.id == parseInt(e))
              );
            }}
            disabled={isInspectMode || loading} // Désactivé en mode inspection
            defaultValue={quotationManager?.currency?.id?.toString() || ''}
          >
            <SelectTrigger className="mty1 w-full">
              <SelectValue
                placeholder={tInvoicing('controls.currency_select_placeholder')}
              />
            </SelectTrigger>
            <SelectContent>
              {currencies?.map((currency: Currency) => {
                return (
                  <SelectItem 
                    key={currency.id} 
                    value={currency?.id?.toString() || ''}
                  >
                    {currency?.code && tCurrency(currency?.code)} ({currency.symbol})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </SelectShimmer>
      </div>
    )}
  </div>
) : (
  <UneditableInput
    className="font-bold my-4"
    value={
      quotationManager.currency &&
      `${quotationManager.currency?.code && tCurrency(quotationManager.currency?.code)} (${quotationManager?.currency?.symbol})`
    }
  />
)}
          </div>
        </div>
        <div className="w-full py-5">
          <h1 className="font-bold">{tInvoicing('controls.include_on_quotation')}</h1>
          <div className="flex w-full items-center mt-1">
  <Label className="w-full">{tInvoicing('controls.bank_details')}</Label>
  <div className="w-full m-1 text-right">
    <Switch
      disabled={isInspectMode}
      onClick={() => {
        if (isInspectMode) return;
        controlManager.set(
          'isBankAccountDetailsHidden',
          !controlManager.isBankAccountDetailsHidden
        );
        quotationManager.set('bankAccount', null);
      }}
      {...{ checked: !controlManager.isBankAccountDetailsHidden }}
    />
  </div>
</div>
          {/* article description switch */}
          <div className="flex w-full items-center mt-1">
  <Label className="w-full">{tInvoicing('controls.article_description')}</Label>
  <div className="w-full m-1 text-right">
    <Switch
      disabled={isInspectMode}
      onClick={() => {
        if (isInspectMode) return;
        articleManager.removeArticleDescription();
        controlManager.set(
          'isArticleDescriptionHidden',
          !controlManager.isArticleDescriptionHidden
        );
      }}
      {...{ checked: !controlManager.isArticleDescriptionHidden }}
    />
  </div>
</div>
          {/* invoicing address switch */}
          {/* general condition switch */}
          <div className="flex w-full items-center mt-1">
  <Label className="w-full">{tInvoicing('quotation.attributes.general_condition')}</Label>
  <div className="w-full m-1 text-right">
    <Switch
      disabled={isInspectMode}
      onClick={() => {
        if (isInspectMode) return;
        quotationManager.set('generalConditions', '');
        controlManager.set(
          'isGeneralConditionsHidden',
          !controlManager.isGeneralConditionsHidden
        );
      }}
      {...{ checked: !controlManager.isGeneralConditionsHidden }}
    />
  </div>
</div>
        </div>
      </div>
    </>
  );
};