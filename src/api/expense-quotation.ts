import axios from './axios';
import { differenceInDays } from 'date-fns';
import { DISCOUNT_TYPE } from '../types/enums/discount-types';
import { upload } from './upload';
import { api } from '.';
import {

  ToastValidation,
  UpdateQuotationSequentialNumber
} from '@/types';
import { CreateExpensQuotationDto, DuplicateExpensQuotationDto,ExpenseQuotation,EXPENSQUOTATION_STATUS, ExpensQuotationUploadedFile, PagedExpensQuotation, UpdateExpensQuotationDto } from '@/types/expensequotation';
import { EXPENSE_QUOTATION_FILTER_ATTRIBUTES } from '@/constants/expensequotation.filter-attributes';

const factory = (): CreateExpensQuotationDto => {
  return {
    date: '',
    dueDate: '',
    sequential:'',
    sequentialNumbr:'',
    status: EXPENSQUOTATION_STATUS.Draft,
    generalConditions: '',
    total: 0,
    subTotal: 0,
    discount: 0,
    discount_type: DISCOUNT_TYPE.AMOUNT,
    currencyId: 0,
    firmId: 0,
    interlocutorId: 0,
    notes: '',
    articleQuotationEntries: [],
    expensequotationMetaData: {
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

/*const findPaginated = async (
  page: number = 1,
  size: number = 5,
  order: 'ASC' | 'DESC' = 'ASC',
  sortKey: string,
  search: string = '',
  relations: string[] = ['firm', 'interlocutor'],
  firmId?: number,
  interlocutorId?: number
): Promise<PagedExpenseQuotation> => {
  const generalFilter = search
    ? Object.values(QUOTATION_FILTER_ATTRIBUTES)
        .map((key) => `${key}||$cont||${search}`)
        .join('||$or||')
    : '';
  const firmCondition = firmId ? `firmId||$eq||${firmId}` : '';
  const interlocutorCondition = interlocutorId ? `interlocutorId||$cont||${interlocutorId}` : '';
  const filters = [generalFilter, firmCondition, interlocutorCondition].filter(Boolean).join(',');

  const response = await axios.get<PagedExpenseQuotation>(
    new String().concat(
      'public/expensequotation/list?',
      `sort=${sortKey},${order}&`,
      `filter=${filters}&`,
      `limit=${size}&page=${page}&`,
      `join=${relations.join(',')}`
    )
  );
  return response.data;
};*/
const findPaginated = async (
  page: number = 1,
  size: number = 5,
  order: 'ASC' | 'DESC' = 'ASC',
  sortKey: string,
  search: string = '',
  relations: string[] = ['firm', 'interlocutor'],
  firmId?: number,
  interlocutorId?: number
): Promise<PagedExpensQuotation> => {
  const generalFilter = search
    ? Object.values(EXPENSE_QUOTATION_FILTER_ATTRIBUTES)
        .map((key) => `${key}||$cont||${search}`)
        .join('||$or||')
    : '';
  const firmCondition = firmId ? `firmId||$eq||${firmId}` : '';
  const interlocutorCondition = interlocutorId ? `interlocutorId||$cont||${interlocutorId}` : '';
  const filters = [generalFilter, firmCondition, interlocutorCondition].filter(Boolean).join(',');

  const response = await axios.get<PagedExpensQuotation>(
    new String().concat(
      'public/expensquotation/list?',
      `sort=${sortKey},${order}&`,
      `filter=${filters}&`,
      `limit=${size}&page=${page}&`,
      `join=${relations.join(',')}`
    )
  );
  return response.data;
};

const findChoices = async (
  firmId?: number, 
  interlocutorId?: number,
  relations?: string[] // Nouveau paramètre pour les relations
): Promise<ExpenseQuotation[]> => {
  try {
    let url = `public/expensquotation/all`;
    const params = new URLSearchParams();
    
    if (firmId !== undefined) params.append('firmId', firmId.toString());
    if (interlocutorId !== undefined) params.append('interlocutorId', interlocutorId.toString());
    
    // Ajouter les relations si spécifiées
    if (relations && relations.length > 0) {
      params.append('relations', relations.join(','));
    }
    
    if (params.toString()) url += `?${params.toString()}`;

    const response = await axios.get<ExpenseQuotation[]>(url);
    return response.data;
  } catch (error) {
    return [];
  }
};












const findOne = async (
  id: number,
  relations: string[] = [
    'firm',
    'currency',
    'bankAccount',
    'interlocutor',
    'firm.currency',
    'expensequotationMetaData',
    'uploads',
    'invoices',
    'uploads.upload',
    'expensearticleQuotationEntries',
    'firm.interlocutorsToFirm',
    'expensearticleQuotationEntries.article', 
    'expensearticleQuotationEntries.articleExpensQuotationEntryTaxes',
    'expensearticleQuotationEntries.articleExpensQuotationEntryTaxes.tax',
    'uploadPdfField'

  ]
): Promise<ExpenseQuotation & { files: ExpensQuotationUploadedFile[] }> => {
  const response = await axios.get<ExpenseQuotation>(`public/expensquotation/${id}?join=${relations.join(',')}`);
  console.log("rrrrr",response.data); // Vérifiez ici si les articles sont présents
    return { ...response.data, files: await getQuotationUploads(response.data) };
};

const uploadQuotationFiles = async (files: File[]): Promise<number[]> => {
  return files && files?.length > 0 ? await upload.uploadFiles(files) : [];
};
/*
const create = async (quotation: CreateExpenseQuotationDto, files: File[]): Promise<ExpenseQuotation> => {
  try {
    // Télécharger les fichiers associés au devis
    const uploadIds = await uploadQuotationFiles(files);

    // Envoyer la requête POST pour créer la quotation en ajoutant les fichiers
    const response = await axios.post<ExpenseQuotation>('public/expensquotation/save', {
      ...quotation,
      uploads: uploadIds.map((id) => ({
        uploadId: id
      }))
    });

    return response.data;
  } catch (error) {
    console.error('Error creating expense quotation:', error);
    throw new Error('Failed to create expense quotation');
  }
};


*/

const create = async (quotation: CreateExpensQuotationDto, files: File[]): Promise<ExpenseQuotation> => {
  let pdfFileId = quotation.pdfFileId; // Utilisez directement pdfFileId

  // Étape 1: Uploader le fichier PDF s'il est présent
  if (quotation.pdfFile) {
    try {
      const [uploadId] = await uploadQuotationFiles([quotation.pdfFile]); // Destructure le premier ID du tableau
      pdfFileId = uploadId; // Met à jour pdfFileId avec l'ID uploadé
      console.log('PDF File Uploaded, ID:', pdfFileId); // Log l'ID du fichier uploadé
    } catch (error) {
      console.error('Error uploading PDF file:', error);
      throw new Error('Failed to upload PDF file');
    }
  }

  // Étape 2: Uploader les autres fichiers
  let uploadIds: number[] = [];
  if (files.length > 0) {
    try {
      uploadIds = await uploadQuotationFiles(files); // Upload les fichiers et récupère leurs IDs
      console.log('Other Files Uploaded, IDs:', uploadIds); // Log les IDs des fichiers uploadés
    } catch (error) {
      console.error('Error uploading other files:', error);
      throw new Error('Failed to upload other files');
    }
  }

  // Étape 3: Envoyer les données à l'API
  try {
    const response = await axios.post<ExpenseQuotation>('public/expensquotation/save', {
      ...quotation, // Copie toutes les propriétés de l'objet quotation
      pdfFileId, // Ajoute pdfFileId directement
      uploads: uploadIds.map((id) => ({ uploadId: id })), // Transforme les IDs en objets { uploadId: id }
    });

    console.log('Quotation created successfully:', response.data); // Log la réponse de l'API
    return response.data; // Retourne les données de la réponse
  } catch (error) {
    console.error('Error creating quotation:', error);
    throw new Error('Failed to create quotation');
  }
};

const getQuotationUploads = async (quotation: ExpenseQuotation): Promise<ExpensQuotationUploadedFile[]> => {
  if (!quotation?.uploads) return [];

  const uploads = await Promise.all(
    quotation.uploads.map(async (u) => {
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
    ) as ExpensQuotationUploadedFile[];
};

const download = async (id: number, template: string): Promise<any> => {
  const quotation = await findOne(id, []);
  const response = await axios.get<string>(`public/expensquotation/${id}/download?template=${template}`, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: response.headers['content-type'] });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `${quotation.sequential}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return response;
};

const duplicate = async (
  duplicateQuotationDto: DuplicateExpensQuotationDto
): Promise<ExpenseQuotation> => {
  try {
    console.log("Duplicating with options:", {
      id: duplicateQuotationDto.id,
      includeFiles: duplicateQuotationDto.includeFiles
    });

    const response = await axios.post<ExpenseQuotation>(
      '/public/expensquotation/duplicate',
      duplicateQuotationDto,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Vérification stricte du résultat
    if (response.status === 200 || response.status === 201) {
      console.log("Duplication successful. Result:", {
        newId: response.data.id,
        hasPdf: !!response.data.pdfFileId,
        expectedPdf: duplicateQuotationDto.includeFiles
      });

      if (!duplicateQuotationDto.includeFiles && response.data.pdfFileId) {
        console.warn("WARNING: PDF was duplicated but includeFiles was false!");
      }

      return response.data;
    }
    throw new Error(`HTTP ${response.status}`);
    
  } catch (error) {
    console.error('Duplication error:', {
    });
    throw error;
  }
};

const update = async (quotation: UpdateExpensQuotationDto, files: File[]): Promise<ExpenseQuotation> => {
  // 1. Upload du fichier PDF si fourni
  let pdfFileId = quotation.pdfFileId;
  if (quotation.pdfFile) {
    try {
      const [uploadedPdfFileId] = await uploadQuotationFiles([quotation.pdfFile]);
      pdfFileId = uploadedPdfFileId;
    } catch (error) {
      console.error('Erreur PDF upload:', error);
      throw error;
    }
  }

  // 2. Upload des fichiers supplémentaires
  let uploadIds: number[] = [];
  if (files.length > 0) {
    try {
      uploadIds = await uploadQuotationFiles(files);
    } catch (error) {
      console.error('Erreur fichiers supplémentaires:', error);
      throw error;
    }
  }

  // 3. Préparation des données pour le backend
  const updateData = {
    ...quotation,
    pdfFileId,
    uploads: [
      // Fichiers existants à conserver
      ...(quotation.uploads?.map(u => ({ 
        uploadId: u.uploadId,
        id: u.id // Important: inclure l'ID pour les fichiers existants
      }))) || [],
      // Nouveaux fichiers uploadés
      ...uploadIds.map(uploadId => ({ uploadId }))
    ]
  };

  // 4. Envoi au backend
  try {
    const response = await axios.put<ExpenseQuotation>(
      `public/expensquotation/${quotation.id}`,
      updateData
    );
    return response.data;
  } catch (error) {
    console.error('Erreur mise à jour devis:', error);
    throw error;
  }
};

const invoice = async (id?: number, createInvoice?: boolean): Promise<ExpenseQuotation> => {
  const response = await axios.put<ExpenseQuotation>(`public/expensequotation/invoice/${id}/${createInvoice}`);
  return response.data;
};

const remove = async (id: number): Promise<ExpenseQuotation> => {
  const response = await axios.delete<ExpenseQuotation>(`expensquotation/delete/${id}`);
  return response.data;
};

const validate = (quotation: Partial<ExpenseQuotation>): ToastValidation => {
  if (!quotation.date) return { message: 'La date est obligatoire' };
  if (!quotation.dueDate) return { message: "L'échéance est obligatoire" };
  if (!quotation.object) return { message: "L'objet est obligatoire" };
  if (differenceInDays(new Date(quotation.date), new Date(quotation.dueDate)) >= 0)
    return { message: "L'échéance doit être supérieure à la date" };
  if (!quotation.firmId || !quotation.interlocutorId)
    return { message: 'Entreprise et interlocuteur sont obligatoire' };
  return { message: '' };
};

const updateQuotationsSequentials = async (updatedSequenceDto: UpdateQuotationSequentialNumber) => {
  const response = await axios.put<ExpenseQuotation>(
    `/public/expensquotation/update-quotation-sequences`,
    updatedSequenceDto
  );
  return response.data;
};

const deletePdfFile = async (quotationId: number): Promise<void> => {
  try {
    // Appeler l'API pour supprimer le fichier PDF
    const response = await axios.delete(`/public/expensquotation/${quotationId}/pdf`);

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

const updateInvoiceStatusIfExpired = async (quotationId: number): Promise<ExpenseQuotation> => {
  try {
    const response = await axios.put<ExpenseQuotation>(
      `public/expensquotation/${quotationId}/update-status-if-expired`
    );
    return response.data;
  } catch (error) {
    console.error('Error updating quotation status:', error);
    throw error;
  }
};
const checkSequentialNumberExists = async (sequentialNumber: string): Promise<boolean> => {
  try {
    const response = await axios.get<{ exists: boolean }>(
      '/public/expensquotation/check-sequential-number', 
      { params: { sequentialNumber } }
    );
    return response.data.exists;
  } catch (error) {
    console.error('Error checking sequential number:', error);
    return false; // Par défaut, considérez que le numéro n'existe pas en cas d'erreur
  }
};

const exportQuotationPdf = async (quotationId: number, templateId?: number): Promise<Blob> => {
  try {
    let url = `public/templates/quotations/${quotationId}/export-pdf`;
    if (templateId) {
      url += `?templateId=${templateId}`;
    }

    const response = await axios.get(url, {
      responseType: 'blob'
    });

    return response.data; // Retourne directement le blob
  } catch (error) {
    console.error('Error exporting quotation PDF:', error);
    throw error;
  }
};

export const expense_quotation = {
  factory,
  findPaginated,
  findOne,
  findChoices,
  create,
  download,
  invoice,
  duplicate,
  update,
  updateQuotationsSequentials,
  remove,
  validate,
  deletePdfFile,
  updateInvoiceStatusIfExpired,
  checkSequentialNumberExists, // Ajoutez cette ligne
  exportQuotationPdf

};
