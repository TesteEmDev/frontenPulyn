# Requirements Document

## Introduction

O Pulyn permitirá que crianças escolham avatares de rosto infantis Adventurer em SVG durante o check-in de recepção e no kiosk de autoatendimento. Nesta primeira versão, os arquivos serão usados como retratos de rosto/cabeça; a representação de corpo inteiro fica para uma evolução futura. O valor persistido continuará sendo uma string estável em `criancas.avatar`, sem depender de URL pública. Como a coluna atual foi encontrada com capacidade `varchar(10)` e os identificadores Adventurer são maiores, a implementação deverá ampliar sua capacidade antes de persistir os novos valores.

A revisão da pasta `front-pulyn/src/avatar` confirmou exatamente 20 arquivos SVG:

- `adventurer-1787066874693.svg`
- `adventurer-1787066893641.svg`
- `adventurer-1787066897643.svg`
- `adventurer-1787066901609.svg`
- `adventurer-1787066904754.svg`
- `adventurer-1787066907832.svg`
- `adventurer-1787066911577.svg`
- `adventurer-1787066914937.svg`
- `adventurer-1787066918306.svg`
- `adventurer-1787066922497.svg`
- `adventurer-1787066926169.svg`
- `adventurer-1787066929218.svg`
- `adventurer-1787066934106.svg`
- `adventurer-1787066937610.svg`
- `adventurer-1787066942696.svg`
- `adventurer-1787066946714.svg`
- `adventurer-1787066949874.svg`
- `adventurer-1787066955258.svg`
- `adventurer-1787066958801.svg`
- `adventurer-1787066964514.svg`

O identificador canônico de cada opção será o nome do arquivo sem a extensão `.svg`, por exemplo `adventurer-1787066874693`. A aplicação manterá um registro explícito entre esse identificador e o módulo SVG importado.

## Glossary

- **Pulyn**: Plataforma multi-tenant de gamificação infantil para eventos.
- **Avatar_Registry**: Registro único das opções Adventurer, seus identificadores canônicos, rótulos acessíveis e módulos SVG.
- **Adventurer_Identifier**: Identificador canônico `adventurer-<timestamp>` sem `.svg`, persistido no campo `criancas.avatar`.
- **Legacy_Avatar**: Valor já persistido, como emoji (`🦊`, `👤`) ou outra string não pertencente ao registro Adventurer.
- **Avatar_Selector**: Controle visual e acessível que permite selecionar uma opção de avatar.
- **Avatar_Renderer**: Componente ou função compartilhada que resolve um valor persistido para SVG Adventurer, Legacy_Avatar ou fallback.
- **Fallback_Avatar**: Representação visual segura usada para valor nulo, vazio, desconhecido ou inválido.
- **Asset_Bundle**: Artefatos do bundle frontend produzidos a partir de imports dos arquivos em `front-pulyn/src/avatar`.
- **Checkin_Flow**: Cadastro de criança na tela `ReceptionCheckin` usando a API administrativa de crianças.
- **Kiosk_Flow**: Cadastro de participante na tela `ReceptionKiosk` usando a API própria do kiosk.
- **Child_API**: Endpoints de criação, consulta e atualização de crianças/participantes, incluindo `criancas.avatar`.
- **Child_Persistence**: Camada que grava e lê o valor string de `criancas.avatar` sem transformação indevida.
- **Display_Screen**: Superfície `DisplayRanking` ou `DisplayMap` que apresenta crianças no telão.
- **Avatar_Test_Suite**: Conjunto de testes unitários, property-based, de integração, acessibilidade e smoke tests da feature.
- **Affected_Screen**: Tela que seleciona ou exibe o avatar de uma criança.
- **Accessible_Name**: Nome textual anunciado por tecnologia assistiva para uma opção ou imagem.

## Requirements

### Requirement 1: Catálogo Adventurer e carregamento de assets

**User Story:** Como responsável pelo produto, quero um catálogo único dos avatares Adventurer, para que todas as telas apresentem e resolvam as mesmas opções.

#### Acceptance Criteria

1. THE Avatar_Registry SHALL expose exactly the 20 Adventurer_Identifier values listed in this document, without duplicate identifiers.
2. THE Avatar_Registry SHALL associate each Adventurer_Identifier with exactly one label for display and one SVG source corresponding to the reviewed file in `front-pulyn/src/avatar`.
3. WHEN the frontend is built, THE Asset_Bundle SHALL include the SVG sources through static imports from `src/avatar` rather than public URL strings such as `/avatar/arquivo.svg`.
4. IF an Adventurer_Identifier has no resolvable SVG source, THEN THE Avatar_Renderer SHALL render the Fallback_Avatar without exposing a broken image.

### Requirement 2: Seleção e experiência de cadastro

**User Story:** Como criança ou responsável, quero escolher um avatar visual antes do cadastro, para reconhecer o personagem durante o evento.

#### Acceptance Criteria

1. WHEN the Checkin_Flow or Kiosk_Flow opens its avatar step, THE Avatar_Selector SHALL present all 20 Adventurer options.
2. WHEN a child activates an option, THE Avatar_Selector SHALL mark only that option as selected and update the preview beside or above the child name without requiring a page reload.
3. WHILE an option is selected, THE Avatar_Selector SHALL expose a visible selected state, an `aria-pressed` state, an Accessible_Name, and a keyboard-focus state that does not rely only on color.
4. WHEN the Checkin_Flow or Kiosk_Flow resets the registration form, THE Avatar_Selector SHALL return to a valid Adventurer option and update the preview consistently.
5. WHEN the child name is displayed in the registration preview, THE Avatar_Renderer SHALL display the selected avatar beside or above that name in both registration flows.

### Requirement 3: Persistência e compatibilidade de valores

**User Story:** Como operador do buffet, quero que a escolha sobreviva ao cadastro e às consultas posteriores, para que o avatar apareça durante todo o evento.

#### Acceptance Criteria

1. WHEN the Checkin_Flow submits a selected Adventurer_Identifier, THE Child_API SHALL receive that exact identifier in the create-child payload.
2. WHEN the Kiosk_Flow submits a selected Adventurer_Identifier, THE Child_API SHALL receive that exact identifier in the create-participant payload.
3. WHEN the Child_API persists an Adventurer_Identifier, THE Child_Persistence SHALL store and return the complete exact string in `criancas.avatar`, without truncation, URL conversion, or substituição por emoji.
4. THE Child_Persistence SHALL use the existing string column `criancas.avatar` without requiring database migration when the column supports the complete Adventurer_Identifier.
5. WHEN an existing child contains a Legacy_Avatar, THE Child_API SHALL preserve the original value on read and on updates that do not intentionally change the avatar.
6. WHEN a saved child is loaded after creation, THE Checkin_Flow and Kiosk_Flow SHALL render the same Adventurer_Identifier that was submitted.
7. IF an API or database limit would truncate a canonical identifier, THEN THE Child_API SHALL report a validation error or provide sufficient capacity before persistence, and SHALL not save a partial identifier.

### Requirement 4: Renderização compatível em telas afetadas

**User Story:** Como usuário do Pulyn, quero ver o mesmo avatar da criança em todas as áreas do sistema, para manter uma identidade visual consistente.

#### Acceptance Criteria

1. WHEN the Avatar_Renderer receives a known Adventurer_Identifier, THE Avatar_Renderer SHALL render the corresponding imported SVG as an image and SHALL not render the identifier as visible text.
2. WHEN the Avatar_Renderer receives a Legacy_Avatar, THE Avatar_Renderer SHALL render the legacy value as an emoji/text representation and SHALL not attempt to resolve it as an Adventurer asset.
3. IF the Avatar_Renderer receives null, an empty string, an unknown string, or an invalid asset value, THEN THE Avatar_Renderer SHALL render the Fallback_Avatar with a stable accessible label.
4. THE Avatar_Renderer SHALL be used by `ReceptionParticipants`, `ReceptionDashboard`, `GameMasterTeams`, `GameMasterRanking`, `GameMasterDashboard`, `GameMasterControl`, `AdminChildren`, `AdminChildProfile`, `FamilyHome`, `FamilyScores`, `FamilyQuiz`, `FamilyProfile`, and `FamilyLocation` whenever those screens display a child avatar.
5. WHEN `DisplayRanking` displays a participant avatar in the podium or ranking list, THE Display_Screen SHALL use the Avatar_Renderer and show the imported SVG for a known Adventurer_Identifier while retaining emoji rendering for Legacy_Avatar values.
6. WHEN `DisplayMap` displays a participant marker, THE Display_Screen SHALL use the Avatar_Renderer for the marker and retain the participant nickname independently of the image.
7. WHEN an Affected_Screen displays a child name with an avatar, THE Affected_Screen SHALL keep the avatar visually adjacent to or above the name at the screen's existing size variants.

### Requirement 5: Acessibilidade e segurança visual

**User Story:** Como criança, responsável ou operador que usa teclado ou tecnologia assistiva, quero entender e operar a escolha de avatar, para que a seleção não dependa apenas de percepção visual.

#### Acceptance Criteria

1. THE Avatar_Selector SHALL provide a non-empty Accessible_Name for every Adventurer option and SHALL expose the selected option through the control state.
2. WHEN an Adventurer SVG is rendered as a meaningful avatar, THE Avatar_Renderer SHALL expose an accessible label containing the avatar label and SHALL not expose a raw file path as the label.
3. WHEN an avatar is decorative because the adjacent name already identifies the child, THE Avatar_Renderer SHALL avoid duplicate announcements while preserving the child name in the accessible reading order.
4. IF an SVG fails to load at runtime, THEN THE Avatar_Renderer SHALL replace it with the Fallback_Avatar and SHALL preserve the adjacent child name and accessible context.
5. THE Avatar_Selector SHALL allow a keyboard user to reach, select, and identify all 20 options in a deterministic tab or arrow-key interaction without requiring pointer input.

### Requirement 6: Testes de correção e regressão

**User Story:** Como equipe de desenvolvimento, quero testes que cubram resolução, persistência e compatibilidade, para evitar regressões em novos e antigos cadastros.

#### Acceptance Criteria

1. THE Avatar_Test_Suite SHALL verify that each of the 20 Adventurer_Identifier values resolves to its imported SVG and that the resolved asset is not a public `/avatar/` URL.
2. THE Avatar_Test_Suite SHALL verify the round trip `Adventurer_Identifier -> create payload -> persisted response -> Avatar_Renderer` without changing the identifier.
3. THE Avatar_Test_Suite SHALL verify that representative Legacy_Avatar values, including emojis, render as legacy values and that null, empty, unknown, and malformed values render the Fallback_Avatar.
4. THE Avatar_Test_Suite SHALL verify, using mocked Checkin_Flow and Kiosk_Flow requests, that the selected identifier is sent exactly and that the kiosk path does not truncate it.
5. THE Avatar_Test_Suite SHALL verify keyboard operation, selected state, Accessible_Name, and focus visibility for the 20-option Avatar_Selector in both registration flows.
6. THE Avatar_Test_Suite SHALL verify SVG rendering and legacy emoji fallback in `ReceptionParticipants`, `ReceptionDashboard`, `DisplayRanking`, `DisplayMap`, the family avatar screens, the game-master avatar screens, and the admin child screens.
7. WHEN the frontend production build runs, THE Asset_Bundle SHALL complete without missing-avatar import errors or direct `/avatar/` references in the generated application code.

## Affected screens and scope decision

- **Seleção obrigatória:** `ReceptionCheckin` e `ReceptionKiosk`, que hoje oferecem oito emojis e enviam `avatar` na criação.
- **Recepção:** `ReceptionParticipants` e `ReceptionDashboard` devem usar a resolução compartilhada ao exibir crianças.
- **Display:** `DisplayRanking` e `DisplayMap` já exibem o valor de avatar diretamente como texto; devem passar a resolver Adventurer como SVG e manter emoji legado. As demais telas display não exibem avatar de criança e não ganham uma superfície nova por esta feature.
- **Família:** `FamilyHome`, `FamilyScores`, `FamilyQuiz`, `FamilyProfile` e `FamilyLocation` devem renderizar Adventurer e preservar emoji legado, inclusive no perfil/modal.
- **Administração e game master:** telas que já usam `Avatar` para crianças devem adotar a mesma resolução para evitar divergência visual.
- **Backend e banco:** os fluxos de criação/consulta devem transportar a string estável completa. Não há requisito de migração; a implementação deve primeiro aproveitar a coluna string existente e bloquear truncamento caso a capacidade seja insuficiente.
- **Fora de escopo:** criação de novos SVGs, upload de avatar, edição de arte, mudança do modelo multi-tenant ou alteração do significado de emojis já cadastrados.

## Test strategy notes

- Usar testes unitários/property-based para percorrer o catálogo completo, testar a resolução de qualquer identificador conhecido e exercitar valores legados/ inválidos.
- Usar testes de integração com mocks para os dois payloads de criação e um caso de round trip de persistência; não usar chamadas reais ao banco ou serviços externos como property-based test.
- Usar testes de componente/acessibilidade para seleção por teclado e fallback; usar smoke tests representativos para as telas display, família, recepção, admin e game master.
- Validar estaticamente que cada asset é importado de `src/avatar` e que nenhum componente constrói caminho público `/avatar/...`.
