import {
  ToastValidation
} from '@/types';
import axios from './axios';
import { upload } from './upload';
import { api } from '.';
import { EXPENSE_PAYMENT_FILTER_ATTRIBUTES } from '@/constants/expense-payment-filter-attributes';
import { ExpenseCreatePaymentDto, ExpensePagedPayment, ExpensePayment, ExpensePaymentUploadedFile, ExpenseUpdatePaymentDto } from '@/types/expense-payment';

const findOne = async (id: number) => {
  const relations = [
    'invoices',
    'invoices.expenseInvoice', 
    'invoices.expenseInvoice.currency',
    'invoices.expenseInvoice.firm'
  ].join(',');
  
  const response = await axios.get<ExpensePayment>(
    `public/expense-payment/${id}?join=${relations}`
  );
  
  return response.data;
};
const findPaginated = async (
  page: number = 1,
  size: number = 5,
  order: 'ASC' | 'DESC' = 'ASC',
  sortKey: string,
  search: string = '',
  relations: string[] = [],
  firmId?: number,
  interlocutorId?: number
): Promise<ExpensePagedPayment> => {
  const generalFilter = search
    ? Object.values(EXPENSE_PAYMENT_FILTER_ATTRIBUTES)
        .map((key) => `${key}||$cont||${search}`)
        .join('||$or||')
    : '';
  const firmCondition = firmId ? `firmId||$eq||${firmId}` : '';
  const interlocutorCondition = interlocutorId ? `interlocutorId||$cont||${interlocutorId}` : '';
  const filters = [generalFilter, firmCondition, interlocutorCondition].filter(Boolean).join(',');

  const response = await axios.get<ExpensePagedPayment>(
    new String().concat(
      'public/expense-payment/list?',
      `sort=${sortKey},${order}&`,
      `filter=${filters}&`,
      `limit=${size}&page=${page}&`,
      `join=${relations.join(',')}`
    )
  );
  return response.data;
};

const uploadPaymentFiles = async (files: File[]): Promise<number[]> => {
  return files && files?.length > 0 ? await upload.uploadFiles(files) : [];
};
const downloadPdf = async (paymentId: number, templateId?: number): Promise<Blob> => {
  const response = await axios.get(`/public/templates/payments/${paymentId}/export-pdf`, {
    params: { templateId },
    responseType: 'blob'
  });
  return response.data;
};

const create = async (payment: ExpenseCreatePaymentDto, files: File[] = []): Promise<ExpensePayment> => {
  let pdfFileId = payment.pdfFileId;

  // Vérifie si un fichier PDF est présent et l'upload
  if (payment.pdfFile) {
    const [uploadId] = await uploadPaymentFiles([payment.pdfFile]); // Upload le fichier PDF et récupère l'ID
    pdfFileId = uploadId; // Met à jour pdfFileId avec l'ID uploadé
  }

  // Upload les autres fichiers
  const uploadIds = await uploadPaymentFiles(files);

  // Envoie les données à l'API
  const response = await axios.post<ExpensePayment>('public/expense-payment/save', {
    ...payment, // Copie toutes les propriétés de l'objet payment
    sequential: payment.sequentialNumbr, // Assigner sequentialNumbr à sequential
    pdfFileId, // Ajoute pdfFileId (ID du fichier PDF uploadé)
    uploads: uploadIds.map((id) => ({ uploadId: id })), // Transforme les IDs en objets { uploadId: id }
  });

  // Retourne les données de la réponse
  return response.data;
};

const getPaymentUploads = async (payment: ExpensePayment): Promise<ExpensePaymentUploadedFile[]> => {
  if (!payment?.uploads) return [];

  const uploads = await Promise.all(
    payment.uploads.map(async (u) => {
      if (u?.upload?.slug) {
        const blob = await api.upload.fetchBlobBySlug(u.upload.slug);
        const filename = u.upload.filename || '';
        if (blob)
          return { upload: u, file: new File([blob], filename, { type: u.upload.mimetype }) };
      }
      return { upload: u, file: undefined };
    })
  );
  return uploads
    .filter((u) => !!u.file)
    .sort(
      (a, b) =>
        new Date(a.upload.createdAt ?? 0).getTime() - new Date(b.upload.createdAt ?? 0).getTime()
    ) as ExpensePaymentUploadedFile[];
};

const update = async (payment: ExpenseUpdatePaymentDto, files: File[] = []): Promise<ExpensePayment> => {
  let pdfFileId = payment.pdfFileId;

  // Vérifie si un fichier PDF est présent et l'upload
  if (payment.pdfFile) {
    const [uploadId] = await uploadPaymentFiles([payment.pdfFile]); // Upload le fichier PDF et récupère l'ID
    pdfFileId = uploadId; // Met à jour pdfFileId avec l'ID uploadé
  }

  // Upload les autres fichiers
  const uploadIds = await uploadPaymentFiles(files);

  // Envoie les données à l'API
  const response = await axios.put<ExpensePayment>(`public/expense-payment/${payment.id}`, {
    ...payment,
    sequential: payment.sequentialNumbr, // Assigner sequentialNumbr à sequential
    pdfFileId, // Ajoute pdfFileId (ID du fichier PDF uploadé)
    uploads: [
      ...(payment.uploads || []), // Conserve les uploads existants
      ...uploadIds.map((id) => ({ uploadId: id })), // Ajoute les nouveaux uploads
    ],
  });

  // Retourne les données de la réponse
  return response.data;
};

const remove = async (id: number): Promise<{
  payment: ExpensePayment;
  deletedInvoices: number[]; // IDs des factures supprimées
}> => {
  const response = await axios.delete(`public/expense-payment/${id}`);
  return response.data;
};
const deletePdfFile = async (paymentId: number): Promise<void> => {
  try {
    // Appeler l'API pour supprimer le fichier PDF
    const response = await axios.delete(`/public/expensquotation/${paymentId}/pdf`);

    // Vérifier si la suppression a réussi
    if (response.status === 200) {
      console.log('PDF file deleted successfully');
    } else {
      throw new Error('Failed to delete PDF file');
    }
  } catch (error) {
    console.error('Error deleting PDF file:', error);
    throw error; // Propager l'erreur pour la gérer dans le composant
  }
};

const validate = (
  payment: Partial<ExpensePayment>, 
  used: number, 
  paid: number,
  invoices: Array<{
    amount: number;
    expenseInvoice: {
      currencyId: number;
      total: number;
      amountPaid: number;
    };
    exchangeRate?: number;
  }> = [],
  paymentCurrencyId?: number,
  allCurrencies: Array<{id: number, code: string}> = []
): ToastValidation => {
  // Validations de base
  if (!payment.date) return { message: 'La date doit être définie' };
  if (!payment?.amount || payment?.amount <= 0)
    return { message: 'Le montant doit être supérieur à 0' };
  if (payment?.fee == null || payment?.fee < 0)
    return { message: 'Les frais doivent être supérieurs ou égaux à 0' };
  if (payment?.fee > payment?.amount) 
    return { message: 'Les frais doivent être inférieurs au montant total' };

  // Validation des montants des factures
  if (invoices.length > 0) {
    for (const invoiceEntry of invoices) {
      const invoice = invoiceEntry.expenseInvoice;
      const remainingAmount = invoice.total - (invoice.amountPaid || 0);
      
      // Trouver les devises
      const invoiceCurrency = allCurrencies.find(c => c.id === invoice.currencyId);
      const paymentCurrency = paymentCurrencyId 
        ? allCurrencies.find(c => c.id === paymentCurrencyId)
        : null;

      // Si devises différentes, vérifier le taux de change
      if (invoice.currencyId !== paymentCurrencyId) {
        if (!invoiceEntry.exchangeRate || invoiceEntry.exchangeRate <= 0) {
          return { 
            message: `Un taux de change valide est requis pour la facture en ${invoiceCurrency?.code || 'devise inconnue'}`
          };
        }

        const maxAllowed = remainingAmount / invoiceEntry.exchangeRate;
        if (invoiceEntry.amount > maxAllowed + 0.01) { // Tolérance pour les arrondis
          return {
            message: `Le montant pour la facture (${invoiceEntry.amount} ${paymentCurrency?.code || ''}) ` +
                     `dépasse le maximum autorisé (${maxAllowed.toFixed(2)} ${paymentCurrency?.code || ''}) ` +
                     `pour un reste de ${remainingAmount} ${invoiceCurrency?.code || ''} ` +
                     `au taux de ${invoiceEntry.exchangeRate}`
          };
        }
      } else {
        // Même devise - validation simple
        if (invoiceEntry.amount > remainingAmount + 0.01) {
          return {
            message: `Le montant pour la facture (${invoiceEntry.amount}) ` +
                     `dépasse le reste à payer (${remainingAmount})`
          };
        }
      }
    }
  }

  // Validation du montant total
  if (Math.abs(paid - used) > 0.01) { // Tolérance pour les arrondis
    return { 
      message: `Le montant total (${paid}) doit correspondre à la somme des factures (${used})`,
      position: 'bottom-right'
    };
  }

  return { message: '', position: 'bottom-right' };
};

export const expensepayment = { findOne, findPaginated, create, update, remove, validate,deletePdfFile,  downloadPdf // Ajoutez cette ligne
};
