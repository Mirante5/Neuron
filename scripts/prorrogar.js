// Neuron 0.1.5 β/scripts/prorrogar.js - LÓGICA DE INSERÇÃO AJUSTADA
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'prorrogar';
    const SCRIPT_ID_STORAGE_KEY = 'scriptEnabled_prorrogar';

    const DROPDOWN_ID_NEURON = 'neuronDropdownProrrogar';
    const LABEL_ID_NEURON_CLASS = 'neuronLabelProrrogar'; // Usaremos como classe para o label Neuron
    // ID do select original da página que NÃO queremos mover
    const ID_SELECT_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoProrrogacao';
    const ID_INPUT_JUSTIFICATIVA_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaProrrogacao';
    const URL_ALVO_DO_SCRIPT = 'ProrrogarManifestacao.aspx';
    const STYLE_CLASS_NEURON = `neuron-${SCRIPT_NOME_PARA_LOG}-styles`;

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textConfig = { Prorrogacao: {} };
    
    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;

    let neuronDropdownElement = null;
    let neuronLabelElement = null;

    // --- Carregamento de Configuração JSON ---
    async function carregarTextConfigNeuron() { //
        try {
            const storageResult = await chrome.storage.local.get('userTextJson');
            if (storageResult.userTextJson && typeof storageResult.userTextJson === 'string') {
                const parsedConfig = JSON.parse(storageResult.userTextJson);
                textConfig = parsedConfig;
            } else {
                const response = await fetch(chrome.runtime.getURL('config/text.json')); //
                if (!response.ok) throw new Error(`Erro HTTP ao carregar padrão: ${response.status}`);
                textConfig = await response.json(); //
            }
            if (!textConfig.Prorrogacao) {
                textConfig.Prorrogacao = {};
                console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Prorrogacao' não encontrada.`);
            }
        } catch (e) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar text.json:`, e);
            textConfig = { Prorrogacao: { "Erro": "Erro ao carregar justificativas." } };
        }
    }

    // --- Estilos ---
    function inserirEstilosNeuron() { //
        if (document.querySelector('.' + STYLE_CLASS_NEURON)) return;
        const style = document.createElement('style');
        style.className = STYLE_CLASS_NEURON;
        style.textContent = `
            .${LABEL_ID_NEURON_CLASS} { display: block; margin-top: 20px; margin-bottom: 5px; font-weight: bold; color: #333; }
            #${DROPDOWN_ID_NEURON} { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; margin-bottom: 10px; }
        `;
        document.head.appendChild(style);
    }
    function removerEstilosNeuron() { //
        document.querySelector('.' + STYLE_CLASS_NEURON)?.remove();
    }

    // --- Criação e Remoção de UI ---
    function removerElementosCriadosProrrogar() { //
        neuronDropdownElement?.remove();
        neuronLabelElement?.remove();
        neuronDropdownElement = null;
        neuronLabelElement = null;
    }

    function criarOuAtualizarUIProrrogar() {
        if (!currentMasterEnabled || !currentScriptEnabled || !window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            removerElementosCriadosProrrogar();
            return;
        }

        // Elemento de referência: o select original da página.
        const originalSelectMotivo = document.getElementById(ID_SELECT_MOTIVO_ORIGINAL);
        const justificativaInputAlvo = document.getElementById(ID_INPUT_JUSTIFICATIVA_PAGINA);

        if (!originalSelectMotivo || !justificativaInputAlvo) {
            // console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Select de motivo original ou campo de justificativa não encontrado. UI Neuron não será criada.`);
            return; 
        }
        
        if (neuronDropdownElement) { // Se já existe, remove para recriar (útil se JSON mudou)
            removerElementosCriadosProrrogar();
        }
        // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Criando/Atualizando UI de Prorrogação.`);

        const prorrogacoesConfig = textConfig?.Prorrogacao || {};

        neuronLabelElement = document.createElement('label');
        neuronLabelElement.setAttribute('for', DROPDOWN_ID_NEURON);
        neuronLabelElement.textContent = 'Neuron - Justificativa Pré-definida:';
        neuronLabelElement.className = LABEL_ID_NEURON_CLASS;

        neuronDropdownElement = document.createElement('select');
        neuronDropdownElement.id = DROPDOWN_ID_NEURON;
        // neuronDropdownElement.className = 'form-control'; // Descomente se quiser estilo Bootstrap

        const optDefault = document.createElement('option');
        optDefault.value = '';
        optDefault.textContent = 'Selecione uma justificativa...';
        neuronDropdownElement.appendChild(optDefault);

        Object.entries(prorrogacoesConfig).forEach(([titulo, texto]) => {
            const opt = document.createElement('option');
            opt.value = texto; 
            opt.textContent = titulo;
            neuronDropdownElement.appendChild(opt);
        });

        neuronDropdownElement.addEventListener('change', function () {
            if (justificativaInputAlvo) justificativaInputAlvo.value = this.value || '';
        });

        // Lógica de Inserção: Inserir DEPOIS do select original
        const parentOfOriginalSelect = originalSelectMotivo.parentNode;
        if (parentOfOriginalSelect) {
            // Insere o label do Neuron depois do select original
            // Se o select original tem um próximo irmão, o label Neuron vai antes desse irmão.
            // Senão (se o select for o último), o label Neuron é anexado ao final.
            parentOfOriginalSelect.insertBefore(neuronLabelElement, neuronDropdownElement.nextSibling);
            // Insere o dropdown do Neuron depois do label Neuron que acabamos de inserir
            parentOfOriginalSelect.insertBefore(neuronDropdownElement, neuronLabelElement.nextSibling);
            
            inserirEstilosNeuron();
        } else {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): ParentNode do select de motivo original não encontrado.`);
            neuronLabelElement?.remove(); // Limpa se não conseguiu inserir
            neuronDropdownElement?.remove();
            neuronLabelElement = null;
            neuronDropdownElement = null;
        }
    }

    // --- Controle da Extensão e Observer ---
    async function verificarEstadoAtualEAgirProrrogar() { /* ... (código da função da resposta anterior, sem alterações na lógica interna principal) ... */ //
        const settings = await chrome.storage.local.get(['masterEnableNeuron', SCRIPT_ID_STORAGE_KEY, 'userTextJson']);
        currentMasterEnabled = settings.masterEnableNeuron !== false;
        currentScriptEnabled = settings[SCRIPT_ID_STORAGE_KEY] !== false;

        await carregarTextConfigNeuron(); 

        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            criarOuAtualizarUIProrrogar(); 
            if (!observerConfiguradoGlobal) { 
                configurarObserverPrincipalProrrogar();
            }
        } else {
            removerElementosCriadosProrrogar();
            removerEstilosNeuron(); 
            desconectarObserverPrincipalProrrogar(); 
        }
    }

    function configurarObserverPrincipalProrrogar() { /* ... (código da função da resposta anterior, sem alterações) ... */ //
        if (observerConfiguradoGlobal && uiMutationObserver) return; 

        uiMutationObserver = new MutationObserver(() => {
            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                if (!document.getElementById(DROPDOWN_ID_NEURON)) { 
                    criarOuAtualizarUIProrrogar();
                }
            } else {
                removerElementosCriadosProrrogar();
            }
        });

        const awaitBodyInterval = setInterval(() => { 
            if (document.body) {
                clearInterval(awaitBodyInterval);
                uiMutationObserver.observe(document.body, { childList: true, subtree: true });
                observerConfiguradoGlobal = true;
            }
        }, 100);
    }

    function desconectarObserverPrincipalProrrogar() { /* ... (código da função da resposta anterior, sem alterações) ... */ //
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null; 
            observerConfiguradoGlobal = false;
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => { //
        if (namespace === 'local') {
            let precisaReavaliar = false;
            if (changes.masterEnableNeuron || changes[SCRIPT_ID_STORAGE_KEY] || changes.userTextJson) {
                precisaReavaliar = true;
            }
            if (precisaReavaliar) {
                verificarEstadoAtualEAgirProrrogar();
            }
        }
    });

    async function initProrrogar() { //
        await new Promise(resolve => { 
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        await verificarEstadoAtualEAgirProrrogar();
    }

    if (window.location.href.includes(URL_ALVO_DO_SCRIPT)) { //
        initProrrogar();
    }
})();