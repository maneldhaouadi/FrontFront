import { Chart } from 'chart.js';
import axios from './axios';
import { Article, ArticleCompareResponseDto, ArticleStatus, BarcodeSearchResponse, CreateArticleDto, PagedArticle, QrCodeSearchResponse, ResponseArticleDto, UpdateArticleDto } from '@/types';
import { AxiosError, isAxiosError } from 'axios';

interface IQueryObject {
  page?: number;
  size?: number;
  order?: 'ASC' | 'DESC';
  sortKey?: string;
  search?: string;
  relations?: string[];
  [key: string]: any;
}

interface ArticleExtractionResponse {
  success: boolean;
  message?: string;
  reference?: string;
  title?: string;
  description?: string;
  unitPrice?: number | string;
  quantityInStock?: number | string;
  notes?: string;
  metadata?: {
    pages?: number;
    extractedFields?: number;
  };
}



interface ArticleExtractedData {
  reference: string;
  title: string;
  description?: string;
  quantityInStock?: number;
  unitPrice: number;
  notes?: string;
  _error?: string; // Pour le debug

}

interface OcrResponse {
  success: boolean;
  data: ArticleExtractedData;
  confidence?: number;
  processingTime?: number;
  debug?: any;
  message?: string;
  corrections?: Array<{
    original: string;
    corrected: string;
    confidence: number;
    field: string;
    context: string[];
  }>;
}
interface OcrResponseData {
  reference?: { value?: string; confidence?: number };
  designation?: { value?: string; confidence?: number }; // Correspond à title
  description?: { value?: string; confidence?: number };
  price?: { value?: number | string; confidence?: number }; // Correspond à unitPrice
  quantity?: { value?: number | string; confidence?: number }; // Correspond à quantityInStock
  notes?: { value?: string; confidence?: number };
}

interface PageDto<T> {
  data: T[];
  count: number;
  total: number;
  page: number;
  pageCount: number;
}

interface ArticleStats {
  totalArticles: number;
  statusCounts: Record<string, number>;
  statusPercentages: Record<string, string>;
  outOfStockCount: number;
  totalStockAvailable: number;
  averageStockPerArticle: number;
  lowStockCount: number;
  outOfStockSinceDays: Record<string, number>;
  topStockValueArticles: Array<{ reference: string; value: number }>;
  toArchiveSuggestions: string[];
}

interface StockAlerts {
  outOfStock: Array<{
    reference: string;
    title?: string;
    daysOutOfStock: number;
  }>;
  lowStock: Array<{
    reference: string;
    title?: string;
    remainingStock: number;
  }>;
}

interface StatusOverview {
  counts: Record<string, number>;
  examples: Record<string, Array<{ reference: string; title?: string }>>;
}

interface ArticleQualityScore {
  id: number;
  reference: string;
  title?: string;
  score: number;
  missingFields: string[];
}

interface SuspiciousArticle {
  id: number;
  reference: string;
  title?: string;
  quantity?: number;
}

interface PriceTrend {
  oldArticles: {
    count: number;
    averagePrice: number;
  };
  newArticles: {
    count: number;
    averagePrice: number;
  };
  priceEvolution: {
    amount: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface StockHealth {
  activePercentage: number;
  status: 'poor' | 'medium' | 'good';
  details: Record<string, number>;
}

interface SimplifiedStockStatus {
  healthy: number;
  warning: number;
  danger: number;
  inactive: number;
}

interface TopValuedArticle {
  reference: string;
  title: string;
  totalValue: number;
}

interface AveragePriceByStatus {
  [status: string]: number;
}
const findPaginated = async (
  page: number = 1,
  size: number = 100,
  order: 'ASC' | 'DESC' = 'ASC',
  sortKey: string = 'title',
  search: string = '',
  relations: string[] = []
): Promise<{ data: Article[] } | PagedArticle> => {
  try {
    const params = {
      page,
      limit: size,
      sort: `${sortKey},${order}`,
      search,
      join: relations.join(','),
      filter: 'status||$ne||archived'
    };

    const response = await axios.get<{ data: Article[] } | PagedArticle>('/public/article/list/active', { params });
    console.log('Articles API response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error("Error fetching paginated articles:", error);
    throw new Error("Failed to fetch articles");
  }
};

const findOne = async (id: number): Promise<Article> => {
  const response = await axios.get<Article>(`/public/article/${id}`);
  return response.data;
};


const findArchivedArticles = async (
  search?: string,
  sortBy?: string,
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): Promise<ResponseArticleDto[]> => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (sortBy) params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    const response = await axios.get<ResponseArticleDto[]>(
      `/public/article/archives?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching archived articles:", error);
    throw new Error("Failed to fetch archived articles");
  }
};

const findActiveArticles = async (): Promise<ResponseArticleDto[]> => {
  try {
    const response = await axios.get<ResponseArticleDto[]>('/public/article/list/active');
    return response.data;
  } catch (error) {
    console.error("Error fetching active articles:", error);
    throw new Error("Failed to fetch active articles");
  }
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

const searchArticlesByTitle = async (
  title: string,
  query: IQueryObject = {}
): Promise<PageDto<ResponseArticleDto> | null> => {
  try {
    if (title) {
      query.filter = query.filter 
        ? `${query.filter},title||$cont||${title}`
        : `title||$cont||${title}`;
    }

    const response = await axios.get<PageDto<ResponseArticleDto>>('/public/article/search', {
      params: query
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la recherche d'articles par titre:", error);
    return null;
  }
};

const hardDelete = async (id: number): Promise<void> => {
  await axios.delete(`/public/article/hard-delete/${id}`);
};


// Dans api.ts
const remove = async (id: number): Promise<{ success: boolean }> => {
  try {
    const response = await axios.delete<{ success: boolean }>(`/public/article/delete/${id}`);
    if (response.data.success) {
      return { success: true };
    } else {
      throw new Error("Delete operation failed");
    }
  } catch (error) {
    console.error("Error deleting article:", error);
    throw error;
  }
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
    const response = await axios.put<Article>(
      `/public/article/update/${id}`,
      updateArticleDto,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        // Supprimez withCredentials ou mettez-le à false si vous n'utilisez pas de cookies
        withCredentials: false
      }
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('Update error details:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Échec de la mise à jour');
    }
    console.error('Update error:', error);
    throw new Error('Une erreur inattendue est survenue');
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

const restoreVersion = async (id: number, version: number): Promise<{ message: string }> => {
  try {
    const response = await axios.post<{ message: string }>(
      `/public/article-history/${id}/restore/${version}`
    );
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la restauration de la version:", error);
    throw new Error("Impossible de restaurer cette version de l'article.");
  }
};

const getTopOutOfStockRisk = async (): Promise<
  ArticleStats & { riskArticles: Array<Article & { daysToOutOfStock: number }> }
> => {
  try {
    const response = await axios.get<
      ArticleStats & { riskArticles: Array<Article & { daysToOutOfStock: number }> }
    >('/public/article/stats/top-out-of-stock-risk');
    return response.data;
  } catch (error) {
    console.error("Erreur récupération risque stock:", error);
    throw new Error("Impossible de récupérer les données de risque");
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


// Déclaration de la fonction utilitaire en dehors de la méthode principale
function formatProductReference(rawRef: string): string {
  if (!rawRef) return 'REF-TEMP';

  // Nettoyage et standardisation
  const cleaned = rawRef
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/^REF-/, 'PROD-'); // Conversion REF- en PROD-

  // Validation du format
  if (/^PROD-\d{4}-\d{3,}$/.test(cleaned)) return cleaned;
  if (/^\d{4}-\d{3,}$/.test(cleaned)) return `PROD-${cleaned}`;
  
  return 'REF-TEMP';
}

const extractFromImage = async (file: File): Promise<ArticleExtractedData> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post<OcrResponse>('/ocr/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { strict: false, debug: true },
      timeout: 30000
    });

    // Gestion des erreurs
    if (!response.data?.success || response.status >= 400) {
      throw new Error(response.data?.message || 'Échec du traitement OCR');
    }

    // Fonction utilitaire pour extraire et normaliser les valeurs (déclarée comme expression de fonction)
    const extractValue = <T>(
      source: any, 
      fieldName: keyof OcrResponseData,
      defaultValue: T,
      isNumber = false
    ): T => {
      const fieldData = source?.[fieldName];
      if (!fieldData?.value) return defaultValue;

      if (isNumber) {
        const numValue = typeof fieldData.value === 'string'
          ? parseFloat(fieldData.value.replace(',', '.').replace(/\s/g, ''))
          : Number(fieldData.value);
        return (isNaN(numValue) ? defaultValue : Math.max(0, numValue)) as T;
      }

      return String(fieldData.value).trim() as T || defaultValue;
    };

    // Extraction et transformation des données
    const ocrData = response.data.data || {};
    const result: ArticleExtractedData = {
      reference: formatProductReference(extractValue(ocrData, 'reference', '')),
      title: extractValue(ocrData, 'designation', 'Titre non détecté'),
      description: extractValue(ocrData, 'description', undefined),
      unitPrice: extractValue(ocrData, 'price', 0, true),
      quantityInStock: extractValue(ocrData, 'quantity', 0, true),
      notes: extractValue(ocrData, 'notes', undefined)
    };

    return result;

  } catch (error) {
    console.error('Erreur OCR:', error);
    return {
      reference: 'REF-TEMP',
      title: 'Titre non détecté',
      unitPrice: 0,
      quantityInStock: 0
    };
  }
};

// Correction de la fonction extractFromPdf dans api.ts
const extractFromPdf = async (file: File): Promise<ArticleExtractedData> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post('/pdf-extract/structured', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json'
      },
      timeout: 60000
    });

    if (!response.data?.success || !response.data.pages?.[0]?.extractedData) {
      throw new Error(response.data?.message || 'Aucune donnée valide extraite');
    }

    // Extraction des données depuis la première page
    const extractedData = response.data.pages[0].extractedData;
    
    return {
      reference: extractedData.reference || '',
      title: extractedData.title || '',
      description: extractedData.description || '',
      unitPrice: typeof extractedData.unitPrice === 'string'
        ? parseFloat(extractedData.unitPrice.replace(',', '.')) 
        : extractedData.unitPrice || 0,
      quantityInStock: extractedData.quantityInStock || 0,
      notes: extractedData.notes || '',
      _error: extractedData.reference ? undefined : 'Référence manquante'
    };

  } catch (error) {
    console.error('Erreur extraction PDF:', error);
    return {
      reference: `TEMP-${Date.now().toString(36).slice(-6).toUpperCase()}`,
      title: file.name.replace('.pdf', ''),
      unitPrice: 0,
      quantityInStock: 0,
      _error: (error as Error)?.message || 'Erreur de traitement PDF'
    };
  }
};


const getSimpleStats = async (): Promise<ArticleStats> => {
  try {
    const response = await axios.get<ArticleStats>('/public/article/stats/simple');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    throw new Error("Impossible de récupérer les statistiques.");
  }
};

const getStockAlerts = async (): Promise<StockAlerts> => {
  try {
    const response = await axios.get<StockAlerts>('/public/article/stats/stock-alerts');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des alertes de stock:", error);
    throw new Error("Impossible de récupérer les alertes de stock.");
  }
};

const getStatusOverview = async (): Promise<StatusOverview> => {
  try {
    const response = await axios.get<StatusOverview>('/public/article/stats/status-overview');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'aperçu des statuts:", error);
    throw new Error("Impossible de récupérer l'aperçu des statuts.");
  }
};

const getQualityScores = async (): Promise<{
  scores: ArticleQualityScore[];
  incompleteArticles: ArticleQualityScore[];
}> => {
  try {
    const response = await axios.get<{
      scores: ArticleQualityScore[];
      incompleteArticles: ArticleQualityScore[];
    }>('/public/article/stats/quality-scores');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des scores de qualité:", error);
    throw new Error("Impossible de récupérer les scores de qualité.");
  }
};

const getSuspiciousArticles = async (): Promise<{
  zeroPrice: SuspiciousArticle[];
  highStock: SuspiciousArticle[];
  invalidReference: SuspiciousArticle[];
}> => {
  try {
    const response = await axios.get<{
      zeroPrice: SuspiciousArticle[];
      highStock: SuspiciousArticle[];
      invalidReference: SuspiciousArticle[];
    }>('/public/article/stats/suspicious-articles');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la détection d'articles suspects:", error);
    throw new Error("Impossible de détecter les articles suspects.");
  }
};

const getPriceTrends = async (): Promise<PriceTrend> => {
  try {
    const response = await axios.get<PriceTrend>('/public/article/stats/price-trends');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des tendances de prix:", error);
    throw new Error("Impossible de récupérer les tendances de prix.");
  }
};

const getStockHealth = async (): Promise<StockHealth> => {
  try {
    const response = await axios.get<StockHealth>('/public/article/stats/stock-health');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'état du stock:", error);
    throw new Error("Impossible de récupérer l'état du stock.");
  }
};

const getStockValueEvolution = async (days: number = 30): Promise<{ dates: string[]; values: number[] }> => {
  try {
    const response = await axios.get<{ dates: string[]; values: number[] }>(
      `/public/article/stats/stock-value-evolution?days=${days}`
    );
    return response.data || { dates: [], values: [] };
  } catch (error) {
    console.error("Erreur lors de la récupération de l'évolution du stock:", error);
    return { dates: [], values: [] };
  }
};

const getSimplifiedStockStatus = async (): Promise<SimplifiedStockStatus> => {
  try {
    const response = await axios.get<SimplifiedStockStatus>('/public/article/stats/simple-stock');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération du statut simplifié du stock:", error);
    throw new Error("Impossible de récupérer le statut simplifié du stock.");
  }
};

const getTopValuedArticles = async (): Promise<TopValuedArticle[]> => {
  try {
    const response = await axios.get<TopValuedArticle[]>('/public/article/stats/top-valued');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des articles les plus valorisés:", error);
    throw new Error("Impossible de récupérer les articles les plus valorisés.");
  }
};

const getAveragePriceByStatus = async (): Promise<AveragePriceByStatus> => {
  try {
    const response = await axios.get<AveragePriceByStatus>('/public/article/stats/avg-price-status');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération du prix moyen par statut:", error);
    throw new Error("Impossible de récupérer le prix moyen par statut.");
  }
};

const useInQuote = async (id: number): Promise<void> => {
  try {
    await axios.post(`/public/article/${id}/use-in-quote`);
  } catch (error) {
    console.error("Erreur lors de l'utilisation dans un devis:", error);
    throw new Error("Impossible d'utiliser l'article dans un devis");
  }
};

const useInOrder = async (id: number): Promise<void> => {
  try {
    await axios.post(`/public/article/${id}/use-in-order`);
  } catch (error) {
    console.error("Erreur lors de l'utilisation dans une commande:", error);
    throw new Error("Impossible d'utiliser l'article dans une commande");
  }
};

const restoreArticleVersion = async (
  id: number, 
  version: number
): Promise<ResponseArticleDto> => {
  try {
    const response = await axios.post<ResponseArticleDto>(
      `/public/article/${id}/restore-version/${version}`
    );
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la restauration de version:", error);
    throw new Error("Impossible de restaurer cette version");
  }
};

const updateArticleStatus = async (
  id: number, 
  newStatus: ArticleStatus
): Promise<ResponseArticleDto> => {
  try {
    const response = await axios.put<ResponseArticleDto>(
      `/public/article/${id}/status`,
      { status: newStatus },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut:", error);
    throw new Error("Erreur inconnue lors de la mise à jour du statut");
  }
};

// Méthodes pour les articles archivés
const getArchivedArticles = async (
  page: number = 1,
  size: number = 10,
  searchTerm: string = ''
): Promise<PagedArticle> => {
  try {
    const response = await axios.get<PagedArticle>(
      `/public/article/archived?page=${page}&limit=${size}&search=${searchTerm}`
    );
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des articles archivés:", error);
    throw new Error("Impossible de récupérer les articles archivés");
  }
};

const archiveArticle = async (id: number): Promise<ResponseArticleDto> => {
  try {
    const response = await axios.post<ResponseArticleDto>(
      `/public/article/${id}/archive`
    );
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'archivage de l'article:", error);
    throw new Error("Impossible d'archiver l'article");
  }
};

const unarchiveArticle = async (id: number): Promise<ResponseArticleDto> => {
  try {
    const response = await axios.post<ResponseArticleDto>(
      `/public/article/${id}/unarchive`
    );
    return response.data;
  } catch (error) {
    console.error("Erreur lors du désarchivage de l'article:", error);
    throw new Error("Impossible de désarchiver l'article");
  }
};

const restoreArticle = async (id: number): Promise<ResponseArticleDto> => {
  try {
    const response = await axios.post<ResponseArticleDto>(
      `/public/article/${id}/restore`
    );
    return response.data;
  } catch (error) {
    console.error("Error restoring article:", error);
    throw new Error("Failed to restore article");
  }
};

const findOneByReference = async (reference: string): Promise<Article | null> => {
  try {
    const response = await axios.get<Article>(`/public/article/by-reference/${reference}`);
    return response.data;
  } catch (error) {
    console.error('Error finding article by reference:', error);
    return null;
  }
};

const checkAvailability = async (
  id: number,
  quantity: number
): Promise<{
  available: boolean;
  availableQuantity: number;
  message?: string;
}> => {
  try {
    const response = await axios.get(`/public/article/${id}/check-availability?quantity=${quantity}`);
    return response.data;
  } catch (error) {
    console.error("Error checking article availability:", error);
    throw new Error("Failed to check article availability");
  }
};

const updateArticleStock = async (
  id: number,
  quantityChange: number
): Promise<Article> => {
  try {
    const response = await axios.put<Article>(`/public/article/${id}/update-stock`, {
      quantityChange
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du stock:", error);
    throw new Error("Impossible de mettre à jour le stock de l'article.");
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
  getSimpleStats,
  getStockAlerts,
  getStatusOverview,
  getQualityScores,
  getSuspiciousArticles,
  getPriceTrends,
  getStockHealth,
  getTopOutOfStockRisk,
  searchArticlesByTitle,
  getStockValueEvolution,
  getSimplifiedStockStatus,
  getTopValuedArticles,
  getAveragePriceByStatus,
  useInQuote,
  useInOrder,
  restoreArticleVersion,
  updateArticleStatus,
  // Méthodes pour les articles archivés
  getArchivedArticles,
  archiveArticle,
  unarchiveArticle,
  findActiveArticles,
  findArchivedArticles,
  restoreArticle,
  hardDelete,
  extractFromPdf,
  findOneByReference,
  checkAvailability,
  updateArticleStock,
};