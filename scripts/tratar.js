// Neuron/scripts/tratar.js - CSS Externalizado
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tratar';
    const SCRIPT_ID = 'tratar';
    const CONFIG_STORAGE_KEY_TRATAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_TRATAR = 'config/config.json';

    const TARGET_DIV_SELECTOR = '#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel3';
    const INPUT_CONTRIBUICAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtContribuicao';
    const BTN_CLASS_CIDADAO = 'neuron-btn-cidadao'; // Usada pelo CSS externo
    const BTN_CLASS_PRORROGACAO_TEXTO = 'neuron-btn-prorrogacao-texto'; // Usada pelo CSS externo

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textModelsTratar = {};

    let uiMutationObserver = null;

    async function carregarConfiguracoesTratar() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Carregando configurações...`, "color: blue; font-weight: bold;");
        const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY_TRATAR);
        let fullConfig = {};

        if (result[CONFIG_STORAGE_KEY_TRATAR] && typeof result[CONFIG_STORAGE_KEY_TRATAR] === 'object') {
            fullConfig = result[CONFIG_STORAGE_KEY_TRATAR];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_TRATAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_TRATAR}:`, e);
                fullConfig = { masterEnableNeuron: false, featureSettings: {}, textModels: { mensagens: {} } };
            }
        }
        
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        textModelsTratar = fullConfig.textModels || { mensagens: {} };

        if (!textModelsTratar.mensagens?.prorrogacao) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Texto de prorrogação (mensagens.prorrogacao) não encontrado.`);
        }
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configurações carregadas. Master: ${currentMasterEnabled}, Script: ${currentScriptEnabled}`);
    }

    function criarBotaoAuxiliar({ id, label, classes = [], onClick }) { // Removido 'style = {}' dos parâmetros
        const btn = document.createElement('input');
        btn.type = 'submit';
        btn.id = id;
        btn.value = label;
        // Adiciona classes Bootstrap e as classes personalizadas para estilização via CSS externo
        btn.classList.add('btn', 'btn-sm', 'btn-primary', ...classes); 
        
        // REMOVIDO: Object.assign(btn.style, { marginLeft: '2px', marginTop: '5px', ...style });
        // REMOVIDO: Listeners de mouseover/mouseout para backgroundColor
        // btn.addEventListener('mouseover', () => btn.style.backgroundColor = '#015298');
        // btn.addEventListener('mouseout', () => btn.style.backgroundColor = '#337ab7');
        
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
        const textoBase = textModelsTratar.mensagens?.prorrogacao || "Modelo de prorrogação não encontrado.";
        const textoFinal = textoBase.replace('{datalimite}', prazo);
        const field = document.getElementById(INPUT_CONTRIBUICAO_ID);
        if (field) field.value = textoFinal;
    }

    function criarOuAtualizarUI() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Tentando criar ou atualizar UI...`, "color: green;");
        if (!currentMasterEnabled || !currentScriptEnabled) {
            removerElementosCriados(); // Garante que, se estava ativo e foi desativado, os botões são removidos.
            return;
        }

        const panel = document.querySelector(TARGET_DIV_SELECTOR);
        const contribInput = document.getElementById(INPUT_CONTRIBUICAO_ID); // Verifica se o campo principal existe
        
        if (!panel || !contribInput) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Painel alvo ('${TARGET_DIV_SELECTOR}') ou campo de contribuição não encontrado. UI não será criada.`);
            return;
        }
        
        // Remove botões antigos antes de recriar para evitar duplicatas
        removerElementosCriados(); 

        const btnImportar = criarBotaoAuxiliar({
            id: 'neuronBtnImportarCidadao',
            label: 'Importar dados do cidadão',
            classes: [BTN_CLASS_CIDADAO], // neuron-btn-cidadao
            onClick: importarDadosCidadaoAction
        });

        const btnTextoProrrogacao = criarBotaoAuxiliar({
            id: 'neuronBtnTextoProrrogacao',
            label: 'Texto de Prorrogação (Neuron)',
            classes: [BTN_CLASS_PRORROGACAO_TEXTO], // neuron-btn-prorrogacao-texto
            onClick: inserirTextoProrrogacaoAction
        });
        
        panel.appendChild(btnImportar);
        panel.appendChild(btnTextoProrrogacao);
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Botões auxiliares adicionados.`, "color: green;");
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
            // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Observer já configurado.`);
            return;
        }
        
        const painelAlvo = document.querySelector(TARGET_DIV_SELECTOR);
        if(!painelAlvo) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Painel alvo para observer não encontrado. Observer não configurado.`);
            return;
        }

        uiMutationObserver = new MutationObserver(() => {
            // Verifica se os botões ainda existem. Se não, e a feature estiver ativa, recria.
            // Isso ajuda caso a página faça um postback ou atualize a área dinamicamente.
            if (currentMasterEnabled && currentScriptEnabled) {
                const panelAindaExiste = !!document.querySelector(TARGET_DIV_SELECTOR);
                if (panelAindaExiste) { // Se o painel onde os botões são inseridos ainda existe
                    if (!document.getElementById('neuronBtnImportarCidadao') || !document.getElementById('neuronBtnTextoProrrogacao')) {
                        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Botões não encontrados (possivelmente removidos por update da página). Recriando...`, "color: orange;");
                        criarOuAtualizarUI(); // Recria se foram removidos
                    }
                } else { // Se o próprio painel alvo sumiu, não há onde inserir. Desconecta o observer.
                    console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Painel alvo desapareceu. Desconectando observer.`);
                    desconectarObserverDaPagina();
                }
            }
        });
        // Observa o corpo do documento para mudanças na árvore de elementos.
        // Se o TARGET_DIV_SELECTOR for muito específico e estável, poderia observar ele.
        // Mas observar o body é mais genérico para capturar recriações de painéis.
        uiMutationObserver.observe(document.body, { childList: true, subtree: true });
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Observer da página configurado.`, "color: green;");
    }

    function desconectarObserverDaPagina() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Observer da página DESCONECTADO.`, "color: red;");
        }
    }

    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_TRATAR]) {
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Configuração alterada via storage.onChanged. Reavaliando...`, "color: orange; font-weight: bold;");
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