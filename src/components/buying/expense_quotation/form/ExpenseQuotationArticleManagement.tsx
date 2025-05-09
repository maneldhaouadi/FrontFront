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
import { Tax } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useExpenseQuotationArticleManager } from '../hooks/useExpenseQuotationArticleManager';
import { ExpenseQuotationArticleItem } from './ExpenseQuotationArticleItem';
import { useExpenseQuotationManager } from '../hooks/useExpenseQuotationManager';

interface ExpenseQuotationArticleManagementProps {
  className?: string;
  taxes: Tax[];
  isArticleDescriptionHidden: boolean;
  edit?: boolean;
  loading?: boolean;
  isInspectMode?: boolean;
}

export const ExpenseQuotationArticleManagement: React.FC<ExpenseQuotationArticleManagementProps> = ({
  className,
  taxes = [],
  isArticleDescriptionHidden,
  edit = true,
  loading,
  isInspectMode = false 
}) => {
  const { t: tInvoicing } = useTranslation('invoicing');
  const quotationManager = useExpenseQuotationManager();
  const articleManager = useExpenseQuotationArticleManager();
  
  // Désactive les sensors en mode inspection
  const sensors = useSensors(
    useSensor(PointerSensor, {
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      enabled: !isInspectMode,
    })
  );

  function handleDragEnd(event: any) {
    if (isInspectMode) return; // Ne fait rien en mode inspection
    
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
    if (isInspectMode) return; // Ne fait rien en mode inspection
    if (articleManager.articles.length > 1) {
      articleManager.delete(idToDelete);
    }
  }

  const addNewItem = React.useCallback(() => {
    if (isInspectMode) return; // Ne fait rien en mode inspection
    articleManager.add();
  }, [articleManager.add, isInspectMode]);

  return (
    <div className={cn("border-b", isInspectMode && "pointer-events-none opacity-75")}>
      <Card className={cn('w-full border-0 shadow-none', className)}>
        <CardHeader className="space-y-1 w-full">
          <div className="flex flex-row items-center">
            <div>
              <CardTitle className="text-2xl flex justify-between">
                {tInvoicing('article.manager')}
                {isInspectMode && <span className="text-sm text-gray-500">(Mode consultation)</span>}
              </CardTitle>
              <CardDescription>{tInvoicing('article.manager_statement_quotation')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
            <SortableContext 
              items={articleManager.articles} 
              strategy={verticalListSortingStrategy}
              disabled={isInspectMode} // Désactive le tri en mode inspection
            >
              {loading && <Skeleton className="h-24 mr-2 my-5" />}
              {!loading &&
                articleManager.articles.map((item) => (
                  <SortableLinks 
                    key={item.id} 
                    id={item} 
                    onDelete={edit && !isInspectMode ? handleDelete : undefined}
                  >
                    <ExpenseQuotationArticleItem
                      article={item.article}
                      onChange={(article) => !isInspectMode && articleManager.update(item.id, article)}
                      taxes={taxes}
                      showDescription={!isArticleDescriptionHidden}
                      currency={quotationManager.currency}
                      edit={edit && !isInspectMode} // Désactive l'édition en mode inspection
                      existingEntries={articleManager.articles.map(item => ({
                        ...item.article,
                        id: Number(item.id) // Conversion de string à number
                      }))}
                    />
                  </SortableLinks>
                ))}
            </SortableContext>
          </DndContext>
          {/* Button allow to add an item in the DnD list */}
          {edit && !isInspectMode && ( // Cache le bouton en mode inspection
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