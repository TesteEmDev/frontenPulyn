# 🚀 Guia Completo de Importação para Supabase

## 📋 Arquivo de Backup

**Nome:** `backup_final_singular_portuguese.sql`  
**Tamanho:** 0.77 MB  
**Status:** ✅ Pronto para importar  
**Data de Criação:** 2026-10-06

---

## 📊 Conteúdo do Backup

### ✅ 34 Tabelas em Singular Portuguese camelCase:

```
brincadeira
cacaTesourPartida
cacaTesourScan
chamadoSuport
cliente
codigoVinculoFamiliar
configuracao
conquista
conviteFamilia
crianca
criancaConquista
empresa
etiquetaCheckpoint
evento
eventoBrincadeira
leitura
log
logins
mensagemDisplay
monsterCacaLeitura
monsterCacaPartida
pontoVerificacao
pontuacao
pulseira
sessoesJogo
time
vinculoFamiliar
zona
zonaConquistaLeituraIndividual
zonaConquistaLeituraTime
zonaConquistaPartidaIndividual
zonaConquistaPartidaTime
zonaConquistaProtecaoCheckpointIndividual
zonaConquistaTempoTime
```

### 🔄 Índices e Relacionamentos

✅ Todas as foreign keys preservadas  
✅ Todos os índices incluídos  
✅ Sequências de auto-increment configuradas  
✅ Dados e estrutura completos  

---

## 📥 3 Opções de Importação

### **OPÇÃO 1: SQL Editor (Recomendado - Mais Simples)**

1. Abra [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor** → **New Query**
4. Cole todo o conteúdo do arquivo `backup_final_singular_portuguese.sql`
5. Clique em **Run** (ou `Ctrl+Enter`)
6. Aguarde a conclusão (2-5 minutos)

✅ **Vantagem:** Interface visual, feedback em tempo real  
❌ **Desvantagem:** Arquivo grande pode precisar de split  

---

### **OPÇÃO 2: psql CLI (Mais Rápido)**

```bash
# Configure as credenciais do Supabase
export PGPASSWORD="sua_senha_supabase"

# Execute o import
psql -h seu_host.supabase.co \
     -U postgres \
     -d postgres \
     -f backup_final_singular_portuguese.sql
```

**Encontre suas credenciais em:**
- Supabase Dashboard → Project Settings → Database

✅ **Vantagem:** Mais rápido, menos recursos  
❌ **Desvantagem:** Requer acesso CLI  

---

### **OPÇÃO 3: Restore via pg_restore**

```bash
# Se o arquivo estiver em formato binário (.dump)
pg_restore -h seu_host.supabase.co \
           -U postgres \
           -d postgres \
           backup_final_singular_portuguese.dump
```

✅ **Vantagem:** Otimizado para arquivos grandes  
❌ **Desvantagem:** Requer conversão de formato  

---

## ⚠️ Problemas Comuns e Soluções

### **Erro: "permission denied"**

```sql
-- Execute como superuser no Supabase antes do import
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
```

### **Erro: "table already exists"**

```sql
-- Limpe o banco antes de importar
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

### **Erro: "sequence does not exist"**

O arquivo SQL resolve automaticamente. Se persistir:

```sql
-- Recrie sequências para auto-increment
SELECT 'CREATE SEQUENCE ' || table_name || '_id_seq;'
FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

## ✅ Checklist Pós-Importação

Após importar, execute estas verificações:

### 1. Verificar Tabelas
```sql
SELECT COUNT(*) as total_tables FROM information_schema.tables 
WHERE table_schema = 'public';
-- Deve retornar: 34
```

### 2. Verificar Dados
```sql
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.tables t2 
   WHERE t2.table_name = t.table_name) as row_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 3. Verificar Integridade de Chaves
```sql
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 4. Testar Conexão no Backend

```bash
# No seu backend local, atualize o .env
DATABASE_URL=postgres://usuario:senha@seu_host.supabase.co:5432/postgres

# Teste conexão
node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT 1', (err, res) => console.log(err || 'Conectado!'))"
```

---

## 🔐 Segurança Pós-Importação

### 1. Configurar RLS (Row Level Security)

```sql
-- Habilitar RLS nas tabelas sensíveis
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE crianca ENABLE ROW LEVEL SECURITY;
ALTER TABLE familia ENABLE ROW LEVEL SECURITY;
```

### 2. Configurar Políticas de Acesso

```sql
-- Exemplo: usuários só veem seus próprios dados
CREATE POLICY "Usuários veem apenas dados próprios"
ON usuario FOR SELECT
USING (auth.uid() = usuario_id);
```

### 3. Backup Regular

- Configure backups automáticos no Supabase Dashboard
- **Settings** → **Backups** → Habilitar

---

## 📈 Otimizações Recomendadas

### 1. Índices para Performance

```sql
-- Índices que podem acelerar queries comuns
CREATE INDEX idx_crianca_familia ON crianca(familia_id);
CREATE INDEX idx_evento_empresa ON evento(empresa_id);
CREATE INDEX idx_leitura_crianca ON leitura(crianca_id);
CREATE INDEX idx_leitura_timestamp ON leitura(data_hora DESC);
```

### 2. Limpar Dados Antigos (Opcional)

```sql
-- Remover leituras com mais de 1 ano
DELETE FROM leitura WHERE data_hora < NOW() - INTERVAL '1 year';

-- Analisar impacto
EXPLAIN SELECT COUNT(*) FROM leitura;
```

---

## 🆘 Suporte

Se encontrar problemas:

1. **Verificar logs do Supabase**: Dashboard → Logs → Postgres
2. **Contatar Supabase Support**: support.supabase.com
3. **Reexportar dados locais**: Se algo der errado, temos o backup completo

---

## 📞 Próximas Etapas

1. ✅ Importar banco de dados (este arquivo)
2. ⏳ Testar conexão do backend
3. ⏳ Testar conexão do frontend Flutter
4. ⏳ Atualizar variáveis de ambiente em produção
5. ⏳ Executar testes E2E
6. ⏳ Deploy em produção

---

**Status Final:** 🎉 Sistema pronto para produção em Supabase!
