import { PagedResponse } from './response';
import { DatabaseEntity } from './response/DatabaseEntity';

// Interface de base pour un article
export interface Article  {
  id: number;
  title?: string;
  description?: string;
  reference: string;
  quantityInStock: number;
  status: string;
  version: number;
  notes?: string;
  justificatifFile?: {
    data: Buffer;
    filename?: string;
    mimeType?: string;
    size?: number;
  };
  unitPrice: number;
  history?: Array<{
    version: number;
    changes: Record<string, { oldValue: any; newValue: any }>;
    date: Date;
  }>;
  isDeletionRestricted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// DTO pour la création d'un article
export interface CreateArticleDto {
  title?: string;
  description?: string;
  reference: string;
  quantityInStock: number;
  status: string;
  notes?: string;
  justificatifFile?: File;
  unitPrice: number;
}

// DTO pour la réponse d'un article
export interface ResponseArticleDto {
  id: number;
  title?: string;
  description?: string;
  reference: string;
  quantityInStock: number;
  status: string;
  version: number;
  notes?: string;
  justificatifFile?: {
    data: Buffer;
    filename?: string;
    mimeType?: string;
    size?: number;
  };
  unitPrice: number;
  isDeletionRestricted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  history?: Array<{
    version: number;
    changes: Record<string, { oldValue: any; newValue: any }>;
    date: Date;
  }>;
}

export interface UpdateArticleDto {
  title?: string;
  description?: string;
  reference: string;
  quantityInStock: number;
  status: ArticleStatus;
  notes?: string;
  unitPrice: number;
  justificatifFile?: File; // Ajouter cette ligne
}


// Représentation paginée des articles
export interface PagedArticle extends PagedResponse<Article> {}

// Interfaces pour la recherche
export interface QrCodeSearchResponse {
  article?: Article;
  message?: string;
}

export interface BarcodeSearchResponse {
  article?: Article;
  message?: string;
}

// Interfaces pour l'extraction et la comparaison
export interface ArticleExtractedData {
  title?: string;
  description?: string;
  reference?: string;
  quantityInStock?: number;
  status?: string;
  unitPrice?: number;
  rawText?: string;
  confidenceScores?: {
    title?: number;
    reference?: number;
    prices?: number;
    [key: string]: number | undefined;
  };
}

export interface FieldComparisonResult {
  field: string;
  match: boolean;
  articleValue: any;
  extractedValue: any;
  confidence?: number;
}

export interface ArticleComparisonResult {
  article: Article;
  sourceType: 'pdf' | 'image';
  sourceName: string;
  matches: Record<string, boolean>;
  differences: Record<string, {
    articleValue: any;
    extractedValue: any;
  }>;
  similarityScore: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  processingTimeMs?: number;
  fieldResults: FieldComparisonResult[];
  extractedData?: ArticleExtractedData;
}

export interface ArticleCompareResponseDto {
  success: boolean;
  comparison?: ArticleComparisonResult;
  error?: string;
}

// Interfaces pour l'OCR et extraction PDF
export interface OcrProcessingResult {
  text: string;
  confidence: number;
  imageMetrics?: {
    sharpness: number;
    contrast: number;
  };
}

export interface PdfExtractionResult extends ArticleExtractedData {
  pagesProcessed: number;
  extractionMethod: string;
}

// Interface pour les suggestions de catégories (maintenant pour les références)
export interface ReferenceSuggestion {
  name: string;
  similarity: number;
  existing?: boolean;
}

// Validation des références
export interface ReferenceValidationResult {
  valid: boolean;
  suggestedReferences?: ReferenceSuggestion[];
  exactMatch?: boolean;
}

// Historique des versions
export interface ArticleVersionInfo {
  version: number;
  date: Date;
  changesSummary: string[];
  changedBy?: string;
}

export interface ArticleVersionsResponse {
  currentVersion: number;
  availableVersions: ArticleVersionInfo[];
}


interface ArticleStats {
  totalArticles: number;
  statusDistribution: Record<string, number>;
  outOfStockCount: number;
  totalStockValue: number;
  averageStockPerArticle: number;
  lowStockCount: number;
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
  issue: string;
  value?: number;
}


// Statuts possibles des articles
export type ArticleStatus = 
  | 'draft' 
  | 'active' 
  | 'inactive' 
  | 'archived' 
  | 'out_of_stock' 
  | 'pending_review' 
  | 'deleted';

// Interface pour le fichier justificatif
export interface JustificatifFile {
  data: Buffer;
  filename?: string;
  mimeType?: string;
  size?: number;
}