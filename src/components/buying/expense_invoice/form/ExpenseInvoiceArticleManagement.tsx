import React, { useState } from 'react';
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
import { Tax } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { ExpenseInvoiceArticleItem } from './ExpenseInvoiceArticleItem';
import { useExpenseInvoiceManager } from '../hooks/useExpenseInvoiceManager';
import { useExpenseInvoiceArticleManager } from '../hooks/useExpenseInvoiceArticleManager';
import { ExpenseArticleInvoiceEntry } from '@/types/expense_invoices';

interface ExpenseInvoiceArticleManagementProps {
  className?: string;
  taxes: Tax[];
  isArticleDescriptionHidden: boolean;
  edit?: boolean;
  loading?: boolean;
  isInspectMode?: boolean;
}
export const ExpenseInvoiceArticleManagement: React.FC<ExpenseInvoiceArticleManagementProps> = ({
  className,
  taxes = [],
  isArticleDescriptionHidden,
  loading,
  edit = true,
  isInspectMode = false
}) => {
  const { t: tInvoicing } = useTranslation('invoicing');
  const invoiceManager = useExpenseInvoiceManager();
  const articleManager = useExpenseInvoiceArticleManager();
  const [articles, setArticles] = useState<ExpenseArticleInvoiceEntry[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = articleManager.articles.findIndex((item) => item.id === active.id);
      const newIndex = articleManager.articles.findIndex((item) => item.id === over.id);
      articleManager.setArticles(
        arrayMove(
          articleManager.articles.map((item) => item.article),
          oldIndex,
          newIndex
        )
      );
    }
  }

  function handleDelete(idToDelete: string) {
    if (articleManager.articles.length > 1) {
      articleManager.delete(idToDelete);
    }
  }

  const addNewItem = React.useCallback(() => {
    articleManager.add();
  }, [articleManager.add]);

  return (
    <div className="border-b">
      <Card className={cn('w-full border-0 shadow-none', className)}>
        <CardHeader className="space-y-1 w-full">
          <div className="flex flex-row items-center">
            <div>
              <CardTitle className="text-2xl flex justify-between">
                {tInvoicing('article.manager')}
              </CardTitle>
              <CardDescription>{tInvoicing('article.manager_statement_invoice')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
            <SortableContext items={articleManager.articles} strategy={verticalListSortingStrategy}>
              {loading && <Skeleton className="h-24 mr-2 my-5" />}
              {!loading &&
                articleManager.articles.map((item) => (
                  <SortableLinks key={item.id} id={item} onDelete={edit ? handleDelete : undefined}>
                    <ExpenseInvoiceArticleItem
                      article={item.article}
                      onChange={(article) => articleManager.update(item.id, article)}
                      taxes={taxes}
                      showDescription={!isArticleDescriptionHidden}
                      currency={invoiceManager.currency}
                      edit={edit}
                    />
                  </SortableLinks>
                ))}
            </SortableContext>
          </DndContext>
          {/* Button allow to add an item in the DnD list */}
          {edit && (
            <Button variant={'outline'} className="h-10 w-fit" onClick={addNewItem}>
              <div className="flex gap-2 items-center w-full justify-center">
                <Plus size={20} />
                {tInvoicing('article.new')}
              </div>
            </Button>
          )}
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
    </div>
  );
};
