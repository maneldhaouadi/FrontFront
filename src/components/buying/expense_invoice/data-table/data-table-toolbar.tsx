import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Table } from '@tanstack/react-table';
import { PackagePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import { DataTableViewOptions } from './data-table-view-options';
import { ExpenseUseInvoiceActions } from './ActionsContext';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const router = useRouter();
  const { t: tCommon } = useTranslation('common');
  const { t: tInvoicing } = useTranslation('invoicing');

  const { setPage, searchTerm, setSearchTerm } = ExpenseUseInvoiceActions();
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={tCommon('table.filter_placeholder', {
            entity: tInvoicing('Factures')
          })}
          value={searchTerm?.toString()}
          onChange={(event) => {
            setPage?.(1);
            setSearchTerm?.(event.target.value);
          }}
          className="h-8 w-[150px] lg:w-[300px]"
        />
        {searchTerm && (
          <Button variant="ghost" onClick={() => setSearchTerm?.('')} className="h-8 px-2 lg:px-3">
            {tCommon('commands.reset')}
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <Button
        className="h-8 px-2 lg:px-3"
        variant="ghost"
        onClick={() => {
          router.push('/buying/expense-new-invoice');
        }}>
        <PackagePlus className="h-6 w-6" />
        {tInvoicing('invoice.add_button_label')}
      </Button>
      <DataTableViewOptions table={table} />
    </div>
  );
}
