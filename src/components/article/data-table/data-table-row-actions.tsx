import * as React from 'react';
import { Row } from '@tanstack/react-table';
import { Article } from '@/types';
import { Button } from '@/components/ui/button';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { Trash2, Eye, Settings2, History } from 'lucide-react';
import { useArticleActions } from '../hooks/ArticleManager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableRowActionsProps {
  row: Row<Article>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const article = row.original;
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const { openDeleteDialog } = useArticleActions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <DotsHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel className="text-center">{tCommon('commands.actions')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Inspecter l'article */}
        <DropdownMenuItem onClick={() => router.push(`/article/article-details/${article.id}`)}>
          <Eye className="h-4 w-4 mr-2" /> {tCommon('commands.inspect')}
        </DropdownMenuItem>
        {/* Modifier l'article */}
       
        {/* Historique de l'article */}
        <DropdownMenuItem onClick={() => router.push(`/article/article-history/${article.id}`)}>
          <History className="h-4 w-4 mr-2" /> {tCommon('Historique')}
        </DropdownMenuItem>
        {/* Supprimer l'article */}
        <DropdownMenuItem
          onClick={() => openDeleteDialog?.(article.id)}
          className="text-red-600"
        >
          <Trash2 className="h-4 w-4 mr-2" /> {tCommon('commands.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
