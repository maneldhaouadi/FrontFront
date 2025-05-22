import { Article } from './article';
import { Cabinet } from './cabinet';
import { Currency } from './currency';
import { DISCOUNT_TYPE } from './enums/discount-types';
import { ExpensePaymentInvoiceEntry } from './expense-payment';
import { ExpenseQuotation } from './expensequotation';
import { Firm } from './firm';
import { Interlocutor } from './interlocutor';
import { PagedResponse } from './response';
import { DatabaseEntity } from './response/DatabaseEntity';
import { Tax } from './tax';
import { TaxWithholding } from './tax-withholding';
import { Upload } from './upload';

export enum EXPENSE_INVOICE_STATUS {
  Draft = 'draft',
  Validated = 'validated',
  Paid = 'paid',
  PartiallyPaid = 'partially_paid',
  Unpaid = 'unpaid',
  Expired = 'expired',
}

export interface ExpenseInvoiceTaxEntry extends DatabaseEntity {
  id?: number;
  expenseArticleInvoiceEntryId?: number;
  tax?: Tax;
  taxId?: number;
}

export interface ExpenseArticleInvoiceEntry extends DatabaseEntity {
  id?: number;
  expenseInvoiceId?: number;
  article?: Article;
  articleId?: number;
  reference?: string; // Ajout du champ reference
  unit_price?: number;
  quantity?: number;
  discount?: number;
  discount_type?: DISCOUNT_TYPE;
  expenseArticleInvoiceEntryTaxes?: ExpenseInvoiceTaxEntry[];
  subTotal?: number;
  total?: number;
}

export interface ExpenseCreateArticleInvoiceEntry
  extends Omit<
    ExpenseArticleInvoiceEntry,
    | 'id'
    | 'expenseInvoiceId'
    | 'subTotal'
    | 'total'
    | 'updatedAt'
    | 'createdAt'
    | 'deletedAt'
    | 'isDeletionRestricted'
    | 'expenseArticleInvoiceEntryTaxes'
    | 'reference' // Exclu de l'Omit si vous voulez le rendre obligatoire
  > {
  taxes?: number[];
  reference?: string; // Devenu obligatoire
}

export interface ExpenseInvoiceMetaData extends DatabaseEntity {
  id?: number;
  showArticleDescription?: boolean;
  hasBankingDetails?: boolean;
  hasGeneralConditions?: boolean;
  hasTaxStamp?: boolean;
  taxSummary?: { taxId: number; amount: number }[];
  hasTaxWithholding?: boolean;
}

export interface ExpenseInvoiceUpload extends DatabaseEntity {
  id?: number;
  expenseInvoiceId?: number;
  invoice?: ExpenseInvoice;
  uploadId?: number;
  upload?: Upload;
}

export interface ExpenseInvoice extends DatabaseEntity {
  id?: number;
  sequential?: string;
  sequentialNumbr?: string;
  object?: string;
  date?: string;
  dueDate?: string;
  status?: EXPENSE_INVOICE_STATUS;
  generalConditions?: string;
  defaultCondition?: boolean;
  total?: number;
  amountPaid?: number;
  subTotal?: number;
  discount?: number;
  discount_type?: DISCOUNT_TYPE;
  currencyId?: number;
  currency?: Currency;
  bankAccountId?: number;
  bankAccount?: Currency;
  firmId?: number;
  firm?: Firm;
  cabinet?: Cabinet;
  cabinetId?: number;
  interlocutorId?: number;
  interlocutor?: Interlocutor;
  notes?: string;
  quotationId?: number;
  quotation?: ExpenseQuotation;
  articleExpenseEntries?: ExpenseArticleInvoiceEntry[];
  expenseInvoiceMetaData?: ExpenseInvoiceMetaData;
  uploads?: ExpenseInvoiceUpload[];
  payments?: ExpensePaymentInvoiceEntry[];
  taxStamp?: Tax;
  taxStampId?: number;
  taxWithholding?: TaxWithholding;
  taxWithholdingId?: number;
  taxWithholdingAmount?: number;
  pdfFileId?: number;
  pdfFile?:File;
  uploadPdfField?:Upload;
}

export interface ExpenseCreateInvoiceDto
  extends Omit<
    ExpenseInvoice,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
    | 'isDeletionRestricted'
    | 'articles'
    | 'firm'
    | 'interlocutor'
    | 'sequential'
    | 'bankAccount'
  > {
  articleInvoiceEntries?: ExpenseCreateArticleInvoiceEntry[];
  files?: ExpenseInvoiceUpload[];
  sequentialNumbr: string;
  sequential: string;
  pdfFileId?: number;
  pdfFile?:File
}

export interface ExpenseUpdateInvoiceDto extends ExpenseCreateInvoiceDto {
  id?: number;
}

export interface ExpenseDuplicateInvoiceDto {
  id?: number;
  includeFiles?: boolean;
  generateNewReferences?: boolean; // Nouveau paramètre
}

export interface ExpensePagedInvoice extends PagedResponse<ExpenseInvoice> {}

export interface ExpenseInvoiceUploadedFile {
  upload: ExpenseInvoiceUpload;
  file: File;
}