# Implementation Plan:

## Overview

Implementar os avatares de rosto Adventurer usando os 20 SVGs existentes, com persistência segura do identificador, compatibilidade com emojis legados e integração nas telas do Pulyn.

## Tasks

- [x] 1. Criar o catálogo frontend único com os 20 imports SVG, IDs, labels e fallback. (Req. 1.1–1.4)
- [x] 2. Evoluir o componente Avatar para renderizar SVG, legado e fallback com acessibilidade. (Req. 4.1–4.3, 5.2–5.4)
- [x] 3. Criar o AvatarSelector com 20 opções, preview, teclado e estado selecionado. (Req. 2.1–2.5, 5.1, 5.5)
- [x] 4. Integrar catálogo e seletor no ReceptionCheckin e ReceptionKiosk. (Req. 2.1–2.5, 3.1–3.2)
- [x] 5. Atualizar recepção, família, admin, game master e display para usar o renderer compartilhado. (Req. 4.4–4.7)
- [x] 6. Criar validador backend, corrigir defaults e remover truncamento nos cadastros. (Req. 3.3–3.7)
- [x] 7. Atualizar o endpoint alternativo, schema e modelo para IDs completos. (Req. 3.3–3.5)
- [x] 8. Criar migração idempotente SQL Server/PostgreSQL para capacidade mínima de 64 caracteres. (Req. 3.4, 3.7)
- [x] 9. Executar diagnósticos, typecheck, lint, build e validações estáticas do catálogo/backend.
- [ ] 10. Executar smoke test manual com backend/banco e telas de seleção e exibição.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2, 3] },
    { "wave": 2, "tasks": [4, 5] },
    { "wave": 3, "tasks": [6, 7, 8] },
    { "wave": 4, "tasks": [9] },
    { "wave": 5, "tasks": [10] }
  ]
}
```

## Notes

O smoke test manual depende de iniciar o backend e aplicar a migração no banco. O build foi concluído com sucesso; permanecem apenas warnings preexistentes e avisos de tamanho de bundle do Vite.
