# Dashboard de análise de contas por Aging

Aplicação leve em HTML/JavaScript para analisar contas hospitalares usando as colunas:

- Etapa - De/Para
- Convênio Conta Agrupado
- NR Atendimento
- NR Conta
- Paciente
- Valor Conta
- Tempo Conta
- Tempo Etapa
- Unidade

## Regra aplicada

- As etapas `06 - Expedição, faturamento` e `07 - Expedição, protocolado` são consideradas em expedição.
- A etapa `08 - Simultâneo, protocolado` também é considerada em expedição.
- Se `Tempo Conta` estiver entre `60` e `75`, a conta entra em situação crítica, inclusive quando também estiver em expedição.
- Se `Tempo Conta` for maior que `75`, a conta é severa.
- As faixas de aging são independentes de expedição: uma conta pode ser crítica ou severa e também estar em expedição.
- Contas de Ricardo nas etapas `07` e `08` sem protocolo são sinalizadas. O protocolo é lido pelo cabeçalho `Protocolo` ou pela coluna `AX`.
- Linhas de resumo identificadas como `Total` não entram na soma de `Valor Conta`.
- O detalhamento mostra as 10 contas de maior `Valor Conta`, em ordem decrescente.
- A exportação Excel inclui todas as contas com `Valor Conta` acima de `R$ 5.000`, em ordem decrescente, mantendo a prioridade.
- A análise também considera a transição em `Etapa - De/Para` para identificar avanço ou travamento.

## Como usar

1. Abra o arquivo `index.html` no navegador, ou rode um servidor local.
2. Clique em `Enviar planilha`.
3. Use CSV ou XLSX/XLS com as colunas acima.
4. Aplique filtros por unidade, etapa e prioridade; o detalhamento e a exportação Excel mostram até 10 contas com os campos operacionais da planilha.

## Executar localmente

No VS Code, abra o terminal na pasta do projeto e execute:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

## Arquivos principais

- `index.html` — estrutura do dashboard.
- `styles.css` — visual do painel.
- `app.js` — lógica de análise e gráficos.
- `sample-data.csv` — exemplo de dados para testar rapidamente.

## Git e GitHub

Se o Git ainda não estiver instalado no Windows:

```text
https://git-scm.com/download/win
```

Depois reinstale ou confirme a instalação e reinicie o VS Code.

Verifique se o Git está funcionando:

```bash
git --version
```

Se funcionar, inicialize o repositório:

```bash
git init
git add .
git commit -m "Initial dashboard"
git branch -M main
```

Conecte ao GitHub:

```bash
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

## Observação

A lógica foi construída para apoiar a análise e priorização de contas, com foco na chegada à expedição e na janela crítica de `Tempo Etapa`.
