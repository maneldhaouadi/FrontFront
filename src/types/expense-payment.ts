import { Currency } from './currency';
import { ExpenseInvoice } from './expense_invoices';
import { Firm } from './firm';
import { PagedResponse } from './response';
import { DatabaseEntity } from './response/DatabaseEntity';
import { Upload } from './upload';

export enum EXPENSE_PAYMENT_MODE {
  Cash = 'payment.payment_mode.cash',
  CreditCard = 'payment.payment_mode.credit_card',
  Check = 'payment.payment_mode.check',
  BankTransfer = 'payment.payment_mode.bank_transfer',
  WireTransfer = 'payment.payment_mode.wire_transfer'
}

export interface ExpensePaymentUpload extends DatabaseEntity {
  id?: number;
  expensePaymentId?: number;
  expensePayment?: ExpensePayment;
  uploadId?: number;
  upload?: Upload;
}

export interface ExpensePaymentInvoiceEntry extends DatabaseEntity {
  id?: number;
  expenseInvoiceId?: number;
  expenseInvoice?: ExpenseInvoice;
  expensePaymentId?: number;
  payment?: ExpensePayment;
  amount?: number;
  exchangeRate?: number;
  originalAmount?: number;
  originalCurrencyId?: number;
  digitAfterComma?: number;
  
}


export interface ExpensePayment extends DatabaseEntity {
  id?: number;
  sequential?: string;
  sequentialNumbr?: string;
  amount?: number;
  fee?: number;
  convertionRate?: number;
  date?: string;
  mode?: EXPENSE_PAYMENT_MODE;
  notes?: string;
  uploads?: ExpensePaymentUpload[];
  invoices?: ExpensePaymentInvoiceEntry[];
  currency?: Currency;
  currencyId?: number;
  firm?: Firm;
  firmId?: number;
  pdfFileId?: number;
  pdfFile?:File;
  uploadPdfField?:Upload;
  targetCurrency?:Currency;
  targetCurrencyId?:number;
}

export interface ExpenseCreatePaymentDto
  extends Omit<ExpensePayment, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isDeletionRestricted'> {
  files?: File[];
  sequentialNumbr:string,
  sequential:string,
  pdfFileId?: number;
  pdfFile?:File
}

export interface ExpenseUpdatePaymentDto extends ExpenseCreatePaymentDto {
  id?: number;
  currencyId?:number
}

export interface ExpensePagedPayment extends PagedResponse<ExpensePayment> {}

export interface ExpensePaymentUploadedFile {
  upload: ExpensePaymentUpload;
  file: File;
}
