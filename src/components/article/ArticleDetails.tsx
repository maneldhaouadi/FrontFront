import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { api, article } from '@/api';
import { Article, ArticleCompareResponseDto, UpdateArticleDto, ArticleStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/common/Spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Edit, Save, X, FileText, Image } from 'lucide-react';

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
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<UpdateArticleDto>({
    title: '',
    description: '',
    reference: '',
    quantityInStock: 0,
    status: 'draft',
    unitPrice: 0,
  });
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareFile, setCompareFile] = useState<File | null>(null);
  const [compareFileType, setCompareFileType] = useState<'image' | 'pdf'>('image');

  useEffect(() => {
    if (!id) return;

    const fetchArticleDetails = async () => {
      try {
        const response = await article.findOne(Number(id));
        setArticleDetails(response);
        setFormData({
          title: response.title || '',
          description: response.description || '',
          reference: response.reference,
          quantityInStock: response.quantityInStock,
          status: response.status,
          unitPrice: response.unitPrice,
        });
      } catch (error) {
        setError('Could not fetch article details');
        toast.error('Error fetching article details');
      } finally {
        setLoading(false);
      }
    };

    fetchArticleDetails();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantityInStock' || name === 'unitPrice'
        ? Number(value)
        : value,
    }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      status: e.target.value as ArticleStatus,
    }));
  };

  const toggleEditMode = () => {
    setIsEditing(prev => !prev);
    if (isEditing && articleDetails) {
      setFormData({
        title: articleDetails.title || '',
        description: articleDetails.description || '',
        reference: articleDetails.reference,
        quantityInStock: articleDetails.quantityInStock,
        status: articleDetails.status,
        unitPrice: articleDetails.unitPrice,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: UpdateArticleDto = {
        ...formData,
        quantityInStock: Number(formData.quantityInStock),
        unitPrice: Number(formData.unitPrice),
      };

      const updatedArticle = await api.article.update(Number(id), payload);
      setArticleDetails(updatedArticle);
      setFormData({
        title: updatedArticle.title || '',
        description: updatedArticle.description || '',
        reference: updatedArticle.reference,
        quantityInStock: updatedArticle.quantityInStock,
        status: updatedArticle.status,
        unitPrice: updatedArticle.unitPrice,
      });
      setIsEditing(false);
      toast.success('Article updated successfully');
    } catch (error) {
      console.error('Error updating article:', error);
      toast.error('Error updating article');
    }
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
    <div className="p-6 bg-white rounded-lg shadow-sm">
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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Article Details</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleCompareWithPdf}
          >
            <FileText className="h-4 w-4" />
            Compare with PDF
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleCompareWithImage}
          >
            <Image className="h-4 w-4" />
            Compare with Image
          </Button>

          <Button
            variant={isEditing ? 'secondary' : 'default'}
            onClick={toggleEditMode}
            className="flex items-center gap-2"
          >
            {isEditing ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                Edit
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    className={!isEditing ? 'bg-gray-100' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    className={!isEditing ? 'bg-gray-100' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    name="reference"
                    value={formData.reference}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    className={!isEditing ? 'bg-gray-100' : ''}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <Input
                    id="unitPrice"
                    name="unitPrice"
                    type="number"
                    value={formData.unitPrice}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    className={!isEditing ? 'bg-gray-100' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="quantityInStock">Quantity in Stock</Label>
                  <Input
                    id="quantityInStock"
                    name="quantityInStock"
                    type="number"
                    value={formData.quantityInStock}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    className={!isEditing ? 'bg-gray-100' : ''}
                  />
                </div>
                <div>
  <Label htmlFor="status">Status</Label>
  {isEditing ? (
    <select
      id="status"
      name="status"
      value={formData.status}
      onChange={handleStatusChange}
      className="w-full p-2 border rounded-full bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      {statusOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ) : (
    <div className="px-4 py-2 rounded-full bg-gray-100 inline-flex items-center">
      <span className="h-2 w-2 rounded-full mr-2" style={{
        backgroundColor: 
          formData.status === 'draft' ? '#6b7280' :
          formData.status === 'active' ? '#10b981' :
          formData.status === 'inactive' ? '#ef4444' :
          formData.status === 'archived' ? '#8b5cf6' :
          formData.status === 'out_of_stock' ? '#f59e0b' :
          formData.status === 'pending_review' ? '#3b82f6' :
          '#9ca3af'
      }}></span>
      {statusOptions.find(opt => opt.value === formData.status)?.label || formData.status}
    </div>
  )}
</div>
              </div>
            </div>
            {isEditing && (
              <div className="flex justify-end">
                <Button type="submit" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArticleDetails;