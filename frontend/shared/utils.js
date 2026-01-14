// Funções utilitárias compartilhadas entre Loja e Admin

// Modo debug (usa config se disponível)
const UTILS_DEBUG =
  typeof window !== 'undefined' && window.getConfig
    ? window.getConfig('development.debug.enabled', false)
    : false;

window.appConfig = window.appConfig || {
  supportedBrowsers: ['Chrome', 'Firefox', 'Edge']
};

// ============== Formatação de data =================
function formatarData(data) {
  try {
    if (!data) return '';
    if (data instanceof Date) {
      return data.toLocaleDateString('pt-BR');
    }
    if (typeof data !== 'string') return '';
    if (data.includes('/')) {
      return data;
    }

    // CORREÇÃO: Tratar datas no formato YYYY-MM-DD sem problemas de timezone
    if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Para datas no formato YYYY-MM-DD, criar Date local sem timezone issues
      const [ano, mes, dia] = data.split('-');
      const dataLocal = new Date(
        parseInt(ano),
        parseInt(mes) - 1,
        parseInt(dia)
      );
      if (isNaN(dataLocal.getTime())) return '';
      return dataLocal.toLocaleDateString('pt-BR');
    }

    // Para outros formatos, usar construtor padrão
    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) return '';
    return dataObj.toLocaleDateString('pt-BR');
  } catch (e) {
    if (UTILS_DEBUG) console.warn('formatarData error', e);
    return '';
  }
}

function formatarDataISO(data) {
  try {
    if (!data) return '';
    if (data instanceof Date) {
      const y = data.getFullYear();
      const m = String(data.getMonth() + 1).padStart(2, '0');
      const d = String(data.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof data !== 'string') return '';
    if (data.includes('/')) {
      const [dia, mes, ano] = data.split('/');
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    return data;
  } catch (e) {
    if (UTILS_DEBUG) console.warn('formatarDataISO error', e);
    return '';
  }
}

function formatarDataHora() {
  const agora = new Date();
  return (
    agora.toLocaleDateString('pt-BR') +
    ' às ' +
    agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

// ============== Formatação de números =================
function formatarNumero(numero) {
  const num =
    typeof numero === 'number'
      ? numero
      : parseFloat(
        String(numero)
          .replace(/[^0-9\-.,]/g, '')
          .replace(',', '.')
      );
  if (isNaN(num)) return '0';
  return num.toLocaleString('pt-BR');
}

// ============ Funções de validação ================
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validarTelefone(telefone) {
  const regex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
  return regex.test(telefone);
}

function validarData(data) {
  if (!data) return false;
  if (data instanceof Date) return !isNaN(data.getTime());
  const dataObj = new Date(data);
  return !isNaN(dataObj.getTime());
}

// ===============  Funções de manipulação de arrays ==============
function ordenarPor(array, campo, direcao = 'asc') {
  return array.sort((a, b) => {
    let valorA = a[campo];
    let valorB = b[campo];

    if (campo === 'data') {
      valorA = converterDataParaComparacao(valorA);
      valorB = converterDataParaComparacao(valorB);
    }
    if (typeof valorA === 'string' && !isNaN(valorA)) {
      valorA = parseFloat(valorA);
      valorB = parseFloat(valorB);
    }
    if (typeof valorA === 'string' || typeof valorB === 'string') {
      valorA = (valorA || '').toLowerCase();
      valorB = (valorB || '').toLowerCase();
    }

    if (valorA < valorB) return direcao === 'asc' ? -1 : 1;
    if (valorA > valorB) return direcao === 'asc' ? 1 : -1;
    return 0;
  });
}

function converterDataParaComparacao(dataString) {
  if (!dataString) return new Date(0);

  if (dataString instanceof Date) return dataString;

  if (dataString.includes('/')) {
    const [dia, mes, ano] = dataString.split('/');
    return new Date(ano, mes - 1, dia);
  }
  return new Date(dataString);
}

function filtrarArray(array, filtros) {
  return array.filter(item => {
    return Object.keys(filtros).every(campo => {
      const valorFiltro = filtros[campo];
      if (!valorFiltro) return true;

      const valorItem = item[campo];
      if (!valorItem) return false;

      if (typeof valorItem === 'string') {
        return valorItem.toLowerCase().includes(valorFiltro.toLowerCase());
      }
      return valorItem === valorFiltro;
    });
  });
}

// ============ Funções de paginação ================
function paginarArray(array, pagina, itensPorPagina) {
  if (itensPorPagina === 'all') return array;

  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + parseInt(itensPorPagina);
  return array.slice(inicio, fim);
}

function calcularTotalPaginas(totalItens, itensPorPagina) {
  if (itensPorPagina === 'all') return 1;
  return Math.ceil(totalItens / parseInt(itensPorPagina));
}

// ============ Funções de busca ================
function buscarTexto(array, texto, campos) {
  if (!texto) return array;

  const textoBusca = texto.toLowerCase().trim();
  const resultado = array.filter(item => {
    const match = campos.some(campo => {
      const valor = item[campo];
      if (!valor) return false;

      const valorString = valor.toString().toLowerCase().trim();
      const encontrou = valorString.includes(textoBusca);

      return encontrou;
    });
    return match;
  });
  return resultado;
}

// ================ Funções de período ================
function obterDatasPeriodo(periodo) {
  const hoje = new Date();
  let dataInicio, dataFim;
  switch (periodo) {
    case 'hoje': {
      const hojeStr = hoje.toLocaleDateString('pt-BR');
      dataInicio = dataFim = hojeStr;
      break;
    }
    case 'semana': {
      const primeiroDiaSemana = new Date(hoje);
      primeiroDiaSemana.setDate(hoje.getDate() - hoje.getDay());
      const ultimoDiaSemana = new Date(primeiroDiaSemana);
      ultimoDiaSemana.setDate(primeiroDiaSemana.getDate() + 6);

      dataInicio = formatarDataISO(
        primeiroDiaSemana.toISOString().split('T')[0]
      );
      dataFim = formatarDataISO(ultimoDiaSemana.toISOString().split('T')[0]);
      break;
    }
    case 'mes': {
      const primeiroMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      dataInicio = formatarDataISO(primeiroMes.toISOString().split('T')[0]);
      dataFim = formatarDataISO(ultimoMes.toISOString().split('T')[0]);
      break;
    }
    default:
      return { dataInicio: null, dataFim: null };
  }
  return { dataInicio, dataFim };
}

function estaNoIntervalo(data, dataInicio, dataFim) {
  if (!data) return false;

  const dataItem = converterDataParaComparacao(data);
  if (dataInicio) {
    const inicio = converterDataParaComparacao(formatarData(dataInicio));
    if (dataItem < inicio) {
      return false;
    }
  }
  if (dataFim) {
    const fim = converterDataParaComparacao(formatarData(dataFim));
    if (dataItem > fim) {
      return false;
    }
  }
  return true;
}

// ================ Funções de exportação ================
function exportarCSV(dados, nomeArquivo) {
  if (!dados || dados.length === 0) {
    mostrarNotificacao('Nenhum dado para exportar', 'warning');
    return;
  }

  const headers = Object.keys(dados[0]);
  let csv = headers.join(',') + '\n';

  dados.forEach(item => {
    const linha = headers.map(header => {
      let valor = item[header] || '';
      if (valor.toString().includes(',') || valor.toString().includes('"')) {
        valor = '"' + valor.toString().replace(/"/g, '""') + '"';
      }
      return valor;
    });
    csv += linha.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      nomeArquivo || `agenda_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function exportarExcel(dados, nomeArquivo) {
  if (!dados || dados.length === 0) {
    mostrarNotificacao('Nenhum dado para exportar', 'warning');
    return;
  }

  try {
    if (typeof XLSX === 'undefined') {
      console.warn('SheetJS não disponível, usando fallback CSV');
      exportarCSV(dados, nomeArquivo?.replace('.xlsx', '.csv') || 'agenda.csv');
      mostrarNotificacao(
        'Arquivo exportado como CSV (compatível com Excel)',
        'info'
      );
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dados);

    const maxWidth = 30;
    const colWidths = Object.keys(dados[0]).map(key => {
      const maxLength = Math.max(
        key.length,
        ...dados.map(row => String(row[key] || '').length)
      );
      return { wch: Math.min(maxLength + 2, maxWidth) };
    });

    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agenda de Recebimentos');

    workbook.Props = {
      Title: 'Agenda de Recebimento de Mercadorias',
      Subject: 'Relatório de Agendamentos',
      Author: 'Sistema de Agenda',
      CreatedDate: new Date()
    };

    const nomeCompleto =
      nomeArquivo ||
      `agenda_recebimentos_${new Date().toISOString().split('T')[0]}.xlsx`;

    if (typeof XLSX !== 'undefined' && typeof XLSX.writeFile === 'function') {
      XLSX.writeFile(workbook, nomeCompleto);
    } else if (UTILS_DEBUG) {
      console.warn('XLSX.writeFile não disponível - fallback CSV');
    }
    if (typeof mostrarNotificacao === 'function') {
      mostrarNotificacao(`Arquivo Excel exportado: ${nomeCompleto}`, 'success');
    }
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    exportarCSV(dados, nomeArquivo?.replace('.xlsx', '.csv') || 'agenda.csv');
    if (typeof mostrarNotificacao === 'function')
      mostrarNotificacao(
        'Erro no Excel, arquivo exportado como CSV',
        'warning'
      );
  }
}

function gerarPDF(elemento, nomeArquivo) {
  try {
    const tabela = document.getElementById('agendaTable');
    if (!tabela) {
      throw new Error('Tabela não encontrada');
    }
    const dados = [];
    const linhas = tabela.querySelectorAll('tbody tr');

    linhas.forEach(linha => {
      if (linha.id === 'loadingRow' || linha.style.display === 'none') return;

      const celulas = linha.querySelectorAll('td');
      if (celulas.length >= 8) {
        dados.push({
          codigo: celulas[0]?.textContent?.trim() || '',
          descricao: celulas[1]?.textContent?.trim() || '',
          fornecedor: celulas[2]?.textContent?.trim() || '',
          status: celulas[3]?.textContent?.trim() || '',
          data: celulas[4]?.textContent?.trim() || '',
          qtde: celulas[5]?.textContent?.trim() || '',
          saldo: celulas[6]?.textContent?.trim() || '',
          observacoes: celulas[7]?.textContent?.trim() || ''
        });
      } else if (UTILS_DEBUG) {
        console.warn(
          'Linha ignorada em gerarPDF: colunas insuficientes',
          celulas.length
        );
      }
    });

    let tabelaHTML = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; font-size: 10px;">Código</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; font-size: 10px;">Descrição</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; font-size: 10px;">Fornecedor</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; font-size: 10px;">Status</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; font-size: 10px;">Data Prevista</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; font-size: 10px;">Qtde</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; font-size: 10px;">Saldo</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; font-size: 10px;">Observações</th>
                    </tr>
                </thead>
                <tbody>`;

    dados.forEach((item, index) => {
      const corLinha = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
      tabelaHTML += `
                <tr style="background-color: ${corLinha};">
                    <td style="border: 1px solid #ddd; padding: 6px; font-size: 9px; max-width: 80px; word-wrap: break-word;">${item.codigo}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; font-size: 9px; max-width: 200px; word-wrap: break-word;">${item.descricao}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; font-size: 9px; max-width: 120px; word-wrap: break-word;">${item.fornecedor}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; font-size: 9px; max-width: 100px; word-wrap: break-word;">${item.status}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; font-size: 9px; max-width: 80px; text-align: center;">${item.data}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; font-size: 9px; max-width: 60px; text-align: center;">${item.qtde}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; font-size: 9px; max-width: 60px; text-align: center;">${item.saldo}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; font-size: 9px; max-width: 150px; word-wrap: break-word;">${item.observacoes}</td>
                </tr>`;
    });
    tabelaHTML += `
                </tbody>
            </table>`;

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      throw new Error('Popup bloqueado. Permita popups para este site.');
    }

    printWindow.document.write(`
            <html>
                <head>
                    <title>Agenda de Recebimentos</title>
                    <style>
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                            @page { 
                                size: A4 landscape; 
                                margin: 1cm; 
                            }
                        }
                        body { 
                            font-family: Arial, sans-serif; 
                            font-size: 12px; 
                            margin: 15px;
                            line-height: 1.3;
                        }
                        .header { 
                            text-align: center; 
                            margin-bottom: 25px; 
                            border-bottom: 2px solid #333; 
                            padding-bottom: 15px; 
                        }
                        .header h1 { 
                            margin: 0; 
                            color: #333; 
                            font-size: 16px;
                        }
                        .header p { 
                            margin: 5px 0; 
                            color: #666; 
                            font-size: 10px;
                        }
                        .footer { 
                            margin-top: 25px; 
                            text-align: center; 
                            font-size: 9px; 
                            color: #666; 
                            border-top: 1px solid #ddd; 
                            padding-top: 15px; 
                        }
                        .stats {
                            margin-bottom: 15px;
                            font-size: 10px;
                            color: #555;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Agenda de Recebimento de Mercadorias</h1>
                        <p><strong>Sistema de Gestão</strong></p>
                        <p>Relatório gerado em: ${formatarDataHora()}</p>
                    </div>
                    <div class="stats">
                        <strong>Total de itens: ${dados.length}</strong>
                    </div>
                    ${tabelaHTML}
                    <div class="footer">
                        <p>Sistema de Gestão - Relatório gerado automaticamente</p>
                        <p>Arquivo: ${nomeArquivo || 'agenda_recebimentos.pdf'}</p>
                    </div>
                </body>
            </html>
        `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    return true;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    if (window.mostrarNotificacao) {
      window.mostrarNotificacao('Erro ao gerar PDF: ' + error.message, 'error');
    }
    return false;
  }
}

// =============== Funções de notificação ================
function mostrarNotificacao(mensagem, tipo = 'info', duracao = 3000) {
  const existentes = document.querySelectorAll('.notificacao');
  existentes.forEach(n => n.remove());

  const notificacao = document.createElement('div');
  notificacao.className = `notificacao notificacao-${tipo}`;

  const icones = {
    success: 'fas fa-check-circle',
    error: 'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };

  const cores = {
    success: '#059669',
    error: '#dc2626',
    warning: '#d97706',
    info: '#0284c7'
  };

  notificacao.innerHTML = `
        <i class="${icones[tipo]}"></i>
        <span>${mensagem}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer;">&times;</button>
    `;

  notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${cores[tipo]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1001;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;

  document.body.appendChild(notificacao);
  if (duracao > 0) {
    setTimeout(() => {
      if (notificacao.parentElement) {
        notificacao.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
          if (notificacao.parentElement) {
            notificacao.remove();
          }
        }, 300);
      }
    }, duracao);
  }
}

// =========== Funções de tema ============
function toggleTheme() {
  const temaAtual = document.body.getAttribute('data-theme');
  const novoTema = temaAtual === 'dark' ? 'light' : 'dark';

  document.body.setAttribute('data-theme', novoTema);
  localStorage.setItem('tema', novoTema);
  atualizarIconeTema(novoTema);
}

function atualizarIconeTema(tema) {
  const icone = document.getElementById('themeIcon');
  if (icone) {
    icone.className = tema === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

function inicializarTema() {
  const temaSalvo = localStorage.getItem('tema') || 'light';
  document.body.setAttribute('data-theme', temaSalvo);
  atualizarIconeTema(temaSalvo);
}

// ============= Funções de debounce para otimização ================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========== Funções de detecção de navegador ===============
function detectarNavegador() {
  const userAgent = navigator.userAgent;

  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
    return 'Chrome';
  }
  if (userAgent.includes('Firefox')) {
    return 'Firefox';
  }
  if (userAgent.includes('Edge')) {
    return 'Edge';
  }
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari';
  }

  return 'Desconhecido';
}

function verificarNavegadorSuportado() {
  const navegador = detectarNavegador();
  const suportados = appConfig.supportedBrowsers;

  if (!suportados.includes(navegador)) {
    mostrarNotificacao(
      `Navegador ${navegador} pode não ser totalmente suportado. Recomendamos Chrome, Firefox ou Edge.`,
      'warning',
      5000
    );
  }
}

// Funções de localStorage
function salvarLocalStorage(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error);
    return false;
  }
}

function carregarLocalStorage(chave, valorPadrao = null) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : valorPadrao;
  } catch (error) {
    console.error('Erro ao carregar do localStorage:', error);
    return valorPadrao;
  }
}

// ========== Adicionar estilos para animações de notificação =========
if (!document.getElementById('notificacao-styles')) {
  const style = document.createElement('style');
  style.id = 'notificacao-styles';
  style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
  document.head.appendChild(style);
}

function getStatusClass(status) {
  if (!status) return '';

  const statusNormalizado = status.toLowerCase().replace(/[^a-z]/g, '-');

  switch (statusNormalizado) {
    case 'agendado':
      return 'status-agendado';
    case 'prev-entrega':
    case 'prev--entrega':
      return 'status-previsto';
    case 'prev-entrega-em-atraso':
    case 'prev--entrega-em-atraso':
      return 'status-atraso';
    case 'entregue':
      return 'status-entregue';
    case 'cancelado':
      return 'status-cancelado';
    default:
      return 'status-' + statusNormalizado;
  }
}

// Exportar funções para uso global
window.formatarData = formatarData;
window.formatarDataISO = formatarDataISO;
window.formatarDataHora = formatarDataHora;
window.formatarNumero = formatarNumero;
window.validarEmail = validarEmail;
window.validarTelefone = validarTelefone;
window.validarData = validarData;
window.ordenarPor = ordenarPor;
window.converterDataParaComparacao = converterDataParaComparacao;
window.filtrarArray = filtrarArray;
window.paginarArray = paginarArray;
window.calcularTotalPaginas = calcularTotalPaginas;
window.buscarTexto = buscarTexto;
window.obterDatasPeriodo = obterDatasPeriodo;
window.estaNoIntervalo = estaNoIntervalo;
window.exportarCSV = exportarCSV;
window.exportarExcel = exportarExcel;
window.Utils = window.Utils || {};

Object.assign(window.Utils, {
  formatarData,
  formatarDataISO,
  formatarDataHora,
  formatarNumero,
  validarEmail,
  validarTelefone,
  validarData,
  ordenarPor,
  converterDataParaComparacao,
  filtrarArray,
  paginarArray,
  calcularTotalPaginas,
  buscarTexto,
  obterDatasPeriodo,
  estaNoIntervalo,
  exportarCSV,
  exportarExcel,
  gerarPDF
});

window.gerarPDF = window.Utils.gerarPDF;
window.mostrarNotificacao = mostrarNotificacao;
window.toggleTheme = toggleTheme;
window.atualizarIconeTema = atualizarIconeTema;
window.inicializarTema = inicializarTema;
window.debounce = debounce;
window.detectarNavegador = detectarNavegador;
window.verificarNavegadorSuportado = verificarNavegadorSuportado;
window.salvarLocalStorage = salvarLocalStorage;
window.carregarLocalStorage = carregarLocalStorage;
window.getStatusClass = getStatusClass;
