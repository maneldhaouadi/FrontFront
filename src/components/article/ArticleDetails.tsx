import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { api, article } from '@/api';
import { Article, ArticleCompareResponseDto, UpdateArticleDto, ArticleStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/common/Spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Image, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusOptions = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'archived', label: 'Archivé' },
  { value: 'out_of_stock', label: 'Rupture de stock' },
  { value: 'pending_review', label: 'En attente de revue' },
  { value: 'deleted', label: 'Supprimé' }
];

const CompareModal: React.FC<{
  file: File;
  fileType: 'image' | 'pdf';
  articleData: Article;
  onClose: () => void;
  open: boolean;
}> = ({ file, fileType, articleData, onClose, open }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [filePreview, setFilePreview] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ArticleCompareResponseDto | null>(null);
  const contentEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) return;
    
    if (fileType === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setFilePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview('/pdf-icon.png');
    }
  }, [file, fileType]);

  useEffect(() => {
    if (fileContent) {
      contentEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [fileContent]);

  const compareData = async () => {
    try {
      setIsProcessing(true);
      setFileContent('');
      setComparisonResult(null);
      
      const simulateTyping = async (text: string) => {
        for (let i = 0; i < text.length; i++) {
          setFileContent(prev => prev + text[i]);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      };

      await simulateTyping(`Comparison started with ${fileType === 'image' ? 'an image' : 'a PDF'}...\n\n`);

      const response = fileType === 'image' 
        ? await article.compareWithImage(articleData.id, file)
        : await article.compareWithPdf(articleData.id, file);
      
      setComparisonResult(response);

      await simulateTyping(`Comparison results:\n\n`);
      
      if (response.comparison) {
        await simulateTyping(`Title:\n`);
        await simulateTyping(`- Article: ${articleData.title}\n`);
        await simulateTyping(`- ${fileType === 'image' ? 'Image' : 'PDF'}: ${response.comparison.extractedData?.title || 'Not found'}\n`);
        await simulateTyping(`→ ${response.comparison.matches.title ? '✓ Match' : '✗ Different'}\n\n`);
        
        await simulateTyping(`Description:\n`);
        await simulateTyping(`- Article: ${articleData.description}\n`);
        await simulateTyping(`- ${fileType === 'image' ? 'Image' : 'PDF'}: ${response.comparison.extractedData?.description || 'Not found'}\n`);
        await simulateTyping(`→ ${response.comparison.matches.description ? '✓ Match' : '✗ Different'}\n\n`);
        
        if (response.comparison.fieldResults) {
          await simulateTyping(`Field differences details:\n`);
          for (const diff of response.comparison.fieldResults) {
            await simulateTyping(`- ${diff.field}:\n`);
            await simulateTyping(`  Article: ${diff.articleValue}\n`);
            await simulateTyping(`  ${fileType === 'image' ? 'Image' : 'PDF'}: ${diff.extractedValue}\n\n`);
          }
        }
      }
      
      await simulateTyping(`Comparison completed.\n`);
      
    } catch (error) {
      console.error('Comparison error:', error);
      setFileContent('Error during comparison');
      toast.error('Error during comparison');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()} className="max-w-6xl">
      <DialogContent className="max-w-[90vw] h-[80vh] flex p-0">
        <div className="flex-1 flex flex-col p-6 border-r">
          <DialogHeader className="mb-4">
            <DialogTitle>
              {fileType === 'image' ? 'Image Preview' : 'PDF Preview'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
            {filePreview ? (
              fileType === 'image' ? (
                <img 
                  src={filePreview} 
                  alt="Uploaded file" 
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4">
                  <img 
                    src={filePreview} 
                    alt="PDF icon" 
                    className="h-32 w-32 object-contain mb-4"
                  />
                  <p className="text-center font-medium">{file.name}</p>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <Spinner size="medium" show={true} />
              </div>
            )}
          </div>
          
          <div className="flex gap-2 justify-end mt-4">
            <Button 
              onClick={compareData} 
              disabled={isProcessing}
              className="min-w-32"
            >
              {isProcessing ? (
                <>
                  <Spinner size="small" show={true} className="mr-2" />
                  Processing...
                </>
              ) : (
                'Compare'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>Comparison Results</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto whitespace-pre-wrap font-mono">
            {fileContent || (
              <div className="text-gray-400 italic">
                {isProcessing ? 'Comparison in progress...' : 'No data to display'}
              </div>
            )}
            <div ref={contentEndRef} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ArticleDetails: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [articleDetails, setArticleDetails] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareFile, setCompareFile] = useState<File | null>(null);
  const [compareFileType, setCompareFileType] = useState<'image' | 'pdf'>('image');
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchArticleDetails = async () => {
      try {
        setLoading(true);
        const response = await article.findOne(Number(id));
        setArticleDetails(response);

        if (response.justificatifFile) {
          const blob = new Blob([response.justificatifFile.data], { type: response.justificatifMimeType });
          const url = URL.createObjectURL(blob);
          setFilePreview(url);
        }
      } catch (error) {
        setError('Could not fetch article details');
        toast.error('Error fetching article details');
      } finally {
        setLoading(false);
      }
    };

    fetchArticleDetails();
  }, [id]);

  const handleDownloadJustificatif = () => {
    if (!articleDetails?.justificatifFile) return;
    
    const blob = new Blob([articleDetails.justificatifFile.data], { 
      type: articleDetails.justificatifMimeType 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = articleDetails.justificatifFileName || 'justificatif';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleCompareWithImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setCompareFile(file);
        setCompareFileType('image');
        setCompareModalOpen(true);
      }
    };
    input.click();
  };

  const handleCompareWithPdf = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setCompareFile(file);
        setCompareFileType('pdf');
        setCompareModalOpen(true);
      }
    };
    input.click();
  };

  if (loading) return <Spinner size="medium" show={loading} />;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!articleDetails) return <p>No article found</p>;

  return (
    <div className="p-6 space-y-6">
      {compareModalOpen && compareFile && articleDetails && (
        <CompareModal
          file={compareFile}
          fileType={compareFileType}
          articleData={articleDetails}
          onClose={() => {
            setCompareModalOpen(false);
            setCompareFile(null);
          }}
          open={compareModalOpen}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Détails de l'article</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{
                backgroundColor: 
                  articleDetails.status === 'draft' ? '#6b7280' :
                  articleDetails.status === 'active' ? '#10b981' :
                  articleDetails.status === 'inactive' ? '#ef4444' :
                  articleDetails.status === 'archived' ? '#8b5cf6' :
                  articleDetails.status === 'out_of_stock' ? '#f59e0b' :
                  articleDetails.status === 'pending_review' ? '#3b82f6' :
                  '#9ca3af'
              }}></span>
              {statusOptions.find(opt => opt.value === articleDetails.status)?.label || articleDetails.status}
            </Badge>
            <Badge variant="outline">
              Version: {articleDetails.version}
            </Badge>
            <Badge variant="outline">
              Ref: {articleDetails.reference}
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleCompareWithPdf}
          >
            <FileText className="h-4 w-4" />
            Comparer avec PDF
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleCompareWithImage}
          >
            <Image className="h-4 w-4" />
            Comparer avec Image
          </Button>

          {articleDetails.justificatifFile && (
            <Button
              variant="outline"
              onClick={handleDownloadJustificatif}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titre</Label>
                    <Input
                      id="title"
                      value={articleDetails.title || ''}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={articleDetails.description || ''}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reference">Référence</Label>
                    <Input
                      id="reference"
                      value={articleDetails.reference}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={articleDetails.notes || ''}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="unitPrice">Prix unitaire</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      value={articleDetails.unitPrice}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantityInStock">Quantité en stock</Label>
                    <Input
                      id="quantityInStock"
                      type="number"
                      value={articleDetails.quantityInStock}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      type="number"
                      value={articleDetails.version || 1}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Statut</Label>
                    <div className="px-4 py-2 rounded-full bg-gray-100 inline-flex items-center">
                      <span className="h-2 w-2 rounded-full mr-2" style={{
                        backgroundColor: 
                          articleDetails.status === 'draft' ? '#6b7280' :
                          articleDetails.status === 'active' ? '#10b981' :
                          articleDetails.status === 'inactive' ? '#ef4444' :
                          articleDetails.status === 'archived' ? '#8b5cf6' :
                          articleDetails.status === 'out_of_stock' ? '#f59e0b' :
                          articleDetails.status === 'pending_review' ? '#3b82f6' :
                          '#9ca3af'
                      }}></span>
                      {statusOptions.find(opt => opt.value === articleDetails.status)?.label || articleDetails.status}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {articleDetails.justificatifFile && (
            <Card>
              <CardHeader>
                <CardTitle>Fichier justificatif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium">{articleDetails.justificatifFileName}</p>
                      <p className="text-sm text-gray-500">
                        {articleDetails.justificatifMimeType} • 
                        {(articleDetails.justificatifFileSize / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {filePreview && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(filePreview, '_blank')}
                      >
                        Prévisualiser
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDownloadJustificatif}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métadonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Créé le</Label>
                <p className="text-sm">
                  {format(new Date(articleDetails.createdAt), 'PPPp', { locale: fr })}
                </p>
              </div>
              <div>
                <Label>Modifié le</Label>
                <p className="text-sm">
                  {format(new Date(articleDetails.updatedAt), 'PPPp', { locale: fr })}
                </p>
              </div>
              {articleDetails.deletedAt && (
                <div>
                  <Label>Supprimé le</Label>
                  <p className="text-sm">
                    {format(new Date(articleDetails.deletedAt), 'PPPp', { locale: fr })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetails;