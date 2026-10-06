// Mapa completo de conversões Inglês → Português
// Usado pelos scripts de automação

const PORTUGUESE_MAP = {
  // ===== IDs (já feitos no banco) =====

  // ===== Colunas Principais =====
  // Nomes
  "name": "nome",
  "family_name": "nomeFamilia",
  "responsible_name": "nomeResponsavel",
  "sender": "remetente",
  "client": "cliente",
  "assignee": "atribuidoPara",

  // Descrições
  "description": "descricao",

  // Tipos/Categorias
  "type": "tipo",
  "role": "perfil",
  "status": "status",
  "priority": "prioridade",

  // Localização
  "city": "cidade",
  "state": "estado",
  "zone": "zona",
  "ip": "ip",
  "location": "localizacao",
  "latitude": "latitude",
  "longitude": "longitude",

  // Contato
  "email": "email",
  "phone": "telefone",
  "password": "senha",

  // Dados
  "points": "pontos",
  "scores": "pontos",
  "plan": "plano",
  "plano": "plano",
  "plan": "plano",
  "avatar": "avatar",

  // Temporais
  "date": "data",
  "time": "hora",
  "duration": "duracao",
  "created_at": "criadoEm",
  "updated_at": "atualizadoEm",
  "started_at": "iniciadoEm",
  "finished_at": "finalizadoEm",
  "completed_at": "completadoEm",
  "last_access": "ultimoAcesso",
  "last_seen": "ultimoVisto",
  "last_conquered_at": "ultimoConquistadoEm",

  // Brincadeira específico
  "rules": "regras",
  "default_points": "pontosPadrao",
  "game_type": "tipoJogo",
  "checkpoints": "checkpoints",

  // Criança
  "nickname": "apelido",
  "age": "idade",
  "bracelet_code": "codigoPulseira",

  // Checkpoint
  "checkpoint_purpose": "proposito",
  "map_x": "mapaX",
  "map_y": "mapaY",
  "led_color": "corLed",
  "territory_owner_time_id": "territorioDonoTimeId",
  "territory_owner_crianca_id": "territorioDonosCriancaId",
  "territory_locked_until": "territorioTravadoAte",
  "territory_cooldown_until": "territorioCooldownAte",
  "authorized_tags": "tagsAutorizadas",

  // Evento
  "enable_display": "exibirDisplay",
  "enable_location": "exibirLocalizacao",
  "active_game_type": "tipoJogoAtivo",
  "active_brincadeira_id": "brincadeiraAtivaId",
  "floor_plan_data": "dadosPlanoPiso",
  "floor_plan_name": "nomePlanoPiso",
  "floor_plan_type": "tipoPlanoPiso",
  "auto_start": "autoInicio",
  "auto_end": "autoFim",

  // Leitura
  "authorized": "autorizado",
  "points_awarded": "pontosAtribuidos",
  "signal_strength": "forcaSinal",

  // Pontos
  "points_multiplier": "multiplicadorPontos",
  "required_type": "tipoRequerido",
  "required_value": "valorRequerido",
  "points_bonus": "pontosBonus",

  // Outras
  "color": "cor",
  "code": "codigo",
  "subject": "assunto",
  "message": "mensagem",
  "details": "detalhes",
  "text": "texto",
  "cnpj": "cnpj",
  "relationship": "relacionamento",
  "setting_key": "chave",
  "setting_value": "valor",
  "token_hash": "hashToken",
  "uid": "uid",

  // Tempos (para queries complexas)
  "round_number": "numeroRonda",
  "target_checkpoint_id": "checkpointAlvoId",
  "completed_checkpoint_ids": "checkpointsCompletadosIds",
  "starting_team_id": "timeInicialId",
  "turn_team_id": "timeVezId",
  "turn_available_at": "vezDisponvelEm",
  "round_started_at": "rondaIniciadaEm",
  "elapsed_ms": "msDecorridos",
  "events_done": "eventosRealizados",
  "created_by": "criadoPor",
  "approved_by": "aprovadoPor",
  "approved_at": "aprovadoEm",
  "rejected_at": "rejeitadoEm",
  "expires_at": "expiramEm",
  "used_at": "usadoEm",
  "data_criacao": "dataCriacao",
  "data_atualizacao": "dataAtualizacao",
};

// Tabelas em português (para comentários e documentação)
const TABLE_NAMES_PT = {
  brincadeiras: "brincadeiras",
  caca_tesouro_partidas: "cacaTesouroPart idas",
  caca_tesouro_scans: "cacaTesouroCamas",
  caca_tesouro_tempos: "cacaTesourTempos",
  checkpoint_tags: "tagCheckpoint",
  checkpoints: "checkpoints",
  clientes: "clientes",
  conquistas: "conquistas",
  crianca_conquistas: "criancaConquistas",
  criancas: "criancas",
  empresas: "empresas",
  evento_brincadeiras: "eventoBrincadeiras",
  support_tickets: "chamadosSuport",
  eventos: "eventos",
  leituras: "leituras",
  logins: "logins",
  family_invites: "convitesFamilia",
  family_child_links: "vinculos Familiares",
  logs: "logs",
  mensagens_display: "mensagensDisplay",
  pontuacoes: "pontuacoes",
  pulseiras: "pulseiras",
  settings: "configuracoes",
  times: "times",
  zonas: "zonas",
};

module.exports = { PORTUGUESE_MAP, TABLE_NAMES_PT };
