const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const { sendFileToLightRAG } = require('/app/lightrag-file-hook');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Get LightRAG proxy URL from environment or user config
const getLightRAGProxyUrl = (req) => {
  const userPlugins = req.user?.plugins || {};
  const lightragConfig = userPlugins.lightrag || {};
  return lightragConfig.LIGHTRAG_PROXY_URL || process.env.LIGHTRAG_PROXY_URL || 'http://localhost:8081';
};

// Upload file to LightRAG
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No file provided' 
      });
    }

    const lightragProxyUrl = getLightRAGProxyUrl(req);
    const { originalname, mimetype, buffer } = req.file;

    console.log(`📁 LightRAG Plugin: Uploading file ${originalname} (${buffer.length} bytes)`);

    // Create form data for LightRAG proxy
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', buffer, {
      filename: originalname,
      contentType: mimetype,
    });

    // Forward to LightRAG proxy
    const response = await fetch(`${lightragProxyUrl}/v1/files/upload`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ LightRAG Plugin: File uploaded successfully: ${originalname}`);
      
      // Also call the hook for additional processing
      const fileBuffer = {
        buffer: buffer,
        originalname: originalname,
        mimetype: mimetype,
        size: buffer.length
      };
      
      const metadata = {
        user_id: req.user?.id || 'unknown',
        endpoint: 'LightRAG Plugin'
      };
      
      console.log(`🔄 LightRAG Plugin: Calling hook for additional processing`);
      sendFileToLightRAG(fileBuffer, metadata).catch(error => {
        console.error('❌ LightRAG Plugin: Hook failed:', error);
      });
      
      res.json({ 
        status: 'success', 
        message: `File "${originalname}" uploaded successfully to LightRAG`,
        data: result 
      });
    } else {
      console.error(`❌ LightRAG Plugin: Upload failed for ${originalname}:`, result);
      res.status(response.status).json({ 
        status: 'error', 
        message: `Failed to upload file to LightRAG: ${result.message || 'Unknown error'}`,
        data: result 
      });
    }
  } catch (error) {
    console.error(`❌ LightRAG Plugin: Upload error:`, error);
    res.status(500).json({ 
      status: 'error', 
      message: `Internal server error: ${error.message}` 
    });
  }
});

// Get documents from LightRAG
router.get('/documents', async (req, res) => {
  try {
    const lightragProxyUrl = getLightRAGProxyUrl(req);
    
    console.log(`📋 LightRAG Plugin: Fetching documents from ${lightragProxyUrl}`);

    const response = await fetch(`${lightragProxyUrl}/v1/documents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ LightRAG Plugin: Documents fetched successfully`);
      res.json({ 
        status: 'success', 
        documents: result.documents || [],
        data: result 
      });
    } else {
      console.error(`❌ LightRAG Plugin: Failed to fetch documents:`, result);
      res.status(response.status).json({ 
        status: 'error', 
        message: `Failed to fetch documents from LightRAG: ${result.message || 'Unknown error'}`,
        data: result 
      });
    }
  } catch (error) {
    console.error(`❌ LightRAG Plugin: Documents fetch error:`, error);
    res.status(500).json({ 
      status: 'error', 
      message: `Internal server error: ${error.message}` 
    });
  }
});

// Delete document from LightRAG
router.delete('/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const lightragProxyUrl = getLightRAGProxyUrl(req);
    
    console.log(`🗑️ LightRAG Plugin: Deleting document ${documentId}`);

    const response = await fetch(`${lightragProxyUrl}/v1/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ LightRAG Plugin: Document deleted successfully: ${documentId}`);
      res.json({ 
        status: 'success', 
        message: `Document deleted successfully`,
        data: result 
      });
    } else {
      console.error(`❌ LightRAG Plugin: Failed to delete document:`, result);
      res.status(response.status).json({ 
        status: 'error', 
        message: `Failed to delete document from LightRAG: ${result.message || 'Unknown error'}`,
        data: result 
      });
    }
  } catch (error) {
    console.error(`❌ LightRAG Plugin: Document delete error:`, error);
    res.status(500).json({ 
      status: 'error', 
      message: `Internal server error: ${error.message}` 
    });
  }
});

// Search in LightRAG knowledge base
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    const lightragProxyUrl = getLightRAGProxyUrl(req);
    
    if (!query) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Search query is required' 
      });
    }

    console.log(`🔍 LightRAG Plugin: Searching for: ${query}`);

    const response = await fetch(`${lightragProxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'lightrag:latest',
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ LightRAG Plugin: Search completed successfully`);
      res.json({ 
        status: 'success', 
        answer: result.choices?.[0]?.message?.content || 'No answer found',
        data: result 
      });
    } else {
      console.error(`❌ LightRAG Plugin: Search failed:`, result);
      res.status(response.status).json({ 
        status: 'error', 
        message: `Search failed: ${result.message || 'Unknown error'}`,
        data: result 
      });
    }
  } catch (error) {
    console.error(`❌ LightRAG Plugin: Search error:`, error);
    res.status(500).json({ 
      status: 'error', 
      message: `Internal server error: ${error.message}` 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'lightrag-plugin',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
