import {ExpenseArticleQuotationEntry, Tax } from '@/types';
import { DISCOUNT_TYPE } from '@/types/enums/discount-types';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

type ExpenseQuotationPseudoItem = { id: string; article: ExpenseArticleQuotationEntry & { total?: number } };

export type ExpenseQuotationArticleManager = {
  articles: ExpenseQuotationPseudoItem[];
  taxSummary: { tax: Tax; amount: number }[];
  add: (article?: ExpenseArticleQuotationEntry) => void;
  update: (id: string, article: ExpenseArticleQuotationEntry) => void;
  delete: (id: string) => void;
  setArticles: (articles: ExpenseArticleQuotationEntry[]) => void;
  reset: () => void;
  getArticles: () => (ExpenseArticleQuotationEntry & { total: number })[];
  removeArticleDescription: () => void;
};
const calculateForExpenseQuotation = (article: ExpenseArticleQuotationEntry) => {
  const quantity = article?.quantity || 0;
  const unit_price = article?.unit_price || 0;
  const discount = article?.discount || 0;
  const discount_type = article?.discount_type || DISCOUNT_TYPE.PERCENTAGE;

  const subTotal = quantity * unit_price;

  const discountAmount =
    discount_type === DISCOUNT_TYPE.PERCENTAGE ? (subTotal * discount) / 100 : discount;

  const subTotalPlusDiscount = subTotal - discountAmount;

  let regularTaxAmount = 0;
  let specialTaxAmount = 0;
  let fixedTaxAmount = 0;

  if (article?.articleExpensQuotationEntryTaxes) {
    for (const entry of article?.articleExpensQuotationEntryTaxes) {
      if (entry?.tax?.isRate) {
        if (entry?.tax?.isSpecial) {
          specialTaxAmount += entry?.tax?.value || 0;
        } else {
          regularTaxAmount += entry?.tax?.value || 0;
        }
      } else fixedTaxAmount += entry?.tax?.value || 0;
    }
  }

  const totalAfterRegularTax = subTotalPlusDiscount * (1 + regularTaxAmount / 100);
  const total = totalAfterRegularTax * (1 + specialTaxAmount / 100) + fixedTaxAmount;

  return { subTotal, total };
};

const calculateTaxSummary = (articles: ExpenseQuotationPseudoItem[]) => {
  const taxSummaryMap = new Map<number, { tax: Tax; amount: number }>();

  articles.forEach((articleItem) => {
    const article = articleItem.article;
    const taxes = article.articleExpensQuotationEntryTaxes|| [];
    const subTotalPlusDiscount = article.subTotal || 0;

    let regularTaxAmount = 0;
    taxes.forEach((taxEntry) => {
      const tax = taxEntry.tax;

      if (!tax?.isSpecial && tax?.isRate) {
        const taxAmount = subTotalPlusDiscount * ((tax?.value || 0) / 100);
        regularTaxAmount += taxAmount;
        if (tax?.id && taxSummaryMap.has(tax.id)) {
          taxSummaryMap.get(tax.id)!.amount += taxAmount;
        } else {
          tax?.id && taxSummaryMap.set(tax.id, { tax, amount: taxAmount });
        }
      } else if (!tax?.isSpecial && !tax?.isRate) {
        const taxAmount = tax?.value || 0;
        if (tax?.id && taxSummaryMap.has(tax.id)) {
          taxSummaryMap.get(tax.id)!.amount += taxAmount;
        } else {
          tax?.id && taxSummaryMap.set(tax.id, { tax, amount: taxAmount });
        }
      }
    });

    const totalAfterRegularTax = subTotalPlusDiscount + regularTaxAmount;
    taxes.forEach((taxEntry) => {
      const tax = taxEntry.tax;
      if (tax?.isSpecial && tax?.isRate) {
        const taxAmount = totalAfterRegularTax * ((tax?.value || 0) / 100);
        if (tax?.id && taxSummaryMap.has(tax.id)) {
          taxSummaryMap.get(tax.id)!.amount += taxAmount;
        } else {
          tax?.id && taxSummaryMap.set(tax.id, { tax, amount: taxAmount });
        }
      } else if (tax?.isSpecial && !tax?.isRate) {
        const taxAmount = tax?.value || 0;
        if (tax?.id && taxSummaryMap.has(tax.id)) {
          taxSummaryMap.get(tax.id)!.amount += taxAmount;
        } else {
          tax?.id && taxSummaryMap.set(tax.id, { tax, amount: taxAmount });
        }
      }
    });
  });

  return Array.from(taxSummaryMap.values());
};

export const useExpenseQuotationArticleManager = create<ExpenseQuotationArticleManager>()((set, get) => ({
  articles: [],
  taxSummary: [],

  add: (article: ExpenseArticleQuotationEntry = { reference: '' }) => {
    const { subTotal, total } = calculateForExpenseQuotation(article);
  
    set((state) => ({
      articles: [
        ...state.articles,
        {
          id: uuidv4(),
          article: {
            ...article,
            total,
            subTotal,
            discount_type: article.discount_type || DISCOUNT_TYPE.AMOUNT,
            discount: article.discount || 0
          }
        }
      ]
    }));
  
    set(() => ({
      taxSummary: calculateTaxSummary(get().articles)
    }));
  },
  update: (id: string, article: ExpenseArticleQuotationEntry) => {
    const { subTotal, total } = calculateForExpenseQuotation(article);

    set((state) => ({
      articles: state.articles.map((a) =>
        a.id === id ? { ...a, article: { ...article, total, subTotal } } : a
      )
    }));

    set(() => ({
      taxSummary: calculateTaxSummary(get().articles)
    }));
  },

  delete: (id: string) => {
    set((state) => ({
      articles: state.articles.filter((a) => a.id !== id)
    }));

    set(() => ({
      taxSummary: calculateTaxSummary(get().articles)
    }));
  },

  setArticles: (articles: ExpenseArticleQuotationEntry[]) => {
      set({
        articles: articles.map((article) => {
          const { subTotal, total } = calculateForExpenseQuotation(article);
          return {
            id: uuidv4(),
            article: { ...article, total, subTotal }
          };
        })
      });
  
      const taxSummary = calculateTaxSummary(get().articles);
      set(() => ({
        taxSummary
      }));
    },
  reset: () =>
    set({
      articles: [],
      taxSummary: []
    }),

  getArticles: () => {
    return get().articles.map((item) => {
      const { subTotal, total } = calculateForExpenseQuotation(item.article);
      return { ...item.article, total, subTotal };
    });
  },

  removeArticleDescription: () => {
    set((state) => ({
      articles: state.articles.map((item) => ({
        ...item,
        article: { ...item.article, description: '' }
      }))
    }));
  }
}));
