// Limpar qualquer sessão anterior imediatamente ao carregar a página de login
if (typeof window.authManager !== 'undefined') {
  window.authManager.clearLocalData();
}

// Elementos do DOM
const accessCards = document.querySelectorAll('.access-card');
const manualLogin = document.getElementById('manual-login');
const microsoftLogin = document.getElementById('microsoft-login');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const _loginBtn = document.getElementById('login-btn');

let _tipoAcesso = 'usuario';

// ===================== Inicializadores ======================
document.addEventListener('DOMContentLoaded', function () {
  if (typeof window.authManager !== 'undefined') {
    window.authManager.clearLocalData();
    window.authManager.verificarSessao().then(isLoggedIn => {
      if (isLoggedIn) {
        const user = window.authManager.getUser();
        if (user) {
          const redirect =
            user.perfil === 'admin'
              ? '../admin/index.html'
              : '../loja/index.html'; // Mantém redirecionamento para loja independente do perfil
          window.location.href = redirect;
        }
      }
    });
  }
  configurarEventos();
  alternarTipoAcesso('usuario');
});

//====================== Controladores ======================
function configurarEventos() {
  accessCards.forEach(card => {
    card.addEventListener('click', () => {
      alternarTipoAcesso(card.dataset.type);
    });
  });

  const formLogin = manualLogin.querySelector('.login-form');
  if (formLogin) {
    formLogin.addEventListener('submit', handleManualLogin);
  }

  document.getElementById('re')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('senha').focus();
    }
  });
  document.getElementById('senha')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualLogin(e);
    }
  });
}

function alternarTipoAcesso(tipo) {
  _tipoAcesso = tipo;
  accessCards.forEach(card => {
    card.classList.toggle('active', card.dataset.type === tipo);
  });
  if (tipo === 'usuario') {
    manualLogin.style.display = 'none';
    microsoftLogin.style.display = 'block';
  } else {
    manualLogin.style.display = 'block';
    microsoftLogin.style.display = 'none';
  }
  limparMensagens();
}

// ===================== Manipuladores de Eventos ======================
async function handleManualLogin(e) {
  e.preventDefault();
  const re = document.getElementById('re').value.trim();
  const senha = document.getElementById('senha').value;
  if (!re || !senha) {
    mostrarErro('Por favor, preencha todos os campos para continuar.');
    return;
  }
  mostrarCarregamento(true);
  limparMensagens();
  try {
    // Fazer login via API do backend
    const result = await window.authManager.login({
      re: re,
      senha: senha
    });
    mostrarSucesso(`🎉 Bem-vindo de volta, ${result.user.nome}!`);
    // Debug: verificar dados do usuário
    console.log('Dados do usuário após login:', result.user);
    console.log('Perfil do usuário:', result.user.perfil);
    // Redirecionar baseado no perfil do usuário
    const redirect =
      result.user.perfil === 'admin'
        ? '../admin/index.html'
        : '../loja/index.html'; // Usuários gerais vão para a mesma tela da loja
    console.log('Redirecionando para:', redirect);
    setTimeout(() => {
      window.location.href = redirect;
    }, 500); // Reduzido para 500ms
  } catch (error) {
    console.error('Erro no login:', error);
    mostrarErro(
      `❌ ${error.message || 'Erro interno do sistema. Tente novamente.'}`
    );
  } finally {
    mostrarCarregamento(false);
  }
}

async function handleMicrosoftLogin() {
  mostrarCarregamento(true, 'microsoft-btn');
  limparMensagens();
  try {
    // Login para usuários gerais via Microsoft
    const baseURL = window.getApiUrl
      ? window.getApiUrl('auth')
      : 'http://localhost:3000/api/auth';
    const response = await fetch(`${baseURL}/login-usuario`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        microsoftToken: 'auto',
        userInfo: {
          tipo: 'usuario'
        }
      })
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }
    // Salvar token e dados do usuário usando AuthManager
    if (window.authManager) {
      localStorage.setItem(
        window.authManager.tokenKey || 'auth_token',
        result.token
      );
      localStorage.setItem(
        window.authManager.userKey || 'user_data',
        JSON.stringify(result.user)
      );
    }
    mostrarSucesso(
      `🎉 Autenticação Microsoft realizada! Bem-vindo, ${result.user.nome}`
    );
    setTimeout(() => {
      window.location.href = '../loja/index.html';
    }, 1500);
  } catch (error) {
    console.error('Erro na autenticação Microsoft:', error);
    mostrarErro('❌ Falha na autenticação Microsoft: ' + error.message);
  } finally {
    mostrarCarregamento(false, 'microsoft-btn');
  }
}

function togglePasswordVisibility() {
  const senhaInput = document.getElementById('senha');
  const toggleBtn = document.querySelector('.password-toggle i');
  if (senhaInput.type === 'password') {
    senhaInput.type = 'text';
    toggleBtn.className = 'fas fa-eye-slash';
  } else {
    senhaInput.type = 'password';
    toggleBtn.className = 'fas fa-eye';
  }
}

// ===================== Funções de UI ======================
function mostrarCarregamento(ativo, botaoId = 'login-btn') {
  const botao = document.getElementById(botaoId);
  const btnContent = botao.querySelector('.btn-content');
  const btnLoading = botao.querySelector('.btn-loading');
  if (ativo) {
    btnContent.style.display = 'none';
    btnLoading.style.display = 'flex';
    botao.disabled = true;
  } else {
    btnContent.style.display = 'flex';
    btnLoading.style.display = 'none';
    botao.disabled = false;
  }
}

function mostrarErro(mensagem) {
  const msgElement = errorMessage.querySelector('.message-text');
  msgElement.textContent = mensagem;
  errorMessage.style.display = 'flex';
  successMessage.style.display = 'none';
}

function mostrarSucesso(mensagem) {
  const msgElement = successMessage.querySelector('.message-text');
  msgElement.textContent = mensagem;
  successMessage.style.display = 'flex';
  errorMessage.style.display = 'none';
}

function limparMensagens() {
  errorMessage.style.display = 'none';
  successMessage.style.display = 'none';
}

// Expor funções para o HTML
window.handleMicrosoftLogin = handleMicrosoftLogin;
window.togglePasswordVisibility = togglePasswordVisibility;
