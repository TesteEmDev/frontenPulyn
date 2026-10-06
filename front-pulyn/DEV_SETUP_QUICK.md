# 🚀 Pulyn - Setup Rápido (5 minutos)

## ✅ Pré-requisitos
- [ ] Node.js 18+ (`node --version`)
- [ ] PostgreSQL 15 (`psql --version`)
- [ ] Git (`git --version`)

## 🚀 Setup Automático (Windows)

### Opção 1: PowerShell Script (Recomendado)
```powershell
# Abra PowerShell como Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Na pasta raiz do projeto:
./setup-dev-env.ps1
```

### Opção 2: Manual (Passo a Passo)

#### 1. Criar Banco de Dados PostgreSQL
```bash
psql -U postgres -c "CREATE DATABASE pulyn_dev OWNER postgres ENCODING 'UTF8';"
```

#### 2. Configurar .env
```bash
cp backendPulyn/.env.postgres backendPulyn/.env
```

Edite o arquivo e configure:
```env
DB_DRIVER=postgres
PGHOST=localhost
PGPORT=5432
PGDATABASE=pulyn_dev
PGUSER=postgres
PGPASSWORD=postgres123456  # Sua senha
DATABASE_URL=postgresql://postgres:postgres123456@localhost:5432/pulyn_dev
PORT=3001
FRONTEND_URL=http://localhost:5173
```

#### 3. Instalar Dependências
```bash
cd backendPulyn
npm install
npm install pg  # Se houver erro

cd ../front-pulyn
npm install
```

#### 4. Executar Migrations
```bash
cd backendPulyn
npm run migrate:all
```

#### 5. Iniciar Aplicação

**Terminal 1 - Backend:**
```bash
cd backendPulyn
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd front-pulyn
npm run dev
```

#### 6. Acessar
- 🌐 Frontend: http://localhost:5173
- 📡 Backend: http://localhost:3001/api

---

## 🔧 Verificação Rápida

```bash
# Backend está rodando?
curl http://localhost:3001/api/test

# PostgreSQL conectando?
psql -U postgres -d pulyn_dev -c "SELECT COUNT(*) FROM logins;"
```

---

## 🐘 PostgreSQL via Docker (Mais Fácil)

Se não quiser instalar PostgreSQL:

```bash
# Criar container
docker run --name pulyn-postgres \
  -e POSTGRES_PASSWORD=postgres123456 \
  -e POSTGRES_DB=pulyn_dev \
  -p 5432:5432 \
  -d postgres:15-alpine

# Depois, .env fica igual, mas PGHOST pode ser:
# - localhost (se Docker está rodando local)
# - docker.host.internal (Windows WSL)
```

---

## 📝 Estrutura do Projeto

```
Pullyn Web/
├── backendPulyn/              # API Node.js/Express
│   ├── index.js               # Servidor principal
│   ├── database.js            # Conexão PostgreSQL
│   ├── routes/                # API endpoints
│   ├── migrations/            # SQL schemas
│   ├── utils/                 # Lógica de negócio
│   ├── .env                   # Configuração (criar!)
│   └── package.json
│
├── front-pulyn/               # Frontend React
│   ├── src/
│   │   ├── pages/             # Componentes principais
│   │   ├── hooks/             # Custom hooks
│   │   ├── App.tsx            # Root component
│   │   └── index.css          # Estilos
│   └── package.json
│
├── checkpoints/               # Código Arduino
│   ├── pullynC2_modular/
│   ├── pullynReception/
│   └── pullynScore/
│
└── DEV_SETUP_QUICK.md         # Este arquivo
```

---

## 🎮 Primeiro Acesso

1. **Banco vazio?** Inserir dados de teste via API
2. **Sem usuário?** Criar admin:
   ```bash
   psql -U postgres -d pulyn_dev
   
   INSERT INTO logins (email, name, role, empresa_id)
   VALUES ('admin@buffet.com', 'Admin', 'admin', 'empresa-001');
   ```

---

## 🐛 Erros Comuns

| Erro | Solução |
|------|---------|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL não está rodando |
| `password authentication failed` | Verificar PGPASSWORD no .env |
| `database pulyn_dev does not exist` | Rodar: `psql -U postgres -c "CREATE DATABASE pulyn_dev;"` |
| `Module not found: pg` | `npm install pg` no backendPulyn |
| Frontend não conecta | Verificar FRONTEND_URL e CORS no backend |

---

## 📚 Guia Completo
Veja: `PULYN_DEV_SETUP.html` para documentação detalhada

---

## 💡 Dicas de Desenvolvimento

```bash
# Logs em tempo real
npm run dev

# TypeScript check
npm run typecheck

# Lint
npm run lint

# Testar conexão BD
npm run test-postgres

# Ver status da aplicação
curl http://localhost:3001/api/debug/game-status
```

---

**Tudo funcionando?** 🎉 Você está pronto para desenvolver!
