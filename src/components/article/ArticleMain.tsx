import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { DataTable } from './data-table/data-table';
import { getArticleColumns } from './data-table/columns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Plus, Search, Archive, Loader2, ImageIcon, FileTextIcon } from 'lucide-react';
import { ArticleActionsContext } from './data-table/ActionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/common/Spinner';
import { ResponseArticleDto } from '@/types';

type ArticleStatus = 'draft' | 'active' | 'inactive' | 'archived' | 'out_of_stock' | 'pending_review';

const ArticleList: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation('article');
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSearchTerm, setOcrSearchTerm] = useState('');

  const {
    data: articles = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['active-articles', searchTerm, ocrSearchTerm],
    queryFn: async () => {
      const data = await api.article.findActiveArticles();
      return data.filter(article => {
        const matchesRegularSearch = searchTerm 
          ? article.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            article.reference?.toLowerCase().includes(searchTerm.toLowerCase())
          : true;
        
        const matchesOcrSearch = ocrSearchTerm
          ? article.title?.toLowerCase().includes(ocrSearchTerm.toLowerCase()) ||
            article.description?.toLowerCase().includes(ocrSearchTerm.toLowerCase()) ||
            article.reference?.toLowerCase().includes(ocrSearchTerm.toLowerCase())
          : true;
        
        return matchesRegularSearch && matchesOcrSearch;
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  const { paginatedArticles, pageCount } = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = page * pageSize;
    return {
      paginatedArticles: articles.slice(startIndex, endIndex),
      pageCount: Math.ceil(articles.length / pageSize) || 1,
    };
  }, [articles, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, ocrSearchTerm]);

  useEffect(() => {
    if (articles.length > 0 && paginatedArticles.length === 0 && page > 1) {
      setPage(page - 1);
    }
  }, [articles, paginatedArticles, page]);

 
useEffect(() => {
  console.log('Current articles:', articles);
}, [articles]);

const { mutate: deleteArticle } = useMutation({
  mutationFn: (id: number) => api.article.deleteArticle(id),
  onSuccess: (response, id) => {
    if (response?.success) {
      toast.success(response.message || 'Article supprimé avec succès');
      
      // Option 1: Invalidation immédiate + mise à jour optimiste
      queryClient.setQueryData<ResponseArticleDto[]>(
        ['active-articles'], 
        (old) => old?.filter(a => a.id !== id) || []
      );
      
      // Option 2: Rechargement après un court délai
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['active-articles'],
          exact: true
        });
      }, 300);
    } else {
      toast.error(response?.message || 'Échec de la suppression');
    }
  },
  onError: (error) => {
    console.error('Delete error:', error);
    toast.error(`Erreur technique: ${error.message}`);
  },
  // Annule la mise à jour optimiste en cas d'erreur
  onSettled: () => {
    queryClient.invalidateQueries({ 
      queryKey: ['active-articles'],
      exact: true
    });
  }
});

  

  const { mutate: updateArticleStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ArticleStatus }) => 
      api.article.updateArticleStatus(id, status),
    onSuccess: () => {
      toast.success(t('Statut mis à jour avec succès'));
      queryClient.invalidateQueries(['active-articles']);
    },
    onError: () => {
      toast.error(t('Erreur lors de la mise à jour du statut'));
    }
  });

  const handleExtractFromFile = useCallback(async (file: File, isPdf = false) => {
    setOcrLoading(true);
    setOcrSearchTerm('');
    
    try {
      const result = isPdf 
        ? await api.article.extractFromPdf(file)
        : await api.article.extractFromImage(file);
      
      if (result.title) {
        setOcrSearchTerm(result.title);
        toast.success(t('Données extraites avec succès'));
      } else {
        toast.warning(t('Aucun titre détecté dans le document'));
      }
    } catch (error) {
      console.error('Extraction Error:', error);
      toast.error(
        isPdf 
          ? t('Erreur lors de l\'extraction du PDF. Veuillez vérifier la qualité du document.')
          : t('Erreur lors de l\'extraction de l\'image. Veuillez vérifier la qualité de l\'image.')
      );
    } finally {
      setOcrLoading(false);
    }
  }, [t]);

  const handleFileUpload = useCallback(
    (type: 'image' | 'pdf') => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        handleExtractFromFile(e.target.files[0], type === 'pdf');
      }
    },
    [handleExtractFromFile]
  );

 
  const handleStatusChange = useCallback((id: number, newStatus: ArticleStatus) => {
    updateArticleStatus({ id, status: newStatus });
  }, [updateArticleStatus]);

  const goToPreviousPage = useCallback(() => {
    if (page > 1) setPage(page - 1);
  }, [page]);

  const goToNextPage = useCallback(() => {
    if (page < pageCount) setPage(page + 1);
  }, [page, pageCount]);

  const goToArchive = useCallback(() => {
    router.push('/articles/archives');
  }, [router]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);

  const clearOcrSearch = useCallback(() => {
    setOcrSearchTerm('');
  }, []);

 const contextValue = useMemo(() => ({
  searchTerm,
  setSearchTerm: (term: string) => {
    setSearchTerm(term);
    setPage(1);
  },
  page,
  totalPageCount: pageCount,
  setPage,
  size: pageSize,
  setSize: setPageSize,
  onStatusChange: handleStatusChange,
  onDelete: deleteArticle,
  refetchArticles: refetch,
}), [
  searchTerm, 
  page, 
  pageCount, 
  pageSize, 
  handleStatusChange, 
  deleteArticle,
  refetch
]);

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-2">{t('Une erreur est survenue lors du chargement des articles')}</p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetch()}
          className="h-8 px-4 text-sm"
        >
          {t('Réessayer')}
        </Button>
      </div>
    );
  }

  return (
    <ArticleActionsContext.Provider value={contextValue}>
      <Card className="flex flex-col flex-1 overflow-hidden">
        <CardHeader className="flex flex-col space-y-1.5">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {t('Liste des articles')}
              </CardTitle>
              <CardDescription className="text-sm">
                {t('Gestion des articles actifs')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm"
                className="h-8 px-4 text-sm flex items-center gap-1.5"
                onClick={() => router.push('/article/create-article')}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('Nouvel article')}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex flex-col h-[calc(100vh-180px)]">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Input
                placeholder={t('Rechercher un article...')}
                value={searchTerm}
                onChange={handleSearchChange}
                className="h-8 pl-8 text-sm"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={ocrLoading}
                className="h-8 px-3 text-sm"
              >
                {ocrLoading ? (
                  <Spinner className="mr-2" size="small" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5" />
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload('image')}
                  className="hidden"
                />
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('pdf-upload')?.click()}
                disabled={ocrLoading}
                className="h-8 px-3 text-sm"
              >
                {ocrLoading ? (
                  <Spinner className="mr-2" size="small" />
                ) : (
                  <FileTextIcon className="h-3.5 w-3.5" />
                )}
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload('pdf')}
                  className="hidden"
                />
              </Button>
            </div>
          </div>

          {ocrSearchTerm && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 rounded-md">
              <span className="text-sm text-blue-800">
                {t('Recherche par OCR')}: "{ocrSearchTerm}"
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearOcrSearch}
                className="h-6 px-2 text-xs text-blue-800 hover:text-blue-900"
              >
                {t('Effacer')}
              </Button>
            </div>
          )}

          <ScrollArea className="flex-1 pr-4 mb-4">
            <DataTable
              data={paginatedArticles}
              columns={getArticleColumns(t, router)}
              isPending={isLoading}
            />

            {isLoading && (
              <div className="p-4 text-center text-muted-foreground">
                <Spinner className="mx-auto" size="small" />
                <p className="mt-2">{t('Chargement des articles...')}</p>
              </div>
            )}

            {!isLoading && articles.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                {searchTerm || ocrSearchTerm
                  ? t('Aucun article ne correspond à votre recherche') 
                  : t('Aucun article trouvé')}
              </div>
            )}
          </ScrollArea>

          {articles.length > 0 && (
            <div className="sticky bottom-0 bg-background pt-4 border-t">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t('Lignes par page')}
                  </span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="h-8 w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={goToPreviousPage}
                    disabled={page === 1}
                  >
                    <span className="sr-only">{t('Page précédente')}</span>
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
                    <span className="sr-only">{t('Page suivante')}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </ArticleActionsContext.Provider>
  );
};

export default ArticleList;