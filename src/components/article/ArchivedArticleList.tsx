import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { DataTable } from './data-table/data-table';
import { getArticleColumns } from './data-table/columns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, PackageSearch, RotateCcw, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ArchivedArticleList: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation('article');
  const queryClient = useQueryClient();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch archived articles
  const {
    data: articles = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['archived-articles', searchTerm],
    queryFn: async () => {
      const data = await api.article.findArchivedArticles();
      return data.filter(article => 
        searchTerm 
          ? article.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            article.reference?.toLowerCase().includes(searchTerm.toLowerCase())
          : true
      );
    }
  });

  // Handle page adjustment when articles are removed
  useEffect(() => {
    if (articles.length > 0 && paginatedArticles.length === 0 && page > 1) {
      setPage(page - 1);
    }
  }, [articles, page, pageSize]);

  // Restore article mutation
  const restoreArticleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.article.restoreArticle(id);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries(['archived-articles']);
      const previousArticles = queryClient.getQueryData(['archived-articles']);

      queryClient.setQueryData(['archived-articles'], (old: any) => 
        old?.filter((article: any) => article.id !== id) || []
      );

      return { previousArticles };
    },
    onError: (err, id, context: any) => {
      queryClient.setQueryData(['archived-articles'], context.previousArticles);
      toast.error(t('Erreur lors de la restauration de l\'article'));
    },
    onSuccess: () => {
      toast.success(t('Article restauré avec succès'));
    },
    onSettled: () => {
      queryClient.invalidateQueries(['archived-articles']);
      queryClient.invalidateQueries(['articles']); // Refresh active articles list
    }
  });

  const handleRestoreArticle = (id: number) => {
    restoreArticleMutation.mutate(id);
  };

  // Client-side pagination
  const paginatedArticles = articles.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.ceil(articles.length / pageSize);

  const goToPreviousPage = () => page > 1 && setPage(page - 1);
  const goToNextPage = () => page < pageCount && setPage(page + 1);
  const goBackToActive = () => router.push('/article/article-Lists');

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>{t('Erreur lors du chargement des archives')}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2"
          onClick={() => refetch()}
        >
          {t('Réessayer')}
        </Button>
      </div>
    );
  }

  return (
    <Card className="flex flex-col flex-1 overflow-hidden">
      <CardHeader className="flex flex-col space-y-1.5">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <PackageSearch className="h-5 w-5" />
              {t('Archives des articles')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('Liste des articles archivés')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-8"
              onClick={goBackToActive}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('Retour aux articles actifs')}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="relative mb-4">
          <Input
            placeholder={t('Rechercher dans les archives...')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="h-8 pl-8 text-sm"
          />
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <DataTable
          data={paginatedArticles}
          columns={getArticleColumns(t, router, handleRestoreArticle)}
          isPending={isLoading || restoreArticleMutation.isLoading}
        />

        {isLoading && (
          <div className="p-4 text-center text-muted-foreground">
            {t('Chargement des archives...')}
          </div>
        )}

        {!isLoading && articles.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            {searchTerm 
              ? t('Aucun article archivé ne correspond à votre recherche') 
              : t('Aucun article archivé trouvé')}
          </div>
        )}

        {articles.length > 0 && (
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('Lignes par page')}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 w-20 text-xs border rounded-md px-2"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={goToPreviousPage}
                disabled={page === 1}
              >
                <span className="sr-only">Page précédente</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <div className="text-xs text-muted-foreground px-2">
                {t('Page')} {page} {t('sur')} {pageCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={goToNextPage}
                disabled={page >= pageCount}
              >
                <span className="sr-only">Page suivante</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArchivedArticleList;