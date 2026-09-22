' 🚀 Guia para Rodar Pulyn em Localhost

## Pré-requisitos
- Node.js instalado (v16+)
- npm instalado
- Banco de dados configurado (PostgreSQL ou SQL Server)

## Instalação Rápida

### 1️⃣ Instalar todas as dependências
```bash
npm run install:all
```

Isso vai instalar:
- Dependências do projeto raiz
- Dependências da API (`api/server`)
- Dependências do Frontend (`front-pulyn`)

### 2️⃣ Configurar variáveis de ambiente

#### Para a API (`api/server/.env`)
```env
# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=pulyn

# Servidor
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=sua_chave_secreta_aqui

# CORS
CORS_ORIGIN=http://localhost:5173
```

#### Para o Frontend (`front-pulyn/.env.local`)
```env
VITE_API_URL=http://localhost:3001/api
```

### 3️⃣ Rodar em Desenvolvimento

#### Opção A: Rodar tudo junto (API + Frontend)
```bash
npm run dev
```

Isso vai abrir:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001

#### Opção B: Rodar separadamente

Terminal 1 - API:
```bash
npm run dev:api
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
```

## 🧪 Testando as Mudanças

Após rodar `npm run dev`, acesse:

1. **Telão (Display)**: http://localhost:5173/display
2. **Master Dashboard**: http://localhost:5173/master
3. **Clientes**: http://localhost:5173/master/clients

## 📝 Mudanças Implementadas

### ✅ Melhorias no Telão (DisplayMain)
- Tela de vencedor agora aparece corretamente com animação
- Pontuações das crianças com destaque especial para o líder
- Checkpoints com informações mais claras e coloridas

### ✅ Melhorias na Caça ao Tesouro (TreasureArena)
- Tela de vencedor permanece visível por mais tempo
- Melhor visual com animações suaves

## 🔧 Troubleshooting

### Erro: "Cannot find module 'concurrently'"
```bash
npm install concurrently --save-dev
```

### Erro: "Port 3001 already in use"
Mude a porta na `.env`:
```env
PORT=3002
```

E atualize o frontend:
```env
VITE_API_URL=http://localhost:3002/api
```

### Erro: "Cannot connect to database"
Verifique as credenciais no `.env` da API e certifique-se que o banco está rodando.

## 📦 Build para Produção

```bash
npm run build
```

Isso vai:
1. Instalar dependências da API
2. Fazer build do Frontend (gera pasta `dist`)

## 🎯 Próximos Passos

1. Rode `npm run dev`
2. Abra http://localhost:5173 no navegador
3. Teste as mudanças no telão
4. Faça ajustes conforme necessário
5. Quando estiver pronto, faça deploy

---

**Dúvidas?** Verifique os logs no terminal para mais detalhes!
