// JavaScript para Interface de Administração - Sistema de Agenda de Recebimentos

// =============== Variáveis globais ===============
let dadosOriginais = [];
const _dadosFiltrados = []; // Marcada com _ para indicar não uso
let dadosVisualizacao = [];
let filtrosAtivos = {};
const configPaginacao = {
  paginaAtual: 1,
  itensPorPagina: 25,
  totalItens: 0,
  totalPaginas: 0
};

let configuracaoOrdenacao = {
  campo: 'data',
  direcao: 'asc'
};

const _itemEditando = null; // Variável reservada para futuro uso
const _acaoConfirmacao = null; // Variável reservada para futuro uso
let filtrosProcessando = false;

// Variáveis para monitoramento de exclusões
let _ultimaExclusao = null; // Variável reservada
let intervaloPollExclusao = null;

// Função para monitorar mudanças após exclusão (reservada para uso futuro)
function _iniciarMonitoramentoExclusao() {
  if (intervaloPollExclusao) {
    clearInterval(intervaloPollExclusao);
  }

  _ultimaExclusao = Date.now();
  let tentativas = 0;
  const maxTentativas = 6; // 30 segundos de monitoramento

  intervaloPollExclusao = setInterval(async () => {
    tentativas++;
    console.log(`🔍 Monitoramento: Verificação ${tentativas}/${maxTentativas}`);

    try {
      const dadosFrescos = await window.apiManager.buscarDadosAdmin();

      // Comparar com dados atuais
      if (dadosFrescos.length !== dadosOriginais.length) {
        console.log('📊 Monitoramento: Diferença detectada, atualizando...');
        dadosOriginais = dadosFrescos;

        // Marcar agendamentos temporários
        dadosOriginais.forEach(item => {
          if (
            item.tipo === 'TEMPORARIO' ||
            (item.id && item.id.toString().startsWith('temp_'))
          ) {
            item.isTemporario = true;
          }
        });

        aplicarFiltros();
        clearInterval(intervaloPollExclusao);
        intervaloPollExclusao = null;
        console.log('✅ Monitoramento: Sincronização completa');
        return;
      }

      if (tentativas >= maxTentativas) {
        console.log('⏰ Monitoramento: Timeout, parando verificações');
        clearInterval(intervaloPollExclusao);
        intervaloPollExclusao = null;
      }
    } catch (error) {
      console.error('❌ Monitoramento: Erro na verificação:', error);
    }
  }, 5000); // Verificar a cada 5 segundos
}

// ============ Inicialização ==============
document.addEventListener('DOMContentLoaded', function () {
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('user_data');
  console.log('Estado atual do localStorage:');
  console.log('- Token:', token ? 'EXISTE' : 'NÃO EXISTE');
  console.log('- UserData:', userData ? 'EXISTE' : 'NÃO EXISTE');

  verificarAutenticacao();

  setTimeout(() => {
    inicializarSistema();
    configurarEventListeners();
    carregarDados();

    setTimeout(() => {
      atualizarRodape();
    }, 1000);
  }, 100);
});

function inicializarSistema() {
  inicializarTema();
  configurarBotaoTema();
  inicializarFiltros();
  inicializarOrdenacao();
  configurarModoVisualizacao();
  inicializarTableView();
  configurarDropdowns();
  configurarDragAndDrop();
  configurarAcessibilidade();
  inicializarToggleFiltros();
  atualizarInfoUsuario();
}

function configurarBotaoTema() {
  const btnTema = document.getElementById('themeToggle');
  if (btnTema) {
    btnTema.addEventListener('click', () => {
      toggleTheme();
    });
  }
}

function verificarAutenticacao() {
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('user_data');

  if (!token || !userData) {
    window.location.href = '../login/login.html';
    return;
  }

  try {
    const usuario = JSON.parse(userData);
    if (usuario.perfil !== 'admin') {
      window.location.href = '../login/login.html';
      return;
    }

    if (document.getElementById('userId')) {
      document.getElementById('userId').textContent =
        usuario.email || usuario.nome || 'Administrador';
    }
  } catch {
    // Em caso de erro na autenticação, redireciona para login
    window.location.href = '../login/login.html';
  }
}

function atualizarInfoUsuario() {
  const agora = new Date();
  const ultimaSync = document.getElementById('lastUpdate');

  setInterval(() => {
    const tempoDecorrido = Math.floor((new Date() - agora) / 60000);
    if (tempoDecorrido < 1) {
      ultimaSync.textContent = 'Atualizado agora';
    } else if (tempoDecorrido < 60) {
      ultimaSync.textContent = `Atualizado há ${tempoDecorrido} min`;
    } else {
      ultimaSync.textContent = `Atualizado há ${Math.floor(tempoDecorrido / 60)}h`;
    }
  }, 60000);

  atualizarRodape();
}

function atualizarRodape() {
  const footerTotalRecords = document.getElementById('footerTotalRecords');
  if (footerTotalRecords) {
    footerTotalRecords.textContent = dadosOriginais.length || 0;
  }

  const footerLastUpdate = document.getElementById('footerLastUpdate');
  if (footerLastUpdate) {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    footerLastUpdate.textContent = `${dataFormatada} às ${horaFormatada}`;
  }

  const footerUser = document.getElementById('footerUser');
  const userIdElement = document.getElementById('userId');
  if (footerUser && userIdElement) {
    footerUser.textContent =
      userIdElement.textContent || 'administrador@example.com';
  }
}

function inicializarFiltros() {
  const filtrosSalvos = carregarLocalStorage('filtros_admin', {});
  if (filtrosSalvos && Object.keys(filtrosSalvos).length > 0) {
    Object.keys(filtrosSalvos).forEach(campo => {
      const elemento = document.getElementById(campo);
      if (elemento) {
        elemento.value = filtrosSalvos[campo];
        filtrosAtivos[campo] = filtrosSalvos[campo];
      }
    });
  }

  const filtroPeriodo = document.getElementById('periodo');
  if (filtroPeriodo) {
    filtroPeriodo.addEventListener('change', function () {
      const filtrosData = document.getElementById('filtros-data');
      if (this.value === 'personalizado') {
        filtrosData.style.display = 'flex';
      } else {
        filtrosData.style.display = 'none';
      }
    });
  }
}

function inicializarOrdenacao() {
  const ordenacaoSalva = carregarLocalStorage(
    'ordenacao_admin',
    configuracaoOrdenacao
  );
  configuracaoOrdenacao = ordenacaoSalva;
  atualizarIconesOrdenacao();
}

function configurarModoVisualizacao() {
  const modoSalvo = carregarLocalStorage('modo_visualizacao_admin', 'tabela');
  if (modoSalvo === 'cards') {
    alternarModoVisualizacao();
  }
}

function inicializarTableView() {
  setTimeout(() => {
    const tableViewSalva = carregarLocalStorage('table_view_admin', 'compact');
    setTableView(tableViewSalva);
  }, 100);
}

function configurarDropdowns() {
  const btnExportar = document.getElementById('btn-exportar');
  const menuExportar = document.getElementById('menu-exportar');

  if (btnExportar && menuExportar) {
    btnExportar.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      this.classList.toggle('active');
      menuExportar.classList.toggle('show');
    });

    document.addEventListener('click', function () {
      btnExportar.classList.remove('active');
      menuExportar.classList.remove('show');
    });
  }
}

window.limparBusca = function () {
  document.getElementById('busca').value = '';
  aplicarFiltros();
};

function configurarDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (dropZone && fileInput) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(
        eventName,
        () => dropZone.classList.add('dragover'),
        false
      );
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(
        eventName,
        () => dropZone.classList.remove('dragover'),
        false
      );
    });

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    }

    fileInput.addEventListener('change', function () {
      handleFiles(this.files);
    });
  }
}

function configurarAcessibilidade() {
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      abrirModalNovoItem();
    }

    if (e.ctrlKey && e.key === 's') {
      const modalItem = document.getElementById('modal-item');
      if (modalItem.style.display === 'flex') {
        e.preventDefault();
        salvarItem();
      }
    }

    if (e.key === 'F5' && !e.ctrlKey) {
      e.preventDefault();
      atualizarDados();
    }

    if (e.key === 'Escape') {
      fecharTodosModais();
    }
  });
}

// ==================== Funções Globais para HTML ====================

function sortTable(campo) {
  ordenarTabela(campo);
}

function previousPage() {
  if (configPaginacao.paginaAtual > 1) {
    configPaginacao.paginaAtual--;
    renderizarTabela();
  }
}

function nextPage() {
  if (configPaginacao.paginaAtual < configPaginacao.totalPaginas) {
    configPaginacao.paginaAtual++;
    renderizarTabela();
  }
}

// ==================== Event Listeners ====================
function configurarEventListeners() {
  const campoBusca = document.getElementById('busca');
  if (campoBusca) {
    let timeoutBusca;

    campoBusca.addEventListener('input', function () {
      const searchInput = this.closest('.search-input');
      searchInput.classList.add('searching');

      clearTimeout(timeoutBusca);
      timeoutBusca = setTimeout(() => {
        aplicarFiltros();
        searchInput.classList.remove('searching');
      }, 300);
    });

    campoBusca.addEventListener('focus', function () {
      this.closest('.search-input').classList.add('focused');
    });

    campoBusca.addEventListener('blur', function () {
      this.closest('.search-input').classList.remove('focused');
    });
  }

  const filtros = [
    'status',
    'fornecedor',
    'periodo',
    'dataInicio',
    'dataFim',
    'tipo'
  ];
  filtros.forEach(filtroId => {
    const elemento = document.getElementById(filtroId);
    if (elemento) {
      console.log('Configurando listener para:', filtroId);
      elemento.addEventListener('change', function () {
        console.log('Filtro alterado:', filtroId, 'Valor:', this.value);
        aplicarFiltros();
      });
    } else {
      console.warn('Elemento não encontrado:', filtroId);
    }
  });

  const itensPorPagina = document.getElementById('itemsPerPage');
  if (itensPorPagina) {
    itensPorPagina.addEventListener('change', function () {
      configPaginacao.paginaAtual = 1;
      configPaginacao.itensPorPagina =
        this.value === 'all' ? 999999 : parseInt(this.value);
      atualizarVisualizacao();
    });
  }

  const formItem = document.getElementById('form-item');
  if (formItem) {
    formItem.addEventListener('submit', function (e) {
      e.preventDefault();
      salvarItem();
    });
  }

  document.querySelectorAll('th[data-campo]').forEach(th => {
    th.addEventListener('click', function () {
      const campo = this.dataset.campo;
      ordenarTabela(campo);
    });
  });
}

function setTableView(view) {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeButton = document.querySelector(
    `[onclick="setTableView('${view}')"]`
  );
  if (activeButton) {
    activeButton.classList.add('active');
  }

  const tableContainer = document.querySelector('.table-container');
  const dataTable = document.querySelector('.data-table');

  if (tableContainer) {
    tableContainer.classList.remove('view-compact', 'view-detailed');
    if (view === 'compact') {
      tableContainer.classList.add('view-compact');
    } else if (view === 'detailed') {
      tableContainer.classList.add('view-detailed');
    }
  }

  if (dataTable) {
    dataTable.classList.remove('compact-view', 'detailed-view');
    if (view === 'compact') {
      dataTable.classList.add('compact-view');
    } else if (view === 'detailed') {
      dataTable.classList.add('detailed-view');
    }
  }

  // Salvar o estado no localStorage
  salvarLocalStorage('table_view_admin', view);
  renderizarTabela();
}

// Tornar setTableView globalmente acessível para o HTML
window.setTableView = setTableView;

function mostrarCarregamento(mostrar) {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = mostrar ? 'flex' : 'none';
  }
}

async function carregarDados(_forcarAPI = false) {
  mostrarCarregamento(true);

  try {
    // Para admin, sempre buscar dados frescos da API para incluir agendamentos temporários
    console.log('🔄 Carregando dados frescos da API...');
    const resultado = await window.apiManager.buscarDadosAdmin();
    dadosOriginais = resultado || [];

    // Marcar agendamentos temporários
    dadosOriginais.forEach(item => {
      if (
        item.tipo === 'TEMPORARIO' ||
        (item.id && item.id.toString().startsWith('temp_'))
      ) {
        item.isTemporario = true;
      }
    });

    // Salvar no localStorage apenas para backup
    salvarLocalStorage('dadosAgenda', dadosOriginais);
    mostrarNotificacao(
      `${dadosOriginais.length} agendamentos carregados (incluindo temporários)`,
      'success'
    );

    aplicarFiltros();
    preencherFiltrosFornecedores();
    preencherFiltrosStatus();
    preencherFiltrosCodigos();
    preencherSelectStatusFormulario();
    atualizarDashboard();
    atualizarSummaryCards();
    atualizarRodape();
  } catch (error) {
    console.error('❌ Erro ao carregar dados:', error);

    // Fallback para localStorage quando a API falhar
    const dadosLocal = carregarLocalStorage('dadosAgenda', null);
    if (dadosLocal && Array.isArray(dadosLocal) && dadosLocal.length > 0) {
      dadosOriginais = dadosLocal;
      mostrarNotificacao('Agendamentos carregados do cache local', 'info');

      aplicarFiltros();
      preencherFiltrosFornecedores();
      preencherFiltrosStatus();
      preencherFiltrosCodigos();
      preencherSelectStatusFormulario();
      atualizarDashboard();
      atualizarSummaryCards();
      atualizarRodape();
    } else {
      mostrarNotificacao('Erro ao carregar dados: ' + error.message, 'error');
    }
  } finally {
    mostrarCarregamento(false);
  }
}

function atualizarDados() {
  const btnAtualizar = document.querySelector('.btn-icon i.fa-sync-alt');
  if (btnAtualizar) {
    btnAtualizar.classList.add('fa-spin');
  }

  carregarDados(true)
    .then(() => {
      // Forçar busca da API
      setTimeout(() => {
        if (btnAtualizar) {
          btnAtualizar.classList.remove('fa-spin');
        }
        atualizarRodape();
      }, 1500);
    })
    .catch(error => {
      console.error('Erro ao atualizar dados:', error);
      if (btnAtualizar) {
        btnAtualizar.classList.remove('fa-spin');
      }
    });
}

function preencherFiltrosFornecedores() {
  const selectFornecedor = document.getElementById('fornecedor');
  const listaDatalists = document.getElementById('lista-fornecedores');

  if (!selectFornecedor) return;

  const fornecedores = [
    ...new Set(dadosOriginais.map(item => item.fornecedor))
  ].sort();

  selectFornecedor.innerHTML =
    '<option value="">Todos os fornecedores</option>';
  fornecedores.forEach(fornecedor => {
    const option = document.createElement('option');
    option.value = fornecedor;
    option.textContent = fornecedor;
    selectFornecedor.appendChild(option);
  });

  if (listaDatalists) {
    listaDatalists.innerHTML = '';
    fornecedores.forEach(fornecedor => {
      const option = document.createElement('option');
      option.value = fornecedor;
      listaDatalists.appendChild(option);
    });
  }

  if (filtrosAtivos.fornecedor) {
    selectFornecedor.value = filtrosAtivos.fornecedor;
  }
}

function preencherFiltrosStatus() {
  const selectStatus = document.getElementById('status');
  if (!selectStatus) return;
  const statusList = [
    'Pendente',
    'Agendado',
    'Prev. Sem Agenda',
    'Prev. Entrega em Atraso'
  ];
  selectStatus.innerHTML = '<option value="">Todos</option>';
  statusList.forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    selectStatus.appendChild(option);
  });
  if (filtrosAtivos.status) {
    selectStatus.value = filtrosAtivos.status;
  }
}

function preencherFiltrosCodigos() {
  const selectCodigo = document.getElementById('tipo');
  if (!selectCodigo) return;

  const codigos = [
    ...new Set(dadosOriginais.map(item => item.codAnt || item.codigo).filter(Boolean))
  ].sort();

  selectCodigo.innerHTML = '<option value="">Todos</option>';
  codigos.forEach(codigo => {
    const option = document.createElement('option');
    option.value = codigo;
    option.textContent = codigo;
    selectCodigo.appendChild(option);
  });

  if (filtrosAtivos.tipo) {
    selectCodigo.value = filtrosAtivos.tipo;
  }
}

function preencherSelectStatusFormulario() {
  const selectStatus = document.getElementById('item-status');
  if (!selectStatus) return;
  const statusList = [
    'Agendado',
    'Prev. Sem Agenda',
    'Prev. Entrega em Atraso'
  ];
  selectStatus.innerHTML = '<option value="">-- Selecione o Status --</option>';
  statusList.forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    selectStatus.appendChild(option);
  });
}

function aplicarFiltros() {
  if (filtrosProcessando) {
    console.log('aplicarFiltros() abortada - já processando');
    return;
  }

  filtrosProcessando = true;
  const busca = document.getElementById('busca')?.value || '';
  const status = document.getElementById('status')?.value || '';
  const fornecedor = document.getElementById('fornecedor')?.value || '';
  const periodo = document.getElementById('periodo')?.value || '';
  const dataInicio = document.getElementById('dataInicio')?.value || '';
  const dataFim = document.getElementById('dataFim')?.value || '';
  const tipo = document.getElementById('tipo')?.value || '';

  filtrosAtivos = {
    busca,
    status,
    fornecedor,
    periodo,
    dataInicio,
    dataFim,
    tipo
  };

  salvarLocalStorage('filtros_admin', filtrosAtivos);

  let dadosFiltrados = [...dadosOriginais];

  if (busca) {
    dadosFiltrados = buscarTexto(dadosFiltrados, busca, [
      'fornecedor',
      'produto',
      'observacoes',
      'contato'
    ]);
  }

  if (status) {
    dadosFiltrados = dadosFiltrados.filter(item => item.status === status);
  }

  if (fornecedor) {
    dadosFiltrados = dadosFiltrados.filter(
      item => item.fornecedor === fornecedor
    );
  }

  if (tipo) {
    dadosFiltrados = dadosFiltrados.filter(
      item => (item.codAnt || item.codigo) === tipo
    );
  }

  if (periodo && periodo !== 'customizado') {
    const { dataInicio: inicio, dataFim: fim } = obterDatasPeriodo(periodo);
    dadosFiltrados = dadosFiltrados.filter(item =>
      estaNoIntervalo(item.data, inicio, fim)
    );
  } else if (periodo === 'customizado' && (dataInicio || dataFim)) {
    dadosFiltrados = dadosFiltrados.filter(item =>
      estaNoIntervalo(item.data, dataInicio, dataFim)
    );
  }

  dadosFiltrados = ordenarPor(
    dadosFiltrados,
    configuracaoOrdenacao.campo,
    configuracaoOrdenacao.direcao
  );

  window.dadosFiltrados = dadosFiltrados;

  configPaginacao.paginaAtual = 1;
  configPaginacao.totalItens = dadosFiltrados.length;
  configPaginacao.totalPaginas = calcularTotalPaginas(
    configPaginacao.totalItens,
    configPaginacao.itensPorPagina
  );

  atualizarVisualizacao();
  atualizarInfoFiltros();
  atualizarDashboard();
  atualizarSummaryCards();

  filtrosProcessando = false;
}

function limparFiltros() {
  document.getElementById('busca').value = '';
  document.getElementById('status').value = '';
  document.getElementById('fornecedor').value = '';
  document.getElementById('periodo').value = '';
  document.getElementById('dataInicio').value = '';
  document.getElementById('dataFim').value = '';
  document.getElementById('tipo').value = '';
  document.getElementById('filtros-data').style.display = 'none';

  filtrosAtivos = {};
  salvarLocalStorage('filtros_admin', {});

  aplicarFiltros();
  mostrarNotificacao('Filtros limpos', 'info');
}

function atualizarInfoFiltros() {
  const totalOriginal = dadosOriginais.length;
  const totalFiltrado = window.dadosFiltrados?.length || 0;

  const infoElement = document.getElementById('info-filtros');
  if (infoElement) {
    const filtrosAplicados = Object.values(filtrosAtivos).filter(
      v => v && v.length > 0
    ).length;

    if (filtrosAplicados > 0) {
      infoElement.innerHTML = `
                <strong>${filtrosAplicados}</strong> filtro${filtrosAplicados > 1 ? 's' : ''} ativo${filtrosAplicados > 1 ? 's' : ''} • 
                <strong>${totalFiltrado}</strong> de <strong>${totalOriginal}</strong> agendamentos
            `;
      infoElement.classList.add('active');
      infoElement.style.display = 'flex';
    } else {
      infoElement.classList.remove('active');
      infoElement.style.display = 'none';
    }
  }
}

function aplicarFiltroPeriodo() {
  const periodoSelect = document.getElementById('periodo');
  const customDateContainer = document.getElementById('customDateContainer');

  if (periodoSelect && customDateContainer) {
    const valorSelecionado = periodoSelect.value;

    if (valorSelecionado === 'customizado') {
      customDateContainer.style.display = 'grid';

      customDateContainer.offsetHeight;

      const hoje = new Date().toISOString().split('T')[0];
      const dataInicioInput = document.getElementById('dataInicio');
      const dataFimInput = document.getElementById('dataFim');

      if (dataInicioInput && !dataInicioInput.value) {
        dataInicioInput.value = hoje;
      }
      if (dataFimInput && !dataFimInput.value) {
        dataFimInput.value = hoje;
      }

      configurarCamposData();

      if (dataInicioInput && !dataInicioInput.hasAttribute('data-listener')) {
        dataInicioInput.addEventListener('change', aplicarFiltros);
        dataInicioInput.setAttribute('data-listener', 'true');
      }
      if (dataFimInput && !dataFimInput.hasAttribute('data-listener')) {
        dataFimInput.addEventListener('change', aplicarFiltros);
        dataFimInput.setAttribute('data-listener', 'true');
      }

      setTimeout(() => {
        customDateContainer.classList.add('visible');
      }, 10);
    } else {
      customDateContainer.classList.remove('visible');

      setTimeout(() => {
        customDateContainer.style.display = 'none';

        const dataInicioInput = document.getElementById('dataInicio');
        const dataFimInput = document.getElementById('dataFim');

        if (dataInicioInput) dataInicioInput.value = '';
        if (dataFimInput) dataFimInput.value = '';
      }, 300);
    }

    aplicarFiltros();
  }
}

function configurarCamposData() {
  const dataInicioInput = document.getElementById('dataInicio');
  const dataFimInput = document.getElementById('dataFim');

  if (dataInicioInput && dataFimInput) {
    const hoje = new Date();
    const umAnoAtras = new Date(
      hoje.getFullYear() - 1,
      hoje.getMonth(),
      hoje.getDate()
    );
    const umAnoFrente = new Date(
      hoje.getFullYear() + 1,
      hoje.getMonth(),
      hoje.getDate()
    );

    dataInicioInput.min = umAnoAtras.toISOString().split('T')[0];
    dataInicioInput.max = umAnoFrente.toISOString().split('T')[0];
    dataFimInput.min = umAnoAtras.toISOString().split('T')[0];
    dataFimInput.max = umAnoFrente.toISOString().split('T')[0];

    dataInicioInput.addEventListener('change', function () {
      if (dataFimInput.value && this.value > dataFimInput.value) {
        dataFimInput.value = this.value;
        mostrarNotificacao(
          'Data fim ajustada para não ser anterior à data início',
          'info'
        );
      }
      dataFimInput.min = this.value;
    });

    dataFimInput.addEventListener('change', function () {
      if (dataInicioInput.value && this.value < dataInicioInput.value) {
        dataInicioInput.value = this.value;
        mostrarNotificacao(
          'Data início ajustada para não ser posterior à data fim',
          'info'
        );
      }
      dataInicioInput.max = this.value;
    });

    dataInicioInput.title =
      'Clique para abrir o calendário ou digite no formato dd/mm/aaaa';
    dataFimInput.title =
      'Clique para abrir o calendário ou digite no formato dd/mm/aaaa';

    [dataInicioInput, dataFimInput].forEach(input => {
      input.addEventListener('click', function (e) {
        if (e.target === this) {
          if (this.showPicker) {
            this.showPicker();
          } else {
            this.focus();
            this.click();
          }
        }
      });

      input.addEventListener('focus', function () {
        setTimeout(() => {
          if (this.showPicker) {
            this.showPicker();
          }
        }, 50);
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (this.showPicker) {
            this.showPicker();
          } else {
            this.focus();
          }
        }
        if (e.key === 'Escape') {
          this.blur();
        }
      });
      input.style.cursor = 'pointer';
    });
  }
}

function ordenarTabela(campo) {
  if (configuracaoOrdenacao.campo === campo) {
    configuracaoOrdenacao.direcao =
      configuracaoOrdenacao.direcao === 'asc' ? 'desc' : 'asc';
  } else {
    configuracaoOrdenacao.campo = campo;
    configuracaoOrdenacao.direcao = 'asc';
  }

  salvarLocalStorage('ordenacao_admin', configuracaoOrdenacao);
  atualizarIconesOrdenacao();
  aplicarFiltros();
}

function atualizarIconesOrdenacao() {
  document
    .querySelectorAll('th[data-campo] .icone-ordenacao')
    .forEach(icone => {
      icone.className = 'icone-ordenacao fas fa-sort';
    });

  const thAtivo = document.querySelector(
    `th[data-campo="${configuracaoOrdenacao.campo}"] .icone-ordenacao`
  );
  if (thAtivo) {
    thAtivo.className = `icone-ordenacao fas fa-sort-${configuracaoOrdenacao.direcao === 'asc' ? 'up' : 'down'}`;
  }
}

function atualizarVisualizacao() {
  const dados = window.dadosFiltrados || [];

  dadosVisualizacao = paginarArray(
    dados,
    configPaginacao.paginaAtual,
    configPaginacao.itensPorPagina
  );

  // Verificar modo de visualização
  const container = document.getElementById('container-agenda');
  if (container && container.classList.contains('modo-cards')) {
    renderizarCards();
  } else {
    renderizarTabela();
  }

  atualizarPaginacao();
}

function atualizarPaginacao() {
  const currentPage = document.getElementById('currentPage');
  const totalPages = document.getElementById('totalPages');
  const totalRecords = document.getElementById('totalRecords');
  const btnPrevious = document.getElementById('btnPrevious');
  const btnNext = document.getElementById('btnNext');

  if (currentPage) currentPage.textContent = configPaginacao.paginaAtual;
  if (totalPages) totalPages.textContent = configPaginacao.totalPaginas;
  if (totalRecords) totalRecords.textContent = configPaginacao.totalItens;

  if (btnPrevious) {
    btnPrevious.disabled = configPaginacao.paginaAtual <= 1;
  }

  if (btnNext) {
    btnNext.disabled =
      configPaginacao.paginaAtual >= configPaginacao.totalPaginas;
  }
}

function renderizarTabela() {
  try {
    const tbody = document.querySelector('#agendaTable tbody');
    if (!tbody) {
      console.warn('Tabela não encontrada');
      return;
    }

    tbody.innerHTML = '';

    if (dadosVisualizacao.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="texto-centralizado texto-muted">
                        <i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.5; display: block; margin-bottom: 1rem;"></i>
                        Nenhum agendamento encontrado
                    </td>
                </tr>
            `;
      return;
    }

    dadosVisualizacao.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = getStatusClass(item.status);

      const statusAprovacao = item.statusAprovacao || 'pendente';
      let badgeAprovacao = '';

      switch (statusAprovacao) {
        case 'aprovado':
          badgeAprovacao =
            '<span class="status-aprovacao-badge status-aprovado"><i class="fas fa-check"></i> Aprovado</span>';
          break;
        case 'rejeitado':
          badgeAprovacao =
            '<span class="status-aprovacao-badge status-rejeitado"><i class="fas fa-times"></i> Rejeitado</span>';
          break;
        case 'reaprovacao-pendente':
          badgeAprovacao =
            '<span class="status-aprovacao-badge status-pendente"><i class="fas fa-exclamation-triangle"></i> Reaprovação</span>';
          break;
        default:
          badgeAprovacao =
            '<span class="status-aprovacao-badge status-pendente"><i class="fas fa-clock"></i> Pendente</span>';
      }

      const isDetailedView = document
        .querySelector('.data-table')
        ?.classList.contains('detailed-view');

      const dataUltimaAtualizacao = item.dataUltimaAtualizacao
        ? formatarData(item.dataUltimaAtualizacao)
        : item.dataAtualizacao
          ? formatarData(item.dataAtualizacao)
          : '-';
      const idCompleto = item.id || item.codAnt || '-';

      // Verificar se é um agendamento temporário
      const isTemporario =
        item.tipo === 'TEMPORARIO' || (item.id && item.id.startsWith('temp_'));

      tr.innerHTML = `
                <td>
                    <div class="cell-content">
                        ${item.codAnt || item.id || '-'}
                        ${isTemporario ? '<span class="badge badge-temporario" title="Agendamento Temporário"><i class="fas fa-clock"></i> TEMP</span>' : ''}
                        ${isDetailedView ? `<div class="cell-extra"><small><i class="fas fa-hashtag"></i> ID: ${idCompleto}</small></div>` : ''}
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        ${item.descricao || item.produto || '-'}
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <span class="fornecedor-badge">${item.fornecedor || '-'}</span>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <span class="status-badge status-${item.status?.toLowerCase().replace(/\s+/g, '-').replace('.', '')}">${item.status || '-'}</span>
                        ${isDetailedView ? `<div class="cell-extra"><small><i class="fas fa-calendar-alt"></i> Atualizado: ${dataUltimaAtualizacao}</small></div>` : ''}
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        ${formatarData(item.data) || '-'}
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        ${item.qtde || item.quantidade || '-'}
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        ${item.saldo || '-'}
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        ${badgeAprovacao}
                        ${isDetailedView && (statusAprovacao === 'pendente' || statusAprovacao === 'reaprovacao-pendente' || statusAprovacao === 'rejeitado') ? `<div class="cell-extra"><small><i class="fas fa-user"></i> Pendente aprovação</small></div>` : ''}
                        ${isDetailedView && statusAprovacao === 'aprovado' && item.aprovadoPor ? `<div class="cell-extra"><small><i class="fas fa-user"></i> Aprovado por: ${item.aprovadoPor}</small></div>` : ''}
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        ${item.observacoes || '-'}
                    </div>
                </td>
                <td class="actions-cell">
                    ${statusAprovacao !== 'aprovado'
          ? `<button class="btn btn-sm btn-success" onclick="aprovarItem('${item.id}')" title="Aprovar">
                            <i class="fas fa-check"></i>
                        </button>`
          : ''
        }
                    ${statusAprovacao === 'aprovado'
          ? `<button class="btn btn-sm btn-warning" onclick="rejeitarItem('${item.id}')" title="Rejeitar">
                            <i class="fas fa-times"></i>
                        </button>`
          : ''
        }
                    <button class="btn btn-sm btn-primary" onclick="editarItem('${item.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${isTemporario
          ? `<button class="btn btn-sm btn-danger" onclick="excluirItem('${item.id}')" title="Excluir Agendamento Temporário">
                            <i class="fas fa-trash"></i>
                        </button>`
          : `<span class="btn btn-sm btn-secondary disabled" title="Agendamentos GEMCO não podem ser excluídos aqui. Use o sistema GEMCO diretamente.">
                            <i class="fas fa-lock"></i>
                        </span>`
        }
                </td>
            `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Erro ao renderizar tabela:', error);
  }
}

function renderizarCards() {
  let container = document.getElementById('container-cards');
  if (!container) {
    const containerTabela = document.getElementById('container-tabela');
    const cardsHtml =
      '<div id="container-cards" class="container-cards"></div>';
    containerTabela.insertAdjacentHTML('afterend', cardsHtml);
    container = document.getElementById('container-cards');
  }

  container.innerHTML = '';

  if (dadosVisualizacao.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Nenhum agendamento encontrado</h3>
                <p>Tente ajustar os filtros ou criar um novo agendamento</p>
                <button class="btn btn-primary" onclick="abrirModalNovoItem()">
                    <i class="fas fa-plus"></i> Novo Agendamento
                </button>
            </div>
        `;
    return;
  }

  dadosVisualizacao.forEach(item => {
    const card = document.createElement('div');
    card.className = `agenda-card ${getStatusClass(item.status)}`;

    // Verificar se é um agendamento temporário
    const isTemporario =
      item.tipo === 'TEMPORARIO' || (item.id && item.id.startsWith('temp_'));

    card.innerHTML = `
            <div class="card-header">
                <div class="card-date">
                    <strong>${formatarData(item.data)}</strong>
                    <small>${item.horario || ''}</small>
                    ${isTemporario ? '<span class="badge badge-temporario" title="Agendamento Temporário"><i class="fas fa-clock"></i> TEMP</span>' : ''}
                </div>
                <div class="card-status">
                    <span class="badge badge-${item.status?.toLowerCase().replace(/\s+/g, '-').replace('.', '') || 'default'}">${item.status || '-'}</span>
                </div>
            </div>
            
            <div class="card-body">
                <h4 class="card-fornecedor">${item.fornecedor || '-'}</h4>
                <p class="card-produto">${item.descricao || item.produto || '-'}</p>
                
                <div class="card-details">
                    <div class="detail-item">
                        <i class="fas fa-box"></i>
                        <span>${item.qtde || item.quantidade || '-'}</span>
                    </div>
                    ${item.codAnt
        ? `
                        <div class="detail-item">
                            <i class="fas fa-hashtag"></i>
                            <span>${item.codAnt}</span>
                        </div>
                    `
        : ''
      }
                </div>
                
                ${item.observacoes
        ? `
                    <div class="card-observacoes">
                        <i class="fas fa-comment"></i>
                        <span>${item.observacoes}</span>
                    </div>
                `
        : ''
      }
            </div>
            
            <div class="card-footer">
                <div class="card-actions">
                    <button class="btn btn-primary btn-sm" onclick="editarItem('${item.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${isTemporario
        ? `<button class="btn btn-danger btn-sm" onclick="excluirItem('${item.id}')" title="Excluir Agendamento Temporário">
                            <i class="fas fa-trash"></i>
                        </button>`
        : `<span class="btn btn-sm btn-secondary disabled" title="Agendamentos GEMCO não podem ser excluídos aqui. Use o sistema GEMCO diretamente.">
                            <i class="fas fa-lock"></i>
                        </span>`
      }
                </div>
            </div>
        `;

    container.appendChild(card);
  });
}

function alternarModoVisualizacao() {
  const container = document.getElementById('container-agenda');
  const btnModo = document.getElementById('icone-modo');
  const textoModo = document.getElementById('texto-modo');

  if (container.classList.contains('modo-cards')) {
    container.classList.remove('modo-cards');
    container.classList.add('modo-tabela');
    btnModo.className = 'fas fa-th-large';
    textoModo.textContent = 'Cards';
    salvarLocalStorage('modo_visualizacao_admin', 'tabela');
  } else {
    container.classList.remove('modo-tabela');
    container.classList.add('modo-cards');
    btnModo.className = 'fas fa-table';
    textoModo.textContent = 'Tabela';
    salvarLocalStorage('modo_visualizacao_admin', 'cards');
  }

  atualizarVisualizacao();
}

// ========== FUNÇÕES DE APROVAÇÃO ADMINISTRATIVA ==========

window.aprovarItem = async function (id) {
  try {
    mostrarCarregamento(true);

    console.log(`✅ Aprovando agendamento: ${id}`);
    const resultado = await window.apiManager.aprovarAgendamento(id);

    if (resultado.sucesso) {
      mostrarNotificacao(
        'Agendamento aprovado com sucesso! A loja já pode visualizar este item.',
        'success'
      );

      // Invalidar cache para forçar busca fresca
      localStorage.removeItem('dadosAgenda');
      localStorage.removeItem('filtros_admin');

      // Recarregar dados e atualizar interface
      await carregarDados();

      console.log('✅ Aprovação concluída e dados atualizados');
    }
  } catch (error) {
    console.error('Erro ao aprovar agendamento:', error);
    mostrarNotificacao(
      'Erro ao aprovar agendamento: ' + error.message,
      'error'
    );
  } finally {
    mostrarCarregamento(false);
  }
};

window.rejeitarItem = async function (id) {
  const motivo = prompt('Digite o motivo da rejeição (opcional):');

  if (motivo === null) return;

  try {
    mostrarCarregamento(true);

    console.log(`❌ Rejeitando agendamento: ${id}`);
    const resultado = await window.apiManager.rejeitarAgendamento(id, motivo);

    if (resultado.sucesso) {
      mostrarNotificacao(
        'Agendamento rejeitado! Removido da visualização da loja.',
        'warning'
      );

      // Invalidar cache para forçar busca fresca
      localStorage.removeItem('dadosAgenda');
      localStorage.removeItem('filtros_admin');

      // Recarregar dados e atualizar interface
      await carregarDados();

      console.log('❌ Rejeição concluída e dados atualizados');
    }
  } catch (error) {
    console.error('Erro ao rejeitar agendamento:', error);
    mostrarNotificacao(
      'Erro ao rejeitar agendamento: ' + error.message,
      'error'
    );
  } finally {
    mostrarCarregamento(false);
  }
};

window.excluirItem = async function (id) {
  console.log('🗑️ Frontend: Tentando excluir agendamento:', id);

  if (!confirm('Tem certeza que deseja excluir este agendamento?')) {
    console.log('❌ Frontend: Exclusão cancelada pelo usuário');
    return;
  }

  try {
    mostrarCarregamento(true);
    console.log('📡 Frontend: Chamando API para excluir:', id);

    // 1. Chamar API para exclusão definitiva PRIMEIRO
    const resultado = await window.apiManager.excluirAgendamento(id);
    console.log('📨 Frontend: Resultado da API:', resultado);

    if (resultado.sucesso) {
      mostrarNotificacao('Agendamento excluído com sucesso!', 'success');
      console.log('✅ Frontend: Exclusão confirmada pelo backend');

      // 2. SEMPRE invalidar todo o cache e recarregar do servidor
      localStorage.removeItem('dadosAgenda');
      localStorage.removeItem('filtros_admin');
      console.log('🗑️ Frontend: Cache local limpo completamente');

      // 3. Forçar recarga COMPLETA dos dados do servidor
      console.log('🔄 Frontend: Forçando recarga completa dos dados...');
      await carregarDados(true); // Força busca do servidor

      // 4. Re-aplicar filtros para atualizar a tabela
      aplicarFiltros();

      // 5. Atualizar demais componentes
      atualizarDashboard();
      atualizarSummaryCards();
      atualizarRodape();

      console.log('✅ Frontend: Interface completamente atualizada');
    } else {
      console.error('❌ Frontend: API retornou erro');
      mostrarNotificacao('Erro ao excluir agendamento', 'error');
    }
  } catch (error) {
    console.error('❌ Frontend: Erro ao excluir agendamento:', error);
    mostrarNotificacao(
      'Erro ao excluir agendamento: ' + error.message,
      'error'
    );

    // Em caso de erro, SEMPRE recarregar dados para garantir consistência
    try {
      console.log(
        '🔄 Frontend: Recarregando após erro para manter consistência...'
      );
      await carregarDados(true);
      aplicarFiltros();
      atualizarDashboard();
      atualizarSummaryCards();
      atualizarRodape();
    } catch (reloadError) {
      console.error('❌ Frontend: Erro ao recarregar após falha:', reloadError);
    }
  } finally {
    mostrarCarregamento(false);
  }
};

window.aprovarTodosItens = async function () {
  const itensPendentes = dadosOriginais.filter(item => item.precisaAprovacao);

  if (itensPendentes.length === 0) {
    mostrarNotificacao('Não há agendamentos pendentes de aprovação', 'info');
    return;
  }

  if (
    !confirm(`Aprovar ${itensPendentes.length} agendamento(s) pendente(s)?`)
  ) {
    return;
  }

  try {
    mostrarCarregamento(true);

    for (const item of itensPendentes) {
      await window.apiManager.aprovarAgendamento(item.id);
    }

    mostrarNotificacao(
      `${itensPendentes.length} agendamentos aprovados!`,
      'success'
    );

    await carregarDados();
  } catch (error) {
    console.error('Erro ao aprovar agendamentos:', error);
    mostrarNotificacao(
      'Erro ao aprovar agendamentos: ' + error.message,
      'error'
    );
  } finally {
    mostrarCarregamento(false);
  }
};

function atualizarDashboard() {
  if (!dadosOriginais.length) return;

  const contadores = {
    total: dadosOriginais.length,
    aprovados: dadosOriginais.filter(
      item => item.statusAprovacao === 'aprovado'
    ).length,
    pendentes: dadosOriginais.filter(
      item =>
        item.statusAprovacao === 'pendente' ||
        item.statusAprovacao === 'reaprovacao-pendente'
    ).length,
    rejeitados: dadosOriginais.filter(
      item => item.statusAprovacao === 'rejeitado'
    ).length
  };

  const dashboardElements = {
    'dashboard-total': contadores.total,
    'dashboard-aprovados': contadores.aprovados,
    'dashboard-pendentes': contadores.pendentes,
    'dashboard-rejeitados': contadores.rejeitados
  };

  Object.entries(dashboardElements).forEach(([id, valor]) => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.textContent = valor;
    }
  });
}

function atualizarSummaryCards() {
  try {
    const dados =
      window.dadosFiltrados && window.dadosFiltrados.length >= 0
        ? window.dadosFiltrados
        : dadosOriginais;
    if (!dados) return;

    const hojeBR = new Date().toLocaleDateString('pt-BR');

    const total = dados.length;
    const agendado = dados.filter(i => i.status === 'AGENDADO' || i.status === 'Agendado').length;
    const prevEntrega = dados.filter(i =>
      i.status === 'PREV. SEM AGENDA' ||
      i.status === 'Prev. Sem Agenda' ||
      i.status === 'PREV. ENTREGA'
    ).length;
    const prevAtraso = dados.filter(
      i => i.status === 'PREV. ENTREGA EM ATRASO' ||
        i.status === 'Prev. Entrega em Atraso'
    ).length;
    const prevHoje = dados.filter(i => {
      const dataItem = formatarData(i.data);
      return dataItem === hojeBR && i.status !== 'ENTREGUE' && i.status !== 'Entregue';
    }).length;

    atualizarNumeroCard('totalItens', total);
    atualizarNumeroCard('agendado', agendado);
    atualizarNumeroCard('prevEntrega', prevEntrega);
    atualizarNumeroCard('prevAtraso', prevAtraso);
    atualizarNumeroCard('prevHoje', prevHoje);
  } catch (err) {
    console.warn('Falha ao atualizar summary cards:', err);
  }
}

function atualizarNumeroCard(id, novoValor) {
  const el = document.getElementById(id);
  if (!el) return;
  const valorAtual = parseInt(el.textContent) || 0;
  if (valorAtual === novoValor) return;
  const duracao = 400; // ms
  const inicio = performance.now();
  function animar(agora) {
    const progresso = Math.min(1, (agora - inicio) / duracao);
    const valorInterpolado = Math.round(
      valorAtual + (novoValor - valorAtual) * progresso
    );
    el.textContent = valorInterpolado;
    if (progresso < 1) requestAnimationFrame(animar);
  }
  requestAnimationFrame(animar);
}

function inicializarToggleFiltros() {
  const filtersSection = document.querySelector('.filters-section');
  const toggleIcon = document.getElementById('toggleIcon');

  if (filtersSection && toggleIcon) {
    if (filtersSection.classList.contains('collapsed')) {
      toggleIcon.className = 'fas fa-chevron-down toggle-icon';
    } else {
      toggleIcon.className = 'fas fa-chevron-up toggle-icon';
    }
  }
}

window.toggleFiltros = function () {
  try {
    const filtersSection = document.querySelector('.filters-section');
    const toggleIcon = document.getElementById('toggleIcon');

    if (filtersSection && toggleIcon) {
      filtersSection.classList.toggle('collapsed');

      if (filtersSection.classList.contains('collapsed')) {
        toggleIcon.className = 'fas fa-chevron-down toggle-icon';
      } else {
        toggleIcon.className = 'fas fa-chevron-up toggle-icon';
      }
    }
  } catch (error) {
    console.error('Error in toggleFiltros:', error);
  }
};

function protegerRotaAdmin() {
  if (typeof protegerRota !== 'undefined' && !protegerRota('admin')) {
    // Redirecionamento já foi feito pela função
    return false;
  }
  return true;
}

async function logout() {
  if (confirm('Deseja realmente sair do sistema?')) {
    if (window.authManager) {
      try {
        await window.authManager.logout();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        window.authManager.clearLocalData();
      }
    }
    window.location.href = '../login/login.html';
  }
}

function checkTextareaScroll() {
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    const isScrollable = textarea.scrollHeight > textarea.clientHeight;
    if (isScrollable) {
      textarea.setAttribute('data-scrollable', 'true');
    } else {
      textarea.removeAttribute('data-scrollable');
    }
  });
}

async function inicializarSistemaAuth() {
  if (typeof window.authManager === 'undefined') {
    window.authManager = new AuthManager();
  }

  const resultado = await window.authManager.verificarSessao();
  if (resultado.valida) {
    const usuario = resultado.sessao;
    const userIdElement = document.getElementById('userId');
    if (userIdElement) {
      userIdElement.textContent =
        usuario.email || 'administrador@example.com';
    }

    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
      const sairBtn = document.createElement('button');
      sairBtn.className = 'btn btn-sm btn-outline';
      sairBtn.onclick = logout;
      sairBtn.title = 'Sair do sistema';
      sairBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
      sairBtn.style.marginLeft = '0.5rem';
      sairBtn.style.padding = '0.25rem 0.5rem';
      userInfo.appendChild(sairBtn);
    }
  }
}

function inicializarTextareaMonitoring() {
  const observacoesTextarea = document.getElementById('item-observacoes');
  if (observacoesTextarea) {
    observacoesTextarea.addEventListener('input', checkTextareaScroll);
    observacoesTextarea.addEventListener('scroll', checkTextareaScroll);

    const modalObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'style'
        ) {
          const modal = document.getElementById('modal-item');
          if (modal && modal.style.display !== 'none') {
            setTimeout(checkTextareaScroll, 100);
            setTimeout(preencherSelectStatusFormulario, 50);
          }
        }
      });
    });

    const modal = document.getElementById('modal-item');
    if (modal) {
      modalObserver.observe(modal, { attributes: true });
    }
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  if (!protegerRotaAdmin()) {
    return;
  }

  await inicializarSistemaAuth();

  inicializarTextareaMonitoring();
});

window.logout = logout;
window.checkTextareaScroll = checkTextareaScroll;
window.aplicarFiltroPeriodo = aplicarFiltroPeriodo;
window.atualizarSummaryCards = atualizarSummaryCards;
window.ordenarTabela = ordenarTabela;
window.alternarModoVisualizacao = alternarModoVisualizacao;
window.atualizarDados = atualizarDados;
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.sortTable = sortTable;
window.previousPage = previousPage;
window.nextPage = nextPage;
