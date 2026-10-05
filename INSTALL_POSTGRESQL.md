# 🐘 Instalar PostgreSQL no Windows

## ⚡ Quick Start (5 minutos)

### Opção 1: PostgreSQL Instalador (Recomendado)

#### Passo 1: Download
1. Acesse: https://www.postgresql.org/download/windows/
2. Clique em **"Download the installer"**
3. Escolha a versão **15.x** (ou mais recente)
4. Salve o arquivo `postgresql-15.x-windows-x64.exe`

#### Passo 2: Executar Instalador
1. **Duplo-clique** no instalador
2. Clique **"Next"** na primeira tela
3. Caminho de instalação: `C:\Program Files\PostgreSQL\15` (padrão)
4. Clique **"Next"**

#### Passo 3: Selecionar Componentes
Marque as caixas:
- ✅ PostgreSQL Server
- ✅ pgAdmin 4 (gerenciador GUI)
- ✅ Stack Builder (opcional)
- ✅ Command Line Tools (IMPORTANTE!)

Clique **"Next"**

#### Passo 4: Definir Senha
1. **Database Superuser Password:** Digite `postgres123456`
   - (Use uma senha mais segura em produção)
2. Confirme a senha
3. Clique **"Next"**

#### Passo 5: Porta e Locale
1. Port: `5432` (padrão)
2. Locale: Deixe vazio (padrão do Windows)
3. Clique **"Next"**

#### Passo 6: Finalizar
Clique **"Finish"** e aguarde a instalação

---

### Opção 2: PostgreSQL via Docker (Mais Fácil, sem instalação)

#### Pré-requisito: Instalar Docker Desktop
1. Download: https://www.docker.com/products/docker-desktop
2. Instale e reinicie o Windows
3. Abra PowerShell como Admin

#### Criar Container PostgreSQL
```powershell
docker run --name pulyn-postgres `
  -e POSTGRES_PASSWORD=postgres123456 `
  -e POSTGRES_DB=pulyn_dev `
  -p 5432:5432 `
  -v postgres_data:/var/lib/postgresql/data `
  -d postgres:15-alpine
```

Aguarde alguns segundos...

#### Verificar se está rodando
```powershell
docker ps
```

Você deve ver:
```
CONTAINER ID   IMAGE              PORTS
abc123...      postgres:15-alpine 0.0.0.0:5432->5432/tcp
```

---

## ✅ Verificar Instalação

Abra **PowerShell** e execute:

```powershell
psql --version
```

Deve mostrar:
```
psql (PostgreSQL) 15.x
```

Se não funcionar, adicione PostgreSQL ao PATH:

### Windows 10/11 - Adicionar ao PATH
1. Pressione **Windows + X** → **System** (Configurações)
2. Vá para **Advanced system settings** → **Environment Variables**
3. Em "System variables", encontre `Path` e clique **Edit**
4. Clique **New** e adicione:
   ```
   C:\Program Files\PostgreSQL\15\bin
   ```
5. Clique **OK** 3x
6. **Reinicie o PowerShell**
7. Teste novamente: `psql --version`

---

## 🗄️ Criar Banco de Dados

Após instalar, crie o banco `pulyn_dev`:

```powershell
psql -U postgres -c "CREATE DATABASE pulyn_dev OWNER postgres ENCODING 'UTF8';"
```

Se pedir senha, digite: `postgres123456`

Deve mostrar:
```
CREATE DATABASE
```

---

## 🔄 Agora Execute o Setup

Depois que PostgreSQL estiver instalado, rode:

```powershell
cd "C:\Users\Walisson\Documents\Pullyn Web"
.\setup-dev-env-simple.ps1
```

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| `psql: command not found` | PostgreSQL não está no PATH. Reinicie o PowerShell após adicionar ao PATH |
| `connection refused` | PostgreSQL não está rodando. Inicie: `net start postgresql-x64-15` |
| `password authentication failed` | Senha incorreta. Tente `postgres123456` |
| Erro com Docker | Certifique-se que Docker Desktop está aberto e rodando |

---

## 💡 Dica: Iniciar/Parar PostgreSQL

### Se instalou normalmente:
```powershell
# Iniciar
net start postgresql-x64-15

# Parar
net stop postgresql-x64-15

# Status
Get-Service -Name postgresql-x64-15
```

### Se usou Docker:
```powershell
# Iniciar container
docker start pulyn-postgres

# Parar container
docker stop pulyn-postgres

# Ver logs
docker logs pulyn-postgres
```

---

## 📝 Próximo Passo

Depois de instalar PostgreSQL, volte ao projeto e execute:

```powershell
.\setup-dev-env-simple.ps1
```

Pronto! 🎉
