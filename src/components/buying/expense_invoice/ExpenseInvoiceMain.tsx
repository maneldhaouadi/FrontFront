import React, { useEffect } from 'react';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/hooks/other/useDebounce';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { getErrorMessage } from '@/utils/errors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from './data-table/data-table';
import { getInvoiceColumns } from './data-table/columns';
import { useExpenseInvoiceManager } from './hooks/useExpenseInvoiceManager';
import { ExpenseInvoiceDeleteDialog } from './dialogs/ExpenseInvoiceDeleteDialog';
import { ExpenseInvoiceDuplicateDialog } from './dialogs/ExpenseInvoiceDuplicateDialog';
import { ExpenseInvoiceActionsContext } from './data-table/ActionsContext';
import { ExpenseDuplicateInvoiceDto } from '@/types/expense_invoices';
import { EXPENSE_INVOICE_STATUS } from '@/types/expense_invoices';
import { DuplicateInvoiceDto } from '@/types';
import { toast } from 'sonner';
import { ExpenseInvoiceDownloadDialog } from './dialogs/ExpenseInvoiceDownloadDialog';

interface ExpenseInvoiceMainProps {
  className?: string;
}

export const ExpenseInvoiceMain: React.FC<ExpenseInvoiceMainProps> = ({ className }) => {
  const router = useRouter();
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');
  const { setRoutes } = useBreadcrumb();
  const [isDownloadPending, setIsDownloadPending] = React.useState(false);

  React.useEffect(() => {
    setRoutes([
      { title: tCommon('menu.buying'), href: '/buying' },
      { title: tCommon('submenu.invoices') }
    ]);
  }, [router.locale]);

  const invoiceManager = useExpenseInvoiceManager();

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
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<{
    id: number, 
    sequential: string,
    hasQuotation: boolean // Ajoutez cette information
  } | null>(null);  const [deleteDialog, setDeleteDialog] = React.useState(false);
  const [duplicateDialog, setDuplicateDialog] = React.useState(false);
  const [downloadDialog, setDownloadDialog] = React.useState(false);
  const [isDuplicatedWithFiles, setIsDuplicatedWithFiles] = React.useState(true);

  const {
    isPending: isFetchPending,
    error,
    data: invoicesResp,
    refetch: refetchInvoices
  } = useQuery({
    queryKey: [
      'invoices',
      debouncedPage,
      debouncedSize,
      debouncedSortDetails.order,
      debouncedSortDetails.sortKey,
      debouncedSearchTerm
    ],
    queryFn: () =>
      api.expense_invoice.findPaginated(
        debouncedPage,
        debouncedSize,
        debouncedSortDetails.order ? 'ASC' : 'DESC',
        debouncedSortDetails.sortKey,
        debouncedSearchTerm,
        ['firm', 'interlocutor', 'currency', 'payments']
      )
  });
  

  // Mutation pour mettre à jour le statut des factures expirées
  const { mutate: updateInvoiceStatus } = useMutation({
    mutationFn: (invoiceId: number) => api.expense_invoice.updateInvoiceStatusIfExpired(invoiceId),
    onSuccess: () => {
      refetchInvoices();
    },
    onError: (error) => {
      toast.error(getErrorMessage('invoicing', error, tInvoicing('expense_invoice.status_update_failed')));
    }
  });

  // Vérifier les factures expirées lors du chargement des données
  useEffect(() => {
    if (invoicesResp?.data) {
      invoicesResp.data.forEach((invoice) => {
        // Vérifier que l'ID de la facture est défini
        if (invoice.id && invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
          updateInvoiceStatus(invoice.id); // Appeler la mutation uniquement si l'ID est défini
        }
      });
    }
  }, [invoicesResp]);

  const invoices = React.useMemo(() => {
    if (!invoicesResp?.data) return [];
  
    return invoicesResp.data.map((invoice) => {
      return invoice; // Retourne l'invoice sans modification
    });
  }, [invoicesResp]);

  const context = {
    //dialogs
    openDeleteDialog: () => setDeleteDialog(true),
    openDuplicateDialog: () => setDuplicateDialog(true),
    openDownloadDialog: () => setDownloadDialog(true),
    //search, filtering, sorting & paging
    searchTerm,
    setSearchTerm,
    page,
    totalPageCount: invoicesResp?.meta.pageCount || 1,
    setPage,
    size,
    setSize,
    order: sortDetails.order,
    sortKey: sortDetails.sortKey,
    setSortDetails: (order: boolean, sortKey: string) => setSortDetails({ order, sortKey })
  };

  //Remove Invoice
  const { mutate: removeInvoice, isPending: isDeletePending } = useMutation({
    mutationFn: (id: number) => api.expense_invoice.remove(id),
    onSuccess: (data) => {
      if (invoices?.length == 1 && page > 1) setPage(page - 1);
        toast.success(tInvoicing('La facture a été supprimée avec succès'));
      refetchInvoices();
      setDeleteDialog(false);
      setInvoiceToDelete(null); // Reset l'élément à supprimer
    },
    onError: (error) => {
      toast.error(getErrorMessage('invoicing', error, tInvoicing('expense_invoice.action_remove_failure')));
      setDeleteDialog(false); // Ferme le dialogue même en cas d'erreur
    }
  });
  
  // Fonction pour ouvrir le dialogue
  const handleOpenDeleteDialog = (invoice: {id: number, sequential: string, quotation?: any}) => {
    setInvoiceToDelete({
      id: invoice.id,
      sequential: invoice.sequential,
      hasQuotation: !!invoice.quotation
    });
    setDeleteDialog(true);
  };

  const handleDownload = async (templateId?: number) => {
    setIsDownloadPending(true);
    try {
      await api.expense_invoice.exportInvoicePdf(invoiceManager.id, templateId);
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloadPending(false);
    }
  };


  //Duplicate Invoice
  const { mutate: duplicateInvoice, isPending: isDuplicationPending } = useMutation({
    mutationFn: ({ id, includeFiles }: { id: number; includeFiles: boolean }) => {
      return api.expense_invoice.duplicate({ id, includeFiles });
    },
    onSuccess: async (data, variables) => {
      // Réinitialiser complètement le manager avant mise à jour
      invoiceManager.reset();
      
      // Mettre à jour avec toutes les données
      invoiceManager.set({
        ...data,
        // Forcer la suppression des fichiers si includeFiles=false
        uploadPdfField: variables.includeFiles ? data.uploadPdfField : null,
        uploadedFiles: variables.includeFiles ? data.uploads || [] : []
      });
  
      toast.success(tInvoicing('expense_invoice.action_duplicate_success'));
      await router.push('/buying/expense_invoice/' + data.id);
      setDuplicateDialog(false);
    },
    onError: (error) => {
      toast.error(
        getErrorMessage('invoicing', error, tInvoicing('expense_invoice.action_duplicate_failure'))
      );
    },
  });

  const isPending = isFetchPending || isDeletePending || paging || resizing || searching || sorting;

  if (error) return 'An error has occurred: ' + error.message;
  return (
    <>
      <ExpenseInvoiceDeleteDialog
        id={invoiceManager?.id}
        sequential={invoiceManager?.sequentialNumbr || ''}
        open={deleteDialog}
        deleteInvoice={() => {
          invoiceManager?.id && removeInvoice(invoiceManager?.id);
        }}
        isDeletionPending={isDeletePending}
        onClose={() => setDeleteDialog(false)}
      />
      <ExpenseInvoiceDuplicateDialog
        id={invoiceManager?.id || 0}
        open={duplicateDialog}
        duplicateInvoice={(includeFiles: boolean) => {
          invoiceManager?.id &&
            duplicateInvoice({
              id: invoiceManager?.id,
              includeFiles: includeFiles
            });
        }}
        isDuplicationPending={isDuplicationPending}
        onClose={() => setDuplicateDialog(false)}
      />
       
       <ExpenseInvoiceDownloadDialog
        id={invoiceManager?.id || 0}
        open={downloadDialog}
        onDownload={handleDownload}
        isDownloadPending={isDownloadPending}
        onClose={() => setDownloadDialog(false)}
      />

      <ExpenseInvoiceActionsContext.Provider value={context}>
        <Card className={className}>
          <CardHeader>
            <CardTitle>{tInvoicing('invoice.singular')}</CardTitle>
            <CardDescription>{tInvoicing('invoice.card_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              className="my-5"
              data={invoices}
              columns={getInvoiceColumns(tInvoicing, router)}
              isPending={isPending}
            />
          </CardContent>
        </Card>
      </ExpenseInvoiceActionsContext.Provider>
    </>
  );
};