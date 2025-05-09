import React from 'react';
import { cn } from '@/lib/utils';
import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  DndContext,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import SortableLinks from '@/components/ui/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Currency } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { PackageOpen } from 'lucide-react';
import { useExpensePaymentManager } from '../hooks/useExpensePaymentManager';
import { useExpensePaymentInvoiceManager } from '../hooks/useExpensePaymentInvoiceManager';
import { ExpensePaymentInvoiceItem } from './ExpensePaymentInvoiceItem';
import { ExpensePaymentInvoiceEntry } from '@/types/expense-payment';

interface ExpensePaymentInvoiceManagementProps {
  className?: string;
  loading?: boolean;
  mode?: 'CREATE' | 'EDIT' | 'INSPECT'; // Ajoutez 'INSPECT' ici
  disabled?: boolean; // Ajoutez cette ligne
}


export const ExpensePaymentInvoiceManagement: React.FC<ExpensePaymentInvoiceManagementProps> = ({
  className,
  loading,
  mode = 'CREATE',
  disabled = false,
}) => {
  // All hooks called unconditionally at the top
  const { t: tInvoicing } = useTranslation('invoicing');
  const paymentManager = useExpensePaymentManager();
  const invoiceManager = useExpensePaymentInvoiceManager();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Memoized calculations
  const displayedInvoices = React.useMemo(() => {
    // En mode inspect/update, affichez toutes les factures associées
    return mode !== 'CREATE' 
      ? invoiceManager.invoices 
      : invoiceManager.invoices.filter(item => {
          const total = item.invoice.expenseInvoice?.total || 0;
          const paid = item.invoice.expenseInvoice?.amountPaid || 0;
          const tax = item.invoice.expenseInvoice?.taxWithholdingAmount || 0;
          return (total - paid - tax) > 0.01;
        });
  }, [invoiceManager.invoices, mode]);


  const unpaidInvoices = React.useMemo(() => {
    return invoiceManager.invoices.filter(item => {
      const total = item.invoice.expenseInvoice?.total || 0;
      const paid = item.invoice.expenseInvoice?.amountPaid || 0;
      const tax = item.invoice.expenseInvoice?.taxWithholdingAmount || 0;
      return (total - paid - tax) > 0.01;
    });
  }, [invoiceManager.invoices]);

  // Early return conditions moved after all hooks
  if (displayedInvoices.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 font-bold h-24 text-center ">
        {mode !== 'CREATE' 
          ? tInvoicing('payment.no_invoices_associated') 
          : tInvoicing('payment.no_unpaid_invoices')} 
        <PackageOpen />
      </div>
    );
  }

  if (unpaidInvoices.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 font-bold h-24 text-center ">
        {tInvoicing('payment.no_unpaid_invoices')} <PackageOpen />
      </div>
    );
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = invoiceManager.invoices.findIndex((item) => item.id === active.id);
      const newIndex = invoiceManager.invoices.findIndex((item) => item.id === over.id);
      
      const defaultCurrency: Currency = {
        id: 0,
        code: 'USD',
        symbol: '$',
        digitAfterComma: 2,
      };
      
      invoiceManager.setInvoices(
        arrayMove(
          invoiceManager.invoices.map((item) => item.invoice),
          oldIndex,
          newIndex
        ),
        paymentManager.currency || defaultCurrency,
        paymentManager.convertionRate || 1
      );
    }
  }

  return (
    <div className="border-b">
      <Card className={cn('w-full border-0 shadow-none', className)}>
        <CardHeader className="space-y-1 w-full">
          <div className="flex flex-row items-center">
            <div>
              <CardTitle className="text-2xl flex justify-between">
                {tInvoicing('invoice.plural')}
              </CardTitle>
              <CardDescription>{tInvoicing('article.manager-statement')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
            <SortableContext items={unpaidInvoices} strategy={verticalListSortingStrategy}>
              {loading && <Skeleton className="h-24 mr-2 my-5" />}
              {!loading &&
                unpaidInvoices.map((item) => (
                  <SortableLinks key={item.id} id={item}>
                    <ExpensePaymentInvoiceItem
                      invoiceEntry={item.invoice}
                      onChange={(invoice) => invoiceManager.update(item.id, invoice)}
                      currency={paymentManager.currency || undefined}
                      paymentConvertionRate={paymentManager.convertionRate || 1}
                      disabled={disabled}
                    />
                  </SortableLinks>
                ))}
            </SortableContext>
          </DndContext>
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
    </div>
  );
};