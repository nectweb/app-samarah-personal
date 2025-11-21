/**
 * Utilitários para formatação de valores
 */

/**
 * Formata um valor numérico como moeda brasileira (R$)
 * 
 * @param value - Valor a ser formatado
 * @returns String formatada como moeda brasileira (exemplo: R$ 1.234,56)
 */
export const formatCurrency = (value: number): string => {
  return `R$ ${value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Converte uma string de moeda brasileira em número
 * 
 * @param currencyString - String formatada como moeda brasileira (exemplo: "R$ 1.234,56")
 * @returns Valor numérico equivalente ou 0 se inválido
 */
export const currencyToNumber = (currencyString: string): number => {
  if (!currencyString) return 0;
  
  // Remove o símbolo R$ e qualquer espaço
  const cleanString = currencyString.replace(/R\$\s*/g, '');
  
  // Substitui a vírgula decimal por ponto e remove separadores de milhar
  const numericString = cleanString.replace(/\./g, '').replace(',', '.');
  
  const value = parseFloat(numericString);
  return isNaN(value) ? 0 : value;
}; 