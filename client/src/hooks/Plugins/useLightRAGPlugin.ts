import { useState, useCallback } from 'react';
import { useToastContext } from '~/Providers';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  created_at: string;
}

interface UploadResponse {
  status: string;
  message: string;
  data?: any;
}

interface DocumentsResponse {
  status: string;
  documents: Document[];
  data?: any;
}

interface SearchResponse {
  status: string;
  answer: string;
  data?: any;
}

export const useLightRAGPlugin = () => {
  const { showToast } = useToastContext();
  const [isLoading, setIsLoading] = useState(false);

  const uploadFile = useCallback(async (file: File): Promise<UploadResponse | null> => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/lightrag-plugin/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        showToast({ message: result.message, status: 'success' });
        return result;
      } else {
        showToast({ message: result.message, status: 'error' });
        return null;
      }
    } catch (error) {
      showToast({ message: 'Upload failed', status: 'error' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const fetchDocuments = useCallback(async (): Promise<Document[]> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/lightrag-plugin/documents');
      const result = await response.json();
      
      if (response.ok) {
        return result.documents || [];
      } else {
        showToast({ message: result.message, status: 'error' });
        return [];
      }
    } catch (error) {
      showToast({ message: 'Failed to fetch documents', status: 'error' });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lightrag-plugin/documents/${documentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (response.ok) {
        showToast({ message: result.message, status: 'success' });
        return true;
      } else {
        showToast({ message: result.message, status: 'error' });
        return false;
      }
    } catch (error) {
      showToast({ message: 'Failed to delete document', status: 'error' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const searchKnowledgeBase = useCallback(async (query: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/lightrag-plugin/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();
      
      if (response.ok) {
        return result.answer;
      } else {
        showToast({ message: result.message, status: 'error' });
        return null;
      }
    } catch (error) {
      showToast({ message: 'Search failed', status: 'error' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  return {
    uploadFile,
    fetchDocuments,
    deleteDocument,
    searchKnowledgeBase,
    isLoading,
  };
};

export default useLightRAGPlugin;
