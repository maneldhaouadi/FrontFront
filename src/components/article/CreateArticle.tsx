import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '@/api';
import { CreateArticleDto, ArticleExtractedData, ArticleStatus } from '@/types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Spinner } from '@/components/common/Spinner';
import { useBreadcrumb } from '@/components/layout/BreadcrumbContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PackagePlus, ImageIcon, FileTextIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

type FormTab = 'form' | 'review';

const CreateArticlePage = () => {
  const { t } = useTranslation('article');
  const router = useRouter();
  const { setRoutes } = useBreadcrumb();

  const [formData, setFormData] = useState<CreateArticleDto>({
    title: '',
    description: '',
    reference: 'REF-',
    unitPrice: 0,
    quantityInStock: 0,
    status: 'draft',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<ArticleExtractedData | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FormTab>('form');

  useEffect(() => {
    setRoutes([
      { title: t('Gestion des stocks'), href: '/articles' },
      { title: t('Liste des articles'), href: '/article/article-Lists' },
      { title: t('Nouvel article') },
    ]);
  }, [t, setRoutes]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Seuls ces deux champs sont obligatoires
    if (!formData.title.trim()) {
      newErrors.title = t('Le titre est obligatoire');
    } else if (formData.title.length > 100) {
      newErrors.title = t('Le titre ne doit pas dépasser 100 caractères');
    }

    if (!formData.reference.trim()) {
      newErrors.reference = t('La référence est obligatoire');
    } else if (!/^REF-\d{6}(-\d{3})?$/.test(formData.reference)) {
      newErrors.reference = t('Format invalide (ex: REF-123456-789)');
    }

    // Les champs suivants ne sont pas obligatoires mais ont des validations
    if (formData.unitPrice < 0) {
      newErrors.unitPrice = t('Le prix ne peut pas être négatif');
    } else if (formData.unitPrice > 1000000) {
      newErrors.unitPrice = t('Le prix est trop élevé');
    }

    if (formData.quantityInStock < 0) {
      newErrors.quantityInStock = t('La quantité ne peut pas être négative');
    } else if (formData.quantityInStock > 1000000) {
      newErrors.quantityInStock = t('La quantité est trop élevée');
    }

    if (formData.description.length > 1000) {
      newErrors.description = t('La description ne doit pas dépasser 1000 caractères');
    }

    if (formData.notes.length > 500) {
      newErrors.notes = t('Les notes ne doivent pas dépasser 500 caractères');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatReference = (value: string): string => {
    if (value.length < 4 && !value.startsWith('REF-')) {
      return 'REF-';
    }
    
    const baseValue = value.startsWith('REF-') ? value : `REF-${value}`;
    const numbersOnly = baseValue.replace(/[^0-9-]/g, '');
    
    let formattedValue = 'REF-';
    const cleanValue = numbersOnly.replace('REF-', '').replace(/-/g, '');
    
    if (cleanValue.length > 0) {
      formattedValue += cleanValue.substring(0, 6);
      if (cleanValue.length > 6) {
        formattedValue += `-${cleanValue.substring(6, 9)}`;
      }
    }
    
    return formattedValue;
  };

  const handleReferenceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatReference(e.target.value);
    setFormData(prev => ({ ...prev, reference: formattedValue }));
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: ['unitPrice', 'quantityInStock'].includes(name) 
          ? Number(value) || 0 
          : value
      }));
    },
    []
  );

  const handleStatusChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      status: value as ArticleStatus
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(t('Veuillez corriger les erreurs dans le formulaire'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const numericReference = formData.reference.replace('REF-', '').replace(/-/g, '');
      const formDataToSend = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formDataToSend.append(key, value.toString());
        }
      });

      const result = await api.article.create(formDataToSend);
      if (result) {
        toast.success(t('Article créé avec succès'));
        router.push('/article/article-Lists');
      }
    } catch (error) {
      console.error('Create article error:', error);
      toast.error(t('Erreur lors de la création de l\'article'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      reference: 'REF-',
      unitPrice: 0,
      quantityInStock: 0,
      status: 'draft',
      notes: '',
    });
    setErrors({});
    setOcrResult(null);
    setOcrError(null);
    setActiveTab('form');
  }, []);

  const handleExtractFromFile = useCallback(async (file: File, isPdf = false) => {
    setOcrLoading(true);
    setOcrError(null);
    
    try {
      let result: ArticleExtractedData;
      
      if (isPdf) {
        const response = await api.article.extractFromPdf(file);
        result = {
          reference: response.reference || '',
          title: response.title || '',
          description: response.description || '',
          unitPrice: typeof response.unitPrice === 'string' 
            ? parseFloat(response.unitPrice.replace(',', '.')) 
            : response.unitPrice || 0,
          quantityInStock: response.quantityInStock || 0,
          notes: response.notes || ''
        };
      } else {
        const response = await api.article.extractFromImage(file);
        result = response;
      }

      const formattedReference = result.reference 
        ? `REF-${result.reference.replace(/^REF-/, '').replace(/\s+/g, '-')}`
        : formData.reference;

      setOcrResult(result);
      setFormData(prev => ({
        ...prev,
        title: result.title || prev.title,
        reference: formattedReference,
        unitPrice: result.unitPrice || prev.unitPrice,
        description: result.description || prev.description,
        quantityInStock: result.quantityInStock || prev.quantityInStock,
        notes: result.notes || prev.notes,
      }));
      
      setActiveTab('review');
      toast.success(t('Informations extraites avec succès'));
    } catch (error: any) {
      console.error('Extraction Error:', error);
      const errorMessage = error.response?.data?.message 
        || error.message 
        || (isPdf 
          ? t('Erreur lors de l\'extraction des données PDF. Veuillez vérifier la qualité du document.')
          : t('Erreur lors de l\'extraction des données. Veuillez vérifier la qualité de l\'image.'));
      
      setOcrError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setOcrLoading(false);
    }
  }, [formData.reference, t]);

  const applyOcrResult = useCallback(() => {
    if (!ocrResult) return;
    
    setFormData(prev => ({
      ...prev,
      title: ocrResult.title || prev.title,
      reference: ocrResult.reference 
        ? `REF-${ocrResult.reference.replace(/^REF-/, '')}` 
        : prev.reference,
      unitPrice: ocrResult.unitPrice || prev.unitPrice,
      description: ocrResult.description || prev.description,
      quantityInStock: ocrResult.quantityInStock || prev.quantityInStock,
      notes: ocrResult.notes || prev.notes,
    }));
    
    setActiveTab('form');
    toast.success(t('Informations appliquées avec succès'));
  }, [ocrResult, t]);

  const handleFileUpload = useCallback(
    (type: 'image' | 'pdf') => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        handleExtractFromFile(e.target.files[0], type === 'pdf');
      }
    },
    [handleExtractFromFile]
  );

  return (
    <Card className="flex flex-col h-[calc(100vh-180px)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackagePlus className="h-5 w-5" />
          {t('Nouvel article')}
        </CardTitle>
        <CardDescription>
          {t('Remplissez les champs ci-dessous pour créer un nouvel article')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          <TabsList className="grid grid-cols-2 w-[400px] mb-4">
            <TabsTrigger value="form">{t('Formulaire')}</TabsTrigger>
            <TabsTrigger value="review" disabled={!ocrResult}>
              {t('Revue OCR')}
              {ocrResult && <Badge className="ml-2" variant="secondary">Nouveau</Badge>}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-4 mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={ocrLoading}
              className="flex items-center gap-2"
            >
              {ocrLoading ? (
                <Spinner className="mr-2" size="small" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              {t('Extraire depuis image')}
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
              className="flex items-center gap-2"
            >
              {ocrLoading ? (
                <Spinner className="mr-2" size="small" />
              ) : (
                <FileTextIcon className="h-4 w-4" />
              )}
              {t('Extraire depuis PDF')}
              <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload('pdf')}
                className="hidden"
              />
            </Button>
          </div>

          {ocrError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {ocrError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden relative">
              <TabsContent value="form" className="h-full absolute inset-0">
                <ScrollArea className="h-full pr-4 pb-24">
                  <div className="space-y-8 pb-8">
                    <div className="space-y-6">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {t('Informations générales')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="title">{t('Titre')} *</Label>
                            <Input
                              id="title"
                              name="title"
                              value={formData.title}
                              onChange={handleChange}
                              placeholder={t('Nom de l\'article')}
                              className="h-10"
                            />
                            {errors.title && (
                              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
                            )}
                          </div>
                          
                          <div>
                            <Label htmlFor="description">{t('Description')}</Label>
                            <Textarea
                              id="description"
                              name="description"
                              value={formData.description}
                              onChange={handleChange}
                              rows={4}
                              placeholder={t('Description détaillée de l\'article')}
                            />
                            {errors.description && (
                              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="reference">{t('Référence')} *</Label>
                            <Input
                              id="reference"
                              name="reference"
                              value={formData.reference}
                              onChange={handleReferenceChange}
                              placeholder="REF-123456-789"
                              className="h-10"
                            />
                            {errors.reference ? (
                              <p className="text-xs text-red-500 mt-1">{errors.reference}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">
                                {t('Format: REF-123456-789')}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <Label htmlFor="status">{t('Statut')}</Label>
                            <Select
                              value={formData.status}
                              onValueChange={handleStatusChange}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder={t('Sélectionner un statut')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">{t('Brouillon')}</SelectItem>
                                <SelectItem value="active">{t('Actif')}</SelectItem>
                                <SelectItem value="inactive">{t('Inactif')}</SelectItem>
                                <SelectItem value="archived">{t('Archivé')}</SelectItem>
                                <SelectItem value="out_of_stock">{t('En rupture')}</SelectItem>
                                <SelectItem value="pending_review">{t('En revue')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {t('Tarification et stock')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="unitPrice">{t('Prix unitaire')}</Label>
                          <Input
                            id="unitPrice"
                            name="unitPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.unitPrice}
                            onChange={handleChange}
                            placeholder={t('Prix en euros')}
                            className="h-10"
                          />
                          {errors.unitPrice && (
                            <p className="text-xs text-red-500 mt-1">{errors.unitPrice}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="quantityInStock">{t('Quantité en stock')}</Label>
                          <Input
                            id="quantityInStock"
                            name="quantityInStock"
                            type="number"
                            min="0"
                            value={formData.quantityInStock}
                            onChange={handleChange}
                            placeholder={t('Nombre disponible')}
                            className="h-10"
                          />
                          {errors.quantityInStock && (
                            <p className="text-xs text-red-500 mt-1">{errors.quantityInStock}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {t('Informations complémentaires')}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="notes">{t('Notes internes')}</Label>
                          <Textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            placeholder={t('Informations supplémentaires pour votre équipe')}
                          />
                          {errors.notes && (
                            <p className="text-xs text-red-500 mt-1">{errors.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="review" className="h-full absolute inset-0">
                <ScrollArea className="h-full pr-4 pb-24">
                  <div className="space-y-8 pb-8">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {t('Résultats de l\'extraction OCR')}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label>{t('Titre extrait')}</Label>
                            <div className="p-3 border rounded-md bg-gray-50">
  {ocrResult?.title || t('Aucun titre détecté')}
</div>
                          </div>
                          
                          <div>
                            <Label>{t('Description extraite')}</Label>
                            <div className="p-3 border rounded-md bg-gray-50 min-h-[100px]">
                              {ocrResult?.description || t('Aucune description détectée')}
                            </div>
                          </div>
                          
                          <div>
                            <Label>{t('Notes extraites')}</Label>
                            <div className="p-3 border rounded-md bg-gray-50 min-h-[60px]">
                              {ocrResult?.notes || t('Aucune note détectée')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label>{t('Référence extraite')}</Label>
                            <div className="p-3 border rounded-md bg-gray-50">
                              {ocrResult?.reference || t('Aucune référence détectée')}
                            </div>
                          </div>
                          
                          <div>
                            <Label>{t('Prix unitaire extrait')}</Label>
                            <div className="p-3 border rounded-md bg-gray-50">
                              {ocrResult?.unitPrice ? `${ocrResult.unitPrice.toFixed(2)} €` : t('Aucun prix détecté')}
                            </div>
                          </div>
                          
                          <div>
                            <Label>{t('Quantité extraite')}</Label>
                            <div className="p-3 border rounded-md bg-gray-50">
                              {ocrResult?.quantityInStock || t('Aucune quantité détectée')}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-4 pt-6">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setActiveTab('form')}
                          className="h-10 px-6"
                        >
                          {t('Annuler')}
                        </Button>
                        <Button 
                          type="button" 
                          onClick={applyOcrResult}
                          className="h-10 px-6"
                        >
                          {t('Appliquer les modifications')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>

            <div className="sticky bottom-0 bg-background pt-6 pb-6 border-t mt-auto">
              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleReset}
                  className="h-10 px-6"
                >
                  {t('Réinitialiser')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="h-10 px-6"
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2" size="small" />
                      {t('Enregistrement...')}
                    </>
                  ) : t('Enregistrer l\'article')}
                </Button>
              </div>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CreateArticlePage;