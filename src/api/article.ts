import axios from './axios';
import { Article, ArticleCompareResponseDto, BarcodeSearchResponse, CreateArticleDto, PagedArticle, QrCodeSearchResponse, UpdateArticleDto } from '@/types';

const findPaginated = async (
  page: number = 1,
  size: number = 5,
  order: 'ASC' | 'DESC' = 'ASC',
  sortKey: string,
  search: string = '',
  relations: string[] = []
): Promise<PagedArticle> => {
  const barcodeFilter = search ? `barcode||$cont||${search}` : '';
  const filters = barcodeFilter ? `filter=${barcodeFilter}` : '';

  try {
    const response = await axios.get<PagedArticle>(
      `/public/article/list?sort=${sortKey},${order}&${filters}&limit=${size}&page=${page}&join=${relations.join(',')}`
    );
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des articles paginés:", error);
    throw new Error("Impossible de récupérer les articles.");
  }
};

const findOne = async (id: number): Promise<Article> => {
  const response = await axios.get<Article>(`/public/article/${id}`);
  return response.data;
};

const create = async (article: CreateArticleDto): Promise<Article> => {
  const response = await axios.post<Article>('/public/article/save', article);
  return response.data;
};

const createWithFilterTitle = async (article: CreateArticleDto): Promise<Article | null> => {
  try {
    const response = await axios.post<Article>('/public/article/save-with-filter-title', article);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la création de l'article avec filtre de titre:", error);
    return null;
  }
};

const remove = async (id: number): Promise<Article> => {
  const response = await axios.delete<Article>(`/public/article/delete/${id}`);
  return response.data;
};

const importExcel = async (file: File): Promise<Article[]> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post<Article[]>('/public/article/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de l\'importation du fichier Excel:', error);
    throw error;
  }
};

const generateQrCode = async (data: string): Promise<string> => {
  try {
    const response = await axios.post<{ qrCode: string }>('/public/article/generate-qr', { data });
    return response.data.qrCode;
  } catch (error) {
    console.error("Erreur lors de la génération du code QR:", error);
    throw new Error("Impossible de générer le code QR.");
  }
};

const update = async (id: number, updateArticleDto: UpdateArticleDto): Promise<Article> => {
  try {
    console.log('Données envoyées:', updateArticleDto);
    const response = await axios.put<Article>(`/public/article/update/${id}`, updateArticleDto);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'article:", error);
    throw new Error("Impossible de mettre à jour l'article.");
  }
};

const getQrCode = async (id: number): Promise<string> => {
  try {
    const response = await axios.get<{ qrCode: string }>(`/public/article/qr/${id}`);
    return response.data.qrCode;
  } catch (error) {
    console.error("Erreur lors de la récupération du code QR:", error);
    throw new Error("Impossible de récupérer le code QR.");
  }
};

const getAllCategories = async (): Promise<string[]> => {
  try {
    const response = await axios.get<string[]>('/public/article/categories/all');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error);
    throw new Error("Impossible de récupérer les catégories.");
  }
};

const getAllSubCategories = async (): Promise<string[]> => {
  try {
    const response = await axios.get<string[]>('/public/article/subcategories/all');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des sous-catégories:", error);
    throw new Error("Impossible de récupérer les sous-catégories.");
  }
};

const searchByQrCode = async (qrCode: string): Promise<QrCodeSearchResponse> => {
  try {
    const response = await axios.post<QrCodeSearchResponse>('/public/article/search-by-qr', { qrCode });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la recherche par code QR:", error);
    throw new Error("Impossible de trouver l'article.");
  }
};

const searchByBarcode = async (barcode: string): Promise<BarcodeSearchResponse> => {
  try {
    const response = await axios.post<BarcodeSearchResponse>('/public/article/search-by-barcode', { barcode });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la recherche par code-barres:", error);
    throw new Error("Impossible de trouver l'article.");
  }
};

const searchByScan = async (scannedData: string): Promise<BarcodeSearchResponse> => {
  try {
    const response = await axios.post<BarcodeSearchResponse>('/public/article/search-by-scan', { scannedData });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la recherche par scan de code-barres:", error);
    throw new Error("Impossible de trouver l'article.");
  }
};

const getArticleHistory = async (id: number): Promise<any[]> => {
  try {
    const response = await axios.get<any[]>(`/public/article/${id}/history`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique de l'article:", error);
    throw new Error("Impossible de récupérer l'historique de l'article.");
  }
};

const restoreVersion = async (id: number, version: number): Promise<Article> => {
  try {
    const response = await axios.post<Article>(`/public/article/${id}/restore-version/${version}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la restauration de la version:", error);
    throw new Error("Impossible de restaurer cette version de l'article.");
  }
};

const getAvailableVersions = async (id: number): Promise<{versions: Array<{version: number, date?: Date}>}> => {
  try {
    const response = await axios.get<{versions: Array<{version: number, date?: Date}>}>(`/public/article/${id}/versions`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des versions:", error);
    throw new Error("Impossible de récupérer les versions de l'article.");
  }
};

const suggestCategories = async (query: string): Promise<string[]> => {
  try {
    const response = await axios.get<string[]>(`/public/article/categories/suggest?query=${query}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la suggestion de catégories:", error);
    return [];
  }
};

const suggestSubCategories = async (query: string): Promise<string[]> => {
  try {
    const response = await axios.get<string[]>(`/public/article/subcategories/suggest?query=${query}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la suggestion de sous-catégories:", error);
    return [];
  }
};

const validateCategory = async (category: string): Promise<{valid: boolean, matches?: string[]}> => {
  try {
    const response = await axios.post<{valid: boolean, matches?: string[]}>('/public/article/validate-category', { category });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la validation de la catégorie:", error);
    return { valid: false };
  }
};

const validateSubCategory = async (subCategory: string): Promise<{valid: boolean, matches?: string[]}> => {
  try {
    const response = await axios.post<{valid: boolean, matches?: string[]}>('/public/article/validate-subcategory', { subCategory });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la validation de la sous-catégorie:", error);
    return { valid: false };
  }
};

const searchCategories = async (query: string): Promise<string[]> => {
  try {
    const response = await axios.get<string[]>(`/public/article/categories/search?query=${query}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la recherche de catégories:", error);
    return [];
  }
};
const extractFromImage = async (file: File): Promise<CreateArticleDto> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post<CreateArticleDto>('/ocr/article/extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de l\'extraction des données depuis l\'image:', error);
    throw new Error("Impossible d'extraire les données depuis l'image.");
  }
};


const extractFromPdf = async (file: File): Promise<CreateArticleDto> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post<CreateArticleDto>('/public/article/extract-from-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data) {
      throw new Error("Aucune donnée reçue du serveur");
    }

    // Conversion explicite des nombres et valeurs par défaut
    return {
      title: response.data.title || '',
      description: response.data.description || '',
      category: response.data.category || '',
      subCategory: response.data.subCategory || '',
      purchasePrice: response.data.purchasePrice ? Number(response.data.purchasePrice) : 0,
      salePrice: response.data.salePrice ? Number(response.data.salePrice) : 0,
      quantityInStock: response.data.quantityInStock ? Number(response.data.quantityInStock) : 0,
      status: response.data.status || 'active'
    };
  } catch (error) {
    console.error('Erreur détaillée:', error);
    throw new Error(`Impossible d'extraire les données depuis le PDF: ${console.error}`);
  }
};

const compareWithPdf = async (
  id: number,
  file: File
): Promise<ArticleCompareResponseDto> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post<ArticleCompareResponseDto>(
      `/public/article/${id}/compare-with-pdf`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Erreur lors de la comparaison avec PDF:", error);
    throw new Error(`Impossible de comparer avec le PDF: ${console.error}`);
  }
};

const compareWithImage = async (
  id: number,
  file: File
): Promise<ArticleCompareResponseDto> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post<ArticleCompareResponseDto>(
      `/public/article/${id}/compare-with-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Erreur lors de la comparaison avec image:", error);
    throw new Error(`Impossible de comparer avec l'image: ${console.error}`);
  }
};
export const article = {
  findPaginated,
  findOne,
  create,
  createWithFilterTitle,
  remove,
  update,
  importExcel,
  generateQrCode,
  getQrCode,
  searchByQrCode,
  searchByBarcode,
  searchByScan,
  getArticleHistory,
  getAllCategories,
  getAllSubCategories,
  restoreVersion,
  getAvailableVersions,
  suggestCategories,
  suggestSubCategories,
  validateCategory,
  validateSubCategory,
  searchCategories,
  extractFromImage,
  extractFromPdf,
  compareWithPdf,    // Nouvelle méthode
  compareWithImage   // Nouvelle méthode
};