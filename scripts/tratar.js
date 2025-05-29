// Neuron 0.1.5 β/scripts/tratar.js - REFATORADO
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tratar';
    const SCRIPT_ID_STORAGE_KEY = 'scriptEnabled_tratar';

    // Seletores e IDs da página original
    const TARGET_DIV_SELECTOR = '#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel3';
    const INPUT_CONTRIBUICAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtContribuicao';
    const BTN_CLASS_CIDADAO = 'neuron-btn-cidadao';
    const BTN_CLASS_PRORROGACAO_TEXTO = 'neuron-btn-prorrogacao-texto';

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textConfig = { mensagens: {} }; // Configuração carregada de text.json
    let uiMutationObserver = null;

    // Carrega text.json (personalizado do storage ou padrão)
    async function carregarTextConfig() {
        try {
            const storageResult = await chrome.storage.local.get('userTextJson');
            if (storageResult.userTextJson && typeof storageResult.userTextJson === 'string') {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Carregando text.json personalizado do storage.`);
                textConfig = JSON.parse(storageResult.userTextJson);
            } else {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Carregando text.json padrão.`);
                const response = await fetch(chrome.runtime.getURL('config/text.json'));
                if (!response.ok) throw new Error(`Erro HTTP ao carregar padrão: ${response.status}`);
                textConfig = await response.json();
            }
        } catch (e) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar text.json:`, e);
            textConfig = { mensagens: { prorrogacao: "Erro ao carregar texto de prorrogação." } }; // Fallback
        }
    }

    // Função auxiliar para criar botões
    function criarBotaoAuxiliar({ id, label, classes = [], style = {}, onClick }) {
        const btn = document.createElement('input');
        btn.type = 'submit'; // Mantido como submit para consistência visual com a página
        btn.id = id;
        btn.value = label;
        btn.classList.add('btn', 'btn-sm', 'btn-primary', ...classes);
        Object.assign(btn.style, { marginLeft: '2px', marginTop: '5px', ...style }); // Ajuste marginTop
        btn.addEventListener('mouseover', () => btn.style.backgroundColor = '#015298');
        btn.addEventListener('mouseout', () => btn.style.backgroundColor = '#337ab7');
        btn.addEventListener('click', e => { e.preventDefault(); onClick(); });
        return btn;
    }

    // Ação: Importar dados do cidadão
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

    // Ação: Inserir texto de prorrogação (do `text.json`)
    function inserirTextoProrrogacaoAction() {
        const prazo = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento')?.textContent.trim() || '{PRAZO_NAO_ENCONTRADO}';
        const textoBase = textConfig?.mensagens?.prorrogacao || "Modelo de prorrogação não encontrado.";
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
        const contribInput = document.getElementById(INPUT_CONTRIBUICAO_ID); // Verificar se o campo principal existe
        if (!panel || !contribInput) {
            // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Painel alvo ou campo de contribuição não encontrado. UI não será criada.`);
            return;
        }

        // Remove botões antigos para evitar duplicação se a função for chamada múltiplas vezes
        removerElementosCriados();

        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Criando/Atualizando UI.`);

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
        
        // Adiciona os botões ao painel. Poderia ser um div container para melhor organização.
        panel.appendChild(btnImportar);
        panel.appendChild(btnTextoProrrogacao);

        // Aqui, também integramos a funcionalidade do `resposta.js` se desejado
        // Exemplo de como chamar a lógica do `resposta.js` (se ela for simples e não criar UI conflitante)
        // if (typeof executarLogicaResposta !== 'undefined') executarLogicaResposta();
    }

    function removerElementosCriados() {
        document.getElementById('neuronBtnImportarCidadao')?.remove();
        document.getElementById('neuronBtnTextoProrrogacao')?.remove();
        // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): UI removida, se existente.`);
    }

    async function verificarEstadoAtualEAgir() {
        const settings = await chrome.storage.local.get(['masterEnableNeuron', SCRIPT_ID_STORAGE_KEY, 'userTextJson']);
        currentMasterEnabled = settings.masterEnableNeuron !== false;
        currentScriptEnabled = settings[SCRIPT_ID_STORAGE_KEY] !== false;

        await carregarTextConfig(); // Carrega/Recarrega text.json

        if (currentMasterEnabled && currentScriptEnabled) {
            // Garante que os elementos base da página onde a UI será inserida existam
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
            configurarObserverDaPagina(); // Configura ou reconfigura o observer
        } else {
            removerElementosCriados();
            desconectarObserverDaPagina(); // Desconecta o observer se o script for desabilitado
        }
    }

    function configurarObserverDaPagina() {
        if (uiMutationObserver) uiMutationObserver.disconnect(); // Desconecta o anterior, se houver

        const panelAlvo = document.querySelector(TARGET_DIV_SELECTOR);
        if(!panelAlvo) return; // Não observa se o painel não existe

        uiMutationObserver = new MutationObserver((mutationsList, observer) => {
            // Se o script está ativo e os botões não existem mais (ex: por um update de AJAX no painel), recria.
            if (currentMasterEnabled && currentScriptEnabled) {
                const panelAindaExiste = document.querySelector(TARGET_DIV_SELECTOR);
                if (panelAindaExiste) { // Verifica se o painel alvo ainda está no DOM
                    if (!document.getElementById('neuronBtnImportarCidadao') || !document.getElementById('neuronBtnTextoProrrogacao')) {
                        // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Detectada alteração no painel. Recriando botões...`);
                        criarOuAtualizarUI(); // Recria a UI
                    }
                } else {
                     // Se o painel foi removido, o observer não tem mais o que observar aqui.
                     // Poderia tentar encontrar um novo ou simplesmente parar.
                    observer.disconnect();
                    uiMutationObserver = null;
                }
            }
        });

        uiMutationObserver.observe(document.body, { childList: true, subtree: true }); // Observa o body para maior robustez a recriações do painel
        // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): MutationObserver configurado.`);
    }

    function desconectarObserverDaPagina() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): MutationObserver desconectado.`);
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            let precisaReavaliar = false;
            if (changes.masterEnableNeuron || changes[SCRIPT_ID_STORAGE_KEY] || changes.userTextJson) {
                precisaReavaliar = true;
            }
            if (precisaReavaliar) {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configuração ou JSON mudou. Reavaliando...`);
                verificarEstadoAtualEAgir();
            }
        }
    });
    
    async function init() {
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                return resolve();
            }
            window.addEventListener('load', resolve, { once: true });
        });
        await verificarEstadoAtualEAgir();
    }

    // Verificação inicial se estamos na página correta
    if (window.location.href.includes('/Manifestacao/TratarManifestacao.aspx')) {
        init();
    }

})();