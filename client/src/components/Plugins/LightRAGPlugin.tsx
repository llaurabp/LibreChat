import React, { useState, useRef, useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { useGetUserQuery } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { useAuthContext } from '~/hooks/AuthContext';
import { useToastContext } from '~/Providers';
import { Button } from '~/components/ui';
import { Upload, FileText, Trash2, Search, Loader2 } from 'lucide-react';
import { useLightRAGPlugin } from '~/hooks/Plugins/useLightRAGPlugin';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  created_at: string;
}

interface LightRAGPluginProps {
  pluginKey: string;
  isButton?: boolean;
}

const LightRAGPlugin: React.FC<LightRAGPluginProps> = ({ pluginKey, isButton = false }) => {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const { showToast } = useToastContext();
  const { data: userQuery } = useGetUserQuery();
  const { uploadFile, fetchDocuments, deleteDocument, searchKnowledgeBase, isLoading } = useLightRAGPlugin();
  
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lightragProxyUrl = userQuery?.plugins?.[pluginKey]?.LIGHTRAG_PROXY_URL || 'http://localhost:8081';

  // Load documents when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    const docs = await fetchDocuments();
    setDocuments(docs);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    if (result) {
      loadDocuments(); // Refresh documents list
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const success = await deleteDocument(documentId);
    if (success) {
      loadDocuments(); // Refresh documents list
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const answer = await searchKnowledgeBase(searchQuery);
    if (answer) {
      showToast({ message: `Search result: ${answer}`, status: 'success' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isButton) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        LightRAG
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        LightRAG Knowledge Base
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">LightRAG Knowledge Base</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                ×
              </Button>
            </div>

            {/* Upload Section */}
            <div className="mb-6 p-4 border rounded-lg">
              <h3 className="text-lg font-medium mb-3">Upload Document</h3>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.txt,.doc,.docx,.md"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isLoading ? 'Uploading...' : 'Choose File'}
                </Button>
                <span className="text-sm text-gray-500">
                  Supported: PDF, TXT, DOC, DOCX, MD
                </span>
              </div>
            </div>

            {/* Search Section */}
            <div className="mb-6 p-4 border rounded-lg">
              <h3 className="text-lg font-medium mb-3">Search Knowledge Base</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask a question about your documents..."
                  className="flex-1 px-3 py-2 border rounded-md"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim()}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>

            {/* Documents List */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Documents</h3>
                <Button
                  onClick={fetchDocuments}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="mt-2">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(doc.size)} • {formatDate(doc.created_at)} • {doc.status}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDeleteDocument(doc.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LightRAGPlugin;
