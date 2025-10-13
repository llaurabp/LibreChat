# LightRAG Plugin for LibreChat

Este plugin integra o LightRAG (Retrieval Augmented Generation) diretamente no LibreChat, permitindo upload e gerenciamento de documentos na base de conhecimento.

## Funcionalidades

- **Upload de Documentos**: Faça upload de arquivos PDF, TXT, DOC, DOCX, MD para sua base de conhecimento LightRAG
- **Busca Inteligente**: Faça perguntas sobre seus documentos e receba respostas baseadas no conteúdo
- **Gerenciamento de Documentos**: Visualize, organize e exclua documentos da sua base de conhecimento
- **Interface Integrada**: Acesso direto através do menu de plugins do LibreChat

## Configuração

### 1. Configurar o LightRAG Proxy

O plugin se conecta ao LightRAG através de um proxy. Certifique-se de que o proxy está rodando:

```bash
cd lightrag-proxy
PORT=8081 LIGHTRAG_URL=http://localhost:9623 go run main.go
```

### 2. Configurar o Plugin no LibreChat

1. Acesse as configurações do LibreChat
2. Vá para a seção "Plugins"
3. Ative o plugin "LightRAG Knowledge Base"
4. Configure a URL do proxy LightRAG (ex: `http://localhost:8081`)

### 3. Usar o Plugin

1. No LibreChat, clique no botão "LightRAG Knowledge Base" na barra de ferramentas
2. Faça upload de seus documentos
3. Use a função de busca para fazer perguntas sobre seus documentos
4. Gerencie seus documentos através da interface

## Estrutura do Plugin

```
LibreChat/
├── api/
│   ├── app/clients/tools/
│   │   └── manifest.json          # Definição do plugin
│   └── server/routes/
│       └── lightrag-plugin.js     # API routes do plugin
├── client/src/
│   ├── components/Plugins/
│   │   └── LightRAGPlugin.tsx     # Componente React principal
│   └── hooks/Plugins/
│       └── useLightRAGPlugin.ts   # Hook personalizado
└── plugins/lightrag/
    └── README.md                  # Esta documentação
```

## API Endpoints

O plugin expõe os seguintes endpoints:

- `POST /api/lightrag-plugin/upload` - Upload de arquivos
- `GET /api/lightrag-plugin/documents` - Listar documentos
- `DELETE /api/lightrag-plugin/documents/:id` - Excluir documento
- `POST /api/lightrag-plugin/search` - Buscar na base de conhecimento
- `GET /api/lightrag-plugin/health` - Status do plugin

## Tipos de Arquivo Suportados

- PDF (.pdf)
- Texto (.txt)
- Microsoft Word (.doc, .docx)
- Markdown (.md)

## Limitações

- Tamanho máximo do arquivo: 50MB
- O LightRAG deve estar rodando e acessível
- O proxy LightRAG deve estar configurado corretamente

## Troubleshooting

### Plugin não aparece no LibreChat
- Verifique se o plugin está ativado nas configurações
- Reinicie o LibreChat após ativar o plugin

### Erro de conexão com LightRAG
- Verifique se o LightRAG está rodando na porta 9623
- Verifique se o proxy LightRAG está rodando na porta 8081
- Confirme a URL do proxy nas configurações do plugin

### Upload de arquivos falha
- Verifique o tamanho do arquivo (máximo 50MB)
- Confirme se o tipo de arquivo é suportado
- Verifique os logs do LibreChat para erros detalhados

## Desenvolvimento

Para modificar o plugin:

1. Edite os arquivos na estrutura acima
2. Reinicie o LibreChat para aplicar as mudanças
3. Teste as funcionalidades através da interface

## Licença

Este plugin segue a mesma licença do LibreChat.
