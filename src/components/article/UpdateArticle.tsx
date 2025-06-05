import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api, article } from '@/api';
import { Article, UpdateArticleDto, ArticleStatus, ArticleExtractedData } from '@/types';
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
import { PackagePlus, ImageIcon, FileTextIcon, Save, X, Check, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import axios, { AxiosError } from 'axios';

type FormTab = 'form' | 'review';

const statusOptions = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'archived', label: 'Archivé' },
  { value: 'out_of_stock', label: 'Rupture de stock' }
] as const;

interface FieldDifference {
  field: keyof UpdateArticleDto;
  currentValue: any;
  extractedValue: any;
  selected?: boolean;
}

const ArticleEdit: React.FC = () => {
  const { t } = useTranslation('article');
  const router = useRouter();
  const { id } = router.query;
  const { setRoutes } = useBreadcrumb();

  const [articleDetails, setArticleDetails] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateArticleDto>({
    title: '',
    description: '',
    reference: 'REF-',
    quantityInStock: 0,
    status: 'draft',
    unitPrice: 0,
    notes: '',
    version: 1
  });

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<ArticleExtractedData | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FormTab>('form');
  const [differences, setDifferences] = useState<FieldDifference[]>([]);

  useEffect(() => {
    if (!id) return;

    setRoutes([
      { title: t('Gestion des stocks'), href: '/articles' },
      { title: t('Liste des articles'), href: '/article/article-Lists' },
      { title: t('Modifier l\'article') },
    ]);

    const fetchArticleDetails = async () => {
      try {
        setLoading(true);
        const response = await article.findOne(Number(id));
        setArticleDetails(response);
        setFormData({
          title: response.title || '',
          description: response.description || '',
          reference: response.reference ? `REF-${response.reference}` : 'REF-',
          quantityInStock: Number(response.quantityInStock) || 0,
          status: response.status,
          unitPrice: Number(response.unitPrice) || 0,
          notes: response.notes || '',
          version: Number(response.version) || 1
        });
      } catch (error) {
        setError(t('Error fetching article details'));
        toast.error(t('Error fetching article details'));
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleDetails();
  }, [id, t, setRoutes]);

  const formatReference = useCallback((value: string): string => {
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
  }, []);

  const handleReferenceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatReference(e.target.value);
    setFormData(prev => ({ ...prev, reference: formattedValue }));
  }, [formatReference]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: ['unitPrice', 'quantityInStock', 'version'].includes(name) 
          ? Number(value) || 0 
          : value
      }));
    },
    []
  );

  const handleStatusChange = (value: ArticleStatus) => {
    setFormData(prev => ({
      ...prev,
      status: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error(t('Le titre est obligatoire'));
      return false;
    }
    if (!formData.reference.trim() || formData.reference === 'REF-') {
      toast.error(t('La référence est obligatoire'));
      return false;
    }
    if (formData.unitPrice < 0) {
      toast.error(t('Le prix unitaire doit être positif'));
      return false;
    }
    if (formData.quantityInStock < 0) {
      toast.error(t('La quantité en stock doit être positive'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !id) return;

    try {
      setSubmitting(true);

      const numericReference = formData.reference.replace('REF-', '').replace('-', '');
      const payload = {
        ...formData,
        reference: numericReference,
        quantityInStock: Number(formData.quantityInStock),
        unitPrice: Number(formData.unitPrice),
        version: Number(formData.version)
      };

      const updatedArticle = await api.article.update(Number(id), payload);
      setArticleDetails(updatedArticle);
      toast.success(t('Article mis à jour avec succès'));
      router.push(`/article/article-details/${id}`);
    } catch (error) {
      const err = error as AxiosError;
      const errorMessage = err.response?.data?.message || t('Échec de la mise à jour');
      console.error('Update error details:', err.response?.data);
      toast.error(`Erreur: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm(t('Voulez-vous vraiment annuler les modifications non enregistrées ?'))) {
      router.push(`/article/article-details/${id}`);
    }
  };

  const findDifferences = useCallback((currentData: UpdateArticleDto, extractedData: ArticleExtractedData): FieldDifference[] => {
    const diffs: FieldDifference[] = [];
    
    const fieldsToCompare: (keyof UpdateArticleDto)[] = [
      'title', 'description', 'reference', 'unitPrice', 
      'quantityInStock', 'status', 'notes'
    ];

    fieldsToCompare.forEach(field => {
      const currentValue = currentData[field];
      let extractedValue = extractedData[field as keyof ArticleExtractedData];

      if (typeof currentValue === 'string' && typeof extractedValue === 'string') {
        extractedValue = extractedValue.trim();
      }

      if (['unitPrice', 'quantityInStock'].includes(field)) {
        if (Math.abs(Number(currentValue) - Number(extractedValue)) > 0.01) {
          diffs.push({
            field,
            currentValue,
            extractedValue,
            selected: field === 'reference'
          });
        }
      } 
      else if (JSON.stringify(currentValue) !== JSON.stringify(extractedValue)) {
        diffs.push({
          field,
          currentValue,
          extractedValue,
          selected: field === 'reference'
        });
      }
    });

    return diffs;
  }, []);

  const handleExtractFromFile = useCallback(async (file: File, isPdf = false) => {
    setOcrLoading(true);
    setOcrError(null);
    
    try {
      const result = isPdf 
        ? await api.article.extractFromPdf(file)
        : await api.article.extractFromImage(file);
      
      const formattedReference = result.reference 
        ? `REF-${result.reference.replace(/^REF-/, '').replace(/^PROD-/, '')}`
        : formData.reference;

      const extractedData: ArticleExtractedData = {
        ...result,
        reference: formattedReference,
        title: result.title || file.name.replace(/\.[^/.]+$/, ""),
        unitPrice: Number(result.unitPrice) || 0,
        quantityInStock: Number(result.quantityInStock) || 0,
        description: result.description || '',
        notes: result.notes || ''
      };

      setOcrResult(extractedData);
      const diffs = findDifferences(formData, extractedData);
      setDifferences(diffs);
      
      setActiveTab('review');
      toast.success(t('Informations extraites avec succès'));
    } catch (error) {
      console.error('Extraction Error:', error);
      setOcrError(
        isPdf 
          ? t('Erreur lors de l\'extraction des données PDF. Veuillez vérifier la qualité du document.')
          : t('Erreur lors de l\'extraction des données. Veuillez vérifier la qualité de l\'image.')
      );
      toast.error(t('Erreur lors de l\'extraction des données'));
    } finally {
      setOcrLoading(false);
    }
  }, [formData, t, findDifferences]);

  const applyFieldValue = useCallback((field: keyof UpdateArticleDto, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: ['unitPrice', 'quantityInStock'].includes(field) 
        ? Number(value) || 0 
        : value
    }));
  }, []);

  const toggleFieldSelection = useCallback((index: number) => {
    setDifferences(prev => {
      const newDiffs = [...prev];
      newDiffs[index].selected = !newDiffs[index].selected;
      return newDiffs;
    });
  }, []);

  const applyAllNewValues = useCallback(() => {
    setFormData(prev => {
      const newData = { ...prev };
      differences.forEach(diff => {
        newData[diff.field] = ['unitPrice', 'quantityInStock'].includes(diff.field)
          ? Number(diff.extractedValue) || 0
          : diff.extractedValue;
      });
      return newData;
    });
    toast.success(t('Toutes les nouvelles valeurs ont été appliquées'));
    setActiveTab('form');
  }, [differences, t]);

  const applySelectedValues = useCallback(() => {
    setFormData(prev => {
      const newData = { ...prev };
      differences.forEach(diff => {
        if (diff.selected) {
          newData[diff.field] = ['unitPrice', 'quantityInStock'].includes(diff.field)
            ? Number(diff.extractedValue) || 0
            : diff.extractedValue;
        }
      });
      return newData;
    });
    toast.success(t('Les valeurs sélectionnées ont été appliquées'));
    setActiveTab('form');
  }, [differences, t]);

  const handleFileUpload = useCallback(
    (type: 'image' | 'pdf') => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        handleExtractFromFile(e.target.files[0], type === 'pdf');
      }
    },
    [handleExtractFromFile]
  );

  if (loading) return <Spinner size="medium" show={loading} />;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!articleDetails) return <p>{t('Aucun article trouvé')}</p>;

  return (
    <Card className="flex flex-col h-[calc(100vh-180px)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackagePlus className="h-5 w-5" />
          {t('Modifier l\'article')}
        </CardTitle>
        <CardDescription>
          {t('Modifiez les champs ci-dessous pour mettre à jour l\'article')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{
                  backgroundColor: 
                    formData.status === 'draft' ? '#6b7280' :
                    formData.status === 'active' ? '#10b981' :
                    formData.status === 'inactive' ? '#ef4444' :
                    formData.status === 'archived' ? '#8b5cf6' :
                    formData.status === 'out_of_stock' ? '#f59e0b' :
                    '#9ca3af'
                }}></span>
                {statusOptions.find(opt => opt.value === formData.status)?.label || formData.status}
              </Badge>
              <Badge variant="outline">
                {t('Version')}: {formData.version}
              </Badge>
              <Badge variant="outline">
                {t('Ref')}: {formData.reference}
              </Badge>
            </div>

            <TabsList className="grid grid-cols-2 w-[400px]">
              <TabsTrigger value="form">{t('Formulaire')}</TabsTrigger>
              <TabsTrigger value="review" disabled={!ocrResult}>
                {t('Revue OCR')}
                {ocrResult && <Badge className="ml-2" variant="secondary">{t('Nouveau')}</Badge>}
              </TabsTrigger>
            </TabsList>
          </div>

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
                  <ArticleForm 
                    formData={formData} 
                    onChange={handleChange}
                    onReferenceChange={handleReferenceChange}
                    onStatusChange={handleStatusChange}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="review" className="h-full absolute inset-0">
                <ScrollArea className="h-full pr-4 pb-24">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">
                      {t('Comparaison des données')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('Sélectionnez quelle version vous souhaitez conserver pour chaque champ')}
                    </p>

                    {differences.length === 0 ? (
                      <div className="p-4 border rounded-md bg-gray-50 text-center">
                        {t('Aucune différence détectée')}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {differences.map((diff, index) => (
                          <div key={`${diff.field}-${index}`} className="border rounded-md p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`select-${diff.field}-${index}`}
                                  checked={diff.selected || false}
                                  onCheckedChange={() => toggleFieldSelection(index)}
                                />
                                <Label htmlFor={`select-${diff.field}-${index}`} className="font-medium capitalize cursor-pointer">
                                  {t(diff.field)}
                                </Label>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => applyFieldValue(diff.field, diff.currentValue)}
                                  className="h-8 px-3"
                                >
                                  <ChevronsLeft className="h-3 w-3 mr-1" />
                                  {t('Ancien')}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => applyFieldValue(diff.field, diff.extractedValue)}
                                  className="h-8 px-3"
                                >
                                  <ChevronsRight className="h-3 w-3 mr-1" />
                                  {t('Nouveau')}
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="border rounded-md p-3 bg-gray-50">
                                <h4 className="text-sm font-medium mb-2">{t('Valeur actuelle')}</h4>
                                <div className="whitespace-pre-wrap break-words text-sm">
                                  {String(diff.currentValue || t('Aucune valeur'))}
                                </div>
                              </div>
                              <div className="border rounded-md p-3 bg-blue-50">
                                <h4 className="text-sm font-medium mb-2">{t('Valeur extraite')}</h4>
                                <div className="whitespace-pre-wrap break-words text-sm">
                                  {String(diff.extractedValue || t('Aucune valeur'))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="flex justify-end gap-4 pt-6">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={applySelectedValues}
                              disabled={!differences.some(d => d.selected)}
                              className="h-9 px-4 text-sm"
                            >
                              <Check className="h-3 w-3 mr-2" />
                              {t('Appliquer sélection')}
                            </Button>
                            <Button
                              variant="default"
                              onClick={applyAllNewValues}
                              className="h-9 px-4 text-sm"
                            >
                              <Check className="h-3 w-3 mr-2" />
                              {t('Tout appliquer')}
                            </Button>
                          </div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setActiveTab('form')}
                            className="h-9 px-4 text-sm"
                          >
                            {t('Retour')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>

            <div className="sticky bottom-0 bg-background pt-6 pb-6 border-t mt-auto">
              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  className="h-10 px-6"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('Annuler')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="h-10 px-6"
                >
                  {submitting ? (
                    <>
                      <Spinner className="mr-2" size="small" />
                      {t('Enregistrement...')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('Enregistrer les modifications')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

interface ArticleFormProps {
  formData: UpdateArticleDto;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onReferenceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (value: ArticleStatus) => void;
}

const ArticleForm: React.FC<ArticleFormProps> = ({
  formData,
  onChange,
  onReferenceChange,
  onStatusChange
}) => {
  const { t } = useTranslation('article');

  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('Informations générales')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">{t('Titre')}*</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={onChange}
                placeholder={t('Nom de l\'article')}
                className="h-10"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">{t('Description')}</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={onChange}
                rows={4}
                placeholder={t('Description détaillée de l\'article')}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reference">{t('Référence')}*</Label>
              <Input
                id="reference"
                name="reference"
                value={formData.reference}
                onChange={onReferenceChange}
                placeholder="REF-123456-789"
                className="h-10"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('Format: REF-123456-789')}
              </p>
            </div>
            
            <div>
              <Label htmlFor="status">{t('Statut')}</Label>
              <Select
                value={formData.status}
                onValueChange={onStatusChange}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('Sélectionner un statut')} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
            <Label htmlFor="unitPrice">{t('Prix unitaire')}*</Label>
            <Input
              id="unitPrice"
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.unitPrice}
              onChange={onChange}
              placeholder={t('Prix en euros')}
              className="h-10"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="quantityInStock">{t('Quantité en stock')}*</Label>
            <Input
              id="quantityInStock"
              name="quantityInStock"
              type="number"
              min="0"
              value={formData.quantityInStock}
              onChange={onChange}
              placeholder={t('Nombre disponible')}
              className="h-10"
              required
            />
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
              onChange={onChange}
              rows={3}
              placeholder={t('Informations supplémentaires pour votre équipe')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleEdit;