// Neuron 0.1.5 β/scripts/arquivar.js - REFATORADO COM JSON DINÂMICO
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'arquivar';
    const SCRIPT_ID_STORAGE_KEY = 'scriptEnabled_arquivar'; //

    // IDs e Seletores da página e do script
    const DROPDOWN_ID_NEURON = 'neuronDropdownArquivar'; // Novo ID padronizado
    const LABEL_CLASS_NEURON = 'neuronLabelArquivar';   // Classe para o label Neuron
    const LABEL_FOR_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoArquivamento'; // Âncora
    const INPUT_JUSTIFICATIVA_ID_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaArquivamento'; //
    const NUMERO_MANIFESTACAO_ID_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero'; //
    const URL_ALVO_DO_SCRIPT = 'ArquivarManifestacao.aspx';
    const STYLE_CLASS_NEURON = `neuron-${SCRIPT_NOME_PARA_LOG}-styles`;

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textConfig = { Arquivar: {} }; // Configuração carregada

    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;

    // Referências aos elementos da UI criados pelo Neuron
    let neuronDropdownElement = null;
    let neuronLabelElement = null;

    // --- Carregamento de Configuração JSON ---
    async function carregarTextConfigNeuron() {
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
            if (!textConfig.Arquivar) {
                textConfig.Arquivar = {};
                console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Arquivar' não encontrada no text.json.`);
            }
        } catch (e) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar text.json:`, e);
            textConfig = { Arquivar: { "Erro": "Erro ao carregar justificativas de arquivamento." } }; // Fallback
        }
    }

    // --- Estilos ---
    function inserirEstilosNeuron() { //
        if (document.querySelector('.' + STYLE_CLASS_NEURON)) return;
        const style = document.createElement('style');
        style.className = STYLE_CLASS_NEURON;
        // Estilos adaptados do original, usando classes e IDs padronizados
        style.textContent = `
            .${LABEL_CLASS_NEURON} { display: block; margin-top: 15px; margin-bottom: 5px; font-weight: bold; color: #333; }
            #${DROPDOWN_ID_NEURON} { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; margin-bottom: 10px; }
        `;
        document.head.appendChild(style);
    }
    function removerEstilosNeuron() {
        document.querySelector('.' + STYLE_CLASS_NEURON)?.remove();
    }

    // --- Criação e Remoção de UI ---
    function removerElementosCriadosArquivar() { //
        neuronDropdownElement?.remove();
        neuronLabelElement?.remove();
        neuronDropdownElement = null;
        neuronLabelElement = null;
        // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): UI de Arquivamento removida.`);
    }

    function criarOuAtualizarUIArquivar() { // Adaptado de criarOuAtualizarDropdown
        if (!currentMasterEnabled || !currentScriptEnabled || !window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            removerElementosCriadosArquivar();
            return;
        }

        const motivoArquivamentoLabelAncora = document.querySelector(`label[for="${LABEL_FOR_MOTIVO_ORIGINAL}"]`);
        const justificativaInputAlvo = document.getElementById(INPUT_JUSTIFICATIVA_ID_PAGINA);
        const numeroManifestacaoElement = document.getElementById(NUMERO_MANIFESTACAO_ID_PAGINA);

        if (!motivoArquivamentoLabelAncora || !justificativaInputAlvo || !numeroManifestacaoElement) {
            // console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos âncora da página não encontrados. UI não será criada.`);
            return;
        }
        
        if (neuronDropdownElement) { // Remove para recriar se JSON mudou
            removerElementosCriadosArquivar();
        }
        // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Criando/Atualizando UI de Arquivamento.`);

        const numeroManifestacao = numeroManifestacaoElement.innerText.trim() || '{NUP_NAO_ENCONTRADO}';
        const arquivarConfig = textConfig?.Arquivar || {};

        neuronLabelElement = document.createElement('label');
        neuronLabelElement.setAttribute('for', DROPDOWN_ID_NEURON);
        neuronLabelElement.textContent = 'Neuron - Justificativa Pré-definida:';
        neuronLabelElement.className = LABEL_CLASS_NEURON;

        neuronDropdownElement = document.createElement('select');
        neuronDropdownElement.id = DROPDOWN_ID_NEURON;
        // neuronDropdownElement.className = 'form-control'; // Se quiser estilo Bootstrap

        const optDefault = document.createElement('option');
        optDefault.value = '';
        optDefault.textContent = 'Selecione uma justificativa...';
        neuronDropdownElement.appendChild(optDefault);

        Object.entries(arquivarConfig).forEach(([key, textoTemplate]) => {
            const option = document.createElement('option');
            // Substitui placeholders no template. O original usava {NUP}|{datalimite}
            // O text.json para Arquivar/Duplicidade usa (NUP)
            // Vamos usar uma regex mais genérica ou placeholders consistentes.
            // Assumindo que o placeholder no JSON é {NUP_MANIFESTACAO} para o número.
            // O text.json atual usa (NUP) para Duplicidade e {datalimite} para prorrogação.
            // Para arquivamento, não há placeholder dinâmico nos textos padrão, exceto o NUP em "Duplicidade".
            // Vamos ajustar para substituir (NUP) se for o caso.
            let textoFinalOpcao = textoTemplate;
            if (typeof textoTemplate === 'string') { //
                 textoFinalOpcao = textoTemplate.replace(/\(NUP\)/g, `(${numeroManifestacao})`); //
                 // Adicione outros placeholders se necessário, ex: .replace(/{PLACEHOLDER}/g, valor)
            }
            option.value = textoFinalOpcao; 
            option.textContent = key; // Nome da justificativa
            neuronDropdownElement.appendChild(option);
        });

        neuronDropdownElement.addEventListener('change', function () {
            if(justificativaInputAlvo) justificativaInputAlvo.value = this.value || '';
        });

        // Insere após o label original do motivo do arquivamento
        const parentOfAncora = motivoArquivamentoLabelAncora.parentNode;
        const nextSiblingOfAncoraOriginalControl = motivoArquivamentoLabelAncora.nextElementSibling?.nextElementSibling; // Tenta pular o select original

        if (parentOfAncora) {
            if (nextSiblingOfAncoraOriginalControl) {
                 parentOfAncora.insertBefore(neuronLabelElement,neuronDropdownElement.nextSibling);
                 parentOfAncora.insertBefore(neuronDropdownElement,neuronLabelElement.nextSibling );
            } else { // Se não houver próximo após o select original, anexa ao final do pai do label
                 parentOfAncora.appendChild(neuronLabelElement);
                 parentOfAncora.appendChild(neuronDropdownElement);
            }
        } else {
             console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): ParentNode do label âncora não encontrado.`);
             neuronLabelElement?.remove(); neuronDropdownElement?.remove(); // Limpa
             return;
        }
        inserirEstilosNeuron();
    }

    // --- Controle da Extensão e Observer Principal ---
    async function verificarEstadoAtualEAgirArquivar() {
        const settings = await chrome.storage.local.get(['masterEnableNeuron', SCRIPT_ID_STORAGE_KEY, 'userTextJson']);
        currentMasterEnabled = settings.masterEnableNeuron !== false;
        currentScriptEnabled = settings[SCRIPT_ID_STORAGE_KEY] !== false;

        await carregarTextConfigNeuron();

        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            criarOuAtualizarUIArquivar();
            if (!observerConfiguradoGlobal) {
                configurarObserverPrincipalArquivar();
            }
        } else {
            removerElementosCriadosArquivar();
            removerEstilosNeuron();
            desconectarObserverPrincipalArquivar();
        }
    }

    function configurarObserverPrincipalArquivar() {
        if (observerConfiguradoGlobal && uiMutationObserver) return;

        uiMutationObserver = new MutationObserver(() => {
            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                if (!document.getElementById(DROPDOWN_ID_NEURON)) {
                    criarOuAtualizarUIArquivar();
                }
            } else {
                removerElementosCriadosArquivar();
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

    function desconectarObserverPrincipalArquivar() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            observerConfiguradoGlobal = false;
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.masterEnableNeuron || changes[SCRIPT_ID_STORAGE_KEY] || changes.userTextJson) {
                verificarEstadoAtualEAgirArquivar();
            }
        }
    });

    async function initArquivar() {
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        await verificarEstadoAtualEAgirArquivar();
    }

    if (window.location.href.includes(URL_ALVO_DO_SCRIPT)) { //
        initArquivar();
    }
})();