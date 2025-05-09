import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArticleQuotationEntry, Currency, ExpenseQuotationTaxEntry, Tax, Article, ExpenseArticleQuotationEntry } from '@/types';
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
import { ExpenseInvoiceTaxEntries } from '../../expense_invoice/form/ExpenseInvoiceTaxEntries';

interface ExpenseQuotationArticleItemProps {
  className?: string;
  article: ExpenseArticleQuotationEntry;
  onChange: (item:ExpenseArticleQuotationEntry) => void;
  showDescription?: boolean;
  currency?: Currency;
  taxes: Tax[];
  edit?: boolean;
  articles?: Article[];
  existingEntries?: ExpenseArticleQuotationEntry[] | { id: string; article?: Article }[]; // Modification ici

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
  existingEntries = [], // Ajoutez cette ligne avec une valeur par défaut
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
        setArticles(response.data);
      } catch (error) {
        setFormError('Impossible de récupérer les articles. Veuillez réessayer plus tard.');
        toast.error('Erreur lors de la récupération des articles');
      } finally {
        setLoading(false);
      }
    };
  
    if (useExistingArticle && articles.length === 0) {
      fetchArticles();
    }
  }, [useExistingArticle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    
    if (!isExistingArticleSelected && newTitle) {
      const isDuplicate = existingEntries.some(entry => {
        const entryTitle = entry.article?.title ?? (entry as any)?.title;
        return entryTitle?.toLowerCase() === newTitle.toLowerCase();
      });
  
      if (isDuplicate) {
        toast.error(tInvoicing('quotation.errors.article_already_exists'));
        return;
      }
    }
    const currentArticle = article?.article || {
      id: 0,
      title: '',
      description: '',
      reference: '',
      quantityInStock: 1, // Valeur par défaut à 1 au lieu de 0
      status: 'draft',
      version: 0,
      unitPrice: article.unit_price || 0, // Utilise le prix unitaire saisi
      notes: '',
      isDeletionRestricted: false
    };
  
    onChange({
      ...article,
      article: {
        ...currentArticle,
      title: newTitle,
        unitPrice: article.unit_price || 0, // Maintient le prix unitaire
        quantityInStock: article.quantity || 1 // Maintient la quantité
      },
      quantity: article.quantity || 1,
      orderedQuantity: article.orderedQuantity || 0,
      originalStock: article.originalStock || 0,
      unit_price: article.unit_price || 0
    });
  };

  const handleSelectArticle = async (value: string) => {
    const selectedArticle = articles.find((art) => art.id === parseInt(value));
    if (selectedArticle) {
      try {
        // Vérifier si un article avec le même titre existe déjà dans la liste
        const isDuplicate = existingEntries.some(entry => {
          const entryTitle = entry.article?.title ?? (entry as any)?.title;
          return entryTitle?.toLowerCase() === selectedArticle.title?.toLowerCase();
        });
  
        if (isDuplicate) {
          toast.error(tInvoicing('quotation.errors.article_already_exists'));
          return;
        }
  
        if (selectedArticle.quantityInStock <= 0) {
          setQuantityError(tInvoicing('quotation.errors.quantity_unavailable'));
          toast.error(tInvoicing('quotation.errors.quantity_unavailable'));
          return;
        }
        
        const unitPrice = Math.round(Number(selectedArticle.unitPrice)) || 0;
        
        onChange({
          ...article,
          article: {
            ...selectedArticle,
            title: selectedArticle.title || '',
            description: selectedArticle.description || '',
            reference: selectedArticle.reference || '',
            quantityInStock: selectedArticle.quantityInStock,
            status: selectedArticle.status || 'draft',
            version: selectedArticle.version || 0,
            unitPrice: unitPrice,
          },
          quantity: 1,
          orderedQuantity: 1,
          originalStock: selectedArticle.quantityInStock,
          unit_price: unitPrice
        });
        
        setIsExistingArticleSelected(true);
        setQuantityError(null);
      } catch (error) {
        console.error('Error selecting article:', error);
        toast.error(tInvoicing('quotation.errors.article_selection_failed'));
      }
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
          isDeletionRestricted: false
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
      isDeletionRestricted: false
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
          setQuantityError(tInvoicing('quotation.errors.quantity_exceeds', { 
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
        id: 0, // Valeur par défaut obligatoire
        title: '',
        description: '',
        reference: '',
        quantityInStock: newQuantity,
        status: 'draft',
        version: 0,
        unitPrice: 0,
        notes: '',
        isDeletionRestricted: false
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
        id: 0, // Valeur par défaut obligatoire
        title: '',
        description: '',
        reference: '',
        quantityInStock: 1,
        status: 'draft',
        version: 0,
        unitPrice: newUnitPrice,
        notes: '',
        isDeletionRestricted: false
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
      toast.warning(tInvoicing('quotation.errors.surpassed_tax_limit'));
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

  const selectedTaxIds = article.articleExpensQuotationEntryTaxes?.map((t) => t.tax?.id) || [];

  return (
    <div className={cn('flex flex-row items-center gap-6 h-full', className)}>
      <div className="w-9/12">
        <div className="flex flex-row gap-2 my-1">
          {/* Title */}
          <div className="w-3/5">
            <Label className="mx-1">{tInvoicing('article.attributes.title')}</Label>
            {edit ? (
              <div className="flex flex-col gap-2">
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
                {useExistingArticle ? (
                  <Select onValueChange={handleSelectArticle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un article" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Rechercher un article..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      
                      {loading ? (
                        <SelectItem value="loading" disabled>
                          Chargement...
                        </SelectItem>
                      ) : articles.length > 0 ? (
                        articles
                          .filter(article => 
                            article?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (article.reference && article.reference.toLowerCase().includes(searchQuery.toLowerCase()))
                          )
                          .map((art) => (
                            <SelectItem 
                              key={art.id} 
                              value={art.id.toString()}
                              disabled={art.quantityInStock <= 0}
                            >
                              {art.title} {art.reference ? `(${art.reference})` : ''}
                              {art.quantityInStock <= 0 && ` (${tInvoicing('quotation.errors.out_of_stock')})`}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="no-articles" disabled>
                          Aucun article disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Saisissez un titre"
                    value={article.article?.title}
                    onChange={handleTitleChange}
                    disabled={isExistingArticleSelected}
                  />
                )}
              </div>
            ) : (
              <UneditableInput value={article.article?.title} />
            )}
          </div>
          {/* Quantity */}
          <div className="w-1/5">
            <Label className="mx-1">{tInvoicing('article.attributes.quantity')}</Label>
            {edit ? (
              <div className="flex flex-col">
                <Input
  type="number"
  placeholder="0"
  value={article.quantity}
  onChange={handleQuantityChange}
  min={1}
  max={isExistingArticleSelected ? article.originalStock : undefined}
/>
                {quantityError && (
                  <span className="text-red-500 text-xs mt-1">{quantityError}</span>
                )}
                {isExistingArticleSelected && article.originalStock !== undefined && (
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    <div>
                      {tInvoicing('original_stock')}: {article.originalStock}
                    </div>
                    <div>
                      {tInvoicing('ordered_quantity')}: {article.orderedQuantity || 0}
                    </div>
                    <div>
                      {tInvoicing('remaining_stock')}: {article.originalStock - (article.orderedQuantity || 0)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <UneditableInput value={article.quantity} />
            )}
          </div>
          {/* Price */}
          <div className="w-1/5">
            <Label className="mx-1">{tInvoicing('article.attributes.unit_price')}</Label>
            <div className="flex items-center gap-2">
              {edit ? (
                <Input
                  type="number"
                  placeholder="0"
                  value={article.unit_price}
                  onChange={handleUnitPriceChange}
                  disabled={isExistingArticleSelected}
                />
              ) : (
                <UneditableInput value={article.unit_price} />
              )}
              <Label className="font-bold mx-1">{currency?.symbol}</Label>
            </div>
          </div>
        </div>
        <div>
          {showDescription && (
            <div>
              {edit ? (
                <>
                  <Label className="mx-1">{tInvoicing('article.attributes.description')}</Label>
                  <Textarea
                    placeholder="Description"
                    className="resize-none"
                    value={article.article?.description}
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
                      value={article.article?.description}
                      className="resize-none"
                      rows={3 + (article?.articleExpensQuotationEntryTaxes?.length || 0)}
                    />
                  </>
                )
              )}
            </div>
          )}
        </div>
      </div>
      <div className="w-3/12 flex flex-col h-full">
        {/* Taxes */}
        <div className="my-auto">
          <Label className="block my-3">{tInvoicing('article.attributes.taxes')}</Label>
          <ExpenseInvoiceTaxEntries
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

        {/* Discount */}
        <div className="my-auto py-5">
          <Label className="mx-1">{tInvoicing('quotation.attributes.discount')}</Label>
          <div className="flex items-center gap-2">
            {edit ? (
              <Input
                className="w-1/2"
                type="number"
                placeholder="0"
                value={article.discount}
                onChange={handleDiscountChange}
              />
            ) : (
              <UneditableInput className="w-1/2" value={article.discount || '0'} />
            )}
            {edit ? (
              <Select
                onValueChange={handleDiscountTypeChange}
                defaultValue={
                  article.discount_type === DISCOUNT_TYPE.PERCENTAGE ? 'PERCENTAGE' : 'AMOUNT'
                }>
                <SelectTrigger className="w-1/2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">%</SelectItem>
                  <SelectItem value="AMOUNT">{currency?.symbol || '$'}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <UneditableInput
                className="w-1/2 font-bold mx-1"
                value={
                  article.discount_type === DISCOUNT_TYPE.PERCENTAGE ? '%' : currency?.symbol || '$'
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="w-2/12 text-center flex flex-col justify-between h-full gap-12 mx-4">
        <div className="flex flex-col gap-2 my-auto">
          <Label className="font-bold mx-1">{tInvoicing('article.attributes.tax_excluded')}</Label>
          <Label>
            {article?.subTotal?.toFixed(digitAfterComma)} {currencySymbol}
          </Label>
        </div>
        <div className="flex flex-col gap-2 my-auto">
          <Label className="font-bold mx-1">{tInvoicing('article.attributes.tax_included')}</Label>
          <Label>
            {article?.total?.toFixed(digitAfterComma)} {currencySymbol}
          </Label>
        </div>
      </div>
    </div>
  );
};