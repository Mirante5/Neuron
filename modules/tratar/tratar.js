// Neuron/scripts/tratar.js - CSS Externalizado (Adaptado para novas configs)
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tratar';
    const SCRIPT_ID = 'tratar';
    const CONFIG_STORAGE_KEY_TRATAR = 'neuronUserConfig'; // Chave geral da config principal
    const CUSTOM_TEXT_MODELS_STORAGE_KEY = 'customTextModels'; // Nova chave para modelos de texto customizados
    const DEFAULT_CONFIG_PATH_TRATAR = 'config/config.json'; // Caminho para a config padrão

    const TARGET_DIV_SELECTOR = '#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel3';
    const INPUT_CONTRIBUICAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtContribuicao';
    const BTN_CLASS_CIDADAO = 'neuron-btn-cidadao';
    const BTN_CLASS_PRORROGACAO_TEXTO = 'neuron-btn-prorrogacao-texto';

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let customTextModels = {}; // Renomeado para customTextModels

    let uiMutationObserver = null; // Observer para o painel de UI (para recriação de botões)

    async function carregarConfiguracoesTratar() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Carregando configurações...`, "color: blue; font-weight: bold;");
        // Carrega a configuração geral da extensão
        const resultGeneral = await chrome.storage.local.get(CONFIG_STORAGE_KEY_TRATAR);
        let fullConfig = {};
        if (resultGeneral[CONFIG_STORAGE_KEY_TRATAR] && typeof resultGeneral[CONFIG_STORAGE_KEY_TRATAR] === 'object') {
            fullConfig = resultGeneral[CONFIG_STORAGE_KEY_TRATAR];
        } else {
            // Fallback para o config.json padrão se a configuração geral não for encontrada
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_TRATAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_TRATAR}:`, e);
                fullConfig = { masterEnableNeuron: false, featureSettings: {} };
            }
        }
        
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;

        // Carrega os modelos de texto customizados do storage.local
        const resultTextModels = await chrome.storage.local.get(CUSTOM_TEXT_MODELS_STORAGE_KEY);
        if (resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY] && typeof resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY] === 'object') {
            customTextModels = resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY];
        } else {
            // Se não houver customizados, carrega os padrões do config.json
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_TRATAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                const defaultConfig = await response.json();
                customTextModels = defaultConfig.textModels || {}; // Pega a parte 'textModels' do config.json
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar modelos de texto padrão:`, e);
                customTextModels = {};
            }
        }

        // Garante que a seção 'mensagens' e 'prorrogacao' existam para Tratar
        if (!customTextModels.mensagens || !customTextModels.mensagens.prorrogacao) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Texto de prorrogação (mensagens.prorrogacao) não encontrado ou vazio.`);
            // Adiciona um fallback mínimo se não existir
            customTextModels.mensagens = customTextModels.mensagens || {};
            customTextModels.mensagens.prorrogacao = "Modelo de prorrogação não encontrado. (Verifique suas configurações)";
        }
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configurações carregadas. Master: ${currentMasterEnabled}, Script: ${currentScriptEnabled}`);
    }

    // Função auxiliar para criar botões, mantida para reusabilidade
    function criarBotaoAuxiliar({ id, label, classes = [], onClick }) {
        const btn = document.createElement('input');
        btn.type = 'submit';
        btn.id = id;
        btn.value = label;
        btn.classList.add('btn', 'btn-sm', 'btn-primary', ...classes);
        btn.addEventListener('click', e => {
            e.preventDefault();
            onClick();
        });
        return btn;
    }

    function importarDadosCidadaoAction() {
        const tipoDoc = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTipoDocPF')?.textContent.trim() || '';
        const nome = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNomePF')?.textContent.trim() || '';
        const documento = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumeroDocPF')?.textContent.trim() || '';
        const email = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtEmailPF')?.textContent.trim() || '';
        const field = document.getElementById(INPUT_CONTRIBUICAO_ID);
        if (field) {
            field.value = `Nome: ${nome}\nDocumento (${tipoDoc}): ${documento}\nEmail: ${email}`;
        }
    }

    function inserirTextoProrrogacaoAction() {
        const prazo = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento')?.textContent.trim() || '{PRAZO_NAO_ENCONTRADO}';
        // Usa o modelo de texto de prorrogação carregado via customTextModels
        const textoBase = customTextModels.mensagens?.prorrogacao || "Modelo de prorrogação não encontrado.";
        const textoFinal = textoBase.replace('{datalimite}', prazo);
        const field = document.getElementById(INPUT_CONTRIBUICAO_ID);
        if (field) field.value = textoFinal;
    }

    function criarOuAtualizarUI() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Tentando criar ou atualizar UI...`, "color: green;");
        // Verifica se o painel alvo e o input de contribuição existem
        const panel = document.querySelector(TARGET_DIV_SELECTOR);
        const contribInput = document.getElementById(INPUT_CONTRIBUICAO_ID);

        if (!panel || !contribInput) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Painel alvo ('${TARGET_DIV_SELECTOR}') ou campo de contribuição não encontrado. UI não será criada.`);
            removerElementosCriados(); // Garante que botões antigos sejam removidos se os alvos não estiverem lá
            return;
        }

        // Tenta pegar os botões existentes
        let btnImportar = document.getElementById('neuronBtnImportarCidadao');
        let btnTextoProrrogacao = document.getElementById('neuronBtnTextoProrrogacao');

        // Se os botões não existem, cria-os
        if (!btnImportar || !btnTextoProrrogacao) {
            removerElementosCriados(); // Garante que não haja botões parciais ou antigos
            
            btnImportar = criarBotaoAuxiliar({
                id: 'neuronBtnImportarCidadao',
                label: 'Importar dados do cidadão',
                classes: [BTN_CLASS_CIDADAO],
                onClick: importarDadosCidadaoAction
            });

            btnTextoProrrogacao = criarBotaoAuxiliar({
                id: 'neuronBtnTextoProrrogacao',
                label: 'Texto de Prorrogação (Neuron)',
                classes: [BTN_CLASS_PRORROGACAO_TEXTO],
                onClick: inserirTextoProrrogacaoAction
            });

            panel.appendChild(btnImportar);
            panel.appendChild(btnTextoProrrogacao);
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Botões auxiliares adicionados.`, "color: green;");
        }
        // Se os botões já existem, não faz nada além de garantir que os dados de fundo estão atualizados (feito pelo carregarConfiguracoesTratar())
        // Não é necessário atualizar o label dos botões dinamicamente aqui, pois eles não são configuráveis.
        // A ação onClick já usará o customTextModels atualizado.
    }

    function removerElementosCriados() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Removendo botões auxiliares Neuron.`, "color: red;");
        document.getElementById('neuronBtnImportarCidadao')?.remove();
        document.getElementById('neuronBtnTextoProrrogacao')?.remove();
    }

    async function verificarEstadoAtualEAgir() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Verificando estado atual e agindo...`, "color: blue;");
        await carregarConfiguracoesTratar();

        if (currentMasterEnabled && currentScriptEnabled) {
            // Espera os elementos da página onde os botões serão inseridos
            await new Promise(resolve => {
                const checkElements = () => {
                    if (document.querySelector(TARGET_DIV_SELECTOR) && document.getElementById(INPUT_CONTRIBUICAO_ID)) {
                        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos alvo da página encontrados.`);
                        resolve();
                    } else {
                        setTimeout(checkElements, 300);
                    }
                };
                checkElements();
            });
            criarOuAtualizarUI();
            configurarObserverDaPagina(); // Configura observer se a UI deve estar ativa
        } else {
            removerElementosCriados();
            desconectarObserverDaPagina(); // Desconecta observer se desabilitado
        }
    }

    function configurarObserverDaPagina() {
        if (uiMutationObserver) { // Se já existe, não precisa recriar
            return;
        }

        const panelAlvo = document.querySelector(TARGET_DIV_SELECTOR);
        if (!panelAlvo) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Painel alvo para observer não encontrado. Observer não configurado.`);
            return;
        }

        uiMutationObserver = new MutationObserver((mutations) => {
            // Verifica se os elementos âncora ainda existem
            const currentPanel = document.querySelector(TARGET_DIV_SELECTOR);
            const currentContribInput = document.getElementById(INPUT_CONTRIBUICAO_ID);

            if (currentMasterEnabled && currentScriptEnabled) {
                // Se os elementos âncora apareceram e os botões não existem, cria
                if (currentPanel && currentContribInput && (!document.getElementById('neuronBtnImportarCidadao') || !document.getElementById('neuronBtnTextoProrrogacao'))) {
                    console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Elementos âncora encontrados, recriando botões (possível postback).`, "color: orange;");
                    criarOuAtualizarUI(); 
                } else if (!currentPanel || !currentContribInput) {
                    // Se os elementos âncora desapareceram, remove a UI e desconecta o observer
                    console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Painel alvo ou input de contribuição desapareceram. Removendo UI.`);
                    removerElementosCriados();
                    desconectarObserverDaPagina();
                }
            } else {
                // Se o script não deve estar ativo, remove a UI
                removerElementosCriados();
            }
        });
        // Observa o painel alvo, ou o body como fallback
        const observeTarget = panelAlvo || document.body;
        uiMutationObserver.observe(observeTarget, { childList: true, subtree: true, attributes: true }); // Adicionado attributes para capturar mudanças de display
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Observer da página configurado para ${observeTarget.tagName}#${observeTarget.id || observeTarget.className}.`, "color: green;");
    }

    function desconectarObserverDaPagina() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Observer da página DESCONECTADO.`, "color: red;");
        }
    }

    // Listener para mudanças nas configurações globais ou nos modelos de texto
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && (changes[CONFIG_STORAGE_KEY_TRATAR] || changes[CUSTOM_TEXT_MODELS_STORAGE_KEY])) {
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Configuração ou modelos de texto alterados. Reavaliando...`, "color: orange; font-weight: bold;");
            await verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Inicializando script...`, "color: purple; font-weight: bold;");
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            }
        });
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Documento carregado/interativo.`);
        await verificarEstadoAtualEAgir();
    }

    if (window.location.href.includes('/Manifestacao/TratarManifestacao.aspx')) {
        init();
    }
})();