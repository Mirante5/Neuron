// Neuron 0.3.1/scripts/tratar.js - CENTRALIZED CONFIG
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tratar';
    const SCRIPT_ID = 'tratar';
    const CONFIG_STORAGE_KEY_TRATAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_TRATAR = 'config/config.json';

    const TARGET_DIV_SELECTOR = '#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel3';
    const INPUT_CONTRIBUICAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtContribuicao';
    const BTN_CLASS_CIDADAO = 'neuron-btn-cidadao';
    const BTN_CLASS_PRORROGACAO_TEXTO = 'neuron-btn-prorrogacao-texto';

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textModelsTratar = {}; // Vai buscar textModels.mensagens.prorrogacao

    let uiMutationObserver = null;

    async function carregarConfiguracoesTratar() {
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
        textModelsTratar = fullConfig.textModels || { mensagens: {} }; // Pega o objeto textModels inteiro

        if (!textModelsTratar.mensagens?.prorrogacao) { // Verifica especificamente o texto de prorrogação
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Texto de prorrogação (mensagens.prorrogacao) não encontrado.`);
        }
    }

    function criarBotaoAuxiliar({ id, label, classes = [], style = {}, onClick }) {
        const btn = document.createElement('input');
        btn.type = 'submit';
        btn.id = id;
        btn.value = label;
        btn.classList.add('btn', 'btn-sm', 'btn-primary', ...classes);
        Object.assign(btn.style, { marginLeft: '2px', marginTop: '5px', ...style });
        btn.addEventListener('mouseover', () => btn.style.backgroundColor = '#015298');
        btn.addEventListener('mouseout', () => btn.style.backgroundColor = '#337ab7');
        btn.addEventListener('click', e => { e.preventDefault(); onClick(); });
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
        const textoBase = textModelsTratar.mensagens?.prorrogacao || "Modelo de prorrogação não encontrado."; // Acessa via textModelsTratar
        const textoFinal = textoBase.replace('{datalimite}', prazo);
        const field = document.getElementById(INPUT_CONTRIBUICAO_ID);
        if (field) field.value = textoFinal;
    }

    function criarOuAtualizarUI() {
        if (!currentMasterEnabled || !currentScriptEnabled) {
            removerElementosCriados();
            return;
        }

        const panel = document.querySelector(TARGET_DIV_SELECTOR);
        const contribInput = document.getElementById(INPUT_CONTRIBUICAO_ID);
        if (!panel || !contribInput) {
            return;
        }
        removerElementosCriados();

        const btnImportar = criarBotaoAuxiliar({
            id: 'neuronBtnImportarCidadao',
            label: 'Importar dados do cidadão',
            classes: [BTN_CLASS_CIDADAO],
            onClick: importarDadosCidadaoAction
        });

        const btnTextoProrrogacao = criarBotaoAuxiliar({
            id: 'neuronBtnTextoProrrogacao',
            label: 'Texto de Prorrogação (Neuron)',
            classes: [BTN_CLASS_PRORROGACAO_TEXTO],
            onClick: inserirTextoProrrogacaoAction
        });
        
        panel.appendChild(btnImportar);
        panel.appendChild(btnTextoProrrogacao);
    }

    function removerElementosCriados() {
        document.getElementById('neuronBtnImportarCidadao')?.remove();
        document.getElementById('neuronBtnTextoProrrogacao')?.remove();
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoesTratar();

        if (currentMasterEnabled && currentScriptEnabled) {
            await new Promise(resolve => {
                const check = () => {
                    if (document.querySelector(TARGET_DIV_SELECTOR) && document.getElementById(INPUT_CONTRIBUICAO_ID)) {
                        resolve();
                    } else {
                        setTimeout(check, 300);
                    }
                };
                check();
            });
            criarOuAtualizarUI();
            configurarObserverDaPagina();
        } else {
            removerElementosCriados();
            desconectarObserverDaPagina();
        }
    }

    function configurarObserverDaPagina() {
        if (uiMutationObserver) uiMutationObserver.disconnect();
        const panelAlvo = document.querySelector(TARGET_DIV_SELECTOR);
        if(!panelAlvo) return;

        uiMutationObserver = new MutationObserver(() => {
            if (currentMasterEnabled && currentScriptEnabled) {
                const panelAindaExiste = document.querySelector(TARGET_DIV_SELECTOR);
                if (panelAindaExiste) {
                    if (!document.getElementById('neuronBtnImportarCidadao') || !document.getElementById('neuronBtnTextoProrrogacao')) {
                        criarOuAtualizarUI();
                    }
                } else {
                    if (uiMutationObserver) uiMutationObserver.disconnect();
                    uiMutationObserver = null;
                }
            }
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
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_TRATAR]) {
            verificarEstadoAtualEAgir();
        }
    });
    
    async function init() {
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        await verificarEstadoAtualEAgir();
    }

    if (window.location.href.includes('/Manifestacao/TratarManifestacao.aspx')) {
        init();
    }
})();