-- Tabela para armazenar conclusões de treinos
CREATE TABLE IF NOT EXISTS treino_concluido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluna_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ficha_treino_id UUID NOT NULL,
  data_conclusao DATE NOT NULL DEFAULT CURRENT_DATE,
  concluido BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para garantir apenas uma conclusão por dia/treino/aluna
  CONSTRAINT treino_concluido_unique UNIQUE (aluna_id, ficha_treino_id, data_conclusao)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_treino_concluido_aluna ON treino_concluido(aluna_id);
CREATE INDEX IF NOT EXISTS idx_treino_concluido_data ON treino_concluido(data_conclusao);
CREATE INDEX IF NOT EXISTS idx_treino_concluido_ficha ON treino_concluido(ficha_treino_id);

-- RLS (Row Level Security)
ALTER TABLE treino_concluido ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Aluna pode ver suas próprias conclusões" ON treino_concluido;
DROP POLICY IF EXISTS "Aluna pode inserir suas próprias conclusões" ON treino_concluido;
DROP POLICY IF EXISTS "Aluna pode atualizar suas próprias conclusões" ON treino_concluido;
DROP POLICY IF EXISTS "Treinadoras podem ver todas as conclusões" ON treino_concluido;

-- Policy: Aluna pode ver apenas suas próprias conclusões
CREATE POLICY "Aluna pode ver suas próprias conclusões"
  ON treino_concluido
  FOR SELECT
  USING (auth.uid() = aluna_id);

-- Policy: Aluna pode inserir suas próprias conclusões
CREATE POLICY "Aluna pode inserir suas próprias conclusões"
  ON treino_concluido
  FOR INSERT
  WITH CHECK (auth.uid() = aluna_id);

-- Policy: Aluna pode atualizar suas próprias conclusões
CREATE POLICY "Aluna pode atualizar suas próprias conclusões"
  ON treino_concluido
  FOR UPDATE
  USING (auth.uid() = aluna_id)
  WITH CHECK (auth.uid() = aluna_id);

-- Policy: Treinadoras podem ver todas as conclusões
CREATE POLICY "Treinadoras podem ver todas as conclusões"
  ON treino_concluido
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.admin = true
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_treino_concluido_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_treino_concluido_updated_at ON treino_concluido;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_treino_concluido_updated_at
  BEFORE UPDATE ON treino_concluido
  FOR EACH ROW
  EXECUTE FUNCTION update_treino_concluido_updated_at();

-- View para facilitar consultas (estatísticas para dashboard)
CREATE OR REPLACE VIEW treino_concluido_stats AS
SELECT 
  aluna_id,
  DATE_TRUNC('week', data_conclusao) as semana,
  DATE_TRUNC('month', data_conclusao) as mes,
  COUNT(*) as total_treinos,
  COUNT(DISTINCT ficha_treino_id) as treinos_diferentes,
  COUNT(DISTINCT data_conclusao) as dias_ativos
FROM treino_concluido
WHERE concluido = true
GROUP BY aluna_id, semana, mes;

-- Comentários para documentação
COMMENT ON TABLE treino_concluido IS 'Registra quando uma aluna conclui um treino';
COMMENT ON COLUMN treino_concluido.aluna_id IS 'ID da aluna que concluiu o treino';
COMMENT ON COLUMN treino_concluido.ficha_treino_id IS 'ID do treino que foi concluído';
COMMENT ON COLUMN treino_concluido.data_conclusao IS 'Data em que o treino foi concluído';
COMMENT ON COLUMN treino_concluido.concluido IS 'Flag indicando se o treino foi realmente concluído';
