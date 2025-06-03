import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableRowActions } from './data-table-row-actions';
import { DataTableColumnHeader } from './data-table-column-header';
import { transformDate, transformDateTime } from '@/utils/date.utils';
import { NextRouter } from 'next/router';
import { firm } from '@/api';
import { EXPENSE_QUOTATION_FILTER_ATTRIBUTES } from '@/constants/expensequotation.filter-attributes';
import { ExpenseQuotation } from '@/types';

export const getQuotationColumns = (
  t: Function,
  router: NextRouter,
  firmId?: number,
  interlocutorId?: number
): ColumnDef<ExpenseQuotation>[] => {
  const translationNamespace = 'invoicing';
  const translate = (value: string, namespace: string = '') => {
    return t(value, { ns: namespace || translationNamespace });
  };
  const firmColumn: ColumnDef<ExpenseQuotation> = {
    accessorKey: 'firm',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={translate('quotation.attributes.firm')}
        attribute={EXPENSE_QUOTATION_FILTER_ATTRIBUTES.FIRM}
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

  const interlocutorColumn: ColumnDef<ExpenseQuotation> = {
    accessorKey: 'interlocutor',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={translate('quotation.attributes.interlocutor')}
        attribute={EXPENSE_QUOTATION_FILTER_ATTRIBUTES.INTERLOCUTOR}
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

  const columns: ColumnDef<ExpenseQuotation>[] = [
    {
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={translate('quotation.attributes.number')}
          attribute={EXPENSE_QUOTATION_FILTER_ATTRIBUTES.SEQUENTIAL}
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
          title={translate('quotation.attributes.date')}
          attribute={EXPENSE_QUOTATION_FILTER_ATTRIBUTES.DATE}
        />
      ),
      cell: ({ row }) => (
        <div>
          {row.original.date ? (
            transformDate(row.original.date)
          ) : (
            <span>{t('quotation.attributes.no_date')}</span>
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
          title={translate('quotation.attributes.due_date')}
          attribute={EXPENSE_QUOTATION_FILTER_ATTRIBUTES.DUEDATE}
        />
      ),
      cell: ({ row }) => (
        <div>
          {row.original.dueDate ? (
            transformDate(row.original.dueDate)
          ) : (
            <span>{t('quotation.attributes.no_due_date')}</span>
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
      title={translate('quotation.attributes.status')}
      attribute={EXPENSE_QUOTATION_FILTER_ATTRIBUTES.STATUS}
    />
  ),
  cell: ({ row }) => {
    const status = row.original?.status || '';
    const statusClasses = {
      Draft: 'bg-gray-100 text-gray-800 border-gray-300',
      Expired: 'bg-amber-100 text-amber-800 border-amber-300',
    };

    return (
      <div className="justify-center">
        <Badge 
          className={` 
            flex items-center justify-center 
            min-w-[60px] max-w-[700px]
            h-8
            rounded-full 
            text-sm font-medium 
            border
            ${statusClasses[status as keyof typeof statusClasses]}
            mx-auto
          `}
        >
          <span className="truncate font-bold">{t(status)}</span> {/* Ajout de font-bold ici */}
        </Badge>
      </div>
    );
  },
  enableSorting: true,
  enableHiding: true
},
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={translate('quotation.attributes.created_at')}
          attribute={EXPENSE_QUOTATION_FILTER_ATTRIBUTES.CREATEDAT}
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
