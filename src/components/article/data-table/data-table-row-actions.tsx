import * as React from 'react';
import { Row } from '@tanstack/react-table';
import { Article, ArticleStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { Trash2, Eye, History, FileEdit, Archive, CheckCircle, XCircle, Box, Loader2, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { api } from '@/api';

interface DataTableRowActionsProps {
  row: Row<Article>;
  onStatusChange?: (id: number, newStatus: ArticleStatus) => void;
  onDelete?: (id: number) => Promise<void>;
  onRestore?: (id: number) => Promise<void>;
}

type BaseAction = {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  show: boolean;
  className?: string;
};

type StatusAction = {
  label: string;
  icon: React.ReactNode;
  action: () => Promise<void>;
  className: string;
};

type StatusActions = {
  [key in ArticleStatus]?: StatusAction[];
};

export function DataTableRowActions({ row, onStatusChange, onDelete, onRestore }: DataTableRowActionsProps) {
  const article = row.original;
  const { t: tCommon } = useTranslation('common');
  const { t: tArticle } = useTranslation('article');
  const router = useRouter();
  const [actionInProgress, setActionInProgress] = React.useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>, actionName: string) => {
    setActionInProgress(actionName);
    try {
      await action();
    } catch (error) {
      console.error(`Action failed: ${actionName}`, error);
      toast.error(tArticle('action_failure'));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStatusChange = async (newStatus: ArticleStatus) => {
    if (newStatus === 'archived') {
      const confirmMessage = tArticle('confirm_archive');
      if (!window.confirm(confirmMessage)) return;
    }

    await handleAction(async () => {
      const response = await api.article.updateArticleStatus(article.id, newStatus);
      
      if (!response) {
        throw new Error('Empty response');
      }
      
      toast.success(tArticle(`status_update_success.${newStatus}`));
      onStatusChange?.(article.id, newStatus);
    }, `status-change-${newStatus}`);
  };

  const handleRestore = async () => {
    const confirmMessage = tArticle('confirm_restore');
    if (!window.confirm(confirmMessage)) return;

    await handleAction(async () => {
      const response = await api.article.updateArticleStatus(article.id, 'active');
      
      if (!response) {
        throw new Error('Empty response');
      }
      
      toast.success(tArticle('status_update_success.active'));
      onStatusChange?.(article.id, 'active');
    }, 'restore');
  };

  const handleDelete = async () => {
    if (!onDelete) {
      toast.error(tArticle('delete_not_available'));
      return;
    }

    let confirmMessage = tArticle('confirm_delete_draft');
    
    if (article.status === 'inactive') {
      confirmMessage = tArticle('confirm_delete_inactive');
    } else if (article.status === 'archived') {
      confirmMessage = tArticle('confirm_delete_archived');
    } else if (article.status === 'active') {
      confirmMessage = tArticle('confirm_delete_active');
    }
    
    if (!window.confirm(confirmMessage)) return;

    await handleAction(async () => {
      await onDelete(article.id);
    }, 'delete');
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const baseActions = React.useMemo<BaseAction[]>(() => [
    {
      label: tCommon('commands.inspect'),
      icon: <Eye className="h-4 w-4 mr-2" />,
      action: () => navigateTo(`/article/article-details/${article.id}`),
      show: true
    },
    {
      label: tCommon('Modifier'),
      icon: <FileEdit className="h-4 w-4 mr-2" />,
      action: () => navigateTo(`/article/update-article/${article.id}`),
      show: ['draft', 'active', 'out_of_stock'].includes(article.status)
    },
    {
      label: tCommon('Historique'),
      icon: <History className="h-4 w-4 mr-2" />,
      action: () => navigateTo(`/article/article-history/${article.id}`),
      show: ['draft', 'active', 'out_of_stock', 'archived'].includes(article.status)
    }
  ], [article.id, article.status, tCommon]);

  const statusActions = React.useMemo<StatusActions>(() => ({
    draft: [
      {
        label: tCommon('commands.activate'),
        icon: <CheckCircle className="h-4 w-4 mr-2 text-green-600" />,
        action: () => handleStatusChange('active'),
        className: "text-green-600"
      },
      {
        label: tCommon('commands.delete'),
        icon: <Trash2 className="h-4 w-4 mr-2 text-red-600" />,
        action: handleDelete,
        className: "text-red-600"
      }
    ],
    active: [
      {
        label: tCommon('commands.deactivate'),
        icon: <XCircle className="h-4 w-4 mr-2 text-yellow-600" />,
        action: () => handleStatusChange('inactive'),
        className: "text-yellow-600"
      },
      {
        label: tCommon('Archiver'),
        icon: <Archive className="h-4 w-4 mr-2 text-purple-600" />,
        action: () => handleStatusChange('archived'),
        className: "text-purple-600"
      },
      {
        label: tCommon('commands.delete'),
        icon: <Trash2 className="h-4 w-4 mr-2 text-red-600" />,
        action: handleDelete,
        className: "text-red-600"
      }
    ],
    inactive: [
      {
        label: tCommon('commands.activate'),
        icon: <CheckCircle className="h-4 w-4 mr-2 text-green-600" />,
        action: () => handleStatusChange('active'),
        className: "text-green-600"
      },
      {
        label: tCommon('commands.delete'),
        icon: <Trash2 className="h-4 w-4 mr-2 text-red-600" />,
        action: handleDelete,
        className: "text-red-600"
      }
    ],
    out_of_stock: [
      {
        label: tCommon('commands.mark_in_stock'),
        icon: <Box className="h-4 w-4 mr-2 text-blue-600" />,
        action: () => handleStatusChange('active'),
        className: "text-blue-600"
      },
      {
        label: tCommon('commands.archive'),
        icon: <Archive className="h-4 w-4 mr-2 text-purple-600" />,
        action: () => handleStatusChange('archived'),
        className: "text-purple-600"
      }
    ],
    archived: [
      {
        label: tCommon('Restaurer'),
        icon: <RotateCcw className="h-4 w-4 mr-2 text-green-600" />,
        action: handleRestore,
        className: "text-green-600"
      },
     {
        label: tCommon('commands.delete'),
        icon: <Trash2 className="h-4 w-4 mr-2 text-red-600" />,
        action: handleDelete,
        className: "text-red-600"
      }
    ]
  }), [article.id, article.status, tCommon, handleStatusChange, handleRestore, handleDelete]);

  const isActionInProgress = (actionName: string) => actionInProgress === actionName;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          disabled={!!actionInProgress}
        >
          {actionInProgress ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <DotsHorizontalIcon className="h-4 w-4" />
          )}
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel className="text-center">{tCommon('commands.actions')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {baseActions.map((action, index) => (
          action.show && (
            <DropdownMenuItem 
              key={`base-${index}`} 
              onClick={action.action}
              className={action.className}
              disabled={!!actionInProgress}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          )
        ))}
        
        {statusActions[article.status]?.map((action, index) => (
          <DropdownMenuItem 
            key={`status-${index}`} 
            onClick={action.action}
            className={action.className}
            disabled={!!actionInProgress}
          >
            {isActionInProgress(action.label) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              action.icon
            )}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}