// ============== Variaveis Globais ============
let dadosOriginais = [];
let dadosFiltrados = [];
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

// =================== Inicialização ===================
document.addEventListener('DOMContentLoaded', function () {
  // Limpar dados antigos que podem estar em cache para garantir dados frescos
  console.log('🧹 Limpando dados antigos do cache...');
  localStorage.removeItem('dadosAgenda');
  localStorage.removeItem('agendamentos_loja');

  // Limpar também referências globais antigas
  if (window.dadosOriginais) delete window.dadosOriginais;
  if (window.dadosFiltrados) delete window.dadosFiltrados;

  function aguardarApiManager(tentativas = 0) {
    if (typeof ApiManager !== 'undefined') {
      if (!window.apiManager) {
        window.apiManager = new ApiManager();
      }
      inicializarSistemaCompleto();
    } else if (tentativas < 10) {
      setTimeout(() => aguardarApiManager(tentativas + 1), 200);
    } else {
      console.error('API Manager não carregado após 10 tentativas');
      mostrarNotificacao(
        'Erro: Sistema de dados não carregado. Recarregue a página.',
        'error'
      );
    }
  }
  aguardarApiManager();
});

function inicializarSistemaCompleto() {
  try {
    const elementosCriticos = [
      'tableBody',
      'lastUpdate',
      'currentPage',
      'totalRecords'
    ];

    const elementosFaltando = [];
    for (const id of elementosCriticos) {
      const elemento = document.getElementById(id);
      if (!elemento) {
        elementosFaltando.push(id);
      }
    }

    if (elementosFaltando.length > 0) {
      console.warn('Elementos opcionais não encontrados:', elementosFaltando);
    }

    inicializarSistema();
    configurarEventListeners();

    mostrarNotificacao('Carregando agendamentos aprovados...', 'info');

    carregarDados()
      .then(() => { })
      .catch(error => {
        console.error('Erro no carregamento automático:', error);
        mostrarNotificacao(
          'Erro no carregamento automático. Use o botão "Atualizar Dados".',
          'warning'
        );
      });

    verificarNavegadorSuportado();
    atualizarUltimaAtualizacao();
  } catch (error) {
    console.error('Erro na inicialização:', error);
    mostrarNotificacao(
      'Erro na inicialização do sistema: ' + error.message,
      'error'
    );
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  if (typeof window.authManager === 'undefined') {
    window.authManager = new AuthManager();
  }

  try {
    const resultado = await window.authManager.verificarSessao();
    if (resultado.valida) {
      const usuario = resultado.sessao;

      const userIdElement = document.getElementById('userId');
      if (userIdElement) {
        userIdElement.textContent = usuario.email || 'usuario@example.com';
      }

      const userInfo = document.querySelector('.user-info');
      if (userInfo && !userInfo.querySelector('.logout-btn')) {
        const sairBtn = document.createElement('button');
        sairBtn.className = 'btn btn-sm btn-outline logout-btn';
        sairBtn.onclick = logout;
        sairBtn.title = 'Sair do sistema';
        sairBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        sairBtn.style.marginLeft = '0.5rem';
        sairBtn.style.padding = '0.25rem 0.5rem';
        userInfo.appendChild(sairBtn);
      } else if (userInfo && userInfo.querySelector('.logout-btn')) {
        // Botão logout já existe
      }
    } else {
      window.location.href = '../login/login.html';
    }
  } catch (error) {
    console.error('❌ Erro ao verificar sessão:', error);
    window.location.href = '../login/login.html';
  }
});

// Inicialização do sistema
function inicializarSistema() {
  inicializarTema();
  inicializarFiltros();
  inicializarOrdenacao();
  configurarModoVisualizacao();
  inicializarTableView();
  configurarAcessibilidade();
  inicializarToggleFiltros();
  iniciarAtualizacaoAutomatica();
}

// Atualização automática para sincronizar com aprovações do admin
let intervalAtualizacao = null;

function iniciarAtualizacaoAutomatica() {
  // Verificar atualizações a cada 30 segundos
  intervalAtualizacao = setInterval(async () => {
    try {
      console.log('🔄 Verificando atualizações automáticas...');
      const dadosAntes = dadosOriginais.length;
      await carregarDados();
      const dadosDepois = dadosOriginais.length;

      if (dadosAntes !== dadosDepois) {
        console.log(
          `📊 Atualizações detectadas: ${dadosAntes} → ${dadosDepois} agendamentos`
        );
        mostrarNotificacao('Agendamentos atualizados!', 'info');
      }
    } catch (error) {
      console.warn('⚠️ Erro na atualização automática:', error);
    }
  }, 30000); // 30 segundos

  console.log('✅ Atualização automática iniciada (30s)');
}

function _pararAtualizacaoAutomatica() {
  if (intervalAtualizacao) {
    clearInterval(intervalAtualizacao);
    intervalAtualizacao = null;
    console.log('⏹️ Atualização automática parada');
  }
}

function inicializarFiltros() {
  localStorage.removeItem('filtros_loja');
  filtrosAtivos = {};
  const camposFiltro = [
    'busca',
    'status',
    'fornecedor',
    'periodo',
    'dataInicio',
    'dataFim'
  ];
  camposFiltro.forEach(campo => {
    const elemento = document.getElementById(campo);
    if (elemento) {
      if (campo === 'periodo') {
        elemento.value = 'semana';
        filtrosAtivos.periodo = 'semana';
      } else {
        elemento.value = '';
      }
    }
  });
}

function inicializarOrdenacao() {
  const ordenacaoSalva = carregarLocalStorage(
    'ordenacao_loja',
    configuracaoOrdenacao
  );
  configuracaoOrdenacao = ordenacaoSalva;
  atualizarIconesOrdenacao();
}

function configurarModoVisualizacao() {
  const modoSalvo = carregarLocalStorage('modo_visualizacao', 'tabela');
  const _botaoModo = document.getElementById('btn-modo');
  if (modoSalvo === 'cards') {
    alternarModoVisualizacao();
  }
}

function inicializarTableView() {
  setTimeout(() => {
    const tableViewSalva = carregarLocalStorage('table_view', 'compact');
    setTableView(tableViewSalva);
  }, 100);
}

function configurarAcessibilidade() {
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      document.getElementById('busca').focus();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      atualizarDados();
    }
    if (e.key === 'Escape' && e.target.id === 'busca') {
      limparBusca();
    }
  });

  const elementos = document.querySelectorAll('button, input, select');
  elementos.forEach(el => {
    el.addEventListener('focus', function () {
      this.style.outline = '2px solid var(--cor-primaria)';
    });

    el.addEventListener('blur', function () {
      this.style.outline = '';
    });
  });
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

function configurarEventListeners() {
  const campoBusca = document.getElementById('busca');
  if (campoBusca) {
    campoBusca.addEventListener(
      'input',
      debounce(function () {
        aplicarFiltros();
      }, 300)
    );
  }

  const filtros = ['status', 'fornecedor', 'periodo', 'dataInicio', 'dataFim'];
  filtros.forEach(filtroId => {
    const elemento = document.getElementById(filtroId);
    if (elemento) {
      elemento.addEventListener('change', aplicarFiltros);
    }
  });

  const itensPorPagina = document.getElementById('itemsPerPage');
  if (itensPorPagina) {
    itensPorPagina.value = configPaginacao.itensPorPagina.toString();

    itensPorPagina.addEventListener('change', function () {
      configPaginacao.paginaAtual = 1;

      if (this.value === 'all') {
        configPaginacao.itensPorPagina = 9999;
      } else {
        configPaginacao.itensPorPagina = parseInt(this.value);
      }
      atualizarVisualizacao();
    });
  } else {
    console.warn('Elemento itemsPerPage não encontrado');
  }
  const btnTema = document.getElementById('btn-tema');
  if (btnTema) {
    btnTema.addEventListener('click', toggleTheme);
  }

  const btnModo = document.getElementById('btn-modo');
  if (btnModo) {
    btnModo.addEventListener('click', alternarModoVisualizacao);
  }
  const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
  if (btnLimparFiltros) {
    btnLimparFiltros.addEventListener('click', limparFiltros);
  }
  const btnToggleFiltros = document.getElementById('btn-toggle-filtros');
  if (btnToggleFiltros) {
    btnToggleFiltros.addEventListener('click', toggleFiltros);
  }

  const btnAtualizar = document.getElementById('btn-atualizar');
  if (btnAtualizar) {
    btnAtualizar.addEventListener('click', atualizarDados);
  }
  const btnExportar = document.getElementById('btn-exportar');
  if (btnExportar) {
    btnExportar.addEventListener('click', exportarDados);
  }
  const btnImprimir = document.getElementById('btn-imprimir');
  if (btnImprimir) {
    btnImprimir.addEventListener('click', imprimirRelatorio);
  }

  document.querySelectorAll('th[data-campo]').forEach(th => {
    th.addEventListener('click', function () {
      const campo = this.dataset.campo;
      ordenarTabela(campo);
    });

    th.style.cursor = 'pointer';
    th.title = 'Clique para ordenar';
  });

  // ================ Event Listeners para Cards de KPI ================
  // Configurar cliques nos cards de KPI para filtrar a tabela
  const cardTotal = document.querySelector('.card-total');
  if (cardTotal) {
    cardTotal.addEventListener('click', function () {
      limparFiltros();
      mostrarNotificacao('Exibindo todas as entregas', 'info');
    });
    cardTotal.style.cursor = 'pointer';
    cardTotal.title = 'Clique para ver todas as entregas';
  }

  const cardAgendado = document.querySelector('.card-agendado');
  if (cardAgendado) {
    cardAgendado.addEventListener('click', function () {
      filtrarPorStatus('AGENDADO');
      mostrarNotificacao('Filtrando por: Agendados', 'info');
    });
    cardAgendado.style.cursor = 'pointer';
    cardAgendado.title = 'Clique para filtrar entregas agendadas';
  }

  const cardPrevEntrega = document.querySelector('.card-prev-entrega');
  if (cardPrevEntrega) {
    cardPrevEntrega.addEventListener('click', function () {
      filtrarPorStatusPrevisao();
      mostrarNotificacao('Filtrando por: Previsões de Entrega', 'info');
    });
    cardPrevEntrega.style.cursor = 'pointer';
    cardPrevEntrega.title = 'Clique para filtrar previsões de entrega';
  }

  const cardPrevAtraso = document.querySelector('.card-prev-atraso');
  if (cardPrevAtraso) {
    cardPrevAtraso.addEventListener('click', function () {
      filtrarPorStatusAtraso();
      mostrarNotificacao('Filtrando por: Entregas Atrasadas', 'warning');
    });
    cardPrevAtraso.style.cursor = 'pointer';
    cardPrevAtraso.title = 'Clique para filtrar entregas atrasadas';
  }

  const cardPrevHoje = document.querySelector('.card-prev-hoje');
  if (cardPrevHoje) {
    cardPrevHoje.addEventListener('click', function () {
      filtrarPorDataHoje();
      mostrarNotificacao('Filtrando por: Entregas Hoje', 'info');
    });
    cardPrevHoje.style.cursor = 'pointer';
    cardPrevHoje.title = 'Clique para filtrar entregas de hoje';
  }
}

async function carregarDados() {
  mostrarCarregamento(true);

  try {
    if (!window.apiManager) {
      console.error('API Manager não encontrado - tentando inicializar...');

      if (typeof ApiManager !== 'undefined') {
        window.apiManager = new ApiManager();
      } else {
        console.error('Classe ApiManager não encontrada');
        mostrarNotificacao(
          'Sistema de dados não carregado. Recarregue a página.',
          'error'
        );
        mostrarCarregamento(false);
        return;
      }
    }

    let dadosCarregados = [];
    try {
      dadosCarregados = await window.apiManager.buscarDadosLoja();
    } catch (error) {
      console.warn(
        'Falha ao carregar dados da loja, tentando dados admin:',
        error
      );
      try {
        const todosOsDados = await window.apiManager.buscarDadosAdmin();
        console.log('📊 Debug - Dados recebidos do admin:', todosOsDados);

        dadosCarregados =
          todosOsDados?.filter(item => {
            // Log detalhado para debug
            console.log(`🔍 Debug - Item ${item.id || item.codAnt}:`, {
              statusAprovacao: item.statusAprovacao,
              status_aprovacao: item.status_aprovacao,
              tipo: typeof item.statusAprovacao
            });

            // Verificar diferentes formatos de status de aprovação
            const statusAprovacao = item.statusAprovacao;

            if (typeof statusAprovacao === 'string') {
              return statusAprovacao === 'aprovado';
            }

            if (
              typeof statusAprovacao === 'object' &&
              statusAprovacao !== null
            ) {
              return statusAprovacao.aprovado === true;
            }

            // Verificar também o campo status_aprovacao (snake_case)
            if (item.status_aprovacao === 'aprovado') {
              return true;
            }

            // Fallback: verificar se não tem status (considera como não aprovado)
            return false;
          }) || [];

        console.log(
          `📊 Debug - Filtrados ${dadosCarregados.length} aprovados de ${todosOsDados?.length || 0} total`
        );
      } catch (fallbackError) {
        console.error('Falha no fallback:', fallbackError);
        dadosCarregados = [];
      }
    }

    dadosOriginais = dadosCarregados || [];

    if (dadosOriginais.length) {
      const exemplo = dadosOriginais[0];
      console.log('🧪 Exemplo de agendamento aprovado (loja):', {
        keys: Object.keys(exemplo),
        codAnt: exemplo.codAnt,
        descricao: exemplo.descricao,
        fornecedor: exemplo.fornecedor,
        statusAprovacao: exemplo.statusAprovacao,
        status: exemplo.status,
        data: exemplo.data,
        qtde: exemplo.qtde,
        quantidade: exemplo.quantidade,
        saldo: exemplo.saldo
      });
    }

    aplicarFiltros();
    preencherFiltrosFornecedores();
    atualizarUltimaAtualizacao();
    atualizarRodape();

    mostrarCarregamento(false);

    if (dadosOriginais.length === 0) {
      console.warn('Nenhum item aprovado encontrado para exibir na loja');
      mostrarNotificacao(
        'Nenhum agendamento aprovado encontrado. Aguardando aprovações do administrador.',
        'info'
      );

      // CORREÇÃO: Garantir que tabela seja renderizada mesmo sem dados
      dadosVisualizacao = [];
      renderizarTabela();
      atualizarPaginacao();
    } else {
      mostrarNotificacao(
        `${dadosOriginais.length} agendamentos carregados com sucesso!`,
        'success'
      );
    }
  } catch (error) {
    console.error('Erro crítico ao carregar dados:', error);
    mostrarCarregamento(false);
    mostrarNotificacao('Erro ao carregar dados: ' + error.message, 'error');

    dadosOriginais = [];
    aplicarFiltros();
    atualizarRodape();
  }
}

// =============== Funções Main ===============
function atualizarDados() {
  const btnAtualizar = document.getElementById('btn-atualizar');
  const iconeAtualizar = btnAtualizar?.querySelector('i');
  if (iconeAtualizar) {
    iconeAtualizar.classList.add('fa-spin');
  }

  carregarDados()
    .then(() => {
      setTimeout(() => {
        if (iconeAtualizar) {
          iconeAtualizar.classList.remove('fa-spin');
        }
        atualizarUltimaAtualizacao();
        atualizarRodape(); // Atualizar informações do rodapé
        mostrarNotificacao('Dados atualizados', 'success');
      }, 1000);
    })
    .catch(error => {
      console.error('Erro ao atualizar dados:', error);
      if (iconeAtualizar) {
        iconeAtualizar.classList.remove('fa-spin');
      }
      mostrarNotificacao('Erro ao atualizar dados', 'error');
    });
}

function atualizarUltimaAtualizacao() {
  const lastUpdateElement = document.getElementById('lastUpdate');
  if (lastUpdateElement) {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    lastUpdateElement.textContent = `${dataFormatada} às ${horaFormatada}`;
  }

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
      userIdElement.textContent || 'usuario@example.com';
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

      // Adicionar event listeners para aplicar filtros quando as datas mudarem
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
        e.preventDefault();
        this.focus();

        setTimeout(() => {
          try {
            if (typeof this.showPicker === 'function') {
              this.showPicker();
            } else {
              this.click();
            }
          } catch {
            console.log(
              'Calendário será aberto pelo comportamento padrão do navegador'
            );
          }
        }, 10);
      });

      input.addEventListener('mousedown', function (e) {
        const rect = this.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const inputWidth = rect.width;
        if (clickX > inputWidth - 50) {
          // Últimos 50px (área do ícone)
          setTimeout(() => {
            try {
              if (typeof this.showPicker === 'function') {
                this.showPicker();
              }
            } catch {
              console.log('Calendário será aberto pelo comportamento padrão');
            }
          }, 10);
        }
      });

      input.addEventListener('focus', function () {
        this.style.cursor = 'text';
      });
      input.addEventListener('blur', function () {
        this.style.cursor = 'pointer';
      });
    });
  }
}

function preencherFiltrosFornecedores() {
  const selectFornecedor = document.getElementById('fornecedor');
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

  if (filtrosAtivos.fornecedor) {
    selectFornecedor.value = filtrosAtivos.fornecedor;
  }
}

function aplicarFiltros() {
  if (!dadosOriginais || !Array.isArray(dadosOriginais)) {
    // Dados não carregados ou inválidos
    return;
  }

  // Sempre começar a filtragem a partir de todos os dados originais carregados (aprovados)
  dadosFiltrados = Array.isArray(dadosOriginais) ? [...dadosOriginais] : [];

  const busca = document.getElementById('busca')?.value || '';
  const status = document.getElementById('status')?.value || '';
  const fornecedor = document.getElementById('fornecedor')?.value || '';
  const periodo = document.getElementById('periodo')?.value || '';
  const dataInicio = document.getElementById('dataInicio')?.value || '';
  const dataFim = document.getElementById('dataFim')?.value || '';

  filtrosAtivos = {
    busca,
    status,
    fornecedor,
    periodo,
    dataInicio,
    dataFim
  };

  salvarLocalStorage('filtros_loja', filtrosAtivos);

  if (busca) {
    // Busca textual sobre a cópia completa inicial
    dadosFiltrados = buscarTexto(dadosFiltrados, busca, [
      'codAnt',
      'descricao',
      'fornecedor',
      'observacoes'
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

  // Não é necessário expor no window - usar apenas variáveis locais
  configPaginacao.paginaAtual = 1;
  configPaginacao.totalItens = dadosFiltrados.length;
  configPaginacao.totalPaginas = calcularTotalPaginas(
    configPaginacao.totalItens,
    configPaginacao.itensPorPagina
  );

  atualizarVisualizacao();
  atualizarInfoFiltros();
}

function limparFiltros() {
  document.getElementById('busca').value = '';
  document.getElementById('status').value = '';
  document.getElementById('fornecedor').value = '';
  document.getElementById('periodo').value = '';
  document.getElementById('dataInicio').value = '';
  document.getElementById('dataFim').value = '';

  filtrosAtivos = {};
  salvarLocalStorage('filtros_loja', {});

  aplicarFiltros();
  mostrarNotificacao('Filtros limpos', 'info');
}

function limparBusca() {
  document.getElementById('busca').value = '';
  aplicarFiltros();
}

function atualizarInfoFiltros() {
  const totalOriginal = dadosOriginais.length;
  const totalFiltrado = dadosFiltrados?.length || 0;

  const infoElement = document.getElementById('info-filtros');
  if (infoElement) {
    if (totalFiltrado < totalOriginal) {
      infoElement.innerHTML = `
                <i class="fas fa-filter"></i>
                Mostrando ${totalFiltrado} de ${totalOriginal} agendamentos
            `;
      infoElement.style.display = 'block';
    } else {
      infoElement.style.display = 'none';
    }
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

  salvarLocalStorage('ordenacao_loja', configuracaoOrdenacao);
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
  // Usar dadosFiltrados local em vez de window.dadosFiltrados
  const dados = dadosFiltrados || [];

  dadosVisualizacao = paginarArray(
    dados,
    configPaginacao.paginaAtual,
    configPaginacao.itensPorPagina
  );

  renderizarTabela();
  atualizarPaginacao();
  atualizarEstatisticas();
}

function renderizarTabela() {
  const tbody = document.querySelector('#agendaTable tbody');
  if (!tbody) return;

  const loadingRow = document.getElementById('loadingRow');
  if (loadingRow) {
    loadingRow.remove();
  }

  tbody.innerHTML = '';

  if (dadosVisualizacao.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="texto-centralizado texto-muted">
                    <i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.5; display: block; margin-bottom: 1rem;"></i>
                    Nenhum agendamento encontrado
                </td>
            </tr>
        `;
    return;
  }

  const isDetailed = document
    .querySelector('.data-table')
    .classList.contains('detailed-view');

  dadosVisualizacao.forEach(item => {
    // Validação de campos essenciais
    if (!item.codAnt || !item.descricao || !item.fornecedor) {
      console.warn(
        '⚠️ Item com campos ausentes, normalizando para renderização:',
        item
      );
      item.codAnt = item.codAnt || item.codigo_produto || item.id || '—';
      item.descricao = item.descricao || item.produto || '(Sem descrição)';
      item.fornecedor =
        item.fornecedor || item.nome_fornecedor || '(Sem fornecedor)';
    }
    if (item.qtde == null && item.quantidade != null)
      item.qtde = item.quantidade;
    if (item.saldo == null) item.saldo = item.qtde || 0;
    if (!item.status) item.status = 'Confirmado';
    const tr = document.createElement('tr');
    tr.className = getStatusClass(item.status);

    if (isDetailed) {
      tr.innerHTML = `
                <td>
                    <div class="cell-content">
                        <strong>${item.codAnt}</strong>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <strong>${item.descricao}</strong>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <strong>${item.fornecedor}</strong>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <span class="status-badge status-${item.status.toLowerCase().replace(/\s+/g, '-').replace('.', '')}">${item.status}</span>
                        <div class="cell-extra">Atualizado: ${item.dataUltimaAtualizacao || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        <strong>${item.data}</strong>
                        <div class="cell-extra">Entrega: ${item.dataEntrega || 'N/A'}</div>
                    </div>
                </td>
                <td class="text-center">
                    <div class="cell-content">
                        <strong>${item.qtde}</strong>
                    </div>
                </td>
                <td class="text-center">
                    <div class="cell-content">
                        <strong class="${item.saldo > 0 ? 'text-warning' : 'text-success'}">${item.saldo}</strong>
                        <div class="cell-extra">${item.saldo > 0 ? 'Pendente' : 'Completo'}</div>
                    </div>
                </td>
                <td>
                    <div class="cell-content">
                        ${item.observacoes
          ? `<span class="observacao-preview" title="${item.observacoes}">
                                ${item.observacoes.length > 50 ? item.observacoes.substring(0, 50) + '...' : item.observacoes}
                            </span>`
          : '<span class="texto-muted">Sem observações</span>'
        }
                    </div>
                </td>
            `;
    } else {
      tr.innerHTML = `
                <td><strong>${item.codAnt}</strong></td>
                <td>${item.descricao}</td>
                <td>${item.fornecedor}</td>
                <td>
                    <span class="status-badge status-${item.status.toLowerCase().replace(/\s+/g, '-').replace('.', '')}">${item.status}</span>
                </td>
                <td>${item.data}</td>
                <td class="text-center">${item.qtde}</td>
                <td class="text-center ${item.saldo > 0 ? 'text-warning' : 'text-success'}">${item.saldo}</td>
                <td>
                    ${item.observacoes
          ? `<span class="observacao-preview" title="${item.observacoes}">
                            ${item.observacoes.length > 30 ? item.observacoes.substring(0, 30) + '...' : item.observacoes}
                        </span>`
          : '<span class="texto-muted">-</span>'
        }
                </td>
            `;
    }

    tbody.appendChild(tr);
  });
}

function setTableView(view) {
  const table = document.querySelector('.data-table');
  const compactBtn = document.querySelector('.view-btn[onclick*="compact"]');
  const detailedBtn = document.querySelector('.view-btn[onclick*="detailed"]');
  if (!table) {
    console.warn('Tabela não encontrada para setTableView');
    return;
  }
  if (compactBtn) {
    compactBtn.classList.remove('active');
  }
  if (detailedBtn) {
    detailedBtn.classList.remove('active');
  }

  if (view === 'compact') {
    table.classList.remove('detailed-view');
    table.classList.add('compact-view');
    if (compactBtn) {
      compactBtn.classList.add('active');
    }
  } else if (view === 'detailed') {
    table.classList.remove('compact-view');
    table.classList.add('detailed-view');
    if (detailedBtn) {
      detailedBtn.classList.add('active');
    }
  }

  salvarLocalStorage('table_view', view);
  renderizarTabela();
}

function _renderizarCards() {
  const container = document.getElementById('container-cards');
  if (!container) {
    const containerTabela = document.getElementById('container-tabela');
    const cardsHtml =
      '<div id="container-cards" class="container-cards"></div>';
    containerTabela.insertAdjacentHTML('afterend', cardsHtml);
  }

  const containerCards = document.getElementById('container-cards');
  containerCards.innerHTML = '';

  if (dadosVisualizacao.length === 0) {
    containerCards.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Nenhum agendamento encontrado</h3>
                <p>Tente ajustar os filtros ou o período selecionado</p>
            </div>
        `;
    return;
  }

  dadosVisualizacao.forEach(item => {
    const card = document.createElement('div');
    card.className = `agenda-card ${getStatusClass(item.status)}`;
    card.innerHTML = `
            <div class="card-header">
                <div class="card-date">
                    <strong>${formatarData(item.data)}</strong>
                    <small>${item.horario}</small>
                </div>
                <div class="card-status">
                    <span class="badge badge-${item.status.toLowerCase()}">${item.status}</span>
                    <span class="prioridade prioridade-${item.prioridade.toLowerCase()}">${item.prioridade}</span>
                </div>
            </div>
            
            <div class="card-body">
                <h4 class="card-fornecedor">${item.fornecedor}</h4>
                <p class="card-produto">${item.produto}</p>
                
                <div class="card-details">
                    <div class="detail-item">
                        <i class="fas fa-box"></i>
                        <span>${formatarNumero(item.quantidade)} ${item.unidade}</span>
                    </div>
                    ${item.contato
        ? `
                        <div class="detail-item">
                            <i class="fas fa-user"></i>
                            <span>${item.contato}</span>
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
                <button class="btn btn-outline btn-sm" onclick="verDetalhes('${item.id}')">
                    <i class="fas fa-eye"></i> Ver Detalhes
                </button>
            </div>
        `;

    containerCards.appendChild(card);
  });
}

function atualizarPaginacao() {
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
        <button class="btn-pag ${paginaAtual === 1 ? 'disabled' : ''}" 
                onclick="irParaPagina(${paginaAtual - 1})" 
                ${paginaAtual === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Anterior
        </button>
    `;

  const inicio = Math.max(1, paginaAtual - 2);
  const fim = Math.min(totalPaginas, inicio + 4);

  if (inicio > 1) {
    html += `<button class="btn-pag" onclick="irParaPagina(1)">1</button>`;
    if (inicio > 2) {
      html += `<span class="pag-ellipsis">...</span>`;
    }
  }

  for (let i = inicio; i <= fim; i++) {
    html += `
            <button class="btn-pag ${i === paginaAtual ? 'active' : ''}" 
                    onclick="irParaPagina(${i})">${i}</button>
        `;
  }

  if (fim < totalPaginas) {
    if (fim < totalPaginas - 1) {
      html += `<span class="pag-ellipsis">...</span>`;
    }
    html += `<button class="btn-pag" onclick="irParaPagina(${totalPaginas})">${totalPaginas}</button>`;
  }

  // Botão próximo
  html += `
        <button class="btn-pag ${paginaAtual === totalPaginas ? 'disabled' : ''}" 
                onclick="irParaPagina(${paginaAtual + 1})" 
                ${paginaAtual === totalPaginas ? 'disabled' : ''}>
            Próximo <i class="fas fa-chevron-right"></i>
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

  const tableSection = document.querySelector('.table-section');
  if (tableSection) {
    tableSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

function atualizarEstatisticas() {
  // Usar APENAS os dados carregados pela API da loja (agendamentos aprovados)
  const dadosParaEstatisticas = dadosFiltrados || dadosOriginais || [];
  const totalOriginais = dadosOriginais?.length || 0;

  console.log('📊 Atualizando estatísticas com dados aprovados:', {
    dadosParaEstatisticas: dadosParaEstatisticas.length,
    totalOriginais: totalOriginais
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toLocaleDateString('pt-BR');
  const totalItens = dadosParaEstatisticas.length;

  // 1. AGENDADOS - Status "Agendado" (case-sensitive)
  const agendado = dadosParaEstatisticas.filter(
    item => item.status === 'Agendado'
  ).length;

  // 2. PREV. ENTREGAS - Status "Prev. Sem Agenda" e variações
  const prevEntrega = dadosParaEstatisticas.filter(
    item => item.status && (
      item.status === 'Prev. Sem Agenda' ||
      item.status === 'Prev Sem Agenda' ||
      item.status.toUpperCase() === 'PREV. ENTREGA' ||
      item.status.toUpperCase() === 'PREVISAO_ENTREGA' ||
      (item.status.toUpperCase().includes('PREV') &&
        item.status.toUpperCase().includes('SEM') &&
        item.status.toUpperCase().includes('AGENDA'))
    )
  ).length;

  // 3. PREV. ENTREGAS ATRASADAS - Status "Prev. Entrega em Atraso" e variações
  const prevAtraso = dadosParaEstatisticas.filter(
    item => item.status && (
      item.status === 'Prev. Entrega em Atraso' ||
      item.status.toUpperCase().includes('ATRASO') ||
      item.status.toUpperCase().includes('ATRASAD') ||
      (item.status.toUpperCase().includes('PREV') &&
        item.status.toUpperCase().includes('ATRASO'))
    )
  ).length;

  // 4. PREV. HOJE - Entregas previstas para hoje
  const prevHoje = dadosParaEstatisticas.filter(item => {
    if (!item.data) return false;

    const dataItem = item.data;
    if (dataItem.includes('/') && dataItem.length === 10) {
      return dataItem === hojeStr;
    }
    try {
      const dataEntrega = new Date(dataItem);
      if (!isNaN(dataEntrega.getTime())) {
        dataEntrega.setHours(0, 0, 0, 0);
        return dataEntrega.getTime() === hoje.getTime();
      }
    } catch {
      console.warn('Erro ao processar data:', dataItem);
    }

    return false;
  }).length;

  // Debug detalhado dos status para verificar classificação
  console.log('📊 Detalhamento dos KPIs:', {
    totalItens,
    agendado: {
      count: agendado,
      items: dadosParaEstatisticas.filter(item => item.status === 'Agendado')
        .map(item => ({ codigo: item.codAnt, status: item.status }))
    },
    prevEntrega: {
      count: prevEntrega,
      items: dadosParaEstatisticas.filter(item => item.status === 'Prev. Sem Agenda')
        .map(item => ({ codigo: item.codAnt, status: item.status }))
    },
    prevAtraso: {
      count: prevAtraso,
      items: dadosParaEstatisticas.filter(item => item.status === 'Prev. Entrega em Atraso')
        .map(item => ({ codigo: item.codAnt, status: item.status }))
    },
    prevAtraso: {
      count: prevAtraso,
      items: dadosParaEstatisticas.filter(item =>
        item.status &&
        (item.status.toUpperCase().includes('ATRASO') ||
          item.status.toUpperCase().includes('ATRASAD') ||
          item.status.toUpperCase() === 'PREV. ENTREGA EM ATRASO')
      ).map(item => ({ codigo: item.codAnt, status: item.status }))
    },
    prevHoje
  });

  const elementos = {
    totalItens,
    agendado,
    prevEntrega,
    prevAtraso,
    prevHoje
  };

  Object.keys(elementos).forEach(key => {
    const elemento = document.getElementById(key);
    if (elemento) {
      elemento.textContent = elementos[key];
    } else {
      console.warn(`Elemento não encontrado: ${key}`);
    }
  });

  const stats = {
    total: dadosParaEstatisticas.length,
    confirmado: dadosParaEstatisticas.filter(
      item => item.status === 'Confirmado'
    ).length,
    pendente: dadosParaEstatisticas.filter(item => item.status === 'Pendente')
      .length,
    cancelado: dadosParaEstatisticas.filter(item => item.status === 'Cancelado')
      .length,
    concluido: dadosParaEstatisticas.filter(item => item.status === 'Concluído')
      .length
  };

  Object.keys(stats).forEach(key => {
    const elemento = document.getElementById(`stat-${key}`);
    if (elemento) {
      elemento.textContent = stats[key];
    }
  });
}

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

function toggleFiltros() {
  const container = document.getElementById('container-filtros');
  const btn = document.getElementById('btn-toggle-filtros');
  const icone = btn.querySelector('i');

  if (container.style.display === 'none') {
    container.style.display = 'block';
    icone.className = 'fas fa-chevron-up';
    btn.title = 'Ocultar filtros';
  } else {
    container.style.display = 'none';
    icone.className = 'fas fa-chevron-down';
    btn.title = 'Mostrar filtros';
  }
}

function toggleFilters() {
  try {
    const filtersSection = document.querySelector('.filters-section');
    const toggleIcon = document.getElementById('toggleIcon');

    if (filtersSection && toggleIcon) {
      filtersSection.classList.toggle('collapsed');

      // Atualizar o ícone
      if (filtersSection.classList.contains('collapsed')) {
        toggleIcon.className = 'fas fa-chevron-down toggle-icon';
      } else {
        toggleIcon.className = 'fas fa-chevron-up toggle-icon';
      }
    }
  } catch (error) {
    console.error('Error in toggleFilters:', error);
  }
}

function exportarDados() {
  // Usar dadosFiltrados local
  const dados = dadosFiltrados || [];
  if (dados.length === 0) {
    mostrarNotificacao('Nenhum dado para exportar', 'warning');
    return;
  }

  const dadosExportacao = dados.map(item => ({
    Data: formatarData(item.data),
    Horário: item.horario,
    Fornecedor: item.fornecedor,
    Produto: item.produto,
    Quantidade: item.quantidade,
    Unidade: item.unidade,
    Status: item.status,
    Prioridade: item.prioridade,
    Contato: item.contato || '',
    Observações: item.observacoes || ''
  }));

  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = `agenda_recebimentos_loja_${dataAtual}.csv`;

  exportarCSV(dadosExportacao, nomeArquivo);
  mostrarNotificacao('Dados exportados com sucesso', 'success');
}

function exportarPDF() {
  // Usar dados locais corretos
  const dados = dadosFiltrados || dadosOriginais || [];
  if (dados.length === 0) {
    mostrarNotificacao('Nenhum dado para exportar', 'warning');
    return;
  }

  try {
    let jsPDF = window.jsPDF;
    if (!jsPDF && window.jspdf) {
      jsPDF = window.jspdf.jsPDF;
    }

    if (!jsPDF) {
      console.warn('jsPDF não disponível, usando método alternativo');
      const tabela = document.getElementById('agendaTable');
      if (tabela && window.gerarPDF) {
        const dataAtual = new Date().toISOString().split('T')[0];
        const nomeArquivo = `agenda_recebimentos_loja_${dataAtual}.pdf`;
        window.gerarPDF(tabela, nomeArquivo);
        mostrarNotificacao('PDF gerado usando método alternativo', 'info');
      } else {
        mostrarNotificacao('Erro: Nenhum método de PDF disponível', 'error');
      }
      return;
    }
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Agenda de Recebimento de Mercadorias - Loja', 20, 20);

    doc.setFontSize(12);
    doc.text('Sistema de Gestão', 20, 30);

    doc.setFontSize(10);
    const dataHora =
      new Date().toLocaleDateString('pt-BR') +
      ' às ' +
      new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
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
      console.warn('autoTable não disponível, usando método simples');
      let yPosition = 60;
      const lineHeight = 8;
      doc.setFontSize(10);
      doc.text('Código', 20, yPosition);
      doc.text('Descrição', 50, yPosition);
      doc.text('Fornecedor', 110, yPosition);
      doc.text('Status', 150, yPosition);
      doc.text('Data', 180, yPosition);
      doc.text('Qtde', 210, yPosition);
      doc.text('Saldo', 230, yPosition);
      doc.text('Obs', 250, yPosition);

      yPosition += lineHeight;

      doc.setFontSize(8);
      linhas.forEach((linha, _index) => {
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(String(linha.codigo).substring(0, 15), 20, yPosition);
        doc.text(String(linha.descricao).substring(0, 25), 50, yPosition);
        doc.text(String(linha.fornecedor).substring(0, 15), 110, yPosition);
        doc.text(String(linha.status).substring(0, 10), 150, yPosition);
        doc.text(String(linha.data).substring(0, 10), 180, yPosition);
        doc.text(String(linha.qtde).substring(0, 8), 210, yPosition);
        doc.text(String(linha.saldo).substring(0, 8), 230, yPosition);
        doc.text(String(linha.observacoes).substring(0, 15), 250, yPosition);

        yPosition += lineHeight;
      });
    } else {
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
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
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
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        'Sistema de Gestão - Relatório gerado automaticamente',
        20,
        doc.internal.pageSize.height - 15
      );
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width - 40,
        doc.internal.pageSize.height - 15
      );
    }

    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `agenda_recebimentos_loja_${dataAtual}.pdf`;

    doc.save(nomeArquivo);
    mostrarNotificacao(`PDF baixado: ${nomeArquivo}`, 'success');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    mostrarNotificacao('Erro ao gerar PDF: ' + error.message, 'error');

    const tabela = document.getElementById('agendaTable');
    if (tabela && window.gerarPDF) {
      const dataAtual = new Date().toISOString().split('T')[0];
      const nomeArquivo = `agenda_recebimentos_loja_${dataAtual}.pdf`;
      window.gerarPDF(tabela, nomeArquivo);
      mostrarNotificacao('PDF gerado usando método de backup', 'info');
    }
  }
}

function exportarExcel() {
  // Usar dados locais corretos
  const dados = dadosFiltrados || dadosOriginais || [];
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
  const nomeArquivo = `agenda_recebimentos_loja_${dataAtual}.xlsx`;

  try {
    if (typeof XLSX !== 'undefined') {
      const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Agenda Loja');
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

function imprimirAgenda() {
  // Usar dados locais corretos
  const dados = dadosFiltrados || dadosOriginais || [];
  if (dados.length === 0) {
    mostrarNotificacao('Nenhum dado para imprimir', 'warning');
    return;
  }

  const tabela = document.getElementById('agendaTable');
  if (tabela) {
    const printWindow = window.open('', '_blank');
    const dataAtual = new Date().toLocaleString('pt-BR');

    printWindow.document.write(`
            <html>
                <head>
                    <title>Agenda de Recebimentos - Loja</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                        .header h1 { margin: 0; color: #333; }
                        .header p { margin: 5px 0; color: #666; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
                        th { background-color: #f8f9fa; font-weight: bold; color: #333; }
                        .status-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
                        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Agenda de Recebimento de Mercadorias</h1>
                        <p><strong>Acesso Loja (Somente Consulta)</strong></p>
                        <p>Relatório gerado em: ${dataAtual}</p>
                        <p>Total de itens: ${dados.length}</p>
                    </div>
                    ${tabela.outerHTML}
                    <div class="footer">
                        <p>Sistema de Gestão - Relatório gerado automaticamente</p>
                        <p>Este documento contém apenas agendamentos aprovados pelo administrador</p>
                    </div>
                </body>
            </html>
        `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    mostrarNotificacao('Documento preparado para impressão', 'success');
  } else {
    mostrarNotificacao('Erro: Tabela não encontrada', 'error');
  }
}

function imprimirRelatorio() {
  // Usar dados locais corretos
  const dados = dadosFiltrados || [];
  if (dados.length === 0) {
    mostrarNotificacao('Nenhum dado para imprimir', 'warning');
    return;
  }

  const tabela = document.getElementById('tabela-agenda');
  if (tabela) {
    gerarPDF(tabela, 'agenda_recebimentos_loja.pdf');
  }
}

function verDetalhes(id) {
  const item = dadosOriginais.find(item => item.id === id);
  if (!item) {
    mostrarNotificacao('Agendamento não encontrado', 'error');
    return;
  }

  let modal = document.getElementById('modal-detalhes');
  if (!modal) {
    modal = criarModalDetalhes();
  }

  preencherModalDetalhes(item);
  modal.style.display = 'flex';
}

function criarModalDetalhes() {
  const modal = document.createElement('div');
  modal.id = 'modal-detalhes';
  modal.className = 'modal';
  modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Detalhes do Agendamento</h3>
                <button class="btn-close" onclick="fecharModal('modal-detalhes')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" id="modal-body-detalhes">
                <!-- Conteúdo será preenchido dinamicamente -->
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="fecharModal('modal-detalhes')">
                    Fechar
                </button>
            </div>
        </div>
    `;

  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      fecharModal('modal-detalhes');
    }
  });
  return modal;
}

function preencherModalDetalhes(item) {
  const body = document.getElementById('modal-body-detalhes');
  body.innerHTML = `
        <div class="detalhes-grid">
            <div class="detalhe-item">
                <label>Data e Horário:</label>
                <span>${formatarData(item.data)} às ${item.horario}</span>
            </div>
            
            <div class="detalhe-item">
                <label>Status:</label>
                <span class="badge badge-${item.status.toLowerCase()}">${item.status}</span>
            </div>
            
            <div class="detalhe-item">
                <label>Prioridade:</label>
                <span class="prioridade prioridade-${item.prioridade.toLowerCase()}">${item.prioridade}</span>
            </div>
            
            <div class="detalhe-item">
                <label>Fornecedor:</label>
                <span>${item.fornecedor}</span>
            </div>
            
            <div class="detalhe-item">
                <label>Contato:</label>
                <span>${item.contato || 'Não informado'}</span>
            </div>
            
            <div class="detalhe-item">
                <label>Produto:</label>
                <span>${item.produto}</span>
            </div>
            
            <div class="detalhe-item">
                <label>Quantidade:</label>
                <span>${formatarNumero(item.quantidade)} ${item.unidade}</span>
            </div>
            
            ${item.observacoes
      ? `
                <div class="detalhe-item detalhe-observacoes">
                    <label>Observações:</label>
                    <span>${item.observacoes}</span>
                </div>
            `
      : ''
    }
            
            <div class="detalhe-item">
                <label>Última Atualização:</label>
                <span>${item.ultimaAtualizacao || 'Não disponível'}</span>
            </div>
        </div>
    `;
}

function fecharModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
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

// ============= Exportar funções para uso global ===============
window.carregarDados = carregarDados;
window.atualizarDados = atualizarDados;
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.ordenarTabela = ordenarTabela;
window.setTableView = setTableView;
window.irParaPagina = irParaPagina;
window.verDetalhes = verDetalhes;
window.fecharModal = fecharModal;
window.exportarDados = exportarDados;
window.imprimirRelatorio = imprimirRelatorio;
window.toggleFiltros = toggleFiltros;
window.toggleFilters = toggleFilters;
window.aplicarFiltroPeriodo = aplicarFiltroPeriodo;
window.exportarPDF = exportarPDF;
window.exportarExcel = exportarExcel;
window.imprimirAgenda = imprimirAgenda;

// ============= Funções de Filtro por Cards KPI ===============
function filtrarPorStatus(status) {
  // Limpar outros filtros
  document.getElementById('busca').value = '';
  document.getElementById('fornecedor').value = '';
  document.getElementById('periodo').value = '';
  document.getElementById('dataInicio').value = '';
  document.getElementById('dataFim').value = '';

  // Aplicar filtro de status
  const selectStatus = document.getElementById('status');
  if (selectStatus) {
    selectStatus.value = status;
  }

  aplicarFiltros();
}

function filtrarPorStatusPrevisao() {
  // Limpar outros filtros
  document.getElementById('busca').value = '';
  document.getElementById('fornecedor').value = '';
  document.getElementById('periodo').value = '';
  document.getElementById('dataInicio').value = '';
  document.getElementById('dataFim').value = '';
  document.getElementById('status').value = '';

  // Aplicar filtro manual para status de previsão
  filtrosAtivos = {};
  dadosFiltrados = dadosOriginais.filter(item =>
    item.status &&
    (item.status.toUpperCase() === 'PREV. ENTREGA' ||
      item.status.toUpperCase() === 'PREVISAO_ENTREGA' ||
      item.status.toUpperCase() === 'PREV. SEM AGENDA' ||
      item.status.toUpperCase() === 'PREV SEM AGENDA' ||
      (item.status.toUpperCase().includes('PREV') &&
        item.status.toUpperCase().includes('ENTREGA') &&
        !item.status.toUpperCase().includes('ATRASO')) ||
      (item.status.toUpperCase().includes('PREV') &&
        item.status.toUpperCase().includes('SEM') &&
        item.status.toUpperCase().includes('AGENDA')))
  );

  configPaginacao.paginaAtual = 1;
  configPaginacao.totalItens = dadosFiltrados.length;
  configPaginacao.totalPaginas = calcularTotalPaginas(
    configPaginacao.totalItens,
    configPaginacao.itensPorPagina
  );

  atualizarVisualizacao();
  atualizarInfoFiltros();
}

function filtrarPorStatusAtraso() {
  // Limpar outros filtros
  document.getElementById('busca').value = '';
  document.getElementById('fornecedor').value = '';
  document.getElementById('periodo').value = '';
  document.getElementById('dataInicio').value = '';
  document.getElementById('dataFim').value = '';
  document.getElementById('status').value = '';

  // Aplicar filtro manual para status de atraso
  filtrosAtivos = {};
  dadosFiltrados = dadosOriginais.filter(item =>
    item.status &&
    (item.status === 'Prev. Entrega em Atraso' ||
      item.status.toUpperCase().includes('ATRASO') ||
      item.status.toUpperCase().includes('ATRASAD') ||
      (item.status.toUpperCase().includes('PREV') &&
        item.status.toUpperCase().includes('ATRASO')))
  );

  configPaginacao.paginaAtual = 1;
  configPaginacao.totalItens = dadosFiltrados.length;
  configPaginacao.totalPaginas = calcularTotalPaginas(
    configPaginacao.totalItens,
    configPaginacao.itensPorPagina
  );

  atualizarVisualizacao();
  atualizarInfoFiltros();
}

function filtrarPorDataHoje() {
  // Limpar outros filtros
  document.getElementById('busca').value = '';
  document.getElementById('fornecedor').value = '';
  document.getElementById('status').value = '';

  // Definir período como hoje
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('periodo').value = 'customizado';
  document.getElementById('dataInicio').value = hoje;
  document.getElementById('dataFim').value = hoje;

  // Mostrar campos de data personalizada
  const customDateContainer = document.getElementById('customDateContainer');
  if (customDateContainer) {
    customDateContainer.style.display = 'grid';
    setTimeout(() => {
      customDateContainer.classList.add('visible');
    }, 10);
  }

  aplicarFiltros();
}

window.filtrarPorStatus = filtrarPorStatus;
window.filtrarPorStatusPrevisao = filtrarPorStatusPrevisao;
window.filtrarPorDataHoje = filtrarPorDataHoje;

