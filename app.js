const state = { rows: [], filtered: [], fileName: "" };

const fields = {
  etapa: ["etapa"],
  transicao: ["etapadepara"],
  convenio: ["conveniocontaagrupado"],
  atendimento: ["nratendimento", "numeroatendimento", "numerodoatendimento"],
  conta: ["nrconta", "numeroconta", "numerodaconta"],
  paciente: ["paciente", "nomedopaciente"],
  tempoConta: ["tempoconta"],
  tempoEtapa: ["tempoetapa"],
  aging: ["agingconta"],
  valor: ["valorconta"],
  unidade: ["unidade"]
};

const stageDefinitions = [
  ["01", "Conta aberta"],
  ["01.1", "Auditoria in loco"],
  ["02", "Pré-faturamento"],
  ["03", "Pré-análise"],
  ["04", "Central de autorizações"],
  ["05", "Contra-auditoria"],
  ["06", "Expedição, faturamento"],
  ["07", "Expedição, protocolado"],
  ["08", "Simultâneo, protocolado"],
  ["10", "Expedição, NF emitida"],
  ["13", "Negociação concluída"],
  ["14", "Contas não factíveis"]
].map(([code, name]) => ({ code, name, label: `${code} - ${name}` }));

const knownUnits = [
  "Itaim", "ERM-Itaim", "Vila Nova Star", "Maternidade Star", "ERM Maternidade Star",
  "Morumbi", "ERM Morumbi", "Jabaquara", "Criança", "Santa Isabel", "Santa Cruz"
];

const supervisorPortfolios = {
  "04": [
    { name: "Nara", agreements: ["Sul América", "Amil", "Care Plus", "Notre Dame", "Central Nacional Unimed", "Seguros Unimed", "Cabesp", "Hospitau", "Unimed Fesp", "STJ", "STF", "Plan Assiste", "Senado Federal", "Gama Saúde", "Câmara dos Deputados", "Vale", "Usisaúde", "Abertta Saúde"] },
    { name: "Patrícia", agreements: ["Bradesco", "Porto Saúde", "Omint", "Cassi", "Caixa Econômica", "Vivest", "Advance", "Mediservice", "Petrobras", "CET", "Metrus", "Economus", "Unafisco", "Saúde ABAS", "Afresp", "Instituto Religioso Barbara Maix (IRBM)", "Novo Notre Dame Upgrade Criança", "Novo Bradesco Upgrade Jabaquara", "Inspetoria Nossa Senhora Aparecida", "Lars Empreendimentos", "Life Empresarial", "Irmãs São José", "Santa Casa Mauá", "Irmãs Apostolinas"] }
  ],
  "06-07-08": [
    { name: "Ricardo", agreements: ["Abertta Saúde", "Cabesp", "Caixa Econômica", "Câmara dos Deputados", "CET", "Economus", "Amil", "Hospitau", "Life Empresarial", "Metrus", "Omint", "Plan Assiste", "Porto Saúde", "Seguros Unimed", "Vale", "Vivest"] },
    { name: "Liliane", agreements: ["Care Plus", "Central Nacional Unimed", "IDOR", "Inspetoria Nossa Senhora Aparecida", "Instituto Religioso Barbara Maix", "Irmãs São José", "Lars Empreendimentos", "Notre Dame", "Santa Casa Mauá", "Saúde ABAS", "Saúde em Dia", "Seguradoras Internacionais", "Serpro", "Sul América", "Tribunal de Justiça Estado de São Paulo", "World Assist"] },
    { name: "Marcelo", agreements: ["Afresp", "Bradesco", "Cassi", "Gama Saúde", "Mediservice", "Petrobras", "Senado Federal", "STF", "STJ", "Unafisco", "Unimed Fesp", "Usisaúde"] }
  ]
};

const statusInfo = {
  normal: { label: "No prazo", badge: "badge-normal", bar: "bar-normal" },
  critical: { label: "Crítica", badge: "badge-critical", bar: "bar-critical" },
  severe: { label: "Severa", badge: "badge-severe", bar: "bar-severe" },
  shipping: { label: "Expedição", badge: "badge-shipping", bar: "bar-shipping" }
};

const elements = Object.fromEntries([
  "file-input", "upload-button", "browse-button", "sample-button", "drop-zone", "message", "dataset-label",
  "kpi-count", "kpi-count-foot", "kpi-value", "kpi-critical", "kpi-severe", "kpi-shipping", "status-total",
  "status-chart", "unit-chart", "search-input", "unit-filter", "stage-filter", "status-filter", "result-count", "table-body",
  "table-page-info", "export-button", "updated-at", "supervisor-section", "supervisor-grid"
].map((id) => [id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), document.getElementById(id)]));

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getStageCode(value) {
  return String(value ?? "").match(/^\s*0*(\d+(?:\.\d+)?)/)?.[1]?.replace(/^0+(?=\d)/, "") ?? "";
}

function getSupervisor(row) {
  const stageCode = getStageCode(row.etapa);
  const definitions = stageCode === "4"
    ? supervisorPortfolios["04"]
    : ["6", "7", "8"].includes(stageCode)
      ? supervisorPortfolios["06-07-08"]
      : [];
  return definitions.find(({ agreements }) => agreements.some((agreement) => normalize(agreement) === normalize(row.convenio)))?.name ?? "";
}

function renderSupervisor(rows, selectedStage) {
  const stageCode = getStageCode(selectedStage);
  const isAllStages = !stageCode;
  const definitions = stageCode === "4"
    ? supervisorPortfolios["04"]
    : ["6", "7", "8"].includes(stageCode)
      ? supervisorPortfolios["06-07-08"]
      : isAllStages
        ? [
          ...(rows.some((row) => getStageCode(row.etapa) === "4") ? supervisorPortfolios["04"] : []),
          ...(rows.some((row) => ["6", "7", "8"].includes(getStageCode(row.etapa))) ? supervisorPortfolios["06-07-08"] : [])
        ]
        : null;
  const analysisRows = rows.filter((row) => {
    const rowStage = getStageCode(row.etapa);
    if (stageCode === "4") return rowStage === "4";
    if (["6", "7", "8"].includes(stageCode)) return ["6", "7", "8"].includes(rowStage);
    return isAllStages && ["4", "6", "7", "8"].includes(rowStage);
  });

  elements.supervisorSection.hidden = !definitions || analysisRows.length === 0;
  if (!definitions || analysisRows.length === 0) return;

  const analyzedValue = analysisRows.reduce((total, row) => total + (row.valor ?? 0), 0);
  elements.supervisorGrid.innerHTML = definitions.map(({ name, agreements }) => {
    const accounts = analysisRows.filter((row) => getSupervisor(row) === name);
    const value = accounts.reduce((total, row) => total + (row.valor ?? 0), 0);
    const averageTicket = accounts.length ? value / accounts.length : null;
    const agingValues = accounts.map((row) => row.aging ?? row.tempoConta).filter((aging) => aging !== null && Number.isFinite(aging));
    const averageAging = agingValues.length ? agingValues.reduce((total, aging) => total + aging, 0) / agingValues.length : null;
    const share = analyzedValue > 0 ? value / analyzedValue * 100 : 0;
    const formatAverage = (number) => number === null ? "—" : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(number);

    return `<article class="supervisor-card"><h3>${name}</h3><dl class="supervisor-stats"><div><dt>Contas</dt><dd>${formatCount(accounts.length)}</dd></div><div><dt>Valor</dt><dd>${formatCurrency(value, true)}</dd></div><div><dt>Ticket médio</dt><dd>${formatCurrency(averageTicket, true)}</dd></div><div><dt>Aging médio</dt><dd>${averageAging === null ? "—" : `${formatAverage(averageAging)} dias`}</dd></div><div><dt>Participação</dt><dd>${formatAverage(share)}%</dd></div></dl></article>`;
  }).join("");
}

function canonicalStage(value) {
  const text = String(value ?? "").trim();
  const normalized = normalize(text);
  const codeMatch = text.match(/^\s*0*(\d+(?:\.\d+)?)/);
  const code = codeMatch?.[1].replace(/^0+(?=\d)/, "");
  const definition = stageDefinitions.find((stage) => {
    const definedCode = stage.code.replace(/^0+(?=\d)/, "");
    return (code && code === definedCode) || normalized === normalize(stage.name);
  });
  return definition?.label ?? text;
}

function destinationStage(value) {
  return String(value ?? "").split(/\s*(?:→|->|>)\s*/).at(-1).trim();
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let text = String(value ?? "").trim().replace(/[R$\s]/g, "");
  if (!text) return null;
  if (text.includes(",") && text.includes(".")) {
    text = text.lastIndexOf(",") > text.lastIndexOf(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  } else if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if ((text.match(/\./g) ?? []).length > 1 || /\.\d{3}$/.test(text)) {
    text = text.replace(/\./g, "");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDelimited(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const separators = [";", ",", "\t"];
  const delimiter = separators.map((candidate) => {
    let count = 0;
    let quoted = false;
    for (const character of firstLine) {
      if (character === '"') quoted = !quoted;
      else if (character === candidate && !quoted) count += 1;
    }
    return { candidate, count };
  }).sort((left, right) => right.count - left.count)[0].candidate;

  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  return rows;
}

function isSummaryRow(cells) {
  return cells.some((cell) => ["total", "totalgeral"].includes(normalize(cell)));
}

function rowsFromMatrix(matrix) {
  if (!matrix.length) throw new Error("A planilha está vazia.");
  const headers = matrix[0].map(normalize);
  const indexes = {};
  for (const [field, aliases] of Object.entries(fields)) {
    indexes[field] = headers.findIndex((header) => aliases.includes(header));
  }
  const optionalFields = new Set(["etapa", "aging"]);
  const missing = Object.entries(indexes).filter(([field, index]) => index < 0 && !optionalFields.has(field)).map(([field]) => ({
    transicao: "Etapa - De/Para", convenio: "Convênio Conta Agrupado", atendimento: "NR Atendimento",
    conta: "NR Conta", paciente: "Paciente", tempoConta: "Tempo Conta", tempoEtapa: "Tempo Etapa",
    valor: "Valor Conta", unidade: "Unidade"
  })[field]);
  if (missing.length) throw new Error(`Colunas não encontradas: ${missing.join(", ")}.`);

  return matrix.slice(1).filter((cells) => !isSummaryRow(cells)).map((cells, index) => {
    const value = (field) => indexes[field] < 0 ? "" : String(cells[indexes[field]] ?? "").trim();
    const transicao = value("transicao");
    return {
      id: index,
      etapa: canonicalStage(value("etapa") || destinationStage(transicao)),
      transicao,
      convenio: value("convenio"),
      atendimento: value("atendimento"),
      conta: value("conta"),
      paciente: value("paciente"),
      tempoConta: parseNumber(cells[indexes.tempoConta]),
      tempoEtapa: parseNumber(cells[indexes.tempoEtapa]),
      aging: parseNumber(cells[indexes.aging]),
      valor: parseNumber(cells[indexes.valor]),
      unidade: value("unidade") || "Não informada"
    };
  }).filter((row) => row.unidade !== "Não informada" || row.conta || row.atendimento);
}

function isShipping(stage) {
  const text = String(stage ?? "").trim();
  const codeMatch = text.match(/^\s*0*(\d+(?:\.\d+)?)/);
  const code = codeMatch?.[1].replace(/^0+(?=\d)/, "");
  if (code) return code === "6" || code === "7";
  const target = destinationStage(text);
  const targetCode = target.match(/^\s*0*(\d+(?:\.\d+)?)/)?.[1]?.replace(/^0+(?=\d)/, "");
  return targetCode === "6" || targetCode === "7";
}

function getStatus(row) {
  if (isShipping(row.etapa)) return "shipping";
  if (row.tempoConta !== null && row.tempoConta > 75) return "severe";
  if (row.tempoConta !== null && row.tempoConta >= 60 && row.tempoConta <= 75) return "critical";
  return "normal";
}

function formatCurrency(value, compact = false) {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", notation: compact && Math.abs(value) >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: compact && Math.abs(value) >= 1000000 ? 1 : 0
  }).format(value);
}

function formatCount(value) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function setMessage(message = "") {
  elements.message.textContent = message;
}

function setRows(rows, fileName) {
  if (!rows.length) throw new Error("Não encontrei linhas com dados nessa planilha.");
  state.rows = rows;
  state.fileName = fileName;
  elements.datasetLabel.textContent = fileName;
  elements.exportButton.disabled = false;
  populateUnitFilter();
  populateStageFilter();
  setMessage("");
  render();
  elements.updatedAt.textContent = `Importado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`;
}

function populateUnitFilter() {
  const selected = elements.unitFilter.value;
  const units = [...new Set([...knownUnits, ...state.rows.map((row) => row.unidade)])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  elements.unitFilter.innerHTML = '<option value="">Todas</option>' + units.map((unit) => `<option value="${escapeHTML(unit)}">${escapeHTML(unit)}</option>`).join("");
  if (units.includes(selected)) elements.unitFilter.value = selected;
}

function populateStageFilter() {
  const selected = elements.stageFilter.value;
  const knownStages = stageDefinitions.map((stage) => stage.label);
  const otherStages = [...new Set(state.rows.map((row) => row.etapa))].filter((stage) => !knownStages.includes(stage));
  const stages = [...knownStages, ...otherStages.sort((a, b) => a.localeCompare(b, "pt-BR"))];
  elements.stageFilter.innerHTML = '<option value="">Todas</option>' + stages.map((stage) => `<option value="${escapeHTML(stage)}">${escapeHTML(stage)}</option>`).join("");
  if (stages.includes(selected)) elements.stageFilter.value = selected;
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    if (left.valor === null) return right.valor === null ? 0 : 1;
    if (right.valor === null) return -1;
    return right.valor - left.valor;
  });
}

function render() {
  const query = normalize(elements.searchInput.value);
  const unit = elements.unitFilter.value;
  const stage = elements.stageFilter.value;
  const status = elements.statusFilter.value;
  state.filtered = state.rows.filter((row) => {
    const rowStatus = getStatus(row);
    const matchesQuery = !query || normalize(`${row.unidade} ${row.convenio} ${row.atendimento} ${row.conta} ${row.paciente} ${row.transicao}`).includes(query);
    return matchesQuery && (!unit || row.unidade === unit) && (!stage || row.etapa === stage) && (!status || rowStatus === status);
  });
  const rows = sortRows(state.filtered);
  renderMetrics(state.filtered);
  renderStatusChart(state.filtered);
  renderUnitChart(state.filtered);
  renderSupervisor(state.filtered, stage);
  renderTable(rows);
}

function renderMetrics(rows) {
  const counts = { critical: 0, severe: 0, shipping: 0 };
  let totalValue = 0;
  let valueCount = 0;
  for (const row of rows) {
    const status = getStatus(row);
    if (status in counts) counts[status] += 1;
    if (row.valor !== null) { totalValue += row.valor; valueCount += 1; }
  }
  elements.kpiCount.textContent = formatCount(rows.length);
  elements.kpiCountFoot.textContent = `${formatCount(state.rows.length)} no total · após filtros`;
  elements.kpiValue.textContent = valueCount ? formatCurrency(totalValue, true) : "—";
  elements.kpiCritical.textContent = formatCount(counts.critical);
  elements.kpiSevere.textContent = formatCount(counts.severe);
  elements.kpiShipping.textContent = formatCount(counts.shipping);
}

function renderStatusChart(rows) {
  const order = ["normal", "critical", "severe", "shipping"];
  const counts = Object.fromEntries(order.map((key) => [key, 0]));
  rows.forEach((row) => { counts[getStatus(row)] += 1; });
  const max = Math.max(1, ...Object.values(counts));
  elements.statusTotal.textContent = `${formatCount(rows.length)} ${rows.length === 1 ? "conta" : "contas"}`;
  elements.statusChart.innerHTML = order.map((key) => {
    const info = statusInfo[key];
    const height = counts[key] ? Math.max(5, counts[key] / max * 100) : 0;
    return `<div class="status-column"><span class="status-count">${formatCount(counts[key])}</span><div class="status-track"><div class="status-bar ${info.bar}" style="height:${height}%"></div></div><span class="status-name">${info.label}</span></div>`;
  }).join("");
}

function renderUnitChart(rows) {
  const values = new Map();
  rows.forEach((row) => values.set(row.unidade, (values.get(row.unidade) ?? 0) + (row.valor ?? 0)));
  const top = [...values].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!top.length) {
    elements.unitChart.innerHTML = '<p class="empty-inline">Os valores por unidade aparecerão aqui.</p>';
    return;
  }
  const max = Math.max(1, ...top.map(([, value]) => value));
  elements.unitChart.innerHTML = top.map(([unit, value]) => `<div class="unit-row"><span class="unit-name" title="${escapeHTML(unit)}">${escapeHTML(unit)}</span><div class="unit-track"><div class="unit-bar" style="width:${Math.max(0, value / max * 100)}%"></div></div><span class="unit-value">${formatCurrency(value, true)}</span></div>`).join("");
}

function renderTable(rows) {
  const topRows = rows.slice(0, 10);
  elements.exportButton.disabled = !state.rows.some((row) => row.valor !== null && row.valor > 5000);
  elements.resultCount.textContent = `${formatCount(topRows.length)} de ${formatCount(rows.length)} contas`;
  elements.tablePageInfo.textContent = rows.length ? `Exibindo ${formatCount(topRows.length)} de ${formatCount(rows.length)} filtradas` : "";
  if (!rows.length) {
    elements.tableBody.innerHTML = '<tr class="empty-row"><td colspan="11"><span class="empty-mark">⌕</span><strong>Nenhuma conta encontrada</strong><span>Ajuste os filtros e tente novamente.</span></td></tr>';
    return;
  }
  elements.tableBody.innerHTML = topRows.map((row) => {
    const info = statusInfo[getStatus(row)];
    const supervisor = getSupervisor(row) || "—";
    return `<tr><td>${escapeHTML(row.unidade)}</td><td>${escapeHTML(row.convenio || "—")}</td><td class="number-cell">${escapeHTML(row.atendimento || "—")}</td><td class="number-cell">${escapeHTML(row.conta || "—")}</td><td>${escapeHTML(row.paciente || "—")}</td><td class="stage-cell">${escapeHTML(row.transicao || "—")}</td><td class="number-cell">${formatCurrency(row.valor)}</td><td class="number-cell">${row.tempoConta === null ? "—" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(row.tempoConta)} dias`}</td><td class="number-cell">${row.tempoEtapa === null ? "—" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(row.tempoEtapa)} dias`}</td><td><span class="badge ${info.badge}">${info.label}</span></td><td>${supervisor}</td></tr>`;
  }).join("");
}

async function importFile(file) {
  if (!file) return;
  try {
    const extension = file.name.split(".").pop().toLowerCase();
    let matrix;
    if (extension === "csv") {
      matrix = parseDelimited((await file.text()).replace(/^\uFEFF/, ""));
    } else if (["xlsx", "xls"].includes(extension)) {
      if (!window.XLSX) throw new Error("O leitor de Excel não carregou. Verifique a conexão e recarregue a página; arquivos CSV continuam disponíveis.");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
      matrix = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
    } else {
      throw new Error("Formato não suportado. Selecione um arquivo CSV, XLSX ou XLS.");
    }
    setRows(rowsFromMatrix(matrix), file.name);
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "Não foi possível ler a planilha.");
  } finally {
    elements.fileInput.value = "";
  }
}

async function exportExcel() {
  if (!window.ExcelJS) {
    setMessage("O recurso de Excel não carregou. Verifique a conexão e recarregue a página para exportar.");
    return;
  }
  const rows = sortRows(state.rows).filter((row) => row.valor !== null && row.valor > 5000);
  const headers = ["Unidade", "Convênio Conta Agrupado", "NR Atendimento", "NR Conta", "Paciente", "Etapa - De/Para", "Valor Conta", "Tempo Conta", "Tempo Etapa", "Prioridade", "Supervisor"];
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Contas acima de 5000");
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow([row.unidade, row.convenio, row.atendimento, row.conta, row.paciente, row.transicao, row.valor ?? "", row.tempoConta ?? "", row.tempoEtapa ?? "", statusInfo[getStatus(row)].label, getSupervisor(row) || ""]));
  worksheet.columns = [{ width: 22 }, { width: 24 }, { width: 16 }, { width: 16 }, { width: 24 }, { width: 34 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: "Aptos Narrow", size: 11, ...(row.number === 1 ? { bold: true } : {}) };
    });
  });

  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contas-acima-de-5000.xlsx";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (error) {
    setMessage(error instanceof Error ? `Não foi possível gerar o Excel: ${error.message}` : "Não foi possível gerar o arquivo Excel.");
  }
}

const sampleMatrix = [
  ["Unidade", "Convênio Conta Agrupado", "NR Atendimento", "NR Conta", "Paciente", "Etapa - De/Para", "Valor Conta", "Tempo Conta", "Tempo Etapa", "Etapa"],
  ["Itaim", "Bradesco Saúde", "56317738", "13346680", "Paciente 001", "01 - Conta aberta → 01.1 - Auditoria in loco", "R$ 12.450,00", 54, 14, "01.1 - Auditoria in loco"],
  ["ERM-Itaim", "SulAmérica", "56317739", "13346681", "Paciente 002", "01.1 - Auditoria in loco → 02 - Pré-faturamento", "R$ 28.100,00", 45, 37, "02 - Pré-faturamento"],
  ["Vila Nova Star", "Bradesco Saúde", "56317740", "13346682", "Paciente 003", "02 - Pré-faturamento → 03 - Pré-análise", "R$ 8.760,50", 39, 24, "03 - Pré-análise"],
  ["Maternidade Star", "Amil", "56317741", "13346683", "Paciente 004", "02 - Pré-faturamento → 03 - Pré-análise", "R$ 1.850,00", 116, 3, "03 - Pré-análise"],
  ["ERM Maternidade Star", "Bradesco Saúde", "56317742", "13346684", "Paciente 005", "05 - Contra-auditoria → 06 - Expedição, faturamento", "R$ 34.700,00", 48, 3, "06 - Expedição, faturamento"],
  ["Morumbi", "Unimed", "56317743", "13346685", "Paciente 006", "06 - Expedição, faturamento → 07 - Expedição, protocolado", "R$ 6.920,00", 55, 45, "07 - Expedição, protocolado"],
  ["ERM Morumbi", "Bradesco Saúde", "56317744", "13346686", "Paciente 007", "03 - Pré-análise → 04 - Central de autorizações", "R$ 19.850,00", 71, 0, "04 - Central de autorizações"],
  ["Jabaquara", "Amil", "56317745", "13346687", "Paciente 008", "04 - Central de autorizações → 05 - Contra-auditoria", "R$ 11.240,00", 56, 67, "05 - Contra-auditoria"],
  ["Criança", "SulAmérica", "56317746", "13346688", "Paciente 009", "07 - Expedição, protocolado → 08 - Simultâneo, protocolado", "R$ 22.500,00", 77, 67, "08 - Simultâneo, protocolado"],
  ["Santa Isabel", "Unimed", "56317747", "13346689", "Paciente 010", "08 - Simultâneo, protocolado → 10 - Expedição, NF emitida", "R$ 4.580,00", 8, 0, "10 - Expedição, NF emitida"],
  ["Santa Cruz", "Bradesco Saúde", "56317748", "13346690", "Paciente 011", "10 - Expedição, NF emitida → 13 - Negociação concluída", "R$ 9.340,00", 67, 67, "13 - Negociação concluída"],
  ["Itaim", "Amil", "56317749", "13346691", "Paciente 012", "13 - Negociação concluída → 14 - Contas não factíveis", "R$ 2.000,00", 44, 0, "14 - Contas não factíveis"],
  ["Total", "", "", "", "", "", "R$ 29.649.637,00", "", "", ""]
];

elements.uploadButton.addEventListener("click", () => elements.fileInput.click());
elements.browseButton.addEventListener("click", () => elements.fileInput.click());
elements.fileInput.addEventListener("change", (event) => importFile(event.target.files[0]));
elements.sampleButton.addEventListener("click", () => {
  try { setRows(rowsFromMatrix(sampleMatrix), "Dados de exemplo"); }
  catch (error) { setMessage(error.message); }
});
elements.searchInput.addEventListener("input", render);
elements.unitFilter.addEventListener("change", render);
elements.stageFilter.addEventListener("change", render);
elements.statusFilter.addEventListener("change", render);
elements.exportButton.addEventListener("click", exportExcel);

for (const eventName of ["dragenter", "dragover"]) {
  elements.dropZone.addEventListener(eventName, (event) => { event.preventDefault(); elements.dropZone.classList.add("is-over"); });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.dropZone.addEventListener(eventName, (event) => { event.preventDefault(); elements.dropZone.classList.remove("is-over"); });
}
elements.dropZone.addEventListener("drop", (event) => importFile(event.dataTransfer.files[0]));