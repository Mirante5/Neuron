/**
 * @file resposta.js
 * @version 2.0 (Lógica Padronizada com Config Central)
 * @description Módulo para inserir opções de resposta rápida na tela de Resposta,
 * agora integrado ao sistema de configuração central.
 */

(async function () {
    'use strict';

    // --- Constantes ---
    const SCRIPT_ID = 'resposta';
    const CONFIG_KEY = 'neuronUserConfig';
    
    // IDs dos elementos da página original
    const ID_TIPO_RESPOSTA_SELECT = 'slTipoResposta';
    const ID_TIPO_RESPOSTA_LIST = 'slTipoResposta-list';
    const ID_TEXTAREA_RESPOSTA = 'txtResposta-textarea';
    const ID_INPUT_RESPONSAVEL = 'responsavelResposta-input';
    
    // IDs dos elementos criados pelo Neuron
    const ID_NEURON_DROPDOWN_CONTAINER = 'neuron-novoDropdown';
    const ID_NEURON_DROPDOWN_INPUT = 'neuron-novoDropdown-input';
    const ID_NEURON_DROPDOWN_LIST = 'neuron-novoDropdown-list';

    // --- Variáveis de Estado ---
    let config = {};
    let isFeatureActive = false;

    // --- Lógica de Configuração e Inicialização ---
    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY] || {};
        console.log(`%cNeuron (${SCRIPT_ID}): Configurações carregadas.`, "color: blue; font-weight: bold;");
    }

    function isScriptAtivo() {
        if (!config || typeof config !== 'object') return false;
        return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
    }

    // --- Lógica da UI ---
    function criarUI() {
        if (document.getElementById(ID_NEURON_DROPDOWN_CONTAINER)) return;

        const containerOriginal = document.getElementById(ID_TIPO_RESPOSTA_SELECT);
        if (!containerOriginal) return;
        
        const novoDropdownHTML = `
            <div class="br-select mb-3" id="${ID_NEURON_DROPDOWN_CONTAINER}">
                <label for="${ID_NEURON_DROPDOWN_INPUT}">Opções de Resposta (Neuron)</label>
                <div class="br-input has-icon">
                    <input id="${ID_NEURON_DROPDOWN_INPUT}" type="text" placeholder="Clique para selecionar..." readonly disabled autocomplete="off">
                    <button class="br-button circle" type="button" aria-label="Exibir lista" tabindex="-1">
                        <i class="fas fa-angle-down" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="br-list" id="${ID_NEURON_DROPDOWN_LIST}" tabindex="-1" style="display: none;"></div>
            </div>`;
        
        containerOriginal.insertAdjacentHTML('afterend', novoDropdownHTML);
        console.log(`%cNeuron (${SCRIPT_ID}): UI de resposta criada.`, "color: green;");
    }

    function removerUI() {
        document.getElementById(ID_NEURON_DROPDOWN_CONTAINER)?.remove();
    }

    function renderizarOpcoesDeResposta(tipoResposta) {
        const dropdownList = document.getElementById(ID_NEURON_DROPDOWN_LIST);
        const dropdownInput = document.getElementById(ID_NEURON_DROPDOWN_INPUT);
        const txtResposta = document.getElementById(ID_TEXTAREA_RESPOSTA);
        const inputResponsavel = document.getElementById(ID_INPUT_RESPONSAVEL);
        
        if (!dropdownList || !dropdownInput || !txtResposta || !inputResponsavel) return;

        // Limpa e desabilita o campo por padrão
        dropdownInput.value = '';
        txtResposta.value = '';
        inputResponsavel.value = '';
        dropdownList.innerHTML = '';
        dropdownInput.setAttribute('disabled', 'disabled');

        const optionsData = config.defaultResponses?.[tipoResposta]?.novoDropdownOptions;

        if (optionsData && Array.isArray(optionsData) && optionsData.length > 0) {
            dropdownInput.removeAttribute('disabled');
            optionsData.forEach((option, index) => {
                const item = document.createElement('div');
                item.className = 'br-item';
                item.setAttribute('tabindex', '-1');
                item.innerHTML = `
                    <div class="br-radio">
                        <input id="neuron-novoDropdown-item-${index}" type="radio" value="${option.text}">
                        <label for="neuron-novoDropdown-item-${index}">${option.text}</label>
                    </div>`;
                item.addEventListener('click', () => {
                    dropdownInput.value = option.text || '';
                    txtResposta.value = option.conteudoTextarea || '';
                    inputResponsavel.value = option.responsavel || '';
                    dropdownList.style.display = 'none';
                });
                dropdownList.appendChild(item);
            });
        }
    }
    
    // --- Gerenciamento de Eventos ---
    const handleUiInteraction = (event) => {
        const dropdownList = document.getElementById(ID_NEURON_DROPDOWN_LIST);
        const dropdownInput = document.getElementById(ID_NEURON_DROPDOWN_INPUT);
        const dropdownContainer = document.getElementById(ID_NEURON_DROPDOWN_CONTAINER);

        if (!dropdownList || !dropdownInput || !dropdownContainer) return;

        // Se clicar no input de resposta do Neuron
        if (event.target === dropdownInput && !dropdownInput.hasAttribute('disabled')) {
            const isHidden = dropdownList.style.display !== 'block';
            dropdownList.style.display = isHidden ? 'block' : 'none';
        } 
        // Se clicar fora do container do dropdown do Neuron, fecha a lista
        else if (!dropdownContainer.contains(event.target)) {
            dropdownList.style.display = 'none';
        }
        
        // Se clicar no dropdown de TIPO de resposta original
        const tipoRespostaItem = event.target.closest(`#${ID_TIPO_RESPOSTA_LIST} .br-item`);
        if (tipoRespostaItem) {
            const selectedText = tipoRespostaItem.querySelector('label')?.textContent.trim();
            if (selectedText) {
                renderizarOpcoesDeResposta(selectedText);
            }
        }
    };

    // --- Controle Principal ---
    function ativarFuncionalidade() {
        if (isFeatureActive) return;
        criarUI();
        document.addEventListener('click', handleUiInteraction);
        isFeatureActive = true;
        console.log(`%cNeuron (${SCRIPT_ID}): Funcionalidade ATIVADA.`, "color: green; font-weight: bold;");
    }

    function desativarFuncionalidade() {
        if (!isFeatureActive) return;
        removerUI();
        document.removeEventListener('click', handleUiInteraction);
        isFeatureActive = false;
        console.log(`%cNeuron (${SCRIPT_ID}): Funcionalidade DESATIVADA.`, "color: red; font-weight: bold;");
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();
        if (isScriptAtivo()) {
            ativarFuncionalidade();
        } else {
            desativarFuncionalidade();
        }
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            console.log(`%cNeuron (${SCRIPT_ID}): Configuração alterada. Reavaliando...`, "color: orange; font-weight: bold;");
            verificarEstadoAtualEAgir();
        }
    });

    // Observador para garantir que os elementos originais da página existam antes de iniciar
    const observer = new MutationObserver(() => {
        const tipoRespostaElement = document.getElementById(ID_TIPO_RESPOSTA_SELECT);
        const textAreaElement = document.getElementById(ID_TEXTAREA_RESPOSTA);
        
        if (tipoRespostaElement && textAreaElement) {
            init();
            observer.disconnect(); // Para de observar uma vez que o script foi inicializado
        }
    });

    async function init() {
        observer.disconnect(); // Garante que não haja observadores duplicados
        await verificarEstadoAtualEAgir();
    }

    // Inicia a observação do DOM
    observer.observe(document.body, { childList: true, subtree: true });

})();