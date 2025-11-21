# Sistema de Checkin e Metas de Ciclo

## Visão Geral

Sistema de acompanhamento de treinos com **checkins** e **metas por ciclo** (ex: 25 treinos em 5 semanas).

## Funcionalidades

### Para Alunas

1. **Checkin ao concluir treino**
   - Ao finalizar os exercícios, clicar em "Marcar Treino como Concluído"
   - O sistema registra automaticamente a data de conclusão

2. **Visualizar progresso do ciclo**
   - Card "Meta do Ciclo" na tela inicial
   - Mostra: checkins realizados / meta total
   - Percentual de conclusão
   - Dias restantes do ciclo
   - Quantos treinos faltam

3. **Calendário semanal**
   - ✓ = Treino concluído
   - ✗ = Dia sem treino
   - Cinza = Dia futuro

### Para Treinadoras

1. **Criar ciclos**
   - Definir aluna
   - Nome do ciclo (ex: "Ciclo 1 - Dezembro 2025")
   - Data de início
   - Duração em semanas (padrão: 5)
   - Meta de treinos (padrão: 25)

2. **Acompanhar progresso**
   - Ver todos os ciclos ativos
   - Checkins realizados vs meta
   - Percentual de conclusão com cores:
     - 🟢 Verde: ≥80%
     - 🟡 Amarelo: 50-79%
     - 🔴 Vermelho: <50%
   - Progresso individual na tela de cada aluna

3. **Finalizar ciclos**
   - Desativar ciclo atual
   - Criar novo ciclo para a aluna

## Estrutura do Banco de Dados

### Tabela `ciclo_treino`

```sql
CREATE TABLE ciclo_treino (
  id UUID PRIMARY KEY,
  aluna_id UUID REFERENCES auth.users(id),
  nome VARCHAR(100),              -- Nome do ciclo
  data_inicio DATE,               -- Data de início
  data_fim DATE,                  -- Data de fim (calculada)
  duracao_semanas INTEGER,        -- Ex: 5 semanas
  meta_treinos INTEGER,           -- Ex: 25 treinos
  ativo BOOLEAN DEFAULT true      -- Apenas 1 ciclo ativo por aluna
);
```

### Tabela `treino_concluido` (já existente)

```sql
CREATE TABLE treino_concluido (
  id UUID PRIMARY KEY,
  aluna_id UUID REFERENCES auth.users(id),
  ficha_treino_id UUID,
  data_conclusao DATE,            -- Data do checkin
  concluido BOOLEAN DEFAULT true
);
```

### View `ciclo_progresso`

View que junta ciclos com checkins:
- `total_checkins`: Número de treinos concluídos
- `faltam`: Treinos faltantes para atingir meta
- `percentual_conclusao`: % de conclusão

## Instalação

### 1. Executar SQL no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New query**
4. Copie e cole o conteúdo de `supabase_ciclo_treinos.sql`
5. Clique em **Run**

### 2. Verificar Criação

No **Table Editor**, verifique se existe:
- Tabela `ciclo_treino`
- View `ciclo_progresso`

## Componentes

### `CycleProgressCard.tsx`
Card para tela da aluna mostrando progresso do ciclo ativo.

### `ClientCycleProgress.tsx`
Card compacto para treinadora ver progresso na tela de detalhes da cliente.

### `manage-cycles.tsx`
Tela para treinadora gerenciar todos os ciclos.

## Fluxo de Uso

### Criando um Ciclo (Treinadora)

1. Acesse a tela "Gerenciar Ciclos"
2. Clique no botão **+**
3. Selecione a aluna
4. Preencha:
   - Nome: "Ciclo 1 - Dezembro 2025"
   - Data de início: 2025-12-01
   - Duração: 5 semanas
   - Meta: 25 treinos
5. Clique em "Criar Ciclo"

### Marcando Checkin (Aluna)

1. Acesse a tela de exercícios do treino
2. Complete os exercícios
3. Clique em "Marcar Treino como Concluído"
4. O checkin é registrado automaticamente
5. Volte para a tela inicial para ver o progresso atualizado

### Finalizando um Ciclo (Treinadora)

1. Acesse "Gerenciar Ciclos"
2. Encontre o ciclo da aluna
3. Clique em "Finalizar"
4. Confirme a ação
5. Crie um novo ciclo se necessário

## Exemplo de Uso Real

**Situação**: Samarah quer que a aluna complete 25 treinos em 5 semanas.

**Passo a passo**:

1. **Treinadora cria o ciclo**:
   - Aluna: Maria Silva
   - Nome: "Ciclo 1 - Dezembro 2025"
   - Início: 01/12/2025
   - Fim: 05/01/2026 (5 semanas)
   - Meta: 25 treinos

2. **Aluna treina**:
   - Segunda: Faz treino A → Marca checkin (1/25)
   - Terça: Faz treino B → Marca checkin (2/25)
   - Quarta: Descansa → Não marca
   - ...continua ao longo das 5 semanas

3. **Acompanhamento**:
   - Aluna vê na tela inicial: "15/25 treinos (60%)"
   - Treinadora vê em "Gerenciar Ciclos": "Maria - 15/25 (60%)" em amarelo
   - Treinadora vê na tela de detalhes da Maria: mesmo progresso

4. **Fim do ciclo**:
   - Aluna completou 20 treinos (80%) ✅
   - Treinadora finaliza o ciclo
   - Cria novo ciclo para os próximos 5 semanas

## Regras de Negócio

- ✅ Apenas **1 ciclo ativo** por aluna
- ✅ Checkins são **automáticos** ao concluir treino
- ✅ Checkins contam para o ciclo ativo baseado na **data**
- ✅ Treinadora pode **finalizar** ciclo a qualquer momento
- ✅ Aluna **não pode editar** checkins manualmente
- ✅ Histórico de checkins é **permanente** mesmo após finalizar ciclo

## Segurança (RLS)

- Alunas podem ver **apenas seus próprios** ciclos e checkins
- Treinadoras podem ver **todos** os ciclos e checkins
- Apenas treinadoras podem **criar/editar/finalizar** ciclos

## Próximas Melhorias (Futuro)

- [ ] Histórico de ciclos anteriores
- [ ] Relatório de desempenho por ciclo
- [ ] Notificações quando faltarem poucos dias
- [ ] Gráfico de evolução ao longo dos ciclos
- [ ] Export de dados em PDF
