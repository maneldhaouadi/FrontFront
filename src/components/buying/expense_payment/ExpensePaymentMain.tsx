import { api } from '@/api';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebounce } from '@/hooks/other/useDebounce';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from './data-table/data-table';
import { getPaymentColumns } from './data-table/columns';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errors';
import { useExpensePaymentManager } from './hooks/useExpensePaymentManager';
import { ExpensePaymentDeleteDialog } from './dialogs/ExpensePaymentDeleteDialog';
import { ExpensePaymentActionsContext } from './data-table/ActionsContext';
import { ExpensePaymentDownloadDialog } from './dialogs/ExpensePaymentDownloadDialog';

interface ExpensePaymentMainProps {
  className?: string;
  firmId?: number;
  interlocutorId?: number;
}

export const ExpensePaymentMain: React.FC<ExpensePaymentMainProps> = ({ className, firmId, interlocutorId }) => {
  const router = useRouter();
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');
  const { t: tCurrency } = useTranslation('currency');
  const [downloadDialog, setDownloadDialog] = React.useState(false);
  const { setRoutes } = useBreadcrumb();
  React.useEffect(() => {
    if (!firmId && !interlocutorId)
      setRoutes([
        { title: tCommon('menu.buying'), href: '/buying' },
        { title: tCommon('submenu.payments') }
      ]);
  }, [router.locale, firmId, interlocutorId, setRoutes, tCommon]);

  const paymentManager = useExpensePaymentManager();

  const [page, setPage] = React.useState(1);
  const { value: debouncedPage, loading: paging } = useDebounce<number>(page, 500);

  const [size, setSize] = React.useState(5);
  const { value: debouncedSize, loading: resizing } = useDebounce<number>(size, 500);

  const [sortDetails, setSortDetails] = React.useState({ order: true, sortKey: 'id' });
  const { value: debouncedSortDetails, loading: sorting } = useDebounce<typeof sortDetails>(
    sortDetails,
    500
  );

  const [searchTerm, setSearchTerm] = React.useState('');
  const { value: debouncedSearchTerm, loading: searching } = useDebounce<string>(searchTerm, 500);

  const [deleteDialog, setDeleteDialog] = React.useState(false);

  const {
    isPending: isFetchPending,
    error,
    data: paymentsResp,
    refetch: refetchPayments
  } = useQuery({
    queryKey: [
      'payments',
      debouncedPage,
      debouncedSize,
      debouncedSortDetails.order,
      debouncedSortDetails.sortKey,
      debouncedSearchTerm
    ],
    queryFn: () =>
      api.expensepayment.findPaginated(
        debouncedPage,
        debouncedSize,
        debouncedSortDetails.order ? 'ASC' : 'DESC',
        debouncedSortDetails.sortKey,
        debouncedSearchTerm,
        ['currency'],
        firmId,
        interlocutorId
      )
  });

  const payments = React.useMemo(() => {
    const data = paymentsResp?.data || [];
    console.log('Payments data:', data); // Ajoutez cette ligne
    return data;
  }, [paymentsResp]);

  const context = {
    //dialogs
    openDeleteDialog: () => setDeleteDialog(true),
  openDownloadDialog: () => setDownloadDialog(true),
    //search, filtering, sorting & paging
    searchTerm,
    setSearchTerm,
    page,
    totalPageCount: paymentsResp?.meta.pageCount || 1,
    setPage,
    size,
    setSize,
    order: sortDetails.order,
    sortKey: sortDetails.sortKey,
    setSortDetails: (order: boolean, sortKey: string) => setSortDetails({ order, sortKey })
  };

  const { mutate: downloadPayment, isPending: isDownloadPending } = useMutation({
    mutationFn: (templateId?: number) => {
      if (!paymentManager.id) throw new Error('Payment ID is missing');
      return api.expensepayment.downloadPdf(paymentManager.id, templateId);
    },
    onSuccess: (pdfBlob) => {
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `paiement-${paymentManager.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      toast.error(getErrorMessage('invoicing', error, 'Échec du téléchargement du paiement'));
    }
  });

  //Remove Invoice
  const queryClient = useQueryClient();
  const { mutate: removePayment, isPending: isDeletePending } = useMutation({
    mutationFn: (id: number) => api.expensepayment.remove(id),
    onSuccess: (data) => {
      if (payments?.length === 1 && page > 1) setPage(page - 1);
      
      const invoiceCount = data.deletedInvoices?.length || 0;
      let successMessage;
      
      if (invoiceCount > 0) {
        successMessage = tInvoicing('payment.delete_with_invoices_success', { count: invoiceCount });
      } else {
        successMessage = tInvoicing('payment.action_remove_success');
      }
      
      toast.success(successMessage);
      refetchPayments();
      setDeleteDialog(false);
      
      // Si des factures ont été supprimées, rafraîchir aussi la liste des factures
      if (invoiceCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['expense-invoices'] });
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage('invoicing', error, tInvoicing('payment.action_remove_failure')));
    }
  });
  

  const isPending = isFetchPending || paging || resizing || searching || sorting;

  return (
    <>
      <ExpensePaymentDeleteDialog
  id={paymentManager?.id}
  sequential={paymentManager?.sequentialNumbr}
  open={deleteDialog}
  deletePayment={() => {
    paymentManager?.id && removePayment(paymentManager.id);
  }}
  isDeletionPending={isDeletePending}
  onClose={() => setDeleteDialog(false)}
  hasInvoices={(paymentManager as any)?.hasInvoices} // Solution temporaire
/>
{paymentManager?.id && (
  <ExpensePaymentDownloadDialog
    id={paymentManager.id} // Pas de ? ici car on a déjà vérifié son existence
    open={downloadDialog}
    onDownload={(templateId) => downloadPayment(templateId)}
    isDownloadPending={isDownloadPending}
    onClose={() => setDownloadDialog(false)}
  />
)}
      <ExpensePaymentActionsContext.Provider value={context}>
        <Card className={className}>
          <CardHeader>
            <CardTitle>{tInvoicing('payment.singular')}</CardTitle>
            <CardDescription>{tInvoicing('payment.card_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              className="my-5"
              data={payments}
              columns={getPaymentColumns(tInvoicing, tCurrency)}
              isPending={isPending}
            />
          </CardContent>
        </Card>
      </ExpensePaymentActionsContext.Provider>
    </>
  );
};