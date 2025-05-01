import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api, article } from '@/api';
import { CreateArticleDto } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/common/Spinner';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FileText, Image, Files } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileUploader } from '@/components/ui/file-uploader';

const ExtractFromFileModal: React.FC<{
  file: File;
  fileType: 'image' | 'pdf';
  onClose: () => void;
  open: boolean;
}> = ({ file, fileType, onClose, open }) => {
  const { t } = useTranslation('article');
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [filePreview, setFilePreview] = useState<string>('');
  const [extractedData, setExtractedData] = useState<CreateArticleDto | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
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
      reader.onerror = () => toast.error(t('article.file_preview_error'));
      reader.readAsDataURL(file);
    } else {
      setFilePreview('/pdf-icon.png');
    }
  }, [file, fileType, t]);

  useEffect(() => {
    contentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [fileContent]);

  const extractDataFromFile = async () => {
    try {
      setIsProcessing(true);
      setFileContent('');
      setExtractedData(null);
      
      const simulateTyping = async (text: string) => {
        for (let i = 0; i < text.length; i++) {
          setFileContent(prev => prev + text[i]);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      };

      await simulateTyping(`${t('article.extraction.starting')} ${fileType === 'image' ? t('article.extraction.from_image') : t('article.extraction.from_pdf')}\n\n`);

      const response = fileType === 'image' 
        ? await api.article.extractFromImage(file)
        : await api.article.extractFromPdf(file);
      
      if (!response?.data) {
        throw new Error(t('article.extraction.invalid_response'));
      }

      const data = response.data;
      setExtractedData(data);

      await simulateTyping(`${t('article.extraction.results')}\n\n`);
      
      await simulateTyping(`${t('article.attributes.title')}: ${data.title || '-'}\n`);
      await simulateTyping(`${t('article.attributes.reference')}: ${data.reference || '-'}\n`);
      await simulateTyping(`${t('article.attributes.unitPrice')}: ${data.unitPrice || 0}\n`);
      await simulateTyping(`${t('article.attributes.quantityInStock')}: ${data.quantityInStock || 0}\n`);
      await simulateTyping(`${t('article.attributes.status')}: ${data.status || 'active'}\n`);
      await simulateTyping(`${t('article.attributes.notes')}: ${data.notes || '-'}\n`);
      
      await simulateTyping(`\n${t('article.extraction.complete')}`);
      
    } catch (error) {
      console.error('Extraction error:', error);
      setFileContent(t('article.extraction.error'));
      toast.error(t('article.data_extraction_failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!extractedData) return;
    
    try {
      setIsProcessing(true);
      const result = await api.article.create(extractedData);
      
      if (result) {
        toast.success(t('article.action_create_success'));
        router.push('/article/article-Lists');
      } else {
        toast.error(t('article.action_create_failure'));
      }
    } catch (error) {
      console.error('Error creating article:', error);
      toast.error(t('article.action_create_failure'));
    } finally {
      setIsProcessing(false);
      setShowConfirmation(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()} className="max-w-6xl">
        <DialogContent className="max-w-[90vw] h-[80vh] flex p-0">
          <div className="flex-1 flex flex-col p-6 border-r">
            <DialogHeader className="mb-4">
              <DialogTitle>
                {fileType === 'image' 
                  ? t('article.extraction.image_preview') 
                  : t('article.extraction.pdf_preview')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
              {filePreview ? (
                fileType === 'image' ? (
                  <img 
                    src={filePreview} 
                    alt={t('article.extraction.uploaded_file')} 
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
                onClick={extractDataFromFile} 
                disabled={isProcessing}
                className="min-w-32"
              >
                {isProcessing ? (
                  <>
                    <Spinner size="small" show={true} className="mr-2" />
                    {t('article.extraction.processing')}
                  </>
                ) : (
                  t('article.extraction.extract_button')
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
              >
                {t('common.commands.cancel')}
              </Button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>{t('article.extraction.extracted_data')}</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto whitespace-pre-wrap font-mono">
              {fileContent || (
                <div className="text-gray-400 italic">
                  {isProcessing ? t('article.extraction.in_progress') : t('article.extraction.no_data')}
                </div>
              )}
              <div ref={contentEndRef} />
            </div>
            
            {extractedData && (
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={onClose}>
                  {t('article.extraction.dont_use')}
                </Button>
                <Button 
                  onClick={() => setShowConfirmation(true)}
                  disabled={isProcessing}
                >
                  {t('article.create_new_article')}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('article.confirmation.title')}</DialogTitle>
            <DialogDescription>
              {t('article.confirmation.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              {t('common.commands.cancel')}
            </Button>
            <Button 
              onClick={handleConfirmCreate}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Spinner size="small" show={true} className="mr-2" />
                  {t('common.commands.creating')}
                </>
              ) : (
                t('common.commands.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const CreateArticle: React.FC = () => {
  const { t: tCommon } = useTranslation('common');
  const { t: tArticle } = useTranslation('article');
  const router = useRouter();
  const { setRoutes } = useBreadcrumb();

  const [formData, setFormData] = useState<CreateArticleDto>({
    title: '',
    description: '',
    reference: '',
    unitPrice: 0,
    quantityInStock: 0,
    status: 'active',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState<'image' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image');
  const [extractionModalOpen, setExtractionModalOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [justificatifFile, setJustificatifFile] = useState<File | null>(null);

  useEffect(() => {
    setRoutes([
      { title: tCommon('menu.inventory'), href: '/article/article-Lists' },
      { title: tCommon('submenu.articles'), href: '/article/article-Lists' },
      { title: tCommon('commands.create') },
    ]);
  }, [router.locale, tCommon, setRoutes]);

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setFileLoading('image');
          setFileType('image');
          setUploadedFile(file);
          setExtractionModalOpen(true);
        } catch (error) {
          console.error('Error loading image:', error);
          toast.error(tArticle('article.image_upload_failed'));
          setFileLoading(null);
        }
      }
    };
    input.click();
  };

  const handlePdfUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setFileLoading('pdf');
          setFileType('pdf');
          setUploadedFile(file);
          setExtractionModalOpen(true);
        } catch (error) {
          console.error('Error loading PDF:', error);
          toast.error(tArticle('article.pdf_upload_failed'));
          setFileLoading(null);
        }
      }
    };
    input.click();
  };

  const handleJustificatifChange = (files: File[]) => {
    if (files.length > 0) {
      setJustificatifFile(files[0]);
      toast.success(tArticle('article.justificatif_uploaded'));
    } else {
      setJustificatifFile(null);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['unitPrice', 'quantityInStock'].includes(name) 
        ? Number(value) 
        : value
    }));
  };

  const validateForm = () => {
    if (!formData.reference.trim()) {
      setError(tArticle('article.validation.reference_required'));
      return false;
    }
    if (formData.unitPrice < 0 || formData.quantityInStock < 0) {
      setError(tArticle('article.validation.invalid_number'));
      return false;
    }
    setError(null);
    return true;
  };

  const handleConfirmCreate = async () => {
    setShowConfirmation(false);
    setLoading(true);
    
    try {
      const formDataToSend = {
        ...formData,
        justificatifFile: justificatifFile || undefined
      };

      const result = await api.article.create(formDataToSend);
      if (result) {
        toast.success(tArticle('article.action_create_success'));
        router.push('/article/article-Lists');
      } else {
        toast.error(tArticle('article.action_create_failure'));
      }
    } catch (error) {
      console.error('Error creating article:', error);
      setError(tArticle('article.action_create_failure'));
      toast.error(tArticle('article.action_create_failure'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setShowConfirmation(true);
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      reference: '',
      unitPrice: 0,
      quantityInStock: 0,
      status: 'active',
      notes: '',
    });
    setJustificatifFile(null);
    setError(null);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      {extractionModalOpen && uploadedFile && (
        <ExtractFromFileModal
          file={uploadedFile}
          fileType={fileType}
          onClose={() => {
            setExtractionModalOpen(false);
            setUploadedFile(null);
            setFileLoading(null);
          }}
          open={extractionModalOpen}
        />
      )}

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tArticle('article.confirmation.title')}</DialogTitle>
            <DialogDescription>
              {tArticle('article.confirmation.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              {tCommon('commands.cancel')}
            </Button>
            <Button 
              onClick={handleConfirmCreate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="small" show={true} className="mr-2" />
                  {tCommon('commands.creating')}
                </>
              ) : (
                tCommon('commands.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <div>
              <CardTitle>{tArticle('Créer un article')}</CardTitle>
              <CardDescription>{tArticle('Remplissez les détails du nouvel article')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleImageUpload}
                disabled={!!fileLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {fileLoading === 'image' ? (
                  <Spinner size="small" show={true} />
                ) : (
                  <Image className="h-4 w-4" />
                )}
                {tArticle('Extraire depuis image')}
              </Button>
              <Button 
                onClick={handlePdfUpload}
                disabled={!!fileLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {fileLoading === 'pdf' ? (
                  <Spinner size="small" show={true} />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {tArticle('Extraire depuis PDF')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">{tArticle('Titre')}</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder={tArticle('Titre de l\'article')}
                  />
                </div>

                <div>
                  <Label htmlFor="description">{tArticle('Description')}</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder={tArticle('description de l\'article')}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="reference">{tArticle('Référence')} *</Label>
                  <Input
                    id="reference"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    placeholder={tArticle('Référence de l\'article')}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="unitPrice">{tArticle('Prix unitaire')}</Label>
                  <Input
                    id="unitPrice"
                    name="unitPrice"
                    type="number"
                    min="0"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    placeholder={tArticle('Prix unitaire')}
                  />
                </div>

                <div>
                  <Label htmlFor="quantityInStock">{tArticle('Quantité en stock')}</Label>
                  <Input
                    id="quantityInStock"
                    name="quantityInStock"
                    type="number"
                    min="0"
                    value={formData.quantityInStock}
                    onChange={handleChange}
                    placeholder={tArticle('Quantité en stock')}
                  />
                </div>

                <div>
                  <Label htmlFor="status">{tArticle('Statut')}</Label>
                  <Select
                    name="status"
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tArticle('Sélectionner un statut')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{tArticle('Brouillon')}</SelectItem>
                      <SelectItem value="active">{tArticle('Actif')}</SelectItem>
                      <SelectItem value="inactive">{tArticle('Inactif')}</SelectItem>
                      <SelectItem value="archived">{tArticle('Archivé')}</SelectItem>
                      <SelectItem value="out_of_stock">{tArticle('Rupture de stock')}</SelectItem>
                      <SelectItem value="pending_review">{tArticle('En attente de revue')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Accordion type="single" collapsible className="w-full border rounded-lg">
                  <AccordionItem value="justificatif">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Files className="h-4 w-4" />
                        <Label className="font-normal">{tArticle('Justificatif')}</Label>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <FileUploader
                        accept={{
                          'image/*': [],
                          'application/pdf': [],
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
                          'application/msword': [],
                        }}
                        maxFileCount={1}
                        value={justificatifFile ? [justificatifFile] : []}
                        onValueChange={handleJustificatifChange}
                      />
                      {justificatifFile && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {tArticle('Fichier sélectionné')}: {justificatifFile.name}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{tArticle('Notes')}</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder={tArticle('Notes supplémentaires')}
                rows={3}
              />
            </div>

            {error && <div className="text-red-500 text-sm col-span-2">{error}</div>}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="small" show={true} className="mr-2" />
                    {tCommon('commands.creating')}
                  </>
                ) : (
                  tCommon('commands.create')
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={handleReset}>
                {tCommon('commands.reset')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateArticle;