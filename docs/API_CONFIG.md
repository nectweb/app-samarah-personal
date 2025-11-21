# Configuração da API ASAAS

Este documento descreve como configurar as credenciais da API ASAAS no aplicativo Samarah Trainer.

## Variáveis de Ambiente

A aplicação utiliza o token de acesso do ASAAS para acessar dados como o número de alunas ativas, pagamentos, etc.

### Configurando o Token de Acesso ASAAS

#### Desenvolvimento Local

1. Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```
ASAAS_API_KEY=seu_token_de_acesso_aqui
```

2. Inicie o aplicativo com o comando:

```bash
# Para Android
ASAAS_API_KEY=seu_token_de_acesso_aqui npx expo start --android

# Para iOS
ASAAS_API_KEY=seu_token_de_acesso_aqui npx expo start --ios
```

#### Produção

Para produção, configure o token como uma variável de ambiente no seu serviço de hospedagem ou CI/CD.

## Funções da API

### Alunas Ativas

A aplicação busca o número total de alunas ativas através de uma chamada à API:

```
GET https://api.asaas.com/v3/customers?active=true&limit=1
```

A resposta contém o campo `totalCount` que representa o número total de alunas ativas.

### Taxa de Crescimento

A aplicação calcula a taxa de crescimento de novas alunas através de chamadas à API:

```
GET https://api.asaas.com/v3/customers?active=true&dateCreated[ge]={primeiro_dia_mes_atual}&dateCreated[le]={hoje}
GET https://api.asaas.com/v3/customers?active=true&dateCreated[ge]={primeiro_dia_mes_anterior}&dateCreated[lt]={primeiro_dia_mes_atual}
```

Onde:
- `{primeiro_dia_mes_atual}`: é o primeiro dia do mês atual (formato YYYY-MM-DD)
- `{hoje}`: é a data atual (formato YYYY-MM-DD)
- `{primeiro_dia_mes_anterior}`: é o primeiro dia do mês anterior (formato YYYY-MM-DD)

A função:
1. Calcula as datas relevantes para o mês atual e anterior
2. Faz duas requisições para obter o número de alunas criadas em cada período
3. Calcula a porcentagem de crescimento com a fórmula: ((totalAtual - totalAnterior) / totalAnterior) * 100
4. Trata o caso especial de divisão por zero (quando não havia alunas no mês anterior)
5. Formata o resultado com sinal "+" se for positivo (exemplo: "+15%")

### Receita Mensal

A aplicação calcula a receita mensal total através de chamadas à API:

```
GET https://api.asaas.com/v3/payments?status=RECEIVED,CONFIRMED&paymentDate[ge]={primeiro_dia_mes}&paymentDate[le]={ultimo_dia_mes}
```

Onde:
- `{primeiro_dia_mes}`: é o primeiro dia do mês atual (formato YYYY-MM-DD)
- `{ultimo_dia_mes}`: é o último dia do mês atual (formato YYYY-MM-DD)

A função:
1. Calcula o primeiro e último dia do mês atual
2. Busca todos os pagamentos com status RECEIVED ou CONFIRMED no período
3. Implementa paginação para lidar com grandes volumes de dados
4. Soma os valores de todos os pagamentos recebidos
5. Formata o resultado como moeda brasileira (R$ X.XXX,XX)

## Testando a Funcionalidade

### Testando a Taxa de Crescimento

Para testar a funcionalidade de taxa de crescimento:

1. Certifique-se de que há alunas ativas criadas no mês atual e anterior na sua conta ASAAS.
2. Inicie o aplicativo com o token ASAAS configurado.
3. O quadro "Crescimento" no dashboard deve exibir a taxa de crescimento calculada.
4. Você pode atualizar os dados puxando a tela para baixo (pull-to-refresh).

### Testando a Receita Mensal

Para testar a funcionalidade de receita mensal:

1. Certifique-se de que existem pagamentos com status `RECEIVED` ou `CONFIRMED` no mês atual na sua conta ASAAS.
2. Inicie o aplicativo com o token ASAAS configurado.
3. O quadro "Receita Mensal" no dashboard deve exibir o valor total dos pagamentos recebidos.
4. Você pode atualizar os dados puxando a tela para baixo (pull-to-refresh).

## Verificação da Configuração

Você pode verificar se a configuração está correta observando os quadros "Alunas Ativas", "Crescimento" e "Receita Mensal" no dashboard. Se estiver funcionando corretamente, os quadros exibirão os valores obtidos da API ASAAS.

Se houver algum erro de configuração, os quadros exibirão um indicador de erro. 