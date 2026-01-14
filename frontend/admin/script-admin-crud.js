// =============Funções Gerais CRUD ================
// Inicialização global do array de dados
window.dadosOriginais = [];
window.itemEditando = null;

// Carregar dados iniciais do backend (admin)
async function inicializarDados() {
  try {
    mostrarCarregamento(true);
    const dados = await window.apiManager.buscarDadosAdmin();
    window.dadosOriginais = Array.isArray(dados) ? dados : [];
    aplicarFiltros();
  } catch (err) {
    console.error('Erro ao carregar dados do backend:', err);
    // fallback para localStorage
    window.dadosOriginais = carregarLocalStorage('dadosAgenda', []);
    aplicarFiltros();
  } finally {
    mostrarCarregamento(false);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  inicializarDados();
});
// Função de paginação duplicada (não usada - existe em script-admin.js)
function _atualizarPaginacao() {
  const paginacao = document.getElementById('paginacao');
  if (!paginacao) return;

  const { paginaAtual, totalPaginas, totalItens } = configPaginacao;
  if (totalPaginas <= 1) {
    paginacao.style.display = 'none';
    return;
  }

  paginacao.style.display = 'flex';

  let html = '';
  html += `
        <button class="page-btn nav-btn first ${paginaAtual === 1 ? 'disabled' : ''}" 
                onclick="irParaPagina(1)" 
                ${paginaAtual === 1 ? 'disabled' : ''}
                title="Primeira página">
            Primeira
        </button>
    `;
  html += `
        <button class="page-btn nav-btn prev ${paginaAtual === 1 ? 'disabled' : ''}" 
                onclick="irParaPagina(${paginaAtual - 1})" 
                ${paginaAtual === 1 ? 'disabled' : ''}
                title="Página anterior">
            Anterior
        </button>
    `;
  const inicio = Math.max(1, paginaAtual - 2);
  const fim = Math.min(totalPaginas, inicio + 4);
  if (inicio > 1) {
    html += `<button class="page-btn" onclick="irParaPagina(1)" title="Página 1">1</button>`;
    if (inicio > 2) {
      html += `<span class="page-separator">⋯</span>`;
    }
  }
  for (let i = inicio; i <= fim; i++) {
    html += `
            <button class="page-btn ${i === paginaAtual ? 'active' : ''}" 
                    onclick="irParaPagina(${i})"
                    title="Página ${i}">${i}</button>
        `;
  }
  if (fim < totalPaginas) {
    if (fim < totalPaginas - 1) {
      html += `<span class="page-separator">⋯</span>`;
    }
    html += `<button class="page-btn" onclick="irParaPagina(${totalPaginas})" title="Página ${totalPaginas}">${totalPaginas}</button>`;
  }
  html += `
        <button class="page-btn nav-btn next ${paginaAtual === totalPaginas ? 'disabled' : ''}" 
                onclick="irParaPagina(${paginaAtual + 1})" 
                ${paginaAtual === totalPaginas ? 'disabled' : ''}
                title="Próxima página">
            Próximo
        </button>
    `;
  html += `
        <button class="page-btn nav-btn last ${paginaAtual === totalPaginas ? 'disabled' : ''}" 
                onclick="irParaPagina(${totalPaginas})" 
                ${paginaAtual === totalPaginas ? 'disabled' : ''}
                title="Última página">
            Última
        </button>
    `;

  paginacao.innerHTML = html;

  const info = document.getElementById('info-paginacao');
  if (info) {
    const inicio =
      (paginaAtual - 1) * parseInt(configPaginacao.itensPorPagina) + 1;
    const fim = Math.min(
      paginaAtual * parseInt(configPaginacao.itensPorPagina),
      totalItens
    );
    info.textContent = `Mostrando ${inicio}-${fim} de ${totalItens} agendamentos`;
  }
}

function irParaPagina(pagina) {
  if (pagina < 1 || pagina > configPaginacao.totalPaginas) return;

  configPaginacao.paginaAtual = pagina;
  atualizarVisualizacao();

  document.getElementById('container-agenda').scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

// ===== DASHBOARD E ESTATÍSTICAS =====
function atualizarDashboard() {
  const dados = window.dadosFiltrados || dadosOriginais;
  const totalAgendamentos = dados.length;
  const totalConfirmados = dados.filter(
    item => item.status === 'ENTREGUE' || item.status === 'CONFIRMADO'
  ).length;
  const totalPendentes = dados.filter(
    item =>
      item.status === 'PREV. ENTREGA' ||
      item.status === 'PREV. ENTREGA EM ATRASO' ||
      item.status === 'PENDENTE'
  ).length;

  const hoje = new Date().toISOString().split('T')[0];
  const confirmadosHoje = dados.filter(
    item =>
      (item.status === 'ENTREGUE' || item.status === 'CONFIRMADO') &&
      formatarDataISO(item.data) === hoje
  ).length;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  const totalMes = dadosOriginais.filter(item => {
    const dataItem = new Date(formatarDataISO(item.data));
    return dataItem >= inicioMes;
  }).length;

  atualizarCard('total-agendamentos', totalAgendamentos);
  atualizarCard('total-confirmados', totalConfirmados);
  atualizarCard('total-pendentes', totalPendentes);
  atualizarCard('total-mes', totalMes);
  atualizarCard('confirmados-hoje', confirmadosHoje);
}

function atualizarCard(elementId, valor) {
  const elemento = document.getElementById(elementId);
  if (elemento) {
    if (typeof valor === 'number' || !isNaN(valor)) {
      animarContador(elemento, valor);
    } else {
      elemento.textContent = valor;
    }
  }
}

function animarContador(elemento, valorFinal) {
  const valorAtual = parseInt(elemento.textContent) || 0;
  const diferenca = valorFinal - valorAtual;
  const duracao = 1000; // 1 segundo
  const incremento = diferenca / (duracao / 16); // 60 FPS

  let contador = valorAtual;

  const animacao = setInterval(() => {
    contador += incremento;
    if (
      (incremento > 0 && contador >= valorFinal) ||
      (incremento < 0 && contador <= valorFinal)
    ) {
      contador = valorFinal;
      clearInterval(animacao);
    }

    elemento.textContent = Math.round(contador);
  }, 16);
}

function abrirModalNovoItem() {
  itemEditando = null;
  limparFormulario();

  // Popular os selects com dados existentes
  popularSelectsCadastro();

  // Habilitar campos para novo agendamento
  document.getElementById('item-codigo').disabled = false;
  document.getElementById('item-fornecedor').disabled = false;
  document.getElementById('item-produto').disabled = false;

  document.getElementById('modal-titulo').innerHTML =
    '<i class="fas fa-plus"></i> Novo Agendamento';
  document.getElementById('modal-item').style.display = 'flex';

  const hoje = new Date();
  document.getElementById('item-data').value = hoje.toISOString().split('T')[0];
  document.getElementById('item-status').value = 'Pendente';
  document.getElementById('item-codigo').focus();
}

// Função para popular os selects com dados existentes
function popularSelectsCadastro() {
  // Obter listas únicas de códigos, fornecedores e produtos
  const codigos = [...new Set(dadosOriginais.map(item => item.codAnt || item.codigo).filter(Boolean))].sort();
  const fornecedores = [...new Set(dadosOriginais.map(item => item.fornecedor).filter(Boolean))].sort();
  const produtos = [...new Set(dadosOriginais.map(item => item.descricao || item.produto).filter(Boolean))].sort();

  // Popular select de códigos
  const selectCodigo = document.getElementById('item-codigo');
  selectCodigo.innerHTML = '<option value="">-- Selecione o Código --</option>';
  codigos.forEach(codigo => {
    const option = document.createElement('option');
    option.value = codigo;
    option.textContent = codigo;
    selectCodigo.appendChild(option);
  });

  // Popular select de fornecedores
  const selectFornecedor = document.getElementById('item-fornecedor');
  selectFornecedor.innerHTML = '<option value="">-- Selecione o Fornecedor --</option>';
  fornecedores.forEach(fornecedor => {
    const option = document.createElement('option');
    option.value = fornecedor;
    option.textContent = fornecedor;
    selectFornecedor.appendChild(option);
  });

  // Popular select de produtos
  const selectProduto = document.getElementById('item-produto');
  selectProduto.innerHTML = '<option value="">-- Selecione o Produto --</option>';
  produtos.forEach(produto => {
    const option = document.createElement('option');
    option.value = produto;
    option.textContent = produto;
    selectProduto.appendChild(option);
  });
}

function editarItem(id) {
  // IDs podem ser string (ex: 'AG...'), não inteiros
  const item = dadosOriginais.find(item => item.id === id);

  if (!item) {
    mostrarNotificacao('Agendamento não encontrado', 'error');
    console.error(
      'Item não encontrado para ID:',
      id,
      'IDs disponíveis:',
      dadosOriginais.map(i => i.id)
    );
    return;
  }

  itemEditando = item;

  // Popular os selects antes de preencher o formulário
  popularSelectsCadastro();

  // Preencher o formulário com os dados do item
  preencherFormulario(item);

  // Desabilitar campos que não podem ser alterados durante edição
  document.getElementById('item-codigo').disabled = true;
  document.getElementById('item-fornecedor').disabled = true;
  document.getElementById('item-produto').disabled = true;

  document.getElementById('modal-titulo').innerHTML =
    '<i class="fas fa-edit"></i> Editar Agendamento';
  document.getElementById('modal-item').style.display = 'flex';
  document.getElementById('item-data').focus();
}

function preencherFormulario(item) {
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  setValue('item-codigo', item.codAnt || item.codigo || '');
  setValue('item-data', formatarDataISO(item.data));
  setValue('item-fornecedor', item.fornecedor);
  setValue('item-produto', item.descricao || item.produto || '');
  setValue('item-quantidade', item.qtde || item.quantidade || '');
  setValue('item-status', item.status || 'Pendente');
  setValue('item-prioridade', item.prioridade || 'Média');
  setValue('item-observacoes', item.observacoes || '');
}

function limparFormulario() {
  document.getElementById('form-item').reset();
  document.getElementById('item-codigo').value = '';

  // Habilitar todos os campos ao limpar
  document.getElementById('item-codigo').disabled = false;
  document.getElementById('item-fornecedor').disabled = false;
  document.getElementById('item-produto').disabled = false;
}

async function salvarItem() {
  const _form = document.getElementById('form-item');
  // Removida validação HTML obrigatória - agora campos são opcionais

  const dadosItem = {
    codAnt: document.getElementById('item-codigo').value.trim(),
    data: document.getElementById('item-data').value,
    fornecedor: document.getElementById('item-fornecedor').value.trim(),
    produto: document.getElementById('item-produto').value.trim(),
    quantidade:
      parseFloat(document.getElementById('item-quantidade').value) || 0,
    status: document.getElementById('item-status').value,
    observacoes: document.getElementById('item-observacoes').value.trim()
  };
  if (!validarDadosItem(dadosItem)) {
    return;
  }
  try {
    mostrarCarregamento(true);
    if (itemEditando) {
      // Atualizar via API
      const _res = await window.apiManager.atualizarAgendamento(
        itemEditando.id,
        {
          ...itemEditando,
          ...dadosItem
        }
      );
      // Atualiza localmente para edição
      const index = dadosOriginais.findIndex(
        item => item.id === itemEditando.id
      );
      if (index !== -1) {
        dadosOriginais[index] = res.item || { ...itemEditando, ...dadosItem };
      }
      mostrarNotificacao('Agendamento atualizado com sucesso', 'success');
      aplicarFiltros(); // Só aplicar filtros para edição
    } else {
      // Criar via API
      console.log('📝 Criando novo agendamento via API...');
      const _res = await window.apiManager.criarAgendamento(dadosItem);
      console.log('✅ Agendamento criado, recarregando dados do servidor...');

      // IMPORTANTE: Não adicionar ao array local, mas recarregar do servidor
      // para garantir sincronização completa
      await carregarDados(true); // Força recarga do servidor
      aplicarFiltros();
      atualizarDashboard();
      atualizarSummaryCards();
      atualizarRodape();

      mostrarNotificacao('Agendamento criado com sucesso', 'success');
    }
    fecharModal('modal-item');
  } catch (error) {
    console.error('Erro ao salvar item:', error);
    mostrarNotificacao(
      'Erro ao salvar agendamento: ' + (error.message || error),
      'error'
    );
  } finally {
    mostrarCarregamento(false);
  }
}

function validarDadosItem(dados) {
  // Status é obrigatório
  if (!dados.status || dados.status.trim() === '') {
    mostrarNotificacao(
      'Por favor, selecione um status para o agendamento',
      'error'
    );
    return false;
  }

  if (dados.data && !validarData(dados.data)) {
    mostrarNotificacao('Data inválida', 'error');
    return false;
  }
  if (dados.quantidade && dados.quantidade <= 0) {
    mostrarNotificacao('Quantidade deve ser maior que zero', 'error');
    return false;
  }
  // Campos opcionais - removidas validações obrigatórias
  if (
    dados.fornecedor &&
    dados.fornecedor.trim().length > 0 &&
    dados.fornecedor.trim().length < 2
  ) {
    mostrarNotificacao(
      'Nome do fornecedor muito curto (mínimo 2 caracteres)',
      'error'
    );
    return false;
  }
  if (
    dados.produto &&
    dados.produto.trim().length > 0 &&
    dados.produto.trim().length < 3
  ) {
    mostrarNotificacao(
      'Descrição do produto muito curta (mínimo 3 caracteres)',
      'error'
    );
    return false;
  }

  return true;
}

function excluirItem(id) {
  // Verificar se é um item simulado
  if (id && id.toString().startsWith('SIM_')) {
    mostrarNotificacao(
      '⚠️ Dados Simulados: Não é possível excluir itens de demonstração. Conecte ao MySQL para usar dados reais.',
      'warning'
    );
    console.warn('Tentativa de excluir dados simulados:', id);
    return;
  }

  const item = dadosOriginais.find(item => item.id === id);
  if (!item) {
    mostrarNotificacao('Agendamento não encontrado', 'error');
    return;
  }

  // Verificar se é um agendamento temporário
  const isTemporario =
    item.tipo === 'TEMPORARIO' || (item.id && item.id.startsWith('temp_'));

  // SEGURANÇA: Bloquear exclusão de agendamentos GEMCO
  if (!isTemporario) {
    mostrarNotificacao(
      '❌ Agendamentos GEMCO não podem ser excluídos por aqui.\n\n💡 Para alterar ou excluir este agendamento, acesse o sistema GEMCO diretamente.',
      'error'
    );
    return;
  }

  const tipoMsg = 'agendamento temporário';
  const avisoAdicional =
    '\n\n⚠️ ATENÇÃO: Este é um agendamento temporário e será removido permanentemente do sistema.';

  acaoConfirmacao = () => {
    (async () => {
      try {
        mostrarCarregamento(true);
        await window.apiManager.excluirAgendamento(id);
        const index = dadosOriginais.findIndex(item => item.id === id);
        if (index !== -1) {
          dadosOriginais.splice(index, 1);
        }
        aplicarFiltros();
        mostrarNotificacao(
          'Agendamento temporário excluído com sucesso',
          'success'
        );
      } catch (err) {
        console.error('Erro ao excluir:', err);
        mostrarNotificacao(
          'Erro ao excluir agendamento: ' + (err.message || err),
          'error'
        );
      } finally {
        mostrarCarregamento(false);
      }
    })();
  };
  mostrarConfirmacao(
    'Excluir Agendamento Temporário',
    `Tem certeza que deseja excluir o ${tipoMsg} de "${item.fornecedor}" - "${item.produto || item.descricao}"?${avisoAdicional}`,
    'Excluir'
  );
}

// Função utilitária não usada (reservada para implementação futura)
function _gerarId() {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// ================= MODAIS E CONFIRMAÇÕES ==============
function mostrarConfirmacao(titulo, mensagem, textoBotao = 'Confirmar') {
  document.getElementById('confirmacao-titulo').textContent = titulo;
  document.getElementById('confirmacao-mensagem').textContent = mensagem;
  document.getElementById('btn-confirmar').textContent = textoBotao;
  document.getElementById('modal-confirmacao').style.display = 'flex';
}
function executarAcaoConfirmada() {
  if (acaoConfirmacao) {
    acaoConfirmacao();
    acaoConfirmacao = null;
  }
  fecharModal('modal-confirmacao');
}

function verDetalhes(id) {
  const item = dadosOriginais.find(item => item.id === id);
  if (!item) {
    mostrarNotificacao('Agendamento não encontrado', 'error');
    return;
  }
  window.verDetalhes(id);
}

function fecharModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
  if (modalId === 'modal-item') {
    itemEditando = null;
    limparFormulario();
  }
  if (modalId === 'modal-confirmacao') {
    acaoConfirmacao = null;
  }
}

function fecharTodosModais() {
  const modais = document.querySelectorAll('.modal');
  modais.forEach(modal => {
    modal.style.display = 'none';
  });

  itemEditando = null;
  acaoConfirmacao = null;
}

// ===== IMPORTAÇÃO E EXPORTAÇÃO =====
function abrirModalImportar() {
  document.getElementById('modal-importar').style.display = 'flex';
}

function handleFiles(files) {
  if (files.length === 0) return;

  const file = files[0];
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (!allowedTypes.includes(file.type)) {
    mostrarNotificacao(
      'Tipo de arquivo não suportado. Use CSV ou Excel.',
      'error'
    );
    return;
  }

  document.getElementById('btn-importar').disabled = false;
  document.getElementById('btn-importar').dataset.file = file.name;

  mostrarNotificacao(`Arquivo "${file.name}" selecionado`, 'info');
}

function exportarExcel() {
  const dados = window.dadosFiltrados || dadosOriginais || [];
  if (dados.length === 0) {
    mostrarNotificacao('Nenhum dado para exportar', 'warning');
    return;
  }

  const dadosExportacao = dados.map(item => ({
    Código: item.codAnt || '',
    Descrição: item.descricao || '',
    Fornecedor: item.fornecedor || '',
    Status: item.status || '',
    'Data Prevista': item.data || '',
    Quantidade: item.qtde || '',
    Saldo: item.saldo || '',
    Observações: item.observacoes || ''
  }));

  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = `agenda_recebimentos_admin_${dataAtual}.xlsx`;

  try {
    if (typeof XLSX !== 'undefined') {
      const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Agenda Admin');
      XLSX.writeFile(workbook, nomeArquivo);
      mostrarNotificacao(`Arquivo Excel exportado: ${nomeArquivo}`, 'success');
    } else {
      if (typeof exportarCSV === 'function') {
        exportarCSV(dadosExportacao, nomeArquivo.replace('.xlsx', '.csv'));
        mostrarNotificacao(
          'Arquivo exportado como CSV (compatível com Excel)',
          'info'
        );
      } else {
        mostrarNotificacao(
          'Erro: Sistema de exportação não disponível',
          'error'
        );
      }
    }
  } catch (error) {
    console.error('Erro ao exportar:', error);
    mostrarNotificacao('Erro ao exportar arquivo', 'error');
  }
}

function exportarPDF() {
  const dados = window.dadosFiltrados || dadosOriginais || [];
  if (!dados.length) {
    mostrarNotificacao('Nenhum dado para exportar', 'warning');
    return;
  }

  try {
    const jsPDFLib = window.jsPDF || (window.jspdf && window.jspdf.jsPDF);
    if (!jsPDFLib) {
      console.warn('jsPDF não disponível, usando fallback gerarPDF');
      const tabela = document.getElementById('agendaTable'); // ID correto da tabela no admin
      if (tabela && typeof window.gerarPDF === 'function') {
        const dataAtual = new Date().toISOString().split('T')[0];
        window.gerarPDF(tabela, `agenda_recebimentos_admin_${dataAtual}.pdf`);
      } else {
        mostrarNotificacao('Erro: Biblioteca de PDF indisponível', 'error');
      }
      return;
    }

    const doc = new jsPDFLib('landscape', 'mm', 'a4');

    doc.setFontSize(16);
    doc.text('Agenda de Recebimento de Mercadorias - Admin', 20, 20);
    doc.setFontSize(12);
    doc.text('Sistema de Gestão', 20, 30);
    doc.setFontSize(10);

    const agora = new Date();
    const dataHora =
      agora.toLocaleDateString('pt-BR') +
      ' às ' +
      agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    doc.text(`Relatório gerado em: ${dataHora}`, 20, 38);
    doc.text(`Total de itens: ${dados.length}`, 20, 45);

    const colunas = [
      { header: 'Código', dataKey: 'codigo' },
      { header: 'Descrição', dataKey: 'descricao' },
      { header: 'Fornecedor', dataKey: 'fornecedor' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Data Prevista', dataKey: 'data' },
      { header: 'Qtde', dataKey: 'qtde' },
      { header: 'Saldo', dataKey: 'saldo' },
      { header: 'Observações', dataKey: 'observacoes' }
    ];

    const linhas = dados.map(item => ({
      codigo: item.codAnt || '',
      descricao: item.descricao || '',
      fornecedor: item.fornecedor || '',
      status: item.status || '',
      data: item.data || '',
      qtde: item.qtde || '',
      saldo: item.saldo || '',
      observacoes: item.observacoes || ''
    }));

    if (typeof doc.autoTable !== 'function') {
      console.warn('autoTable não disponível; tentando fallback gerarPDF');
      const tabela = document.getElementById('agendaTable');
      if (tabela && typeof window.gerarPDF === 'function') {
        const dataAtual = new Date().toISOString().split('T')[0];
        window.gerarPDF(tabela, `agenda_recebimentos_admin_${dataAtual}.pdf`);
        mostrarNotificacao(
          'PDF gerado (fallback) sem formatação avançada',
          'info'
        );
      } else {
        mostrarNotificacao('Erro: Plugin autoTable não carregado', 'error');
      }
      return;
    }

    doc.autoTable({
      columns: colunas,
      body: linhas,
      startY: 55,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        lineColor: [128, 128, 128],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        codigo: { cellWidth: 25 },
        descricao: { cellWidth: 60 },
        fornecedor: { cellWidth: 40 },
        status: { cellWidth: 30 },
        data: { cellWidth: 25 },
        qtde: { cellWidth: 20 },
        saldo: { cellWidth: 20 },
        observacoes: { cellWidth: 50 }
      },
      margin: { top: 55, left: 10, right: 10 }
    });

    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      const h = doc.internal.pageSize.height;
      const w = doc.internal.pageSize.width;
      doc.text(
        'Sistema de Gestão - Relatório gerado automaticamente',
        20,
        h - 15
      );
      doc.text(`Página ${i} de ${totalPaginas}`, w - 40, h - 15);
    }

    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `agenda_recebimentos_admin_${dataAtual}.pdf`;
    doc.save(nomeArquivo);
    mostrarNotificacao(`PDF baixado: ${nomeArquivo}`, 'success');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    mostrarNotificacao('Erro ao gerar PDF: ' + error.message, 'error');
  }
}

// ===== FUNÇÕES AUXILIARES =====
function getStatusClass(status) {
  const classes = {
    Confirmado: 'status-confirmado',
    Pendente: 'status-pendente',
    Cancelado: 'status-cancelado',
    Concluído: 'status-concluido'
  };
  return classes[status] || '';
}

function mostrarCarregamento(mostrar) {
  const elemento = document.getElementById('loading');
  if (elemento) {
    elemento.style.display = mostrar ? 'flex' : 'none';
  }
}

// ===== EXPORTAR FUNÇÕES GLOBAIS =====
window.irParaPagina = irParaPagina;
window.abrirModalNovoItem = abrirModalNovoItem;
window.editarItem = editarItem;
window.excluirItem = excluirItem;
window.salvarItem = salvarItem;
window.verDetalhes = verDetalhes;
window.fecharModal = fecharModal;
window.executarAcaoConfirmada = executarAcaoConfirmada;
window.abrirModalImportar = abrirModalImportar;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;
window.handleFiles = handleFiles;
window.fecharTodosModais = fecharTodosModais;
window.getStatusClass = getStatusClass;
