import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/other/useDebounce';
import { api } from '@/api';
import { getErrorMessage } from '@/utils/errors';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DataTable } from './data-table/data-table';
import { getQuotationColumns } from './data-table/columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';
import { DuplicateExpensQuotationDto } from '@/types';
import { useExpenseQuotationManager } from './hooks/useExpenseQuotationManager';
import { ExpenseQuotationDeleteDialog } from './dialogs/ExpenseQuotationDeleteDialog';
import { ExpenseQuotationDuplicateDialog } from './dialogs/ExpenseQuotationDuplicateDialog';
import { ExpenseQuotationInvoiceDialog } from './dialogs/ExpenseQuotationInvoiceDialog';
import { ExpenseQuotationActionsContext } from './data-table/ActionsContext';
import { EXPENSQUOTATION_STATUS } from '@/types'; // Assurez-vous d'importer le statut approprié
import { ExpenseQuotationDownloadDialog } from './dialogs/ExpenseQuotationDownloadDialog';

interface ExpenseQuotationMainProps {
  className?: string;
}

export const ExpenseQuotationMain: React.FC<ExpenseQuotationMainProps> = ({ className }) => {
  const router = useRouter();
  const { t: tCommon, ready: commonReady } = useTranslation('common');
  const { t: tInvoicing, ready: invoicingReady } = useTranslation('invoicing');
  const [downloadDialog, setDownloadDialog] = React.useState(false);
const [isDownloadPending, setIsDownloadPending] = React.useState(false);
  const { setRoutes } = useBreadcrumb();
  React.useEffect(() => {
    setRoutes([
      { title: tCommon('menu.buying'), href: '/buying' },
      { title: tCommon('submenu.quotations') }
    ]);
  }, [router.locale]);

  const quotationManager = useExpenseQuotationManager();

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
  const [duplicateDialog, setDuplicateDialog] = React.useState(false);
  const [invoiceDialog, setInvoiceDialog] = React.useState(false);

  const {
    isPending: isFetchPending,
    error,
    data: quotationsResp,
    refetch: refetchQuotations
  } = useQuery({
    queryKey: [
      'quotations',
      debouncedPage,
      debouncedSize,
      debouncedSortDetails.order,
      debouncedSortDetails.sortKey,
      debouncedSearchTerm
    ],
    queryFn: () =>
      api.expense_quotation.findPaginated(
        debouncedPage,
        debouncedSize,
        debouncedSortDetails.order ? 'ASC' : 'DESC',
        debouncedSortDetails.sortKey,
        debouncedSearchTerm,
        ['firm', 'interlocutor', 'currency', 'invoices']
      )
  });

  const { mutate: updateQuotationStatus } = useMutation({
      mutationFn: (quotationId: number) => api.expense_quotation.updateInvoiceStatusIfExpired(quotationId),
      onSuccess: () => {
        refetchQuotations();
      },
      onError: (error) => {
        toast.error(getErrorMessage('invoicing', error, tInvoicing('expense_invoice.status_update_failed')));
      }
    });

    const handleDownload = async (templateId?: number) => {
      if (!quotationManager.id) {
        toast.error("Aucun devis sélectionné");
        return;
      }
    
      setIsDownloadPending(true);
      try {
        // Appel API simplifié
        const pdfBlob = await api.expense_quotation.exportQuotationPdf(
          quotationManager.id,
          templateId
        );
    
        // Gestion du téléchargement
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `devis-${quotationManager.sequential || quotationManager.id}.pdf`);
        document.body.appendChild(link);
        link.click();
    
        // Nettoyage
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
    
      } catch (error) {
        console.error("Erreur de téléchargement:", error);
        toast.error(`Erreur lors du téléchargement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      } finally {
        setIsDownloadPending(false);
      }
    };

  
  // Mettre à jour le statut des quotations lors de l'affichage
  useEffect(() => {
      if (quotationsResp?.data) {
        quotationsResp.data.forEach((quotation) => {
          // Vérifier que l'ID de la facture est défini
          if (quotation.id && quotation.dueDate && new Date(quotation.dueDate) < new Date()) {
            updateQuotationStatus(quotation.id); // Appeler la mutation uniquement si l'ID est défini
          }
        });
      }
    }, [quotationsResp]);
  
    const quotations = React.useMemo(() => {
      if (!quotationsResp?.data) return [];
    
      return quotationsResp.data.map((quotation) => {
        return quotation; // Retourne l'invoice sans modification
      });
    }, [quotationsResp]);

  const context = {
    //dialogs
    openDeleteDialog: () => setDeleteDialog(true),
    openDuplicateDialog: () => setDuplicateDialog(true),
    openInvoiceDialog: () => setInvoiceDialog(true),
    openDownloadDialog: () => setDownloadDialog(true), // Cette ligne doit être présente
    //search, filtering, sorting & paging
    searchTerm,
    setSearchTerm,
    page,
    totalPageCount: quotationsResp?.meta.pageCount || 1,
    setPage,
    size,
    setSize,
    order: sortDetails.order,
    sortKey: sortDetails.sortKey,
    setSortDetails: (order: boolean, sortKey: string) => setSortDetails({ order, sortKey })
  };

  //Remove Quotation
  const { mutate: removeQuotation, isPending: isDeletePending } = useMutation({
    mutationFn: (id: number) => api.expense_quotation.remove(id),
    onSuccess: () => {
      if (quotations?.length == 1 && page > 1) setPage(page - 1);
      toast.success(tInvoicing('quotation.action_remove_success'));
      refetchQuotations();
      setDeleteDialog(false);
    },
    onError: (error) => {
      toast.error(
        getErrorMessage('invoicing', error, tInvoicing('quotation.action_remove_failure'))
      );
    }
  });

  const { mutate: duplicateQuotation, isPending: isDuplicationPending } = useMutation({
    mutationFn: (params: { id: number; includeFiles: boolean }) => 
      api.expense_quotation.duplicate(params),
    onSuccess: (data) => {
      toast.success('Devis dupliqué avec succès');
      // Log des nouvelles références
      console.log('Références des articles dupliqués:', 
        data.expensearticleQuotationEntries?.map(e => e.reference));
      router.push(`/buying/expense_quotation/${data.id}`);
    },
    onError: (error) => {
      toast.error('Échec de la duplication');
      console.error('Erreur:', error);
    }
  });
  

  const isPending =
    isFetchPending ||
    isDeletePending ||
    paging ||
    resizing ||
    searching ||
    sorting ||
    !commonReady ||
    !invoicingReady;

  if (error) return 'An error has occurred: ' + error.message;
  return (
    <>
      <ExpenseQuotationDeleteDialog
        id={quotationManager?.id}
        sequential={quotationManager?.sequential || ''}
        open={deleteDialog}
        deleteQuotation={() => {
          quotationManager?.id && removeQuotation(quotationManager?.id);
        }}
        isDeletionPending={isDeletePending}
        onClose={() => setDeleteDialog(false)}
      />
      <ExpenseQuotationDuplicateDialog
  id={quotationManager?.id ?? 0}
  open={duplicateDialog}
  onClose={() => setDuplicateDialog(false)}
  duplicateQuotation={({ includeFiles }) => {
    if (!quotationManager?.id) {
      toast.error(tInvoicing('quotation.missing_id_error'));
      return;
    }

    // Nettoyage des fichiers si nécessaire
    if (!includeFiles) {
      quotationManager.set('pdfFile', null);
      quotationManager.set('uploadPdfField', null);
      quotationManager.set('pdfFileId', null);
    }

    duplicateQuotation({ 
      id: quotationManager.id, 
      includeFiles 
    });
  }}
  isDuplicationPending={isDuplicationPending}
/>
      <ExpenseQuotationDownloadDialog
  id={quotationManager?.id || 0}
  open={downloadDialog} // Doit être true quand on clique
  onDownload={handleDownload}
  isDownloadPending={isDownloadPending}
  onClose={() => setDownloadDialog(false)}
/>
      <ExpenseQuotationActionsContext.Provider value={context}>
        <Card className={className}>
          <CardHeader>
            <CardTitle>{tInvoicing('quotation.singular')}</CardTitle>
            <CardDescription>{tInvoicing('quotation.card_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              className="flex flex-col flex-1 overflow-hidden p-1"
              containerClassName="overflow-auto"
              data={quotations}
              columns={getQuotationColumns(tInvoicing, router)}
              isPending={isPending}
            />
          </CardContent>
        </Card>
      </ExpenseQuotationActionsContext.Provider>
    </>
  );
};