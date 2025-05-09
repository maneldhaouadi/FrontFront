import { useRouter } from 'next/router';
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
import { Download, Settings2, Telescope, Trash2 } from 'lucide-react';
import { ExpensePayment } from '@/types/expense-payment';
import { useExpensePaymentActions } from './ActionsContext';
import { useExpensePaymentManager } from '../hooks/useExpensePaymentManager';

interface DataTableRowActionsProps {
  row: Row<ExpensePayment>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const payment = row.original;
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const paymentManager = useExpensePaymentManager();
  const { openDeleteDialog, openDownloadDialog } = useExpensePaymentActions();

  const targetInvoice = () => {
    paymentManager.set('id', payment?.id);
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
        <DropdownMenuItem 
          onClick={() => router.push(`/buying/expense_payment/${payment.id}?mode=inspect`)}>
          <Telescope className="h-5 w-5 mr-2" /> {tCommon('commands.inspect')}
        </DropdownMenuItem>
        {/* Download */}
        <DropdownMenuItem onClick={() => {
          targetInvoice();
          openDownloadDialog();
        }}>
          <Download className="h-5 w-5 mr-2" /> {tCommon('commands.download')}
        </DropdownMenuItem>
        {/* Modify */}
        <DropdownMenuItem 
          onClick={() => router.push(`/buying/expense_payment/${payment.id}?mode=edit`)}>
          <Settings2 className="h-5 w-5 mr-2" /> {tCommon('commands.modify')}
        </DropdownMenuItem>
        {/* Delete */}
        <DropdownMenuItem onClick={() => {
          targetInvoice();
          openDeleteDialog();
        }}>
          <Trash2 className="h-5 w-5 mr-2" /> {tCommon('commands.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}