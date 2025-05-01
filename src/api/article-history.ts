import { CreateArticleHistoryDto, ResponseArticleHistoryDto } from '@/types/article-history';
import axios from './axios';

/**
 * Crée une nouvelle entrée d'historique pour un article.
 * @param createArticleHistoryDto - Les données de l'entrée d'historique à créer.
 * @returns L'entrée d'historique créée.
 */
const createHistoryEntry = async (
  createArticleHistoryDto: CreateArticleHistoryDto,
): Promise<ResponseArticleHistoryDto> => {
  try {
    const response = await axios.post<ResponseArticleHistoryDto>(
      '/article-history/create',
      createArticleHistoryDto,
    );
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la création de l'entrée d'historique:", error);
    throw new Error("Impossible de créer l'entrée d'historique.");
  }
};

/**
 * Supprime une version spécifique d'un article et ajuste les versions suivantes
 * @param articleId - L'ID de l'article
 * @param version - Le numéro de version à supprimer
 * @returns Promise<void>
 */
const deleteVersion = async (articleId: number, version: number): Promise<void> => {
  try {
    await axios.delete(`/public/article-history/${articleId}/version/${version}`);
  } catch (error) {
    console.error("Erreur lors de la suppression de la version:", error);
    throw new Error(`Impossible de supprimer la version ${version} de l'article ${articleId}`);
  }
};

const getArticleHistory = async (articleId: number): Promise<ResponseArticleHistoryDto[]> => {
  try {
    const { data } = await axios.get(`/public/article-history/${articleId}/history`);
    return data || [];
  } catch (error) {
    console.error('Failed to fetch history:', error);
    throw new Error('Failed to load article history');
  }
};

const downloadPdf = async (articleId: number, version: number): Promise<void> => {
  try {
    const response = await axios.get(
      `/public/article-history/${articleId}/version/${version}/download-pdf`,
      { responseType: 'blob' }
    );
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `article_${articleId}_v${version}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF download failed:', error);
    throw new Error('PDF download failed');
  }
};

/**
 * Génère un fichier PDF pour un article spécifique.
 * @param articleId - L'ID de l'article.
 * @returns Un message de succès ou d'erreur.
 */
const generatePdf = async (articleId: number): Promise<string> => {
  try {
    const response = await axios.get<string>(
      `/public/article-history/${articleId}/generate-files`,
    );
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    throw new Error("Impossible de générer le PDF.");
  }
};

export const articleHistory = {
  createHistoryEntry,
  getArticleHistory,
  generatePdf,
  downloadPdf,
  deleteVersion, // Ajout de la nouvelle fonction
};