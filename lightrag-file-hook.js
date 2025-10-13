const https = require('https');
const http = require('http');

/**
 * LightRAG File Upload Hook
 * This middleware automatically sends uploaded files to LightRAG for processing
 */

const LIGHTRAG_PROXY_URL = process.env.LIGHTRAG_PROXY_URL || 'http://lightrag-proxy:8082';

async function sendFileToLightRAG(file, metadata) {
  const timestamp = new Date().toISOString();
  const logPrefix = `[${timestamp}] [LightRAG Hook]`;
  
  try {
    console.log(`${logPrefix} 🔄 Starting file upload to LightRAG`);
    console.log(`${logPrefix} 📁 File details:`, {
      filename: file.originalname,
      size: file.buffer?.length || file.size,
      mimetype: file.mimetype,
      user_id: metadata?.user_id || 'unknown'
    });
    
    // Create multipart form data manually
    const boundary = '----formdata-librechat-' + Math.random().toString(16);
    const CRLF = '\r\n';
    
    let body = '';
    body += '--' + boundary + CRLF;
    body += 'Content-Disposition: form-data; name="file"; filename="' + file.originalname + '"' + CRLF;
    body += 'Content-Type: ' + file.mimetype + CRLF;
    body += CRLF;
    
    const headerBuffer = Buffer.from(body, 'utf8');
    const fileBuffer = file.buffer;
    const footerBuffer = Buffer.from(CRLF + '--' + boundary + '--' + CRLF, 'utf8');
    
    const totalLength = headerBuffer.length + fileBuffer.length + footerBuffer.length;
    
    const postData = Buffer.concat([headerBuffer, fileBuffer, footerBuffer]);
    
    const url = new URL(`${LIGHTRAG_PROXY_URL}/v1/files/upload`);
    console.log(`${logPrefix} 🌐 Sending to LightRAG proxy: ${url.toString()}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': totalLength
      },
      timeout: 300000 // 5 minutes
    };
    
    console.log(`${logPrefix} 📤 Request options:`, {
      hostname: options.hostname,
      port: options.port,
      path: options.path,
      contentLength: totalLength,
      timeout: options.timeout
    });

    return new Promise((resolve, reject) => {
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        console.log(`${logPrefix} 📨 Response received:`, {
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers
        });
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log(`${logPrefix} ✅ File sent to LightRAG successfully:`, {
              track_id: response.track_id,
              status: response.status,
              message: response.message
            });
            resolve(response);
          } catch (error) {
            console.error(`${logPrefix} ❌ Error parsing LightRAG response:`, {
              error: error.message,
              rawData: data.substring(0, 500) // First 500 chars for debugging
            });
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        console.error(`${logPrefix} ❌ Network error sending file to LightRAG:`, {
          error: error.message,
          code: error.code,
          errno: error.errno
        });
        resolve(null);
      });

      req.on('timeout', () => {
        console.error(`${logPrefix} ❌ Timeout sending file to LightRAG after 5 minutes`);
        req.destroy();
        resolve(null);
      });

      console.log(`${logPrefix} 📤 Sending request data...`);
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error(`${logPrefix} ❌ Unexpected error sending file to LightRAG:`, {
      error: error.message,
      stack: error.stack,
      filename: file.originalname
    });
    // Don't throw error - we don't want to break LibreChat's file upload
    return null;
  }
}

module.exports = {
  sendFileToLightRAG
};
