/**
 * @file tratar.js
 * @version 2.1 (Seletores no Topo)
 * @description Injeta a UI na página "Tratar Manifestação" e utiliza a estrutura de configuração centralizada.
 */

(async function () {
    'use strict';

    // --- Constantes de Configuração e Metadados ---
    const SCRIPT_ID = 'tratar';
    const CONFIG_KEY = 'neuronUserConfig';

    // --- Constantes de Seletores do DOM ---
    const TARGET_DIV_SELECTOR = '#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel3';
    const INPUT_CONTRIBUICAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtContribuicao';
    const NOME_CIDADAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNomePF';
    const TIPO_DOC_CIDADAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTipoDocPF';
    const NUM_DOC_CIDADAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumeroDocPF';
    const EMAIL_CIDADAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtEmailPF';
    const PRAZO_ATENDIMENTO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento';

    // --- Variáveis de Estado ---
    let config = {}; // Armazena a configuração completa.
    let uiMutationObserver = null;

    /**
     * Carrega a configuração unificada diretamente do storage.
     */
    async function carregarConfiguracoesTratar() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY];
        console.log(`%cNeuron (${SCRIPT_ID}): Configurações carregadas.`, "color: blue; font-weight: bold;");
    }

    function isScriptAtivo() {
        return config.masterEnableNeuron && config.featureSettings?.[SCRIPT_ID]?.enabled;
    }

    function criarBotaoAuxiliar({ id, label, onClick }) {
        const btn = document.createElement('input');
        btn.type = 'submit';
        btn.id = id;
        btn.value = label;
        btn.classList.add('btn', 'btn-sm', 'btn-primary');
        btn.addEventListener('click', e => {
            e.preventDefault();
            onClick();
        });
        return btn;
    }

    function importarDadosCidadaoAction() {
        const tipoDoc = document.getElementById(TIPO_DOC_CIDADAO_ID)?.textContent.trim() || '';
        const nome = document.getElementById(NOME_CIDADAO_ID)?.textContent.trim() || '';
        const documento = document.getElementById(NUM_DOC_CIDADAO_ID)?.textContent.trim() || '';
        const email = document.getElementById(EMAIL_CIDADAO_ID)?.textContent.trim() || '';
        const field = document.getElementById(INPUT_CONTRIBUICAO_ID);
        if (field) {
            field.value = `Nome: ${nome}\nDocumento (${tipoDoc}): ${documento}\nEmail: ${email}`;
        }
    }

    function inserirTextoProrrogacaoAction() {
        const prazo = document.getElementById(PRAZO_ATENDIMENTO_ID)?.textContent.trim() || '{PRAZO_NAO_ENCONTRADO}';
        const textoBase = config.textModels?.mensagens?.prorrogacao || "Modelo de prorrogação não encontrado.";
        const textoFinal = textoBase.replace('{datalimite}', prazo);
        const field = document.getElementById(INPUT_CONTRIBUICAO_ID);
        if (field) field.value = textoFinal;
    }

    function criarOuAtualizarUI() {
        const panel = document.querySelector(TARGET_DIV_SELECTOR);
        const contribInput = document.getElementById(INPUT_CONTRIBUICAO_ID);
        if (!panel || !contribInput) return;

        if (document.getElementById('neuronBtnImportarCidadao')) return;
        
        removerElementosCriados();

        const btnImportar = criarBotaoAuxiliar({
            id: 'neuronBtnImportarCidadao',
            label: 'Importar dados do cidadão',
            onClick: importarDadosCidadaoAction
        });

        const btnTextoProrrogacao = criarBotaoAuxiliar({
            id: 'neuronBtnTextoProrrogacao',
            label: 'Texto de Prorrogação (Neuron)',
            onClick: inserirTextoProrrogacaoAction
        });

        panel.appendChild(btnImportar);
        panel.appendChild(btnTextoProrrogacao);
        console.log(`%cNeuron (${SCRIPT_ID}): Botões auxiliares adicionados.`, "color: green;");
    }

    function removerElementosCriados() {
        document.getElementById('neuronBtnImportarCidadao')?.remove();
        document.getElementById('neuronBtnTextoProrrogacao')?.remove();
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoesTratar();

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

        const painelAlvo = document.querySelector(TARGET_DIV_SELECTOR);
        if (!painelAlvo) return;

        uiMutationObserver = new MutationObserver(() => {
            if (isScriptAtivo()) {
                criarOuAtualizarUI();
            } else {
                removerElementosCriados();
            }
        });
        
        uiMutationObserver.observe(painelAlvo, { childList: true, subtree: true });
        console.log(`%cNeuron (${SCRIPT_ID}): Observer da página configurado.`, "color: green;");
    }

    function desconectarObserverDaPagina() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            console.log(`%cNeuron (${SCRIPT_ID}): Observer da página DESCONECTADO.`, "color: red;");
        }
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            console.log(`%cNeuron (${SCRIPT_ID}): Configuração alterada. Reavaliando...`, "color: orange; font-weight: bold;");
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve();
            } else {
                window.addEventListener('DOMContentLoaded', resolve, { once: true });
            }
        });
        verificarEstadoAtualEAgir();
    }

    init();
})();