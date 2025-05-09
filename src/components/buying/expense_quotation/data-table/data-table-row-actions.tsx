import { useRouter } from 'next/router';
import { EXPENSQUOTATION_STATUS, ExpenseQuotation} from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Row } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Copy, Download, FileCheck, Settings2, Telescope, Trash2 } from 'lucide-react';
import { useExpenseQuotationActions } from './ActionsContext';
import { useExpenseQuotationManager } from '../hooks/useExpenseQuotationManager';


interface DataTableRowActionsProps {
  row: Row<ExpenseQuotation>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const quotation = row.original;
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const quotationManager = useExpenseQuotationManager();
  const { openDeleteDialog, openDuplicateDialog, openInvoiceDialog, openDownloadDialog } =
  useExpenseQuotationActions();
  
  const targetQuotation = () => {
    quotationManager.set('id', quotation?.id);
    quotationManager.set('sequential', quotation?.sequential);
    quotationManager.set('status', quotation?.status);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <DotsHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[160px]">
        <DropdownMenuLabel className="text-center">{tCommon('commands.actions')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Inspect */}
        <DropdownMenuItem onClick={() => router.push('/buying/expense_quotation/' + quotation.id + '?mode=inspect')}>
  <Telescope className="h-5 w-5 mr-2" /> {tCommon('commands.inspect')}
</DropdownMenuItem>
<DropdownMenuItem onClick={() => {
          targetQuotation();
          openDownloadDialog?.();
        }}>
          <Download className="h-5 w-5 mr-2" /> {tCommon('commands.download')}
        </DropdownMenuItem>

        {/* Duplicate */}
        <DropdownMenuItem
          onClick={() => {
            targetQuotation();
            openDuplicateDialog?.();
          }}>
          <Copy className="h-5 w-5 mr-2" /> {tCommon('commands.duplicate')}
        </DropdownMenuItem>
        {/* Print */}
        <DropdownMenuItem
          onClick={() => {
            targetQuotation();
          }}>
        </DropdownMenuItem>
        {/* Duplicate */}
        {(quotation.status == EXPENSQUOTATION_STATUS.Draft) && (
          <DropdownMenuItem onClick={() => router.push('/buying/expense_quotation/' + quotation.id)}>
            <Settings2 className="h-5 w-5 mr-2" /> {tCommon('commands.modify')}
          </DropdownMenuItem>
        )}
        { (
          <DropdownMenuItem
            onClick={() => {
              targetQuotation();
              openDeleteDialog?.();
            }}>
            <Trash2 className="h-5 w-5 mr-2" /> {tCommon('commands.delete')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
