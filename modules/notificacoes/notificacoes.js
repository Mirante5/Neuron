/**
 * @file notificacoes.js
 * @version 3.1 (Efeito de Pulsação)
 * @description Versão final com efeito de pulsação no ícone quando há notificações.
 */

(async function () {
    'use strict';

    // --- Constantes e Estado ---
    const SCRIPT_ID = 'notificacoes';
    const CONFIG_KEY = 'neuronUserConfig';
    const STORAGE_KEY_DEMANDAS = 'neuronDemandasMestra';
    const STORAGE_KEY_CONCLUIDAS = 'neuronDemandasConcluidas';
    
    let config = {};
    let demandasConcluidas = new Set();
    let memoriaDeDemandas = {};
    let isFeatureActive = false;

    // --- Funções de Inicialização e Configuração ---
    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY] || {};
    }

    function isScriptAtivo() {
        if (!config || typeof config !== 'object') return false;
        return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
    }

    // --- Lógica de Criação e Remoção da UI ---
    function criarUI() {
        if (document.getElementById('neuron-notificacao-trigger')) return;

        const trigger = document.createElement('div');
        trigger.id = 'neuron-notificacao-trigger';
        trigger.title = 'Abrir Notificações';
        trigger.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901"/></svg>`;
        const contador = document.createElement('span');
        contador.id = 'neuron-notificacao-contador';
        contador.className = 'neuron-contador';
        contador.style.display = 'none';
        trigger.appendChild(contador);
        document.body.appendChild(trigger);
        
        const painel = document.createElement('div');
        painel.id = 'neuron-notificacao-painel';
        painel.innerHTML = `
            <div class="neuron-painel-header">
                <h4>Notificações</h4>
                <button id="neuron-painel-close" class="neuron-painel-close" title="Fechar">&times;</button>
            </div>
            <div id="neuron-painel-body" class="neuron-painel-body">
                <p>A carregar dados...</p>
            </div>
            <div class="neuron-painel-footer">
                <button id="neuron-btn-atualizar" class="neuron-footer-btn neuron-btn-atualizar">Atualizar</button>
                <button id="neuron-btn-limpar" class="neuron-footer-btn neuron-btn-limpar">Limpar Lista</button>
            </div>
            <div id="neuron-confirm-limpar" class="neuron-confirm-modal" style="display: none;">
                <p class="neuron-confirm-mensagem">Atenção! Esta ação é irreversível.<br>Deseja mesmo limpar toda a lista?</p>
                <div class="neuron-confirm-botoes">
                    <button id="neuron-confirm-limpar-sim" class="neuron-btn neuron-btn-perigo">Sim, Limpar</button>
                    <button id="neuron-confirm-limpar-nao" class="neuron-btn">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(painel);
    }

    function removerUI() {
        document.getElementById('neuron-notificacao-trigger')?.remove();
        document.getElementById('neuron-notificacao-painel')?.remove();
    }
    
    function exibirToastAviso(mensagem) {
        document.querySelector('.neuron-toast-aviso')?.remove();
        const toast = document.createElement('div');
        toast.className = 'neuron-toast-aviso';
        toast.textContent = mensagem;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
    
    // --- Lógica de Ações ---
    function limparLista() {
        memoriaDeDemandas = {};
        demandasConcluidas = new Set();
        chrome.storage.local.remove([STORAGE_KEY_DEMANDAS, STORAGE_KEY_CONCLUIDAS]);
        renderizarPainel();
        fecharConfirmacaoLimpar();
    }

    function fecharConfirmacaoLimpar() {
        const modal = document.getElementById('neuron-confirm-limpar');
        if (modal) modal.style.display = 'none';
    }

    // --- Lógica Principal ---
    function inicializarDadosNotificacoes() {
        chrome.storage.local.get([STORAGE_KEY_CONCLUIDAS, STORAGE_KEY_DEMANDAS], (result) => {
            demandasConcluidas = new Set(result[STORAGE_KEY_CONCLUIDAS] || []);
            memoriaDeDemandas = result[STORAGE_KEY_DEMANDAS] || {};
            renderizarPainel();
        });
    }

    const handleDadosExtraidos = (event) => {
        if (!event.detail || !Array.isArray(event.detail)) return;
        event.detail.forEach(demanda => {
            if (demanda && demanda.numero) memoriaDeDemandas[demanda.numero] = demanda;
        });
        chrome.storage.local.set({ [STORAGE_KEY_DEMANDAS]: memoriaDeDemandas });
        renderizarPainel();
    };

    const handleUiInteraction = (event) => {
        const targetId = event.target.id;

        if (targetId === 'neuron-notificacao-trigger' || event.target.closest('#neuron-notificacao-trigger')) {
            const painel = document.getElementById('neuron-notificacao-painel');
            if(painel) painel.style.display = painel.style.display === 'flex' ? 'none' : 'flex';
        } else if (targetId === 'neuron-painel-close') {
            const painel = document.getElementById('neuron-notificacao-painel');
            if(painel) painel.style.display = 'none';
        } else if (targetId === 'neuron-btn-atualizar') {
             document.dispatchEvent(new CustomEvent('NEURON_SOLICITAR_ATUALIZACAO'));
             event.target.innerText = 'A atualizar...';
             setTimeout(() => { if(event.target) event.target.innerText = 'Atualizar'; }, 1500);
        } else if (targetId === 'neuron-btn-limpar') {
            const modal = document.getElementById('neuron-confirm-limpar');
            if (modal) modal.style.display = 'flex';
        } else if (targetId === 'neuron-confirm-limpar-sim') {
            limparLista();
        } else if (targetId === 'neuron-confirm-limpar-nao') {
            fecharConfirmacaoLimpar();
        }

        const grupoHeader = event.target.closest('.neuron-grupo-header');
        if (grupoHeader) {
            grupoHeader.classList.toggle('open');
            grupoHeader.nextElementSibling?.classList.toggle('collapsed');
        }
    };
    
    function renderizarPainel() {
        const corpoDoPainel = document.getElementById('neuron-painel-body');
        if (!corpoDoPainel) return;

        const notificacoesRelevantes = Object.values(memoriaDeDemandas).filter(isNotificacaoRelevante);
        
        const criarGrupoHTML = (titulo, lista, detalheExtra = null) => {
            if (lista.length === 0) return '';
            let grupoHtml = `<div class="neuron-grupo-header"><h5>${titulo} (${lista.length})</h5></div>`;
            grupoHtml += `<div class="neuron-grupo-lista collapsed">`; 
            lista.forEach(d => {
                const isDone = demandasConcluidas.has(d.numero);
                let detalheTexto = (detalheExtra === 'prazo' && d.diasRestantes != null) ? `<span class="neuron-link-detalhe">Prazo em ${d.diasRestantes} dias</span>` : '';
                grupoHtml += `
                    <div class="neuron-item-notificacao ${isDone ? 'done' : ''}" data-numero="${d.numero}">
                        <div class="neuron-link-wrapper" data-href="${d.href || '#'}"><span class="neuron-link-numero">${d.numero}</span>${detalheTexto}</div>
                        <input type="checkbox" class="neuron-done-check" title="Marcar como concluído" ${isDone ? 'checked' : ''}>
                    </div>`;
            });
            return grupoHtml + '</div>';
        };

        const prazosCurtos = notificacoesRelevantes.map(d => ({ ...d, diasRestantes: calcularDiasRestantes(d.prazo) })).filter(d => d.diasRestantes !== null && d.diasRestantes <= 2).sort((a, b) => a.diasRestantes - b.diasRestantes);
        
        corpoDoPainel.innerHTML = 
            criarGrupoHTML('Prazos Curtos (<= 2 dias)', prazosCurtos, 'prazo') +
            criarGrupoHTML('Possíveis Respondidas', notificacoesRelevantes.filter(d => d.possivelRespondida)) +
            criarGrupoHTML('Com Observação', notificacoesRelevantes.filter(d => d.possivelobservacao)) +
            criarGrupoHTML('Demandas Prorrogadas', notificacoesRelevantes.filter(d => d.situacao.includes('Prorrogada'))) +
            criarGrupoHTML('Demandas Complementadas', notificacoesRelevantes.filter(d => d.situacao.includes('Complementada'))) ||
            '<p>Nenhuma notificação relevante encontrada.</p>';
        
        adicionarEventListenersAosItens();
        atualizarContadorEIcone();
    }
    
    function adicionarEventListenersAosItens() {
        document.querySelectorAll('.neuron-item-notificacao').forEach(item => {
            const numero = item.dataset.numero;
            const linkWrapper = item.querySelector('.neuron-link-wrapper');
            linkWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                const href = linkWrapper.dataset.href;
                if (!href || href === '#') return;
                
                const urlRelativo = href.split('.gov.br')[1];
                const elementoNaPagina = urlRelativo ? document.querySelector(`a[navigateurl="${urlRelativo}"]`) : null;
                
                if (elementoNaPagina) {
                    const linha = elementoNaPagina.closest('.row');
                    if (linha) {
                        elementoNaPagina.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const originalColor = linha.style.backgroundColor;
                        linha.style.transition = 'background-color 0.3s ease-in-out';
                        linha.style.backgroundColor = '#fff3cd';
                        setTimeout(() => { linha.style.backgroundColor = originalColor || ''; }, 2500);
                    }
                } else {
                    exibirToastAviso(`Demanda ${numero} não encontrada. A abrir em nova aba.`);
                    setTimeout(() => window.open(href, 'noopener,noreferrer'), 1000);
                }
            });
            
            const checkbox = item.querySelector('.neuron-done-check');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    demandasConcluidas.add(numero);
                    item.classList.add('done');
                } else {
                    demandasConcluidas.delete(numero);
                    item.classList.remove('done');
                }
                chrome.storage.local.set({ [STORAGE_KEY_CONCLUIDAS]: Array.from(demandasConcluidas) });
                atualizarContadorEIcone();
            });
        });
    }

    function atualizarContadorEIcone() {
        const contador = document.getElementById('neuron-notificacao-contador');
        const trigger = document.getElementById('neuron-notificacao-trigger');
        if (!contador || !trigger) return;

        const naoConcluidas = Object.values(memoriaDeDemandas).filter(d => isNotificacaoRelevante(d) && !demandasConcluidas.has(d.numero));
        const total = naoConcluidas.length;

        // Limpa todas as classes de status e pulsação antes de reavaliar
        trigger.className = ''; 

        if (total > 0) {
            contador.innerText = total > 99 ? '99+' : total;
            contador.style.display = 'block';
            // Adiciona a classe de pulsação
            trigger.classList.add('pulsating');
            // Define a cor
            if (total > 5) {
                trigger.classList.add('status-danger');
            } else {
                trigger.classList.add('status-warning');
            }
        } else {
            contador.style.display = 'none';
            // Garante que o ícone fique verde e pare de pulsar
            trigger.classList.add('status-ok');
        }
    }
    
    function isNotificacaoRelevante(demanda) {
        if (!demanda || typeof demanda !== 'object') return false;
        const situacao = demanda.situacao || '';
        const diasRestantes = calcularDiasRestantes(demanda.prazo);
        return (diasRestantes !== null && diasRestantes <= 2) || situacao.includes('Prorrogada') || situacao.includes('Complementada') || demanda.possivelRespondida || demanda.possivelobservacao;
    }
    
    function calcularDiasRestantes(dataString) {
        if (!dataString) return null;
        const partes = dataString.split('/');
        if (partes.length !== 3) return null;
        const dataAlvo = new Date(partes[2], partes[1] - 1, partes[0]);
        if (isNaN(dataAlvo.getTime())) return null;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return Math.ceil((dataAlvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    }

    // --- Gerenciamento de Estado da Funcionalidade ---
    function ativarFuncionalidade() {
        if (isFeatureActive) return;
        criarUI();
        document.addEventListener('click', handleUiInteraction);
        document.addEventListener('dadosExtraidosNeuron', handleDadosExtraidos);
        inicializarDadosNotificacoes();
        isFeatureActive = true;
    }

    function desativarFuncionalidade() {
        if (!isFeatureActive) return;
        removerUI();
        document.removeEventListener('click', handleUiInteraction);
        document.removeEventListener('dadosExtraidosNeuron', handleDadosExtraidos);
        isFeatureActive = false;
    }
    
    async function verificarEstadoAtualEAgir() {
        try {
            await carregarConfiguracoes();
            if (isScriptAtivo()) {
                ativarFuncionalidade();
            } else {
                desativarFuncionalidade();
            }
        } catch (error) {
            console.error(`Neuron (${SCRIPT_ID}): Erro fatal durante a inicialização!`, error);
            desativarFuncionalidade();
        }
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        await verificarEstadoAtualEAgir();
    }

    init();

})();