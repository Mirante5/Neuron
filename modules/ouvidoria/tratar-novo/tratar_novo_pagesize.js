(function() {
    'use strict';

    const SCRIPT_ID = 'tratarTriar';
    const CONFIG_KEY = 'neuronUserConfig';
    const ID_CAMPO_TAMANHO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_txtTamanhoPagina';
    const ID_BOTAO_CONFIRMAR = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_btnAlterarTamanhoPagina';

    let observer = null;
    let debounceTimer;

    async function isScriptAtivo() {
        if (!chrome.runtime?.id) return false;
        try {
            const result = await chrome.storage.local.get(CONFIG_KEY);
            const config = result[CONFIG_KEY] || {};
            return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        } catch (error) {
            console.warn(`%cNeuron (${SCRIPT_ID}): Não foi possível ler as configurações.`, "color: goldenrod;", error.message);
            return false;
        }
    }

    async function verificarEAtualizarTamanho() {
        if (!await isScriptAtivo()) return;

        const result = await chrome.storage.local.get(CONFIG_KEY);
        const config = result[CONFIG_KEY] || {};
        const itensPorPaginaDesejado = String(config.generalSettings?.qtdItensTratarTriar || '50');
        
        const campoTamanho = document.getElementById(ID_CAMPO_TAMANHO);
        const botaoConfirmar = document.getElementById(ID_BOTAO_CONFIRMAR);

        if (!campoTamanho || !botaoConfirmar || campoTamanho.value === itensPorPaginaDesejado) {
            return;
        }

        console.log(`%cNeuron (${SCRIPT_ID}): Corrigindo paginação para ${itensPorPaginaDesejado}...`, "color: orange;");
        campoTamanho.value = itensPorPaginaDesejado;
        botaoConfirmar.click();
    }

    async function gerenciarEstado() {
        if (await isScriptAtivo()) {
            if (observer) return;
            
            const onPageChange = () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(verificarEAtualizarTamanho, 300);
            };

            observer = new MutationObserver(onPageChange);
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
                onPageChange();
            }
        } else {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (!chrome.runtime?.id) return;
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            gerenciarEstado();
        }
    });

    gerenciarEstado();
})();