# Pulyn offline na rede local

Este modo funciona sem internet, desde que o servidor, navegadores e ESP32 estejam na mesma LAN. Sem o servidor ou o banco local, o Pulyn não processa login, NFC, pontuação ou WebSocket.

## 1. Servidor e banco

1. Instale PostgreSQL no computador/mini-PC que ficará no evento.
2. Crie o banco `pulyn` e aplique `api/server/postgres-schema.sql`.
3. Copie `api/server/.env.lan.example` para `api/server/.env` e ajuste senha, JWT e IP.
4. Execute `npm install` em `api/server` e inicie com `npm.cmd start`.
5. Libere a porta TCP `3001` no firewall do Windows.

## 2. Frontend

1. Copie `front-pulyn/.env.lan.example` para `front-pulyn/.env`.
2. Troque `192.168.0.60` pelo IP reservado do servidor.
3. Execute `npm install` e `npm.cmd run build` em `front-pulyn`.
4. Reinicie o backend para ele servir o novo `front-pulyn/dist`.
5. Abra `http://IP_DO_SERVIDOR:3001` nos terminais.

## 3. ESP32

Nos firmwares C2, C2 modular, recepção e Score Kiosk, altere `PULYN_LAN_MODE` para `1` e confirme o valor de `PULYN_LAN_SERVER`. Grave cada firmware novamente. O modo LAN usa HTTP local; não use HTTPS sem certificado no ESP32.

## 4. Operação

Reserve o IP do servidor no roteador, mantenha todos os dispositivos na mesma sub-rede e desative o isolamento entre clientes do Wi-Fi. A instalação local é um banco separado da nuvem; sincronização posterior com Render/Supabase ainda não está incluída.
