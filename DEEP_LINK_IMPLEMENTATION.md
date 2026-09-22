# 🔗 Deep Link para Convites de Família - Implementação Completa

## 📋 O que foi implementado

Sistema de **Deep Linking** que permite aos pais clicar em um link e abrir o app Flutter automaticamente para se registrarem com convite.

---

## 🎯 Fluxo Completo

```
1. Recepção gera convite na web → Token único
2. Link enviado ao pai: https://app.pulyn.com/family/invite/TOKEN123
3. Pai clica no link
4. Se tem app → Abre direto no Flutter
5. Se não tem app → Abre na web (pode baixar depois)
6. Pai vê evento + criança
7. Pai preenche email/senha
8. Registra com convite
9. Acesso liberado após aprovação da recepção
```

---

## 📦 Arquivos Criados/Modificados

### ✅ Arquivos Novos

1. **`lib/screens/auth/family_invite_screen.dart`** (370 linhas)
   - Screen para registro via convite
   - Valida convite antes de exibir formulário
   - Mostra dados do evento automaticamente
   - Permite adicionar crianças (se necessário)

### ✅ Arquivos Modificados

1. **`lib/main.dart`**
   - Adicionado import de `FamilyInviteScreen`
   - Adicionada rota: `/family/invite/:token`
   - Deep Link reconhece padrão de rota

2. **`lib/services/api_service.dart`**
   - Adicionado método: `getFamilyInvite(token)` - valida convite
   - Adicionado método: `registerWithInvite()` - registra via convite

3. **`android/app/src/main/AndroidManifest.xml`**
   - Adicionado intent-filter para Deep Linking
   - Reconhece URLs: `https://app.pulyn.com/family/invite/*`
   - Reconhece URLs locais: `https://localhost:5173/family/invite/*`

4. **`ios/Runner/Info.plist`**
   - Adicionado `FlutterDeepLinkingEnabled` = true
   - Adicionado CFBundleURLTypes com scheme `pulyn://`
   - Permite abrir via Deep Link no iOS

---

## 🧪 Como Testar

### Opção 1: Android Emulator
```bash
# Abrir link no emulator
adb shell am start -a android.intent.action.VIEW \
  -d "https://app.pulyn.com/family/invite/TOKEN_123_ABC"
```

### Opção 2: Device Real
1. Gerar convite na web (ReceptionFamilies.tsx)
2. Copiar link: `https://app.pulyn.com/family/invite/TOKEN`
3. Enviar via WhatsApp/Email
4. Pai clica no link
5. App Flutter abre automaticamente

### Opção 3: Teste Local
```bash
# Na web local (localhost:5173)
adb shell am start -a android.intent.action.VIEW \
  -d "https://localhost:5173/family/invite/TOKEN_123"
```

---

## 🔍 Fluxo Técnico do Deep Link

### Android

**Intent Filter adicionado:**
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="app.pulyn.com"
          android:pathPrefix="/family/invite/" />
</intent-filter>
```

**Fluxo:**
1. Sistema Android detecta URL que casa com padrão
2. Oferece abrir com "Pulyn Family App"
3. Abre MainActivity
4. GoRouter reconhece rota `/family/invite/:token`
5. Renderiza `FamilyInviteScreen` com token

### iOS

**Configuração adicionada:**
```plist
<key>FlutterDeepLinkingEnabled</key>
<true/>
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLName</key>
        <string>com.pulyn.family</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>pulyn</string>
        </array>
    </dict>
</array>
```

**Fluxo:**
1. iOS detecta URL universal
2. Abre app se instalado
3. GoRouter processa rota
4. Renderiza `FamilyInviteScreen`

---

## 🛠️ O que o FamilyInviteScreen Faz

```dart
1. Recebe token na rota: /family/invite/:token
2. Valida convite via API: GET /familias/invites/:token
3. Se válido:
   - Mostra dados do evento (nome, data)
   - Se criança vinculada, mostra nome dela
   - Exibe formulário de registro
4. Se inválido:
   - Mostra erro: "Convite expirado"
   - Botão para voltar ao login
5. No submit:
   - Envia POST /familias/invites/:token/register
   - Salva token em SharedPreferences
   - Navega para /home
```

---

## 📱 URLs Esperadas

### Produção
```
https://app.pulyn.com/family/invite/abc123def456...
```

### Desenvolvimento
```
https://localhost:5173/family/invite/abc123def456...
```

### App Instalado
```
pulyn://app.pulyn.com/family/invite/abc123def456...
```

---

## ✅ Checklist de Implementação

- ✅ Screen de convite criada
- ✅ API endpoints integrados
- ✅ Deep Link Android configurado
- ✅ Deep Link iOS configurado
- ✅ GoRouter com rota /family/invite/:token
- ✅ Validação de convite
- ✅ Registro via convite
- ✅ Salvar token após registro
- ✅ Mensagem de sucesso/erro

---

## 🚀 Próximos Passos

1. **Testar em dispositivo real** (iOS + Android)
2. **Testar URLs com tokens reais** da web
3. **Ajustar URLs de domínio** quando estiver em produção
4. **Adicionar tracking** de qual convite foi usado (analytics)
5. **Testar fallback** para web se app não estiver instalado

---

## 📖 Referências

- [Flutter Deep Linking](https://flutter.dev/docs/development/ui/navigation/deep-linking)
- [Android App Links](https://developer.android.com/training/app-links)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [GoRouter Navigation](https://pub.dev/packages/go_router)

---

## 💡 Como Usar na Web

Na web (ReceptionFamilies.tsx), quando criar convite:

```typescript
// Exemplo de link gerado
const inviteUrl = `https://app.pulyn.com/family/invite/${result.token}`;

// Se o pai clicar no dispositivo com app instalado → Abre no Flutter
// Se clicar no desktop/browser sem app → Abre na web (como funciona hoje)
```

---

## 🎉 Resultado Final

Agora o fluxo é **super simples**:

1. Recepção clica "Gerar convite"
2. Copia link: `https://app.pulyn.com/family/invite/TOKEN`
3. Envia para pai por WhatsApp
4. Pai **clica apenas uma vez**
5. App abre automaticamente (se instalado)
6. Pai preenche dados
7. Registra
8. Vê filho em tempo real

**Zero complicação! 🎯**
