import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Currency, ExpenseQuotationTaxEntry, Tax, Article, ExpenseArticleQuotationEntry, PagedArticle, ArticleStatus } from '@/types';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { DISCOUNT_TYPE } from '@/types/enums/discount-types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';
import { UneditableInput } from '@/components/ui/uneditable/uneditable-input';
import { api } from '@/api';
import { Checkbox } from '@/components/ui/checkbox';
import { QuotationTaxEntries } from './ExpenseQuotationTaxEntries';
import { Button } from '@/components/ui/button';


interface ExpenseQuotationArticleItemProps {
  className?: string;
  article: ExpenseArticleQuotationEntry;
  onChange: (item: ExpenseArticleQuotationEntry) => void;
  showDescription?: boolean;
  currency?: Currency;
  taxes: Tax[];
  edit?: boolean;
  articles?: Article[];
  existingEntries?: (ExpenseArticleQuotationEntry | { id: string; article?: Article })[];
}

export const ExpenseQuotationArticleItem: React.FC<ExpenseQuotationArticleItemProps> = ({
  className,
  article,
  onChange,
  taxes,
  currency,
  showDescription = false,
  edit = true,
  articles: propArticles = [],
  existingEntries = [],
}) => {
  const { t: tInvoicing } = useTranslation('invoicing');
  const [articles, setArticles] = useState<Article[]>(propArticles);
  const [loading, setLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [useExistingArticle, setUseExistingArticle] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [isExistingArticleSelected, setIsExistingArticleSelected] = useState<boolean>(false);


  const digitAfterComma = currency?.digitAfterComma || 3;
  const currencySymbol = currency?.symbol || '$';

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setFormError(null);
      try {
        const response = await api.article.findPaginated(1, 100, 'ASC', 'title');
        
        let articlesData: Article[] = [];
        if (Array.isArray(response)) {
          articlesData = response;
        } else if (response && 'data' in response && Array.isArray(response.data)) {
          articlesData = response.data;
        } else if (response && 'data' in response && Array.isArray((response as PagedArticle).data)) {
          articlesData = (response as PagedArticle).data;
        } else {
          console.error('Unexpected response format:', response);
          setFormError('Invalid articles data format');
        }
        
        const availableArticles = articlesData.filter(article => 
          article.status !== 'out_of_stock' && article.quantityInStock > 0
        );
        
        setArticles(availableArticles);
      } catch (error) {
        setFormError('Failed to fetch articles. Please try again later.');
        console.error('Error fetching articles:', error);
        toast.error('Error fetching articles');
      } finally {
        setLoading(false);
      }
    };

    if (useExistingArticle) {
      fetchArticles();
    }
  }, [useExistingArticle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value.trim();
    
    if (!newTitle) {
      toast.error(tInvoicing('quotation.errors.title_required'));
      return;
    }
    
    if (!isExistingArticleSelected) {
      const isDuplicate = existingEntries.some(entry => {
        const entryTitle = entry.article?.title ?? (entry as any)?.title;
        return entryTitle?.toLowerCase() === newTitle.toLowerCase();
      });

      if (isDuplicate) {
        toast.error("Cet article existe déjà dans la liste");
        return;
      }
    }

    const updatedArticle = {
      ...(article.article || createNewArticle()),
      title: newTitle,
      quantityInStock: article.quantity || 1,
      unitPrice: article.unit_price || 0
    };

    onChange({
      ...article,
      article: updatedArticle,
      quantity: article.quantity || 1,
      orderedQuantity: article.orderedQuantity || 0,
      originalStock: article.originalStock || 0,
      unit_price: article.unit_price || 0
    });
  };

  const createNewArticle = (): Article => ({
  id: 0,
  title: '',
  description: '',
  reference: generateRandomReference(), // Ajout de la référence générée
  quantityInStock: 1,
  status: 'draft',
  version: 0,
  unitPrice: 0,
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeletionRestricted: false
});

 const handleSelectArticle = async (value: string) => {
  console.log('Selected article ID:', value);
  if (!value) return;

  try {
    const selectedArticle = articles.find((art) => art.id === parseInt(value));
    console.log('Found article:', selectedArticle);

    if (!selectedArticle) {
      toast.error(tInvoicing('Article non trouvé'));
      return;
    }

    // Vérifier si l'article est déjà dans la liste
    const isAlreadyAdded = existingEntries.some(entry => {
      const entryId = entry.article?.id || (entry as any)?.articleId;
      return entryId === selectedArticle.id && entry.id !== article.id;
    });

    if (isAlreadyAdded) {
      toast.error(tInvoicing('Cet article a déjà été ajouté'));
      return;
    }

    // Vérifier la disponibilité
    if (selectedArticle.quantityInStock <= 0) {
      setQuantityError("Stock insuffisant");
toast.error("Stock insuffisant"); return;
    }

    // Mettre à jour l'article sélectionné
    onChange({
      ...article,
      articleId: selectedArticle.id,
      article: selectedArticle,
      quantity: 1,
      orderedQuantity: 1,
      originalStock: selectedArticle.quantityInStock,
      unit_price: selectedArticle.unitPrice || 0,
      reference: selectedArticle.reference
    });

    setIsExistingArticleSelected(true);
    setQuantityError(null);
  } catch (error) {
    console.error('Error selecting article:', error);
toast.error("Échec de la sélection de l'article");
  }
};

const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newReference = e.target.value.trim().toUpperCase();
  
  // Vérification du format
  if (newReference && !newReference.match(/^REF-\d{6}-\d{3}$/)) {
    toast.error("Le format de référence doit être REF-123456-789");
    return;
  }

  // Vérification de l'unicité
  const isDuplicate = existingEntries.some(entry => {
    const entryRef = entry.article?.reference ?? (entry as any)?.reference;
    return entryRef?.toUpperCase() === newReference && entry.id !== article.id;
  });

  if (isDuplicate) {
    toast.error("Cette référence existe déjà");
    return;
  }

  onChange({
    ...article,
    article: {
      ...(article.article || createNewArticle()),
      reference: newReference
    },
    reference: newReference
  });
};

const generateUniqueReference = (existingRefs: string[] = []): string => {
  let newRef: string;
  let attempts = 0;
  const maxAttempts = 100; // Limite pour éviter les boucles infinies

  do {
    newRef = generateRandomReference();
    attempts++;
    
    if (attempts >= maxAttempts) {
      throw new Error("Impossible de générer une référence unique après plusieurs tentatives");
    }
  } while (existingRefs.includes(newRef));

  return newRef;
};
const handleGenerateReference = () => {
  // Récupérer toutes les références existantes
  const existingRefs = [
    ...existingEntries.map(entry => entry.article?.reference || (entry as any)?.reference),
    ...articles.map(art => art.reference)
  ].filter(Boolean); // Filtrer les valeurs nulles/undefined

  try {
    const newRef = generateUniqueReference(existingRefs);
    onChange({
      ...article,
      article: {
        ...(article.article || createNewArticle()),
        reference: newRef
      },
      reference: newRef
    });
  } catch (error) {
    toast.error("Échec de génération d'une référence unique");
    console.error(error);
  }
};
  const handleUseExistingArticleChange = (checked: boolean) => {
  setUseExistingArticle(checked);
  if (!checked) {
    setIsExistingArticleSelected(false);
    onChange({
      ...article,
      article: {
        id: 0,
        title: '',
        description: '',
        reference: '',
        quantityInStock: 0,
        status: 'draft',
        version: 0,
        unitPrice: 0,
        notes: '',
        createdAt: new Date(), // Add this
        updatedAt: new Date(), // Add this
        // Optional properties can be omitted or set to undefined
        deletedAt: undefined,
        isDeletionRestricted: undefined
      },
      quantity: 1,
      orderedQuantity: 0,
      originalStock: 0,
      unit_price: 0
    });
  }
};

const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const currentArticle = article?.article || {
    id: 0,
    title: '',
    description: '',
    reference: '',
    quantityInStock: 0,
    status: 'draft',
    version: 0,
    unitPrice: 0,
    notes: '',
    createdAt: new Date(), // Add this required property
    updatedAt: new Date(), // Add this required property
    // Optional properties can be omitted or set to undefined
    deletedAt: undefined,
    isDeletionRestricted: undefined,
    justificatifFile: undefined,
    justificatifFileName: undefined,
    justificatifMimeType: undefined,
    justificatifFileSize: undefined,
    history: undefined
  };

  onChange({
    ...article,
    article: {
      ...currentArticle,
      description: e.target.value,
    }
  });
};

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = e.target.value;
    const regex = new RegExp(`^\\d*(\\.\\d{0,${digitAfterComma}})?$`);
    
    if (quantity.match(regex)) {
      const newQuantity = parseFloat(quantity);
      
      if (isExistingArticleSelected && article.originalStock !== undefined) {
        if (newQuantity > article.originalStock) {
          setQuantityError(tInvoicing('cette quantité dépasse la quantité disponible.', { 
            available: article.originalStock 
          }));
          return;
        }
        setQuantityError(null);
      }
      
      const updatedArticle = article.article ? {
        ...article.article,
        quantityInStock: newQuantity
      } : {
        id: 0,
        title: '',
        description: '',
        reference: '',
        quantityInStock: newQuantity,
        status: 'draft' as ArticleStatus, // Explicitly type as ArticleStatus
        version: 0,
        unitPrice: 0,
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeletionRestricted: false,
        // Optional properties
        deletedAt: undefined,
        justificatifFile: undefined,
        justificatifFileName: undefined,
        justificatifMimeType: undefined,
        justificatifFileSize: undefined,
        history: undefined
      };
      
      onChange({
        ...article,
        quantity: newQuantity,
        orderedQuantity: newQuantity,
        article: updatedArticle
      });
    }
  };

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const unit_price = e.target.value;
    const regex = new RegExp(`^\\d*(\\.\\d{0,${digitAfterComma}})?$`);
    if (unit_price.match(regex)) {
      const newUnitPrice = parseFloat(unit_price);
      
      const updatedArticle = article.article ? {
        ...article.article,
        unitPrice: newUnitPrice
      } : {
        id: 0,
        title: '',
        description: '',
        reference: '',
        quantityInStock: 1,
        status: 'draft' as ArticleStatus, // Explicit type assertion
        version: 0,
        unitPrice: newUnitPrice,
        notes: '',
        createdAt: new Date(), // Required property
        updatedAt: new Date(), // Required property
        isDeletionRestricted: false,
        // Optional properties
        deletedAt: undefined,
        justificatifFile: undefined,
        justificatifFileName: undefined,
        justificatifMimeType: undefined,
        justificatifFileSize: undefined,
        history: undefined
      };
      
      onChange({
        ...article,
        unit_price: newUnitPrice,
        article: updatedArticle
      });
    }
  };
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const discount = e.target.value;
    const { discount_type } = article;

    if (discount_type === DISCOUNT_TYPE.PERCENTAGE) {
      const percentage = parseFloat(discount);
      onChange({
        ...article,
        discount: percentage,
      });
    } else if (discount_type === DISCOUNT_TYPE.AMOUNT) {
      const regex = new RegExp(`^\\d*(\\.\\d{0,${digitAfterComma}})?$`);
      if (regex.test(discount)) {
        onChange({
          ...article,
          discount: parseFloat(discount),
        });
      }
    }
  };

  const handleDiscountTypeChange = (value: string) => {
    onChange({
      ...article,
      discount_type: value === 'PERCENTAGE' ? DISCOUNT_TYPE.PERCENTAGE : DISCOUNT_TYPE.AMOUNT,
      discount: 0
    });
  };

  const handleTaxChange = (value: string, index: number) => {
    const selectedTax = taxes.find((tax) => tax.id === parseInt(value));
    const updatedTaxes = [...(article.articleExpensQuotationEntryTaxes || [])];
    if (selectedTax) {
      updatedTaxes[index] = { tax: selectedTax };
    } else {
      updatedTaxes.splice(index, 1);
    }
    onChange({ ...article, articleExpensQuotationEntryTaxes: updatedTaxes });
  };

  const handleTaxDelete = (index: number) => {
    const updatedTaxes = article.articleExpensQuotationEntryTaxes?.filter((_, i) => i !== index);
    onChange({ ...article, articleExpensQuotationEntryTaxes: updatedTaxes });
  };

  const handleAddTax = () => {
    if ((article.articleExpensQuotationEntryTaxes?.length || 0) >= taxes.length) {
toast.warning("Nombre maximum de taxes atteint");
      return;
    }
    onChange({
      ...article,
      articleExpensQuotationEntryTaxes: [
        ...(article.articleExpensQuotationEntryTaxes || []),
        {} as ExpenseQuotationTaxEntry,
      ],
    });
  };

  const generateRandomReference = () => {
  const firstPart = Math.floor(100000 + Math.random() * 900000); // 6 chiffres
  const secondPart = Math.floor(100 + Math.random() * 900); // 3 chiffres
  return `REF-${firstPart}-${secondPart}`;
};

useEffect(() => {
  if (!article.reference || !article.reference.match(/^REF-\d{6}-\d{3}$/)) {
    // Récupérer toutes les références existantes
    const existingRefs = [
      ...existingEntries.map(entry => entry.article?.reference || (entry as any)?.reference),
      ...articles.map(art => art.reference)
    ].filter(Boolean);

    try {
      const newRef = generateUniqueReference(existingRefs);
      const updatedArticle = {
        ...article,
        article: {
          ...(article.article || createNewArticle()),
          reference: newRef
        },
        reference: newRef
      };
      onChange(updatedArticle);
    } catch (error) {
      console.error("Failed to generate unique reference:", error);
      // Vous pourriez aussi afficher un message à l'utilisateur ici
    }
  }
}, []);


  const selectedTaxIds = article.articleExpensQuotationEntryTaxes?.map((t) => t.tax?.id) || [];

  


 return (
    <div className={cn('flex flex-row items-center gap-6 h-full', className)}>
      <div className="w-9/12">
        <div className="flex flex-row gap-2 my-1">
          {/* Title and Reference Section */}
          <div className="w-3/5">
            <div className="flex flex-col gap-2">
              {/* Article Type Selection */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-existing-article"
                  checked={useExistingArticle}
                  onCheckedChange={handleUseExistingArticleChange}
                />
                <Label htmlFor="use-existing-article">
                  {tInvoicing('Article existant')}
                </Label>
              </div>
  
              {/* Reference Field */}
              {/* Reference Field */}

{/* Reference Field */}
{/* Reference Field */}
{/* Reference Field */}
<div className="flex flex-col gap-1 mb-2">
  <Label className="mx-1">Référence</Label>
  <div className="flex gap-2">
    {useExistingArticle ? (
      <UneditableInput 
        value={article.article?.reference || ''} 
        placeholder="Référence de l'article existant"
        className="flex-1"
      />
    ) : (
      <>
        <Input
          placeholder="REF-123456-789"
          value={article.article?.reference || article.reference || ''}
          onChange={handleReferenceChange}
          pattern="^REF-\d{6}-\d{3}$"
          title="Format: REF-123456-789"
          disabled={isExistingArticleSelected}
          className="flex-1"
        />
        <Button 
          type="button"
          variant="outline"
          onClick={handleGenerateReference}
          className="whitespace-nowrap"
          disabled={useExistingArticle || isExistingArticleSelected}
        >
          {tInvoicing('generate_reference')}
        </Button>
      </>
    )}
  </div>
</div>
              
  
              {/* Title Field */}
              <div className="flex flex-col gap-1">
                <Label className="mx-1">{tInvoicing('title')}</Label>
                {useExistingArticle ? (
                <Select onValueChange={handleSelectArticle}>
  <SelectTrigger>
    <SelectValue placeholder={tInvoicing('select_placeholder')} />
  </SelectTrigger>
  <SelectContent>
    <div className="p-2">
      <Input
        placeholder={tInvoicing('search_placeholder')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
    
    {loading ? (
      <SelectItem value="loading" disabled>
        {tInvoicing('common.loading')}
      </SelectItem>
    ) : articles.length > 0 ? (
      articles
        .filter(art => 
          art?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art?.reference?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map((art) => (
          <SelectItem 
            key={art.id} 
            value={art.id.toString()}
            // Only disable if out of stock
            disabled={art.status === 'out_of_stock' || art.quantityInStock <= 0}
          >
            <div className="flex flex-col">
              <span>{art.title || 'Untitled'}</span>
              {art.reference && (
                <span className="text-xs text-muted-foreground">
                  {art.reference}
                </span>
              )}
              {(art.status === 'out_of_stock' || art.quantityInStock <= 0) && (
                <span className="text-xs text-orange-500">
                  {tInvoicing('out_of_stock')}
                </span>
              )}
            </div>
          </SelectItem>
        ))
    ) : (
      <SelectItem value="no-articles" disabled>
        {tInvoicing('article.no_articles')}
      </SelectItem>
    )}
  </SelectContent>
</Select>
                ) : (
                  <Input
                    placeholder={tInvoicing('title_placeholder')}
                    value={article.article?.title || ''}
                    onChange={handleTitleChange}
                  />
                )}
              </div>
            </div>
          </div>
  
          {/* Quantity Section */}
          {/* Quantity Section */}
<div className="w-1/5">
  <Label className="mx-1">{tInvoicing('article.attributes.quantity')}</Label>
  {edit ? (
    <div className="flex flex-col">
      <Input
        type="number"
        placeholder="0"
        value={article.quantity || ''}
        onChange={handleQuantityChange}
        min={1}
        max={isExistingArticleSelected ? article.originalStock : undefined}
        className={quantityError ? 'border-red-500' : ''}
      />
      {quantityError && (
        <span className="text-red-500 text-xs mt-1">{quantityError}</span>
      )}
      {isExistingArticleSelected && article.originalStock !== undefined && (
        <div className="text-xs text-muted-foreground mt-1 space-y-1">
          <div>
            {tInvoicing('original_stock')}: {article.originalStock}
          </div>
          <div>
            {tInvoicing('ordered_quantity')}: {article.orderedQuantity || 0}
          </div>
          <div>
            {tInvoicing('remaining_stock')}: {Math.max(0, article.originalStock - (article.orderedQuantity || 0))}
          </div>
        </div>
      )}
    </div>
  ) : (
    <UneditableInput value={article.quantity?.toString() || '0'} />
  )}
</div>
  
          {/* Price Section */}
          <div className="w-1/5">
            <Label className="mx-1">{tInvoicing('article.attributes.unit_price')}</Label>
            <div className="flex items-center gap-2">
              {edit ? (
                <Input
                  type="number"
                  placeholder="0"
                  value={article.unit_price || ''}
                  onChange={handleUnitPriceChange}
                  disabled={isExistingArticleSelected}
                />
              ) : (
                <UneditableInput value={article.unit_price?.toString() || '0'} />
              )}
              <Label className="font-bold">{currency?.symbol}</Label>
            </div>
          </div>
        </div>
  
        {/* Description Section */}
        {showDescription && (
          <div className="mt-2">
            {edit ? (
              <>
                <Label className="mx-1">{tInvoicing('article.attributes.description')}</Label>
                <Textarea
                  placeholder={tInvoicing('description_placeholder')}
                  className="resize-none"
                  value={article.article?.description || ''}
                  onChange={handleDescriptionChange}
                  rows={3}
                  disabled={isExistingArticleSelected}
                />
              </>
            ) : (
              article.article?.description && (
                <>
                  <Label className="mx-1">{tInvoicing('article.attributes.description')}</Label>
                  <Textarea
                    disabled
                    value={article.article.description}
                    className="resize-none"
                    rows={3 + (article?.articleExpensQuotationEntryTaxes?.length || 0)}
                  />
                </>
              )
            )}
          </div>
        )}
      </div>
  
      {/* Taxes and Discount Section */}
      <div className="w-3/12 flex flex-col h-full">
        <div className="my-auto">
          <Label className="block my-3">{tInvoicing('article.attributes.taxes')}</Label>
          <QuotationTaxEntries
            article={article}
            taxes={taxes}
            selectedTaxIds={selectedTaxIds}
            currency={currency}
            handleTaxAdd={handleAddTax}
            handleTaxChange={handleTaxChange}
            handleTaxDelete={handleTaxDelete}
            edit={edit}
          />
        </div>
  
        <div className="my-auto py-5">
          <Label className="mx-1">{tInvoicing('quotation.attributes.discount')}</Label>
          <div className="flex items-center gap-2">
            {edit ? (
              <>
                <Input
                  className="w-1/2"
                  type="number"
                  placeholder="0"
                  value={article.discount || ''}
                  onChange={handleDiscountChange}
                />
                <Select
                  onValueChange={handleDiscountTypeChange}
                  value={article.discount_type || DISCOUNT_TYPE.AMOUNT}
                >
                  <SelectTrigger className="w-1/2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DISCOUNT_TYPE.PERCENTAGE}>%</SelectItem>
                    <SelectItem value={DISCOUNT_TYPE.AMOUNT}>{currency?.symbol || '$'}</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <UneditableInput className="w-1/2" value={article.discount?.toString() || '0'} />
                <UneditableInput
                  className="w-1/2 font-bold"
                  value={article.discount_type === DISCOUNT_TYPE.PERCENTAGE ? '%' : currency?.symbol || '$'}
                />
              </>
            )}
          </div>
        </div>
      </div>
  
      {/* Totals Section */}
      <div className="w-2/12 text-center flex flex-col justify-between h-full gap-12 mx-4">
        <div className="flex flex-col gap-2 my-auto">
          <Label className="font-bold">{tInvoicing('article.attributes.tax_excluded')}</Label>
          <Label className="text-lg">
            {article?.subTotal?.toFixed(digitAfterComma)} {currencySymbol}
          </Label>
        </div>
        <div className="flex flex-col gap-2 my-auto">
          <Label className="font-bold">{tInvoicing('article.attributes.tax_included')}</Label>
          <Label className="text-lg">
            {article?.total?.toFixed(digitAfterComma)} {currencySymbol}
          </Label>
        </div>
      </div>
    </div>
  );
};