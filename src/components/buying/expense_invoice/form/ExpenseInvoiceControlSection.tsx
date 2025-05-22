import React from 'react';
import { api } from '@/api';
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
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errors';
import { useRouter } from 'next/router';
import {
  BankAccount,
  Currency,
  ExpenseArticleQuotationEntry,
  ExpenseQuotation,
  PaymentInvoiceEntry,
  Tax,
  TaxWithholding
} from '@/types';
import { UneditableInput } from '@/components/ui/uneditable/uneditable-input';
import { EXPENSE_INVOICE_STATUS} from '@/types/expense_invoices';
import { EXPENSE_INVOICE_LIFECYCLE_ACTIONS } from '@/constants/expense_invoice.lifecycle';
import { useExpenseInvoiceManager } from '../hooks/useExpenseInvoiceManager';
import { useExpenseInvoiceControlManager } from '../hooks/useExpenseInvoiceControlManager';
import { useExpenseInvoiceArticleManager } from '../hooks/useExpenseInvoiceArticleManager';
import { ExpenseInvoiceActionDialog } from '../dialogs/ExpenseInvoiceActionDialog';
import { ExpenseInvoicePaymentList } from './ExpenseInvoicePaymentList';
import { ExpensePaymentInvoiceEntry } from '@/types/expense-payment';

interface ExpenseInvoiceLifecycle {
  label: string;
  key: string;
  variant: 'default' | 'outline';
  icon: React.ReactNode;
  onClick?: () => void;
  loading: boolean;
  when: {
    membership: 'IN' | 'OUT';
    set: (EXPENSE_INVOICE_STATUS | undefined)[];
  };
}

interface ExpenseInvoiceControlSectionProps {
  className?: string;
  status?: EXPENSE_INVOICE_STATUS;
  isDataAltered?: boolean;
  bankAccounts: BankAccount[];
  currencies: Currency[];
  quotations: ExpenseQuotation[];
  payments?: ExpensePaymentInvoiceEntry[];
  taxWithholdings?: TaxWithholding[];
  handleSubmit?: () => void;
  handleSubmitDraft: () => void;
  handleSubmitValidated: () => void;
  handleSubmitExpired?: () => void;
  reset: () => void;
  loading?: boolean;
  edit?: boolean;
  isInspectMode?: boolean; 
  hideValidateButton?: boolean;
}

export const ExpenseInvoiceControlSection = ({
  className,
  status = undefined,
  isDataAltered,
  bankAccounts,
  currencies,
  quotations,
  payments = [],
  taxWithholdings,
  handleSubmit,
  handleSubmitDraft,
  handleSubmitValidated,
  reset,
  loading,
  edit = true,
  isInspectMode = false,
  hideValidateButton = false,
}: ExpenseInvoiceControlSectionProps) => {
  const router = useRouter();
  const { t: tInvoicing } = useTranslation('invoicing');
  const { t: tCommon } = useTranslation('common');
  const { t: tCurrency } = useTranslation('currency');

  const invoiceManager = useExpenseInvoiceManager();
  
  const controlManager = useExpenseInvoiceControlManager();
  const articleManager = useExpenseInvoiceArticleManager();

  //action dialog
  const [actionDialog, setActionDialog] = React.useState<boolean>(false);
  const [actionName, setActionName] = React.useState<string>();
  const [action, setAction] = React.useState<() => void>(() => {});

  const buttonsWithHandlers: ExpenseInvoiceLifecycle[] = [
  !isInspectMode && {
    ...EXPENSE_INVOICE_LIFECYCLE_ACTIONS.save,
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
  !isInspectMode && {
    ...EXPENSE_INVOICE_LIFECYCLE_ACTIONS.draft,
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
   !hideValidateButton && {
    ...EXPENSE_INVOICE_LIFECYCLE_ACTIONS.validated,
    key: 'validated',
    onClick: () => {
      setActionName(tCommon('commands.validate'));
      !!handleSubmitValidated &&
        setAction(() => {
          return () => handleSubmitValidated();
        });
      setActionDialog(true);
    },
    loading: false
  },
  !isInspectMode && {
    ...EXPENSE_INVOICE_LIFECYCLE_ACTIONS.reset,
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
].filter(Boolean) as ExpenseInvoiceLifecycle[];
  const sequential = invoiceManager.sequentialNumbr;

  return (
    <>
      <ExpenseInvoiceActionDialog
        id={invoiceManager?.id || 0}
        sequential={sequential}
        action={actionName}
        open={actionDialog}
        callback={action}
        isCallbackPending={loading}
        onClose={() => setActionDialog(false)}
      />
  

      <div className={cn(className)}>
        <div className="flex flex-col border-b w-full gap-2 pb-5">
          {/* invoice status */}
          {status && (
            <Label className="text-base my-2 text-center">
              <span className="font-bold">{tInvoicing('invoice.attributes.status')} :</span>
              <span className="font-extrabold text-gray-500 mx-2">{tInvoicing(status)}</span>
            </Label>
          )}
          {/* invoice lifecycle actions */}
          {buttonsWithHandlers.map((lifecycle: ExpenseInvoiceLifecycle) => {
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
        {/* associated quotation */}
        <div className="border-b w-full mt-5">
          <h1 className="font-bold">{tInvoicing('controls.associate_quotation')}</h1>
          <div className="my-4">
            {edit ? (
              <SelectShimmer isPending={loading}>
                <Select
                  key={invoiceManager?.quotationId || 'quotationId'}
                  onValueChange={async (e) => {
                    const quotationId = parseInt(e);
                    const selectedQuotation = quotations?.find((q) => q.id === quotationId);
                    
                    if (selectedQuotation) {
                      // Chargez les détails complets du devis
                      const fullQuotation = await api.expense_quotation.findOne(quotationId, [
                        'expensearticleQuotationEntries',
                        'expensearticleQuotationEntries.article'
                      ]);
                      
                      // Mettez à jour le manager avec toutes les données
                      invoiceManager.set('quotationId', quotationId);
                      invoiceManager.set('quotation', fullQuotation);
                      
                      console.log('Quotation mise à jour:', fullQuotation); // Pour le débogage
                    }
                  }}
                  value={invoiceManager?.quotationId?.toString() || ''}
                >
                  <SelectTrigger className="my-1 w-full">
                    <SelectValue placeholder={tInvoicing('controls.quotation_select_placeholder')} />
                  </SelectTrigger>

                  <SelectContent>
                  {quotations?.length > 0 ? (
                    quotations.map((q: ExpenseQuotation) => {
                      if (!q.id) return null;  // Si `q.id` est undefined ou null, ne pas afficher l'élément
                      return (
                        <SelectItem key={q.id} value={q.id.toString()}>
                          <span className="font-bold">{q.sequential}</span>
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem disabled value="no-selection">
                      {tInvoicing('controls.no_associated_quotation')}
                    </SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </SelectShimmer>
            ) : invoiceManager.quotationId ? (
              <UneditableInput
                className="font-bold my-4"
                value={quotations.find((q) => q.id === invoiceManager.quotationId)?.sequentialNumbr || ''}
              />
            ) : (
              <Label className="flex p-2 items-center justify-center gap-2 underline ">
                <AlertCircle />
                {tInvoicing('controls.no_associated_quotation')}
              </Label>
            )}
          </div>

          {/* Afficher la liste des éléments associés à la quotation */}
          {invoiceManager.quotationId && (
          <div className="my-4">
            <h2 className="font-semibold mb-2">Articles du devis</h2>
            {(() => {
              // Utilisez directement la quotation du manager
              const selectedQuotation = invoiceManager.quotation;
              
              console.log('Selected Quotation Data:', selectedQuotation);

              if (!selectedQuotation) {
                return <div className="text-red-500 text-sm">Devis non trouvé</div>;
              }

              const items = selectedQuotation.expensearticleQuotationEntries || [];

              if (items.length === 0) {
                return (
                  <div className="text-orange-500 text-sm">
                    Aucun article trouvé dans le devis
                    <pre className="hidden">{JSON.stringify(selectedQuotation, null, 2)}</pre>
                  </div>
                );
              }

              return (
                <div className="border rounded-lg p-3 bg-gray-50">
                  {items.map((item: ExpenseArticleQuotationEntry, index: number) => (
                    <div key={`${item.id || index}`} className="py-2 border-b last:border-b-0">
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {item.article?.title || `Article ${index + 1}`}
                        </span>
                        <span className="font-semibold">
                          {item.quantity || 1} × {item.unit_price || 0} {invoiceManager.currency?.symbol || '€'}
                        </span>
                      </div>
                      {item.article?.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.article.description}
                        </p>
                      )}
                      {(item.discount_type && item.discount_type) && (
                        <p className="text-sm text-muted-foreground">
                          discount_type: {item.discount_type}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
        </div>

        {/* Payment list */}
        {status &&
          [
            EXPENSE_INVOICE_STATUS.Unpaid,
            EXPENSE_INVOICE_STATUS.Paid,
            EXPENSE_INVOICE_STATUS.PartiallyPaid,
            EXPENSE_INVOICE_STATUS.Expired

          ].includes(status) &&
          payments.length != 0 && (
            <ExpenseInvoicePaymentList className="border-b" payments={payments} currencies={currencies} />
          )}
        <div className="border-b w-full mt-5">
          {/* bank account choices */}
          <div>
            {bankAccounts.length == 0 && !controlManager.isBankAccountDetailsHidden && (
              <div>
                <h1 className="font-bold">{tInvoicing('controls.bank_details')}</h1>
                <Label className="flex p-5 items-center justify-center gap-2 underline ">
                  <AlertCircle />
                  {tInvoicing('controls.no_bank_accounts')}
                </Label>
              </div>
            )}

            {bankAccounts.length != 0 && !controlManager.isBankAccountDetailsHidden && (
              <div>
                <h1 className="font-bold">{tInvoicing('controls.bank_details')}</h1>
                <div className="my-5">
                  <SelectShimmer isPending={loading}>
                    <Select
                      key={invoiceManager.bankAccount?.id || 'bankAccount'}
                      onValueChange={(e) => {
                        if (isInspectMode) return;
                        invoiceManager.set(
                          'bankAccount',
                          bankAccounts.find((account) => account.id == parseInt(e))
                        );
                      }}
                      disabled={!edit || isInspectMode} // Désactive en mode inspection
                      defaultValue={invoiceManager?.bankAccount?.id?.toString() || ''}>
                      <SelectTrigger className="mty1 w-full">
                        <SelectValue placeholder={tInvoicing('controls.bank_select_placeholder')} />
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
            {/* currency choices */}
            <div>
              <h1 className="font-bold">{tInvoicing('controls.currency_details')}</h1>
              {edit ? (
                <div>
                  {' '}
                  {currencies.length != 0 && (
                    <div className="my-5">
                      <SelectShimmer isPending={loading}>
                        <Select
                          key={invoiceManager.currency?.id || 'currency'}
                          onValueChange={(e) => {
                            invoiceManager.set(
                              'currency',
                              currencies.find((currency) => currency.id == parseInt(e))
                            );
                          }}
                          defaultValue={invoiceManager?.currency?.id?.toString() || ''}>
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
                                  value={currency?.id?.toString() || ''}>
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
                    invoiceManager.currency &&
                    `${invoiceManager.currency?.code && tCurrency(invoiceManager.currency?.code)} (${invoiceManager?.currency?.symbol})`
                  }
                />
              )}
            </div>
          </div>
        </div>
        <div className={cn('w-full py-5', !controlManager.isTaxWithholdingHidden && 'border-b')}>
          <h1 className="font-bold">{tInvoicing('controls.include_on_quotation')}</h1>
          <div className="flex w-full items-center mt-1">
            {/* bank details switch */}
            <Label className="w-full">{tInvoicing('controls.bank_details')}</Label>
            <div className="w-full m-1 text-right">
              <Switch
                disabled={isInspectMode} // Désactive en mode inspection
                onClick={() =>
                  controlManager.set(
                    'isBankAccountDetailsHidden',
                    !controlManager.isBankAccountDetailsHidden
                  )
                }
                {...{ checked: !controlManager.isBankAccountDetailsHidden }}
              />
            </div>
          </div>
          {/* article description switch */}
          <div className="flex w-full items-center mt-1">
            <Label className="w-full">{tInvoicing('controls.article_description')}</Label>
            <div className="w-full m-1 text-right">
              <Switch
                disabled={isInspectMode} // Désactive en mode inspection
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
          {/* general condition switch */}
          <div className="flex w-full items-center mt-1">
            <Label className="w-full">{tInvoicing('invoice.attributes.general_condition')}</Label>
            <div className="w-full m-1 text-right">
              <Switch
                disabled={isInspectMode} // Désactive en mode inspection
                onClick={() => {
                  if (isInspectMode) return;
                  invoiceManager.set('generalConditions', '');
                  controlManager.set(
                    'isGeneralConditionsHidden',
                    !controlManager.isGeneralConditionsHidden
                  );
                }}
                {...{ checked: !controlManager.isGeneralConditionsHidden }}
              />
            </div>
          </div>
          {/* tax withholding */}
          <div className="flex w-full items-center mt-1">
            <Label className="w-full">{tInvoicing('invoice.attributes.withholding')}</Label>
            <div className="w-full m-1 text-right">
              <Switch
                disabled={isInspectMode} // Désactive en mode inspection
                onClick={() => {
                  if (isInspectMode) return; // Ne rien faire en mode inspection
                  invoiceManager.set('taxWithholdingId', null);
                  controlManager.set(
                    'isTaxWithholdingHidden',
                    !controlManager.isTaxWithholdingHidden
                  );
                }}
                {...{ checked: !controlManager.isTaxWithholdingHidden }}
              />
            </div>
          </div>
        </div>
        {!controlManager.isTaxWithholdingHidden && (
          <div className="w-full py-5">
            <h1 className="font-bold">{tInvoicing('controls.withholding')}</h1>
            <div className="my-4">
              <SelectShimmer isPending={loading}>
                <Select
                  key={invoiceManager?.taxWithholdingId || 'taxWithholdingId'}
                  onValueChange={(e) => {
                    if (isInspectMode) return; // Ne rien faire en mode inspection
                    invoiceManager.set('taxWithholdingId', parseInt(e));
                  }}
                  disabled={isInspectMode} // Désactive en mode inspection
                  value={invoiceManager?.taxWithholdingId?.toString()}>
                  <SelectTrigger className="my-1 w-full">
                    <SelectValue
                      placeholder={tInvoicing('controls.tax_withholding_select_placeholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {taxWithholdings?.map((t: TaxWithholding) => {
                      return (
                        <SelectItem key={t.id} value={t?.id?.toString() || ''}>
                          <span className="font-bold">{t?.label}</span> <span>({t?.rate} %)</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </SelectShimmer>
            </div>
          </div>
        )}
      </div>
    </>
  );
};