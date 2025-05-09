import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { articleHistory } from '@/api/article-history';
import { ResponseArticleHistoryDto } from '@/types/article-history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/common/Spinner';
import { DataTable } from './data-table/data-table';
import { api } from '@/api';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Download, Undo2 } from 'lucide-react';

const ArticleHistoryList = ({ articleId }: { articleId: number }) => {
  const { t } = useTranslation('articleHistory');
  const [history, setHistory] = useState<ResponseArticleHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArticleHistory = async () => {
    try {
      setLoading(true);
      const data = await articleHistory.getArticleHistory(articleId);
      setHistory(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (articleId: number, version: number) => {
    try {
      await articleHistory.downloadPdf(articleId, version);
      toast.success(t('pdf_downloaded'));
    } catch (err) {
      toast.error(t('error_downloading_pdf'));
    }
  };

  const handleRestoreVersion = async (version: number) => {
    if (!window.confirm(t('confirm_restore', { version }))) return;
    
    try {
      await api.article.restoreVersion(articleId, version);
      toast.success(t('version_restored'));
      fetchArticleHistory();
    } catch (err) {
      toast.error(t('error_restoring'));
    }
  };

  const handleDeleteVersion = async (version: number) => {
    if (!window.confirm(t('confirm_delete_version', { version }))) return;
    
    try {
      await articleHistory.deleteVersion(articleId, version); 
      toast.success(t('version_deleted'));
      fetchArticleHistory();
    } catch (err) {
      toast.error(t('error_deleting_version'));
    }
  };

  useEffect(() => {
    fetchArticleHistory();
  }, [articleId]);

  // Fonction pour formater les valeurs spécifiques
  const formatFieldValue = (field: string, value: any) => {
    if (value === null || value === undefined) return 'N/A';
    
    // Formatage spécifique pour les champs numériques
    if (field === 'unitPrice') {
      return parseFloat(value).toFixed(2);
    }
    
    // Formatage des dates
    if (field === 'updatedAt' || field === 'createdAt') {
      return format(new Date(value), 'PPPp', { locale: fr });
    }
    
    return value.toString();
  };

  const columns: ColumnDef<ResponseArticleHistoryDto>[] = [
    {
      accessorKey: 'version',
      header: t('version'),
      cell: ({ row }) => `Version ${row.original.version}`,
    },
    {
      accessorKey: 'date',
      header: t('date'),
      cell: ({ row }) => format(new Date(row.original.date), 'PPPp', { locale: fr }),
    },
    {
      accessorKey: 'changes',
      header: t('changes'),
      cell: ({ row }) => (
        <div className="space-y-1">
          {Object.entries(row.original.changes).map(([field, change]) => (
            <div key={field} className="flex items-center gap-2">
              <span className="font-medium">{field}:</span>
              <span className="text-muted-foreground">
                {formatFieldValue(field, change.oldValue)}
              </span>
              <span>→</span>
              <span>{formatFieldValue(field, change.newValue)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'actions',
      header: t('actions'),
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleRestoreVersion(row.original.version)}
              className="cursor-pointer"
            >
              <Undo2 className="mr-2 h-4 w-4" />
              {t('restaurer_version')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDownloadPdf(row.original.articleId, row.original.version)}
              className="cursor-pointer"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('télécharger_pdf')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteVersion(row.original.version)}
              className="cursor-pointer text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('supprimer_version')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (loading) return <Spinner className="mx-auto my-8" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Historique de l\'article')}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={history}
          emptyMessage={t('no_history_found')}
        />
      </CardContent>
    </Card>
  );
};

export default ArticleHistoryList;