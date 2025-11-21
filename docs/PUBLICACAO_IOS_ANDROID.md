# 📱 Guia de Publicação - iOS e Android

## 🎯 Configurações Implementadas

### ✅ iOS (App Store)
- Bundle Identifier: `com.movimento.sz`
- Deployment Target: iOS 13.4+
- Suporte a iPhone e iPad
- Build Number automático (auto-increment)
- Permissões configuradas (câmera, fotos)
- Info.plist completo
- Configuração para Apple Sign In desabilitada
- Resource Class: m1-medium (build mais rápido)

### ✅ Android (Google Play)
- Package: `com.movimento.sz`
- Min SDK: 24 (Android 7.0)
- Target SDK: 35 (Android 15)
- Compile SDK: 35
- Version Code: Auto-increment
- Adaptive Icon configurado
- Permissões configuradas
- Build type: AAB (App Bundle) para produção

---

## 📋 Pré-requisitos para Publicação

### Para iOS (App Store)

1. **Conta Apple Developer** (US$ 99/ano)
   - Acesse: https://developer.apple.com
   - Cadastre com o Apple ID: `sahzigler.jf@hotmail.com`

2. **App Store Connect**
   - Criar o app no App Store Connect
   - App ID: `6475797673` (já configurado)
   - Team ID: `9X4J2H6349` (já configurado)

3. **Certificados e Provisioning Profiles**
   - Distribution Certificate
   - App Store Provisioning Profile
   - Push Notification Certificate (se usar notificações)

4. **API Key da App Store Connect** ✅ (já configurado)
   - Key ID: `TH64QA9U4J`
   - Issuer ID: `07c03008-e68c-40c3-b705-b28689e3874e`
   - Arquivo P8: `AuthKey_TH64QA9U4J.p8`

### Para Android (Google Play)

1. **Conta Google Play Developer** (US$ 25 única vez)
   - Acesse: https://play.google.com/console

2. **Criar o App no Google Play Console**
   - Nome: "Movimento SZ"
   - Package: `com.movimento.sz`

3. **Service Account Key** (para upload automático)
   - Criar service account no Google Cloud Console
   - Baixar arquivo JSON
   - Salvar como `google-play-service-account.json` na raiz do projeto

4. **Keystore de Assinatura**
   - Você precisará criar ou já ter um keystore
   - EAS Build gerará automaticamente se não tiver

---

## 🚀 Comandos de Build e Publicação

### 1️⃣ Instalar EAS CLI (se não tiver)

```bash
npm install -g eas-cli
```

### 2️⃣ Login no EAS

```bash
eas login
```

Use as credenciais da conta Expo associada ao projeto.

### 3️⃣ Build para iOS (App Store)

**Build de produção:**
```bash
eas build --platform ios --profile production
```

**Build de preview (TestFlight):**
```bash
eas build --platform ios --profile preview
```

### 4️⃣ Build para Android (Google Play)

**Build de produção (AAB):**
```bash
eas build --platform android --profile production
```

**Build de preview (APK para teste):**
```bash
eas build --platform android --profile preview
```

### 5️⃣ Build para Ambas as Plataformas

```bash
eas build --platform all --profile production
```

---

## 📤 Publicação Automática (Submit)

### iOS (App Store)

```bash
eas submit --platform ios --profile production
```

**O que acontece:**
1. Upload automático para App Store Connect
2. Enviado para revisão da Apple
3. Aguardar aprovação (1-3 dias normalmente)

### Android (Google Play)

```bash
eas submit --platform android --profile production
```

**O que acontece:**
1. Upload automático para Google Play Console
2. Publicado na track "production"
3. Rollout gradual (pode configurar)

---

## 🔑 Configurar Credenciais

### iOS - Primeira Build

Na primeira build iOS, o EAS vai perguntar:

```
? Would you like to log in to your Apple account? Yes
```

Digite o Apple ID: `sahzigler.jf@hotmail.com`

O EAS vai:
1. Gerar certificados automaticamente
2. Criar provisioning profiles
3. Salvar tudo na nuvem do EAS

### Android - Keystore

Na primeira build Android:

```
? Would you like to generate a Keystore? Yes
```

O EAS vai:
1. Gerar um keystore automaticamente
2. Salvar na nuvem do EAS
3. Reutilizar nas próximas builds

---

## 📝 Checklist Antes de Publicar

### Assets Necessários

- [ ] **Icon** (1024x1024 PNG)
  - Caminho: `./assets/icon.png`
  - Sem transparência, sem bordas arredondadas

- [ ] **Splash Screen** (1284x2778 PNG recomendado)
  - Caminho: `./assets/splash.png`
  - Fundo branco

- [ ] **Adaptive Icon Android** (1024x1024 PNG)
  - Caminho: `./assets/adaptive-icon.png`
  - Área segura: círculo central de 768x768

- [ ] **Screenshots**
  - iOS: 6.5", 6.7", 5.5" displays
  - Android: Phone, 7", 10" tablets

### Informações do App

- [ ] **Descrição curta** (80 caracteres)
- [ ] **Descrição completa** (4000 caracteres)
- [ ] **Keywords** (iOS: 100 caracteres)
- [ ] **Categoria**: Saúde & Fitness
- [ ] **Classificação etária**: 4+ ou Livre
- [ ] **Política de Privacidade** (URL obrigatória)
- [ ] **Site de Suporte** (URL)

### Testes Finais

- [ ] Testar login/logout
- [ ] Testar criação de conta
- [ ] Testar todas as telas principais
- [ ] Testar upload de fotos
- [ ] Testar em diferentes tamanhos de tela
- [ ] Testar modo escuro/claro
- [ ] Testar permissões (câmera, fotos)

---

## 🔄 Atualizar Versão

Quando for lançar uma atualização:

### 1. Atualizar versão no `app.config.js`:

```javascript
version: '1.0.1', // Era 1.0.0
```

### 2. Build numbers incrementam automaticamente

O `autoIncrement: true` no `eas.json` já está configurado!

### 3. Build e submit normalmente:

```bash
eas build --platform all --profile production
eas submit --platform all --profile production
```

---

## ⚠️ Troubleshooting

### Erro: "No valid signing identity found"

```bash
eas credentials --platform ios
```

Regere os certificados.

### Erro: "Invalid Provisioning Profile"

```bash
eas build:resign --platform ios
```

### Android: Erro de assinatura

```bash
eas credentials --platform android
```

Delete e recrie o keystore (só faça isso se não tiver app publicado ainda!).

---

## 📱 Testar Antes de Publicar

### TestFlight (iOS)

1. Build com profile "preview"
2. Automaticamente sobe para TestFlight
3. Convide testadores pelo email
4. Eles baixam pelo app TestFlight

### Internal Testing (Android)

1. Build com profile "preview" (gera APK)
2. Baixe o APK e instale manualmente
3. Ou use Internal Testing no Google Play

---

## 🎉 Publicação Completa - Passo a Passo

### Checklist Final

1. ✅ Versão atualizada em `app.config.js`
2. ✅ Assets todos criados (ícone, splash, screenshots)
3. ✅ Testado em dispositivos reais
4. ✅ Supabase em produção configurado
5. ✅ Políticas de privacidade criadas

### Comandos em Ordem

```bash
# 1. Login
eas login

# 2. Build iOS e Android
eas build --platform all --profile production

# 3. Aguardar build terminar (15-30 min)

# 4. Submit para as lojas
eas submit --platform ios --profile production
eas submit --platform android --profile production

# 5. Monitorar no console
# iOS: https://appstoreconnect.apple.com
# Android: https://play.google.com/console
```

---

## 📊 Monitoramento Pós-Lançamento

### App Store Connect (iOS)
- Ver downloads
- Ver reviews
- Ver crashes
- Ver métricas de uso

### Google Play Console (Android)
- Ver instalações
- Ver reviews
- Ver crashes (via Android Vitals)
- Ver métricas de performance

### Analytics (Recomendado)
- Instalar Google Analytics ou Mixpanel
- Rastrear eventos importantes
- Acompanhar comportamento dos usuários

---

## 📞 Suporte

**Dúvidas sobre EAS Build:**
- Docs: https://docs.expo.dev/build/introduction/
- Fórum: https://forums.expo.dev/

**Dúvidas sobre App Store:**
- https://developer.apple.com/support/

**Dúvidas sobre Google Play:**
- https://support.google.com/googleplay/android-developer

---

## ✅ Status Atual do Projeto

- ✅ iOS configurado (bundle, permissions, build settings)
- ✅ Android configurado (package, SDK versions, permissions)
- ✅ EAS Build configurado para ambas plataformas
- ✅ Auto-increment de versões habilitado
- ✅ Submit automático configurado
- ⚠️ Precisa executar SQL no Supabase (ciclos de treino)
- ⏳ Aguardando assets finais (ícone pode estar ok)
- ⏳ Aguardando Google Play Service Account JSON
- ⏳ Primeira build e credenciais

**Próximo passo:** Executar primeira build para gerar credenciais!

```bash
eas build --platform ios --profile preview
```
