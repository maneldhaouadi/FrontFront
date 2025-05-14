import { Upload } from '@/types';
import axios from './axios';

const findAll = async (): Promise<Upload[]> => {
  const response = await axios.get(`public/storage/all`);
  return response.data;
};

const findOne = async (id: number): Promise<Upload> => {
  const response = await axios.get(`public/storage/${id}`);
  return response.data;
};

const deleteFile = async (id: number): Promise<void> => {
  try {
    await axios.delete(`public/storage/${id}`);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};

const deleteManyFiles = async (ids: number[]): Promise<void> => {
  try {
    await axios.delete(`public/storage`, { data: { ids } });
  } catch (error) {
    console.error('Error deleting files:', error);
    throw new Error('Failed to delete files');
  }
};

const uploadFile = async (file: File): Promise<{ id?: number; error?: string }> => {
  const formData = new FormData();
  formData.append('file', file); // Ajoute le fichier au FormData

  console.log('FormData content:', formData.get('file')); // Log pour vérifier le fichier
  console.log('File size:', file.size); // Vérifiez la taille du fichier
  console.log('File type:', file.type); // Vérifiez le type du fichier

  try {
    console.log('Sending request to backend...'); // Log pour vérifier que la requête est envoyée
    const response = await axios.post<{ id: number }>('public/storage/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // En-tête requis pour les fichiers
      },
    });

    console.log('Backend response:', response); // Log pour vérifier la réponse complète du backend

    // Assurez-vous que la réponse contient un ID
    if (response.data && response.data.id) {
      console.log('Upload successful, file ID:', response.data.id); // Log pour vérifier l'ID
      return { id: response.data.id };
    } else {
      console.error('No ID returned from server:', response.data); // Log supplémentaire
      return { error: 'No ID returned from server' };
    }
  } catch (error) {
    console.error('Error uploading file:', error); // Log pour afficher l'erreur complète
    return { error: 'Failed to upload file' };
  }
};
const uploadFiles = async (files: File[]): Promise<number[]> => {
  const uploadIds: number[] = [];

  for (const file of files) {
    const result = await uploadFile(file); // Utilise uploadFile pour chaque fichier

    if (result.id) {
      uploadIds.push(result.id); // Ajoute l'ID si l'upload a réussi
    } else {
      console.error(`Failed to upload file: ${file.name}`); // Log l'erreur
    }
  }

  return uploadIds;
};

const fetchBlobBySlug = async (slug?: string): Promise<Blob | null> => {
  try {
    const response = await axios.get(`public/storage/file/slug/${slug}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    return null;
  }
};

const fetchBlobById = async (id?: number): Promise<Blob | null> => {
  try {
    const response = await axios.get(`public/storage/file/id/${id}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    return null;
  }
};

const downloadFile = async (slug: string): Promise<void> => {
  const response = await axios.get(`public/storage/file/${slug}`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', slug);
  document.body.appendChild(link);
  link.click();
};

export const upload = {
  findAll,
  findOne,
  uploadFile,
  uploadFiles,
  fetchBlobBySlug,
  fetchBlobById,
  downloadFile,
  delete: deleteFile,           // Méthode pour supprimer un seul fichier
  deleteMany: deleteManyFiles   // Méthode pour supprimer plusieurs fichiers
};
