# 🔧 Guia: Configurar Arduino Modular para Local/Servidor

## 📍 Localização do Arquivo
```
checkpoints/pullynC2_modular/config.h
```

## 🎯 Como Mudar entre Local e Servidor

### Opção 1: Rodar no Servidor Online (Padrão)
```cpp
#define PULYN_LAN_MODE 0
```

**Resultado:**
- Conecta ao servidor: `https://backendpulyn.onrender.com`
- Ideal para produção

---

### Opção 2: Rodar Localmente (LAN)
```cpp
#define PULYN_LAN_MODE 1
```

**Resultado:**
- Conecta ao servidor local: `http://192.168.0.60:3001`
- Ideal para testes e desenvolvimento

---

## 📝 Passo a Passo

### 1️⃣ Abra o arquivo `config.h`
```
checkpoints/pullynC2_modular/config.h
```

### 2️⃣ Localize a linha:
```cpp
#define PULYN_LAN_MODE 0
```

### 3️⃣ Mude para:
- **`0`** = Servidor Online (Render)
- **`1`** = Servidor Local (LAN)

### 4️⃣ Salve o arquivo

### 5️⃣ Compile e envie para o Arduino

---

## 🌐 Configurações de Servidor

### Servidor Local (LAN)
```cpp
#define PULYN_LAN_SERVER "http://192.168.0.60:3001"
```
- **Quando usar:** Testes locais, desenvolvimento
- **Velocidade:** Mais rápida (2-3s de timeout)
- **Requisito:** API rodando em `http://192.168.0.60:3001`

### Servidor Online (Render)
```cpp
#define PULYN_ONLINE_SERVER "https://backendpulyn.onrender.com"
```
- **Quando usar:** Produção, eventos
- **Velocidade:** Mais lenta (4-10s de timeout)
- **Requisito:** Conexão com internet

---

## 🚀 Fluxo Rápido para Testar Localmente

1. **Inicie a API localmente:**
   ```bash
   npm run dev:api
   ```
   (Deve estar rodando em `http://localhost:3001`)

2. **Atualize o IP no Arduino** (se necessário):
   ```cpp
   #define PULYN_LAN_SERVER "http://192.168.0.60:3001"
   ```
   ⚠️ Substitua `192.168.0.60` pelo IP da sua máquina na rede

3. **Configure o Arduino:**
   ```cpp
   #define PULYN_LAN_MODE 1
   ```

4. **Compile e envie para o Arduino**

5. **Teste a leitura RFID** - Deve conectar ao servidor local

---

## 🔍 Verificar Qual Servidor Está Sendo Usado

Abra o Serial Monitor do Arduino IDE e procure por mensagens como:
- `Conectando ao servidor local...` → LAN Mode ativado
- `Conectando ao servidor online...` → Modo Online ativado

---

## ⚠️ Troubleshooting

### Arduino não conecta ao servidor local
1. Verifique se a API está rodando: `npm run dev:api`
2. Confirme o IP correto: `ipconfig` (Windows) ou `ifconfig` (Mac/Linux)
3. Verifique se o firewall permite conexões na porta 3001

### Arduino não conecta ao servidor online
1. Verifique conexão com internet
2. Confirme que o servidor Render está online
3. Aumente os timeouts se necessário

### Como encontrar o IP da sua máquina
**Windows:**
```bash
ipconfig
```
Procure por "IPv4 Address" (ex: 192.168.0.60)

**Mac/Linux:**
```bash
ifconfig
```
Procure por "inet" (ex: 192.168.0.60)

---

## 📌 Resumo Rápido

| Situação | PULYN_LAN_MODE | Servidor |
|----------|---|---|
| Testes locais | `1` | `http://192.168.0.60:3001` |
| Produção | `0` | `https://backendpulyn.onrender.com` |

---

**Dúvidas?** Verifique os logs do Serial Monitor do Arduino!
