const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * LightRAG Database Hook
 * This hook intercepts file creation in the database and sends files to LightRAG
 */

const LIGHTRAG_PROXY_URL = process.env.LIGHTRAG_PROXY_URL || 'http://lightrag-proxy:8081';

async function sendFileToLightRAGFromPath(filepath, filename, mimetype, user_id) {
  const timestamp = new Date().toISOString();
  const logPrefix = `[${timestamp}] [LightRAG DB Hook]`;
  
  try {
    console.log(`${logPrefix} 🔄 Starting file upload to LightRAG from path`);
    console.log(`${logPrefix} 📁 File details:`, {
      filepath: filepath,
      filename: filename,
      mimetype: mimetype,
      user_id: user_id || 'unknown'
    });
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      console.log(`${logPrefix} ⚠️ File not found at path: ${filepath}`);
      return null;
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(filepath);
    const fileSize = fileBuffer.length;
    
    console.log(`${logPrefix} 📊 File size: ${fileSize} bytes`);
    
    // Create multipart form data manually
    const boundary = '----formdata-librechat-db-' + Math.random().toString(16);
    const CRLF = '\r\n';
    
    let body = '';
    body += '--' + boundary + CRLF;
    body += 'Content-Disposition: form-data; name="file"; filename="' + filename + '"' + CRLF;
    body += 'Content-Type: ' + mimetype + CRLF;
    body += CRLF;
    
    const headerBuffer = Buffer.from(body, 'utf8');
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
    
    return new Promise((resolve) => {
      const protocol = url.protocol === 'https:' ? https : http;
      const req = protocol.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`${logPrefix} ✅ LightRAG response received:`, {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            dataLength: data.length
          });
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`${logPrefix} 🎉 File successfully uploaded to LightRAG: ${filename}`);
            resolve(data);
          } else {
            console.error(`${logPrefix} ❌ LightRAG upload failed:`, {
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              response: data
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
        console.error(`${logPrefix} ❌ Timeout sending file to LightRAG: ${filename}`);
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
      filename: filename,
      filepath: filepath
    });
    return null;
  }
}

module.exports = {
  sendFileToLightRAGFromPath
};

