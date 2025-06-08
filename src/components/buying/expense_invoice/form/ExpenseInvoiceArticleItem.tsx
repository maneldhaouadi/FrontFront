import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/components/ui/select';
import { DISCOUNT_TYPE } from '@/types/enums/discount-types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';
import { UneditableInput } from '@/components/ui/uneditable/uneditable-input';
import { ExpenseArticleInvoiceEntry, ExpenseInvoiceTaxEntry } from '@/types/expense_invoices';
import { Article, Currency, ExpenseArticleQuotationEntry, Tax } from '@/types';
import { ExpenseInvoiceTaxEntries } from './ExpenseInvoiceTaxEntries';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/api';
import { Button } from '@/components/ui/button';

interface ExpenseInvoiceArticleItemProps {
  className?: string;
  article: ExpenseArticleInvoiceEntry;
  onChange: (item: ExpenseArticleInvoiceEntry) => void;
  showDescription?: boolean;
  currency?: Currency;
  taxes: Tax[];
  edit?: boolean;
  articles?: Article[];
  onSelectQuotation?: (quotationId: number) => Promise<void>;
  quotationArticles?: ExpenseArticleQuotationEntry[];

}





export const ExpenseInvoiceArticleItem: React.FC<ExpenseInvoiceArticleItemProps> = ({
  className,
  article,
  onChange,
  taxes,
  currency,
  showDescription = false,
  edit = true,
  articles: propArticles = []
}) => {
  const { t: tInvoicing } = useTranslation('invoicing');

  const [articles, setArticles] = useState<Article[]>(propArticles);
  const [loading, setLoading] = useState<boolean>(false);
  const [useExistingArticle, setUseExistingArticle] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExistingArticle, setIsExistingArticle] = useState<boolean>(false);

  const digitAfterComma = currency?.digitAfterComma || 3;
  const currencySymbol = currency?.symbol || '$';
  const [availableQuantity, setAvailableQuantity] = useState<number | null>(null);

 useEffect(() => {
  const fetchArticles = async () => {
    setLoading(true);
    try {
      const articles = await api.article.findPaginated(1, 100, 'ASC', 'title');
      setArticles(articles || []);
    } catch (error) {
      console.error("Fetch articles error:", error);
      toast.error(tInvoicing('error.loading_articles'));
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  if (useExistingArticle) {
    fetchArticles();
  } else {
    setArticles([]);
  }
}, [useExistingArticle, tInvoicing]);  const handleReferenceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Si l'utilisateur essaie de supprimer le préfixe REF-, on le remet
    if (!value.startsWith('REF-')) {
      value = 'REF-' + value.replace(/^REF-/, '');
    }
    
    // On ne garde que les chiffres après le préfixe
    const numbersPart = value.replace(/^REF-/, '');
    const cleanValue = 'REF-' + numbersPart.replace(/\D/g, '');
    
    // Validation du format (REF- suivi de 1 à 9 chiffres)
    if (numbersPart.length > 0 && !/^\d{1,9}$/.test(numbersPart)) {
      toast.error(tInvoicing('invalid_reference_format'));
      return;
    }
  
    const updatedArticle = {
      ...article,
      article: {
        ...(article.article || {
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
        }),
        reference: cleanValue
      }
    };
  
    if (cleanValue && article.article?.reference !== cleanValue) {
      try {
        const existingArticle = await api.article.findOneByReference(cleanValue);
        if (existingArticle) {
          if (article.quantity ?? 0 > existingArticle.quantityInStock) {
            toast.error(tInvoicing('insufficient_quantity'));
            return;
          }
          setAvailableQuantity(existingArticle.quantityInStock);
          setIsExistingArticle(true);
        }
      } catch (error) {
        console.error('Error checking article reference', error);
      }
    }
  
    onChange(updatedArticle);
  };

  const generateReference = async () => {
    let generatedReference = '';
    let referenceExists = true;
    let attempts = 0;
    const maxAttempts = 5;

    while (referenceExists && attempts < maxAttempts) {
      const timestamp = Date.now().toString().slice(-6);
      const randomNum = Math.floor(100 + Math.random() * 900);
      generatedReference = `REF-${timestamp}${randomNum}`;

      try {
        const response = await api.article.findOneByReference(generatedReference);
        referenceExists = !!response;
        attempts++;
      } catch (error) {
        referenceExists = false;
      }
    }

    if (referenceExists) {
      toast.error(tInvoicing('article.errors.generation_failed'));
      return;
    }

    onChange({
      ...article,
      reference: generatedReference,
      article: {
        ...(article.article || {
          id: 0,
          title: '',
          description: '',
          quantityInStock: 0,
          status: 'draft',
          version: 0,
          unitPrice: 0,
          notes: '',
          isDeletionRestricted: false
        }),
        reference: generatedReference
      }
    });
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedArticle = {
      ...article,
      article: {
        ...(article.article || {
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
        }),
        title: e.target.value,
        version: (article.article?.version || 0) + 1
      },
      updatedAt: new Date().toISOString()
    };
    onChange(updatedArticle);
  };

  const handleSelectArticle = async (value: string) => {
  if (value === 'disabled' || value === 'loading' || value === 'no-articles') return;
  
  try {
    const selectedArticle = articles.find((art) => art.id === parseInt(value));
    if (!selectedArticle) {
      toast.error(tInvoicing('article.errors.not_found'));
      return;
    }

    setAvailableQuantity(selectedArticle.quantityInStock);
    setIsExistingArticle(true);
    
    const unitPrice = selectedArticle.unitPrice || 0;
    
    onChange({
      ...article,
      article: {
        ...selectedArticle,
        unitPrice: unitPrice
      },
      quantity: Math.min(article.quantity || 1, selectedArticle.quantityInStock || 1),
      unit_price: unitPrice,
      reference: selectedArticle.reference || ''
    });
  } catch (error) {
    console.error("Error selecting article:", error);
    toast.error(tInvoicing('article.errors.selection_failed'));
  }
};


  const handleUseExistingArticleChange = (checked: boolean) => {
    setUseExistingArticle(checked);
    setIsExistingArticle(false);
    
    if (!checked) {
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
        unit_price: 0
      });
    }
  };

  const handleArticleUpdate = (field: keyof Article, value: any) => {
    if (!article.article) {
      const newArticle = {
        id: 0,
        title: '',
        description: '',
        reference: '',
        quantityInStock: 0,
        status: 'draft',
        version: 0,
        unitPrice: 0,
        notes: '',
        isDeletionRestricted: false,
        [field]: value
      };
      onChange({
        ...article,
        article: newArticle
      });
      return;
    }
  
    onChange({
      ...article,
      article: {
        ...article.article,
        [field]: value
      }
    });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedArticle = {
      ...article,
      article: {
        ...(article.article || {
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
        }),
        description: e.target.value,
        version: (article.article?.version || 0) + 1
      },
      updatedAt: new Date().toISOString()
    };
    onChange(updatedArticle);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = e.target.value;
    const regex = new RegExp(`^\\d*(\\.\\d{0,${digitAfterComma}})?$`);
    
    if (quantity.match(regex)) {
      const quantityNum = parseFloat(quantity);
      
      if (availableQuantity !== null && quantityNum > availableQuantity) {
        toast.error(tInvoicing('quantité insuffisante', {
          available: availableQuantity,
          requested: quantityNum
        }));
        return;
      }
      
      onChange({
        ...article,
        quantity: quantityNum
      });
    }
  };

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const unitPrice = e.target.value;
    const regex = new RegExp(`^\\d*(\\.\\d{0,${digitAfterComma}})?$`);
    if (unitPrice.match(regex)) {
      onChange({
        ...article,
        unit_price: parseFloat(unitPrice)
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
        discount: percentage
      });
    } else if (discount_type === DISCOUNT_TYPE.AMOUNT) {
      const regex = new RegExp(`^\\d*(\\.\\d{0,${digitAfterComma}})?$`);
      if (regex.test(discount)) {
        onChange({
          ...article,
          discount: parseFloat(discount)
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
    const updatedTaxes = [...(article.expenseArticleInvoiceEntryTaxes || [])];
    if (selectedTax) {
      updatedTaxes[index] = { tax: selectedTax };
    } else {
      updatedTaxes.splice(index, 1);
    }
    onChange({ ...article, expenseArticleInvoiceEntryTaxes: updatedTaxes });
  };

  const handleTaxDelete = (index: number) => {
    const updatedTaxes = article.expenseArticleInvoiceEntryTaxes?.filter((_, i) => i !== index);
    onChange({ ...article, expenseArticleInvoiceEntryTaxes: updatedTaxes });
  };

  const handleAddTax = () => {
    if ((article.expenseArticleInvoiceEntryTaxes?.length || 0) >= taxes.length) {
      toast.warning(tInvoicing('expense_invoice.errors.surpassed_tax_limit'));
      return;
    }
    onChange({
      ...article,
      expenseArticleInvoiceEntryTaxes: [...(article.expenseArticleInvoiceEntryTaxes || []), {} as ExpenseInvoiceTaxEntry]
    });
  };

 

  const selectedTaxIds = article.expenseArticleInvoiceEntryTaxes?.map((t) => t.tax?.id) || [];

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
                    {tInvoicing('Article Existant')}
                  </Label>
                </div>
                {useExistingArticle ? (
                  <Select onValueChange={handleSelectArticle} value={article.article?.id?.toString() || ''}>
  <SelectTrigger>
    <SelectValue placeholder={tInvoicing('Select an article')} />
  </SelectTrigger>
<SelectContent>
  <div className="p-2">
    <Input
      placeholder={tInvoicing('Search an article...')}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>
  {loading ? (
    <SelectItem value="loading" disabled>
      {tInvoicing('Loading...')}
    </SelectItem>
  ) : articles.filter(art => art.quantityInStock > 0).length > 0 ? (
    articles
      .filter(art => art.quantityInStock > 0) // Filtrer uniquement les articles disponibles
      .filter(art => 
        art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.reference?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((art) => (
        <SelectItem 
          key={art.id} 
          value={art.id.toString()}
        >
          <div className="flex justify-between items-center">
            <span>
              {art.title} {art.reference ? `(${art.reference})` : ''}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {art.quantityInStock} {tInvoicing('available')}
            </span>
          </div>
        </SelectItem>
      ))
  ) : (
    <SelectItem value="no-articles" disabled>
      {tInvoicing('No available articles in stock')}
    </SelectItem>
  )}
</SelectContent>
</Select>
                ) : (
                  <>
                    <Input
                      placeholder={tInvoicing('Enter a title')}
                      value={article.article?.title || ''}
                      onChange={handleTitleChange}
                      disabled={isExistingArticle}
                    />
                    
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-muted-foreground">REF-</span>
                          <Input
                            placeholder="123456"
                            value={article.reference ? article.reference.replace(/^REF-/, '') : ''}
                            onChange={handleReferenceChange}
                            className="pl-12"
                            maxLength={9}
                            disabled={isExistingArticle}
                          />
                        </div>
                      </div>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={generateReference}
                        className="whitespace-nowrap"
                        disabled={isExistingArticle || !!article.article?.id}
                      >
                        {tInvoicing('generate_reference')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <UneditableInput value={article.article?.title || ''} />
                <UneditableInput 
                  value={article.reference || tInvoicing('no_reference')}
                  placeholder={tInvoicing('no_reference')}
                />
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="w-1/5">
            <Label className="mx-1">{tInvoicing('article.attributes.quantity')}</Label>
            {edit ? (
              <div>
                <Input
                  type="number"
                  placeholder="0"
                  value={article.quantity}
                  onChange={handleQuantityChange}
                  min={0}
                  max={availableQuantity || undefined}
                />
                {availableQuantity !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {tInvoicing('available_quantity')}: {availableQuantity}
                  </p>
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
                  disabled={isExistingArticle}
                />
              ) : (
                <UneditableInput value={article.unit_price} />
              )}
              <Label className="font-bold mx-1">{currency?.symbol}</Label>
            </div>
          </div>
        </div>

        {/* Description */}
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
                    disabled={isExistingArticle}
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
                      rows={3 + (article?.expenseArticleInvoiceEntryTaxes?.length || 0)}
                    />
                  </>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Taxes and Discount */}
      <div className="w-3/12 flex flex-col h-full">
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

        <div className="my-auto py-5">
          <Label className="mx-1">{tInvoicing('invoice.attributes.discount')}</Label>
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