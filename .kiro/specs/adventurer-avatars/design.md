# Design Document — Avatares Adventurer

## Overview

A primeira versão substituirá os oito emojis do cadastro por 20 retratos SVG DiceBear Adventurer. O avatar será exibido como rosto/cabeça dentro do componente circular existente; não haverá corpo inteiro nesta entrega.

Os SVGs permanecerão em `front-pulyn/src/avatar/` e serão importados estaticamente pelo frontend. Não serão usados caminhos `/avatar/...`, uploads ou URLs externas.

## Architecture

### Catálogo compartilhado

Criar `front-pulyn/src/avatar/adventurerAvatars.ts` com:

- tipo `AdventurerAvatar` contendo `id`, `label`, `src` e `index`;
- exatamente 20 imports dos arquivos SVG existentes;
- array imutável `ADVENTURER_AVATARS`;
- `DEFAULT_AVATAR_ID` apontando para o primeiro avatar;
- `isAdventurerAvatarId(value)` para validação no frontend;
- `resolveAvatar(value)` retornando asset Adventurer, emoji legado ou fallback.

O identificador será o nome do arquivo sem `.svg`, por exemplo `adventurer-1787066874693`. O catálogo será a única fonte de verdade no frontend.

## Components and Interfaces

### Componente visual

Evoluir `front-pulyn/src/components/ui/Avatar.tsx` para resolver tanto IDs Adventurer quanto valores legados. Para reduzir regressão, a prop `emoji` existente continuará aceita temporariamente; uma prop `avatar`/`value` poderá ser usada nos novos pontos.

O componente renderizará `<img>` para um ID conhecido e texto/emoji para valores legados. Valores nulos, vazios ou desconhecidos usarão o primeiro SVG como fallback visual, sem modificar o banco. As props `alt` e `decorative` controlarão a leitura por tecnologia assistiva.

### Seletor compartilhado

Criar `front-pulyn/src/components/ui/AvatarSelector.tsx`, recebendo valor selecionado, callback de mudança, estado desabilitado e rótulo. O componente exibirá as 20 opções, `aria-pressed`, foco visível e preview do avatar selecionado.

## Data Models

O valor persistido em `criancas.avatar` será uma string com um dos 20 IDs Adventurer para novos cadastros. Valores emoji legados continuam válidos para leitura e permanecem inalterados até uma troca explícita.

## 3. Fluxos frontend

`ReceptionCheckin.tsx` e `ReceptionKiosk.tsx` deixarão de manter listas locais de emojis. Ambos importarão o catálogo/`AvatarSelector`, iniciarão o formulário com `DEFAULT_AVATAR_ID` e enviarão o ID completo no campo `avatar`.

`ReceptionParticipants`, `ReceptionDashboard`, telas administrativas, game master, família e display continuarão usando o componente `Avatar`; a resolução compartilhada fará a troca automática de IDs Adventurer por SVG e manterá emojis legados.

O fluxo de sucesso do Kiosk receberá o ID persistido retornado pela API e exibirá o mesmo SVG selecionado. Falhas de cadastro manterão a seleção no formulário e não mostrarão estado de sucesso.

## 4. Contrato e persistência backend

Criar `api/server/utils/avatar.js` com a mesma lista explícita dos 20 IDs, `isValidAvatarId` e `DEFAULT_AVATAR_ID`. A duplicação entre frontend e backend será intencional para manter a API independente do bundle React.

Em `routes/criancas.js` e `routes/kiosk.js`:

- criação com avatar ausente usará o ID default, em vez de emoji novo;
- criação com valor fora da lista retornará HTTP 400 e não deixará registro parcial;
- criação válida persistirá o ID completo sem `slice` ou transformação;
- atualização só validará avatar quando o campo for enviado, preservando emojis legados quando omitido;
- respostas devolverão exatamente o valor persistido.

## 5. Banco de dados

A coluna atual `criancas.avatar` foi encontrada como `varchar(10)`, insuficiente para os IDs Adventurer. Criar uma migração reversível para `varchar(64)` ou capacidade equivalente no banco efetivamente utilizado pelo servidor, preservando valores emoji existentes.

A migração deverá ser aplicada antes dos testes de criação e deverá evitar truncamento. Nenhum dado legado será convertido automaticamente.

## Error Handling

Erros de catálogo, importação e validação de payload serão tratados sem quebrar o cadastro: o frontend usa fallback visual e o backend retorna HTTP 400 antes de qualquer inserção inválida. Falhas de persistência mantêm o formulário e não exibem sucesso.

## 6. Acessibilidade e comportamento

Cada opção terá nome acessível `Avatar Adventurer 01` até `Avatar Adventurer 20`, imagem com `alt` quando significativa e `aria-hidden` quando decorativa ao lado do nome da criança. O estado selecionado será anunciado sem depender apenas de cor. O foco por teclado será visível; os botões poderão ser percorridos e ativados por teclado.

Se um asset falhar no carregamento, o renderer trocará para o fallback sem quebrar o layout, mantendo o nome da criança e o contexto acessível.

## 7. Segurança e isolamento

A validação de avatar será apenas de catálogo e não altera as regras existentes de autenticação, empresa, evento, pulseira ou time. As queries continuarão usando os filtros de tenant já presentes. O backend nunca aceitará conteúdo SVG, caminho de arquivo ou URL enviado pelo cliente como avatar.

## 8. Plano de implementação

1. Criar o catálogo frontend e validar os 20 imports.
2. Evoluir `Avatar` para renderizar SVG, legado e fallback.
3. Criar e integrar `AvatarSelector` no Check-in e Kiosk.
4. Ajustar telas que exibem avatar diretamente para usar a resolução compartilhada.
5. Criar o utilitário de catálogo/validação backend.
6. Alterar criação e atualização de crianças e o cadastro atômico do Kiosk.
7. Criar e aplicar a migração da coluna `criancas.avatar`.
8. Executar build, diagnóstico TypeScript e testes direcionados.

## Testing Strategy

## Correctness Properties

### Property 1: Resolução determinística

Todo ID do catálogo resolve para exatamente um SVG importado.

**Validates: Requirements 1.1, 1.2, 4.1**

### Property 2: Persistência sem truncamento

Todo cadastro novo persiste o ID completo, sem truncamento.

**Validates: Requirements 3.1, 3.2, 3.3, 3.7**

### Property 3: Compatibilidade legada

Todo valor legado continua renderizável como legado.

**Validates: Requirements 3.5, 4.2**

### Property 4: Fallback seguro

Todo valor ausente ou desconhecido resolve para o fallback sem alterar o banco.

**Validates: Requirements 4.3, 5.4**

A validação deverá cobrir: contagem exata de 20 opções; resolução de cada ID para o SVG correto; seleção e preview nos dois fluxos; round trip do ID sem truncamento; rejeição de ID inválido; preservação de emojis legados; fallback para valor vazio/desconhecido; acessibilidade básica e build de produção.

Como o projeto não possui uma suíte dedicada definida para esta feature, priorizar testes/checagens nos módulos alterados e um smoke test manual das telas `ReceptionCheckin`, `ReceptionKiosk`, participantes e display.

## 10. Arquivos previstos

- `.kiro/specs/adventurer-avatars/requirements.md`
- `.kiro/specs/adventurer-avatars/design.md`
- `front-pulyn/src/avatar/adventurerAvatars.ts`
- `front-pulyn/src/components/ui/Avatar.tsx`
- `front-pulyn/src/components/ui/AvatarSelector.tsx`
- `front-pulyn/src/pages/reception/ReceptionCheckin.tsx`
- `front-pulyn/src/pages/reception/ReceptionKiosk.tsx`
- `front-pulyn/src/pages/reception/ReceptionParticipants.tsx`
- telas adicionais que exibem avatar diretamente
- `api/server/utils/avatar.js`
- `api/server/routes/criancas.js`
- `api/server/routes/kiosk.js`
- migração de banco para ampliar `criancas.avatar`

## 11. Fora de escopo técnico

Não criar arte de corpo inteiro, não mover os SVGs para `public`, não alterar o modelo de times/pontuação, não migrar emojis existentes e não criar personalização de catálogo por empresa nesta versão.
