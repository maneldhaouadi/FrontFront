import { ArrowDownIcon, ArrowUpIcon, CaretSortIcon, EyeNoneIcon } from '@radix-ui/react-icons';
import { Column } from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useChatbotActions } from './ActionsContext';

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
  attribute?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  attribute,
  className
}: DataTableColumnHeaderProps<TData, TValue>) {
  const { order, sortKey, setSortDetails, languageCode } = useChatbotActions();

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const tCommon = (key: string) => {
    const translations = {
      'order.asc': languageCode === 'fr' ? 'Croissant' : languageCode === 'en' ? 'Ascending' : 'Ascendente',
      'order.desc': languageCode === 'fr' ? 'Décroissant' : languageCode === 'en' ? 'Descending' : 'Descendente',
      'commands.hide': languageCode === 'fr' ? 'Masquer' : languageCode === 'en' ? 'Hide' : 'Ocultar'
    };
    return translations[key as keyof typeof translations] || key;
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent">
            <span>{title}</span>
            {order === true && attribute == sortKey ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : order === false && attribute == sortKey ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : (
              <CaretSortIcon className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => {
              attribute && setSortDetails(false, attribute);
            }}>
            <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {tCommon('order.asc')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              attribute && setSortDetails(true, attribute);
            }}>
            <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {tCommon('order.desc')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="font-bold" onClick={() => column.toggleVisibility(false)}>
            <EyeNoneIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {tCommon('commands.hide')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}