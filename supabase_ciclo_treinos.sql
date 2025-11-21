-- Tabela para armazenar ciclos de treino com metas
CREATE TABLE IF NOT EXISTS ciclo_treino (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluna_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL, -- Ex: "Ciclo 1 - Janeiro 2025"
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  duracao_semanas INTEGER NOT NULL DEFAULT 5,
  meta_treinos INTEGER NOT NULL, -- Ex: 25 treinos
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ciclo_aluna ON ciclo_treino(aluna_id);
CREATE INDEX IF NOT EXISTS idx_ciclo_ativo ON ciclo_treino(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_ciclo_datas ON ciclo_treino(data_inicio, data_fim);

-- Índice único parcial: apenas um ciclo ativo por aluna
CREATE UNIQUE INDEX IF NOT EXISTS idx_ciclo_unico_ativo 
  ON ciclo_treino(aluna_id) 
  WHERE ativo = true;

-- RLS
ALTER TABLE ciclo_treino ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Aluna pode ver seus ciclos" ON ciclo_treino;
DROP POLICY IF EXISTS "Treinadoras podem ver todos ciclos" ON ciclo_treino;
DROP POLICY IF EXISTS "Treinadoras podem inserir ciclos" ON ciclo_treino;
DROP POLICY IF EXISTS "Treinadoras podem atualizar ciclos" ON ciclo_treino;

-- Policy: Aluna pode ver seus ciclos
CREATE POLICY "Aluna pode ver seus ciclos"
  ON ciclo_treino
  FOR SELECT
  USING (auth.uid() = aluna_id);

-- Policy: Treinadoras podem ver todos ciclos
CREATE POLICY "Treinadoras podem ver todos ciclos"
  ON ciclo_treino
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.admin = true
    )
  );

-- Policy: Treinadoras podem inserir ciclos
CREATE POLICY "Treinadoras podem inserir ciclos"
  ON ciclo_treino
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.admin = true
    )
  );

-- Policy: Treinadoras podem atualizar ciclos
CREATE POLICY "Treinadoras podem atualizar ciclos"
  ON ciclo_treino
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.admin = true
    )
  );

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ciclo_treino_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_ciclo_treino_updated_at ON ciclo_treino;

-- Trigger
CREATE TRIGGER update_ciclo_treino_updated_at
  BEFORE UPDATE ON ciclo_treino
  FOR EACH ROW
  EXECUTE FUNCTION update_ciclo_treino_updated_at();

-- View para estatísticas de ciclo (checkins x meta)
CREATE OR REPLACE VIEW ciclo_progresso AS
SELECT 
  c.id as ciclo_id,
  c.aluna_id,
  c.nome as ciclo_nome,
  c.data_inicio,
  c.data_fim,
  c.duracao_semanas,
  c.meta_treinos,
  c.ativo,
  COUNT(tc.id) FILTER (WHERE tc.concluido = true) as total_checkins,
  c.meta_treinos - COUNT(tc.id) FILTER (WHERE tc.concluido = true) as faltam,
  ROUND(
    (COUNT(tc.id) FILTER (WHERE tc.concluido = true)::DECIMAL / 
     NULLIF(c.meta_treinos, 0)) * 100, 
    1
  ) as percentual_conclusao
FROM ciclo_treino c
LEFT JOIN treino_concluido tc 
  ON tc.aluna_id = c.aluna_id 
  AND tc.data_conclusao >= c.data_inicio 
  AND tc.data_conclusao <= c.data_fim
GROUP BY c.id, c.aluna_id, c.nome, c.data_inicio, c.data_fim, 
         c.duracao_semanas, c.meta_treinos, c.ativo;

-- Comentários
COMMENT ON TABLE ciclo_treino IS 'Ciclos de treino com metas para alunas';
COMMENT ON COLUMN ciclo_treino.meta_treinos IS 'Meta de treinos a serem completados no ciclo';
COMMENT ON COLUMN ciclo_treino.duracao_semanas IS 'Duração do ciclo em semanas (ex: 5)';
COMMENT ON VIEW ciclo_progresso IS 'Progresso de cada ciclo: checkins realizados vs meta';
