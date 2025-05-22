import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableRowActions } from './data-table-row-actions';
import { DataTableColumnHeader } from './data-table-column-header';
import { transformDate, transformDateTime } from '@/utils/date.utils';
import { NextRouter } from 'next/router';
import { ExpenseInvoice } from '@/types/expense_invoices';
import { EXPENSE_INVOICE_FILTER_ATTRIBUTES } from '@/constants/expense_invoice.filter-attributes';

export const getInvoiceColumns = (
  t: Function,
  router: NextRouter,
  firmId?: number,
  interlocutorId?: number
): ColumnDef<ExpenseInvoice>[] => {
  const translationNamespace = 'invoicing';
  const translate = (value: string, namespace: string = '') => {
    return t(value, { ns: namespace || translationNamespace });
  };

  const firmColumn: ColumnDef<ExpenseInvoice> = {
    accessorKey: 'firm',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={translate('quotation.attributes.firm')}
        attribute={EXPENSE_INVOICE_FILTER_ATTRIBUTES.FIRM}
      />
    ),
    cell: ({ row }) => (
      <div
        className="font-bold cursor-pointer hover:underline"
        onClick={() => router.push(`/contacts/firm/${row.original?.firmId}`)}>
        {row.original.firm?.name}
      </div>
    ),
    enableSorting: true,
    enableHiding: true
  };

  const interlocutorColumn: ColumnDef<ExpenseInvoice> = {
    accessorKey: 'interlocutor',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={translate('quotation.attributes.interlocutor')}
        attribute={EXPENSE_INVOICE_FILTER_ATTRIBUTES.INTERLOCUTOR}
      />
    ),
    cell: ({ row }) => (
      <div
        className="font-bold cursor-pointer hover:underline"
        onClick={() => router.push(`/contacts/interlocutor/${row.original?.interlocutorId}`)}>
        {row.original?.interlocutor?.surname} {row.original?.interlocutor?.name}
      </div>
    ),
    enableSorting: true,
    enableHiding: true
  };

  const columns: ColumnDef<ExpenseInvoice>[] = [
    {
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={translate('invoice.attributes.number')}
          attribute={EXPENSE_INVOICE_FILTER_ATTRIBUTES.SEQUENTIAL}
        />
      ),
      cell: ({ row }) => <div>{row.original.sequential}</div>,
      enableSorting: true,
      enableHiding: true
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={translate('invoice.attributes.date')}
          attribute={EXPENSE_INVOICE_FILTER_ATTRIBUTES.DATE}
        />
      ),
      cell: ({ row }) => (
        <div>
          {row.original.date ? (
            transformDate(row.original.date)
          ) : (
            <span>{t('invoice.attributes.no_date')}</span>
          )}
        </div>
      ),
      enableSorting: true,
      enableHiding: true
    },
    {
      accessorKey: 'due_date',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={translate('invoice.attributes.due_date')}
          attribute={EXPENSE_INVOICE_FILTER_ATTRIBUTES.DUEDATE}
        />
      ),
      cell: ({ row }) => (
        <div>
          {row.original.dueDate ? (
            transformDate(row.original.dueDate)
          ) : (
            <span>{t('invoice.attributes.no_due_date')}</span>
          )}
        </div>
      ),
      enableSorting: true,
      enableHiding: true
    },
    {
  accessorKey: 'status',
  header: ({ column }) => (
    <DataTableColumnHeader
      column={column}
      title={translate('invoice.attributes.status')}
      attribute={EXPENSE_INVOICE_FILTER_ATTRIBUTES.STATUS}
    />
  ),
  cell: ({ row }) => (
    <div className="flex justify-center">
      <Badge className="min-w-[150px] h-8 px-4 py-1 text-sm flex items-center justify-center">
        {t(row.original?.status || '')}
      </Badge>
    </div>
  ),
  enableSorting: true,
  enableHiding: true
},

    {
      accessorKey: 'amount_paid',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={translate('invoice.attributes.amount_paid')}
          attribute={EXPENSE_INVOICE_FILTER_ATTRIBUTES.AMOUNT_PAID}
        />
      ),
      cell: ({ row }) => (
        <div>
          {row.original?.amountPaid?.toFixed(row.original?.currency?.digitAfterComma)}{' '}
          {row.original?.currency?.symbol}
        </div>
      ),
      enableSorting: true,
      enableHiding: true
    },
    {
      accessorKey: 'withholding',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={translate('invoice.attributes.withholding')}
          attribute={EXPENSE_INVOICE_FILTER_ATTRIBUTES.TAX_WITHHOLDING}
        />
      ),
      cell: ({ row }) => (
        <div>
          {row.original?.taxWithholdingAmount?.toFixed(row.original?.currency?.digitAfterComma)}{' '}
          {row.original?.currency?.symbol}
        </div>
      ),
      enableSorting: true,
      enableHiding: true
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={translate('invoice.attributes.created_at')}
          attribute={EXPENSE_INVOICE_FILTER_ATTRIBUTES.CREATEDAT}
        />
      ),
      cell: ({ row }) => <div>{transformDateTime(row.original?.createdAt || '')}</div>,
      enableSorting: true,
      enableHiding: true
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DataTableRowActions row={row} />
        </div>
      )
    }
  ];
  if (!firmId) columns.splice(2, 0, firmColumn);
  if (!interlocutorId) columns.splice(3, 0, interlocutorColumn);
  return columns;
};
