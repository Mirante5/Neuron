(async function () {
    'use strict';

    const SCRIPT_ID = 'tratar';

    const TARGET_DIV_SELECTOR = '#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel3';
    const INPUT_CONTRIBUICAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtContribuicao';
    const NOME_CIDADAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNomePF';
    const TIPO_DOC_CIDADAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTipoDocPF';
    const NUM_DOC_CIDADAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumeroDocPF';
    const EMAIL_CIDADAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtEmailPF';
    const PRAZO_ATENDIMENTO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento';

    let config = {};
    let uiMutationObserver = null;

    async function carregarConfiguracoesTratar() {
        try {
            config = await window.NeuronUtils.loadConfiguration(SCRIPT_ID);
        } catch (error) {
            window.NeuronUtils.logError(SCRIPT_ID, 'Falha ao carregar configurações', error);
            config = {};
        }
    }

    function isScriptAtivo() {
        return window.NeuronUtils.isScriptActive(config, SCRIPT_ID);
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
        // Fix: Use correct configuration path - mensagens is at root level, not under textModels
        const textoBase = window.NeuronUtils.safeGet(config, 'mensagens.prorrogacao', "Modelo de prorrogação não encontrado.");
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
        window.NeuronUtils.logInfo(SCRIPT_ID, 'Botões auxiliares adicionados.');
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
        window.NeuronUtils.logInfo(SCRIPT_ID, 'Observer da página configurado.');
    }

    function desconectarObserverDaPagina() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            window.NeuronUtils.logInfo(SCRIPT_ID, 'Observer da página DESCONECTADO.');
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[window.NeuronUtils.CONFIG_KEY]) {
            window.NeuronUtils.logWarning(SCRIPT_ID, 'Configuração alterada. Reavaliando...');
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
