/**
 * @file prorrogar.js
 * @version 3.0 (IDs Corretos do Utilizador e Lógica Unificada)
 * @description Injeta a UI na página "Prorrogar Prazo", utilizando os IDs corretos e a configuração centralizada.
 */

(async function () {
    'use strict';

    // --- Constantes de Configuração e Metadados ---
    const SCRIPT_ID = 'prorrogar';
    const CONFIG_KEY = 'neuronUserConfig';

    // --- Constantes de Seletores do DOM (USANDO OS IDs DO SEU CÓDIGO) ---
    const DROPDOWN_ID_NEURON = 'neuronDropdownProrrogar';
    const MOTIVO_DROPDOWN_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoProrrogacao';
    const JUSTIFICATIVA_TEXTAREA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaProrrogacao';

    // --- Variáveis de Estado ---
    let config = {};
    let uiMutationObserver = null;

    /**
     * Carrega a configuração unificada diretamente do storage.
     */
    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY];
        console.log(`%cNeuron (${SCRIPT_ID}): Configurações carregadas.`, "color: blue; font-weight: bold;");
    }

    function isScriptAtivo() {
        return config.masterEnableNeuron && config.featureSettings?.[SCRIPT_ID]?.enabled;
    }

    function criarOuAtualizarUI() {
        // Usa o dropdown de motivo correto como ponto de ancoragem.
        const motivoAncora = document.getElementById(MOTIVO_DROPDOWN_ID);
        if (!motivoAncora) return;

        if (document.getElementById(DROPDOWN_ID_NEURON)) return;
        
        removerElementosCriados();

        const container = document.createElement('div');
        container.className = 'form-group neuron-prorrogar-container';
        
        const label = document.createElement('label');
        label.htmlFor = DROPDOWN_ID_NEURON;
        label.textContent = 'Modelos de Justificativa (Neuron):';
        
        const dropdown = document.createElement('select');
        dropdown.id = DROPDOWN_ID_NEURON;
        dropdown.className = 'form-control';
        
        container.appendChild(label);
        container.appendChild(dropdown);

        dropdown.innerHTML = '<option value="">Selecione um modelo...</option>';
        
        const modelos = config.textModels?.Prorrogar || { "Erro": "Modelos não carregados." };

        for (const key in modelos) {
            const option = document.createElement('option');
            option.value = modelos[key];
            option.textContent = key;
            dropdown.appendChild(option);
        }

        dropdown.addEventListener('change', (e) => {
            const justificativaInput = document.getElementById(JUSTIFICATIVA_TEXTAREA_ID);
            if (justificativaInput) {
                justificativaInput.value = e.target.value;
            }
        });
        
        // Insere a nossa UI logo após o grupo de formulário que contém o dropdown de motivo.
        motivoAncora.closest('.form-group').insertAdjacentElement('afterend', container);
        console.log(`%cNeuron (${SCRIPT_ID}): UI de prorrogação criada com sucesso.`, "color: green;");
    }

    function removerElementosCriados() {
        document.querySelector('.neuron-prorrogar-container')?.remove();
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();
        if (isScriptAtivo()) {
            criarOuAtualizarUI();
            configurarObserverDaPagina();
        } else {
            removerElementosCriados();
            desconectarObserverDaPagina();
        }
    }

    function configurarObserverDaPagina() {
        if (uiMutationObserver) return;
        
        uiMutationObserver = new MutationObserver(() => {
            if (isScriptAtivo()) criarOuAtualizarUI();
            else removerElementosCriados();
        });
        
        uiMutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    function desconectarObserverDaPagina() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        await new Promise(resolve => {
            if (document.readyState !== 'loading') resolve();
            else window.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
        verificarEstadoAtualEAgir();
    }
    
    init();
})();