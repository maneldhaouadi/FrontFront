import axios from './axios';
import { differenceInDays, isAfter } from 'date-fns';
import { DISCOUNT_TYPE } from '../types/enums/discount-types';
import { upload } from './upload';
import { api } from '.';
import {
  DateRange,
  ToastValidation,
  UpdateInvoiceSequentialNumber
} from '@/types';
import { EXPENSE_INVOICE_STATUS, ExpenseCreateInvoiceDto, ExpenseDuplicateInvoiceDto, ExpenseInvoice, ExpenseInvoiceUploadedFile, ExpensePagedInvoice,ExpenseUpdateInvoiceDto } from '@/types/expense_invoices';
import { EXPENSE_INVOICE_FILTER_ATTRIBUTES } from '@/constants/expense_invoice.filter-attributes';
import { Underline, Upload } from 'lucide-react';

const factory = (): ExpenseCreateInvoiceDto => {
  return {
  date: '',
  dueDate: '',
  status: EXPENSE_INVOICE_STATUS.Unpaid,
  generalConditions: '',
  total: 0,
  subTotal: 0,
  discount: 0,
  discount_type: DISCOUNT_TYPE.AMOUNT,
  currencyId: 0,
  firmId: 0,
  interlocutorId: 0,
  notes: '',
  sequential: '',
  sequentialNumbr: '',
  articleInvoiceEntries: [],
  expenseInvoiceMetaData: {
    hasBankingDetails: true,
    hasGeneralConditions: true,
    showArticleDescription: true,
    taxSummary: []
  },
  files: [],
  pdfFileId:0,
  pdfFile:undefined
};
};

const findPaginated = async (
  page: number = 1,
  size: number = 5,
  order: 'ASC' | 'DESC' = 'ASC',
  sortKey: string,
  search: string = '',
  relations: string[] = ['firm', 'interlocutor'],
  firmId?: number,
  interlocutorId?: number
): Promise<ExpensePagedInvoice> => {
  const generalFilter = search
    ? Object.values(EXPENSE_INVOICE_FILTER_ATTRIBUTES)
        .map((key) => `${key}||$cont||${search}`)
        .join('||$or||')
    : '';
  const firmCondition = firmId ? `firmId||$eq||${firmId}` : '';
  const interlocutorCondition = interlocutorId ? `interlocutorId||$cont||${interlocutorId}` : '';
  const filters = [generalFilter, firmCondition, interlocutorCondition].filter(Boolean).join(',');

  const response = await axios.get<ExpensePagedInvoice>(
    new String().concat(
      'public/expenseinvoice/list?',
      `sort=${sortKey},${order}&`,
      `filter=${filters}&`,
      `limit=${size}&page=${page}&`,
      `join=${relations.join(',')}`
    )
  );
  return response.data;
};

const findOne = async (
  id: number,
  relations: string[] = [
    'firm',
    'currency',
    'bankAccount',
    'quotation.expensearticleQuotationEntries.article',
    'interlocutor',
    'firm.currency',
    'expenseInvoiceMetaData',
    'uploads',
    'uploads.upload',
    'payments',
    'payments.payment',
    'taxWithholding',
    'firm.deliveryAddress',
    'firm.invoicingAddress',
    'articleExpenseEntries',
    'firm.interlocutorsToFirm',
    'articleExpenseEntries.article',
    'articleExpenseEntries.expenseArticleInvoiceEntryTaxes',
    'articleExpenseEntries.expenseArticleInvoiceEntryTaxes.tax',
    'uploadPdfField'

  ]
): Promise<ExpenseInvoice & { files: ExpenseInvoiceUploadedFile[] }> => {
  const response = await axios.get<ExpenseInvoice>(`public/expenseinvoice/${id}?join=${relations.join(',')}`);
  console.log("rrrrInvoice",response.data); // Vérifiez ici si les articles sont présents

  return { ...response.data, files: await getInvoiceUploads(response.data) };
  
};



const uploadInvoiceFiles = async (files: File[]): Promise<number[]> => {
  return files && files?.length > 0 ? await upload.uploadFiles(files) : [];
};

const create = async (invoice: ExpenseCreateInvoiceDto, files: File[]): Promise<ExpenseInvoice> => {
  let pdfFileId = invoice.pdfFileId;

  // Upload du fichier PDF s'il est présent
  if (invoice.pdfFile) {
    const result = await api.upload.uploadFile(invoice.pdfFile); // Upload du fichier PDF
    if (result.id) {
      pdfFileId = result.id; // Met à jour pdfFileId avec l'ID uploadé
    } else {
      throw new Error('Failed to upload PDF file');
    }
  }

  // Upload des autres fichiers (si nécessaire)
  const uploadIds = await api.upload.uploadFiles(files);

  // Envoie les données à l'API pour créer la facture
  const response = await axios.post<ExpenseInvoice>('public/expenseinvoice', {
    ...invoice, // Copie toutes les propriétés de l'objet invoice
    pdfFileId, // Ajoute pdfFileId
    uploads: uploadIds.map((id) => ({ uploadId: id })), // Transforme les IDs en objets { uploadId: id }
  });

  // Retourne les données de la réponse
  return response.data;
};
const getInvoiceUploads = async (invoice: ExpenseInvoice): Promise<ExpenseInvoiceUploadedFile[]> => {
  if (!invoice?.uploads) return [];

  const uploads = await Promise.all(
    invoice.uploads.map(async (u) => {
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
    ) as ExpenseInvoiceUploadedFile[];
};

const duplicate = async (duplicateInvoiceDto: ExpenseDuplicateInvoiceDto): Promise<ExpenseInvoice> => {
  try {
    const response = await axios.post<ExpenseInvoice>(
      'public/expenseinvoice/duplicate',
      {
        ...duplicateInvoiceDto,
        sequentialNumbr: null, // Définir sequentialNumbr à null
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error duplicating invoice:', error);
    throw new Error('Failed to duplicate invoice');
  }
};
const update = async (invoice: ExpenseUpdateInvoiceDto, files: File[]): Promise<ExpenseInvoice> => {
  let pdfFileId = invoice.pdfFileId; // ID du fichier PDF existant
  console.log('ID du fichier PDF existant:', pdfFileId); // Log de l'ID du fichier PDF existant

  // Upload du nouveau fichier PDF s'il est fourni
  if (invoice.pdfFile) {
    try {
      const [uploadedPdfFileId] = await uploadInvoiceFiles([invoice.pdfFile]);
      pdfFileId = uploadedPdfFileId; // Mettre à jour l'ID du fichier PDF
      console.log('Nouveau fichier PDF uploadé. ID:', uploadedPdfFileId); // Log du nouvel ID du fichier PDF
    } catch (error) {
      console.error('Erreur lors de l\'upload du fichier PDF:', error);
      throw error;
    }
  }

  // Upload des fichiers supplémentaires (exclure le fichier PDF)
  let uploadIds: number[] = [];
  if (files.length > 0) {
    try {
      uploadIds = await uploadInvoiceFiles(files);
      console.log('Fichiers supplémentaires uploadés. IDs:', uploadIds); // Log des IDs des fichiers supplémentaires
    } catch (error) {
      console.error('Erreur lors de l\'upload des fichiers supplémentaires:', error);
      throw error;
    }
  }

  // Préparer les données pour la mise à jour
  const updatedInvoice = {
    ...invoice,
    pdfFileId, // Inclure l'ID du fichier PDF (nouveau ou existant)
    uploads: [
      ...(invoice.uploads || []), // Inclure les fichiers existants
      ...uploadIds.map((id) => ({ uploadId: id })), // Ajouter les nouveaux fichiers
    ],
  };

  console.log('Données de la facture mises à jour:', updatedInvoice); // Log des données de la facture

  try {
    // Envoyer les données au backend
    const response = await axios.put<ExpenseInvoice>(
      `public/expenseinvoice/${invoice.id}`,
      updatedInvoice
    );
    console.log('Facture mise à jour avec succès:', response.data); // Log de la réponse du backend
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la facture:', error);
    throw error;
  }
};
const remove = async (id: number): Promise<{ 
  invoice: ExpenseInvoice;
  quotationDeleted?: boolean;
  quotationSequential?: string;
}> => {
  const response = await axios.delete(`public/expenseinvoice/${id}`);
  return response.data;
};

const validate = (invoice: Partial<ExpenseInvoice>, dateRange?: DateRange): ToastValidation => {
  if (!invoice.date) return { message: 'La date est obligatoire' };
  const invoiceDate = new Date(invoice.date);
  if (
    dateRange?.from &&
    !isAfter(invoiceDate, dateRange.from) &&
    invoiceDate.getTime() !== dateRange.from.getTime()
  ) {
    return { message: `La date doit être après ou égale à ${dateRange.from.toLocaleDateString()}` };
  }
  if (
    dateRange?.to &&
    isAfter(invoiceDate, dateRange.to) &&
    invoiceDate.getTime() !== dateRange.to.getTime()
  ) {
    return { message: `La date doit être avant ou égale à ${dateRange.to.toLocaleDateString()}` };
  }
  if (!invoice.dueDate) return { message: "L'échéance est obligatoire" };
  if (!invoice.object) return { message: "L'objet est obligatoire" };
  const dueDate = new Date(invoice.dueDate);
  if (differenceInDays(invoiceDate, dueDate) > 0) {
    return { message: "L'échéance doit être supérieure ou égale à la date" };
  }
  if (!invoice.firmId || !invoice.interlocutorId) {
    return { message: 'Entreprise et interlocuteur sont obligatoire' };
  }
  return { message: '' };
};

const deletePdfFile = async (invoiceId: number): Promise<void> => {
  try {
    // Appeler l'API pour supprimer le fichier PDF
    const response = await axios.delete(`public/expenseinvoice/${invoiceId}/pdf`);

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

const updateInvoiceStatusIfExpired = async (invoiceId: number): Promise<ExpenseInvoice> => {
  try {
    const response = await axios.put<ExpenseInvoice>(
      `public/expenseinvoice/${invoiceId}/update-status-if-expired`
    );
    return response.data;
  } catch (error) {
    console.error('Error updating invoice status:', error);
    throw error;
  }
};

// Ajoutez cette fonction à votre fichier API frontend (à la fin, avant l'export)
const exportInvoicePdf = async (invoiceId: number, templateId?: number): Promise<void> => {
  try {
    // Construction de l'URL avec le templateId optionnel
    let url = `public/templates/invoices/${invoiceId}/export-pdf`;
    if (templateId) {
      url += `?templateId=${templateId}`;
    }

    const response = await axios.get(url, {
      responseType: 'blob' // Important pour les fichiers binaires
    });

    // Créer un lien temporaire pour le téléchargement
    const urlObject = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = urlObject;
    link.setAttribute('download', `facture-${invoiceId}.pdf`);
    document.body.appendChild(link);
    link.click();
    
    // Nettoyage
    window.URL.revokeObjectURL(urlObject);
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting invoice PDF:', error);
    throw error;
  }

};


export const expense_invoice = {
  factory,
  findPaginated,
  findOne,
  create,
  duplicate,
  update,
  remove,
  validate,
  deletePdfFile,
  updateInvoiceStatusIfExpired,
  exportInvoicePdf,
};
