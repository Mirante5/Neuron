// Neuron 0.1.5 β/scripts/tramitar.js - REFATORADO
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tramitar';
    const SCRIPT_ID_STORAGE_KEY = 'scriptEnabled_tramitar';

    // IDs e seletores da página original
    const ID_CAMPO_DATA_TRATAMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtDataTratamento';
    const ID_CAMPO_MENSAGEM = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtMensagem';
    const ID_CAMPO_TAGS_INFO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTags';
    const ID_SPAN_PRAZO_ATENDIMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento';
    const CONTAINER_PAINEL_SELECTOR = '.col-md-6.col-md-push-6.hidden-print'; // Onde o painel de pontos focais é inserido

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let pontosFocaisConfig = {};
    let textMessagesConfig = { Tramitar: {} }; // Estrutura esperada

    // Referências aos elementos da UI criados pelo script
    let painelPontosFocaisElement = null;
    let selectMensagensElement = null;

    // --- Funções de Carregamento de Configuração ---
    async function carregarPontosFocaisConfig() {
        try {
            const storageResult = await chrome.storage.local.get('userPontosFocaisJson');
            if (storageResult.userPontosFocaisJson && typeof storageResult.userPontosFocaisJson === 'string') {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Carregando pontosfocais.json personalizado do storage.`);
                pontosFocaisConfig = JSON.parse(storageResult.userPontosFocaisJson);
            } else {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Carregando pontosfocais.json padrão.`);
                const response = await fetch(chrome.runtime.getURL('config/pontosfocais.json')); //
                if (!response.ok) throw new Error(`Erro HTTP ao carregar padrão: ${response.status}`);
                pontosFocaisConfig = await response.json(); //
            }
        } catch (e) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar pontosfocais.json:`, e);
            pontosFocaisConfig = {}; // Fallback
        }
    }

    async function carregarTextMessagesConfig() {
        try {
            const storageResult = await chrome.storage.local.get('userTextJson');
            if (storageResult.userTextJson && typeof storageResult.userTextJson === 'string') {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Carregando text.json personalizado do storage.`);
                textMessagesConfig = JSON.parse(storageResult.userTextJson);
            } else {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Carregando text.json padrão.`);
                const response = await fetch(chrome.runtime.getURL('config/text.json')); //
                if (!response.ok) throw new Error(`Erro HTTP ao carregar padrão: ${response.status}`);
                textMessagesConfig = await response.json(); //
            }
             // Garante que a subestrutura esperada exista
            if (!textMessagesConfig.Tramitar) {
                textMessagesConfig.Tramitar = {};
            }
        } catch (e) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar text.json:`, e);
            textMessagesConfig = { Tramitar: {} }; // Fallback
        }
    }

    // --- Funções Auxiliares da Lógica Original ---
    function calcularDataMenosDezDiasOriginal() {
        const spanPrazo = document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO);
        if (!spanPrazo || !spanPrazo.innerText.trim()) return '';

        const [dia, mes, ano] = spanPrazo.innerText.trim().split('/').map(Number);
        if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return ''; // Validação básica

        const data = new Date(ano, mes - 1, dia);
        data.setDate(data.getDate() - 10);

        if (data.getDay() === 6) data.setDate(data.getDate() - 1); // Sábado
        else if (data.getDay() === 0) data.setDate(data.getDate() + 1); // Domingo (original era -2, mas +1 parece mais correto para "próximo dia útil")

        const d = data.getDate().toString().padStart(2, '0');
        const m = (data.getMonth() + 1).toString().padStart(2, '0');
        return `${d}/${m}/${data.getFullYear()}`;
    }

    function preencherDataTratamentoOriginal() {
        const campoData = document.getElementById(ID_CAMPO_DATA_TRATAMENTO);
        if (campoData) {
            campoData.value = calcularDataMenosDezDiasOriginal();
        }
    }

    function exibirNomesParaSecretaria(selectElementId = 'neuronSecretariasList', ulElementId = 'neuronNomesSecretaria') {
        const select = document.getElementById(selectElementId);
        const ul = document.getElementById(ulElementId);
        if (!select || !ul) return;

        ul.innerHTML = '';
        const sigla = select.value;

        if (sigla && pontosFocaisConfig && pontosFocaisConfig[sigla]) {
            pontosFocaisConfig[sigla].forEach(nome => {
                const li = document.createElement('li');
                li.textContent = nome;
                ul.appendChild(li);
            });
        }
    }
    
    function configurarAutotramitarOriginal(selectSecretariasId = 'neuronSecretariasList') { //
        const sigla = document.getElementById(selectSecretariasId)?.value;
        if (!sigla || !pontosFocaisConfig || !pontosFocaisConfig[sigla]) {
            alert('Selecione uma secretaria válida com pontos focais definidos!');
            return;
        }
        const nomesParaAdicionar = pontosFocaisConfig[sigla];

        const tabelaSelector = "#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_grdUsuariosUnidades";
        const inputNomeSelector = 'selectize_0'; // ID do input do selectize (pode variar se houver outros na página)
        const botaoAddSelector = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_btnIncluirUsuario';

        function getNomesNaTabela() {
            const tabela = document.querySelector(tabelaSelector);
            if (!tabela) return [];
            const spans = tabela.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_grdUsuariosUnidades_lblNomeItem']");
            return Array.from(spans).map(span => span.textContent.trim().replace(' (Unidade)', ''));
        }

        let indexNomeAtual = 0;
        function adicionarProximoNome() {
            if (indexNomeAtual >= nomesParaAdicionar.length) {
                alert('Todos os nomes configurados para a secretaria foram processados!');
                return;
            }

            const nome = nomesParaAdicionar[indexNomeAtual];
            const nomesJaNaTabela = getNomesNaTabela();

            if (nomesJaNaTabela.includes(nome)) {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Nome "${nome}" já está na tabela. Pulando.`);
                indexNomeAtual++;
                setTimeout(adicionarProximoNome, 500); // Pequeno delay para não sobrecarregar
                return;
            }

            const inputNome = document.getElementById(inputNomeSelector);
            const botaoAdd = document.getElementById(botaoAddSelector);

            if (!inputNome || !botaoAdd) {
                alert('Erro: Elementos da página para adicionar usuário (input ou botão) não encontrados.');
                return;
            }

            inputNome.value = nome;
            inputNome.dispatchEvent(new Event('input', { bubbles: true })); // Para Selectize atualizar

            setTimeout(() => {
                // Simular Enter (pode ser necessário para alguns Selectize)
                inputNome.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
                
                setTimeout(() => { // Delay para Selectize processar o Enter e popular
                    botaoAdd.click();
                    indexNomeAtual++;
                    setTimeout(adicionarProximoNome, 3000); // Espera AJAX da adição e processa próximo
                }, 1000);
            }, 500);
        }
        adicionarProximoNome();
    }

    // --- Funções de Criação/Remoção de UI ---
    function criarPainelPontosFocaisInterno() {
        if (painelPontosFocaisElement) painelPontosFocaisElement.remove();

        const painel = document.createElement('div');
        painel.id = 'neuronPainelPontosFocais';
        painel.className = 'panel panel-default';
        painel.style.marginBottom = '20px';

        const options = ['<option value="">Escolha uma Secretaria...</option>'];
        if (pontosFocaisConfig) {
            for (const [sigla, descArray] of Object.entries(pontosFocaisConfig)) {
                const nomeCompleto = Array.isArray(descArray) ? descArray[0] : sigla; // Pega o primeiro nome como display
                options.push(`<option value="${sigla}">${nomeCompleto}</option>`);
            }
        }

        painel.innerHTML = `
            <div class="panel-heading">
                <h4 class="panel-title">Neuron - Pontos Focais</h4>
            </div>
            <div class="panel-body">
                <label for="neuronSecretariasList">Selecione a Secretaria:</label>
                <select id="neuronSecretariasList" class="form-control" style="margin-bottom: 10px;">
                    ${options.join('\n')}
                </select>
                <div class="nomes-relacionados" style="margin-bottom: 10px;">
                    <label>Nome(s) relacionado(s):</label>
                    <ul id="neuronNomesSecretaria" style="list-style-type: disclosure-closed; max-height: 500px; overflow-y: auto; border: 1px solid #eee; padding: 5px 25px 5px 25px;;"></ul>
                </div>
                <button id="neuronBtnAutotramitar" class="btn btn-info btn-sm">Auto-Tramitar Pontos Focais</button>
            </div>
        `;
        painelPontosFocaisElement = painel;

        const container = document.querySelector(CONTAINER_PAINEL_SELECTOR);
        if (container) {
            container.prepend(painelPontosFocaisElement);

            // Adicionar listeners
            const selectSecretarias = document.getElementById('neuronSecretariasList');
            const btnAutotramitar = document.getElementById('neuronBtnAutotramitar');

            if (selectSecretarias) {
                selectSecretarias.addEventListener('change', () => exibirNomesParaSecretaria('neuronSecretariasList', 'neuronNomesSecretaria'));
                // Restaurar seleção (opcional, pode ser gerenciado externamente se necessário)
                const salvo = localStorage.getItem('neuronSecretariaSelecionadaTramitar'); // Chave específica
                if (salvo) {
                    selectSecretarias.value = salvo;
                    exibirNomesParaSecretaria('neuronSecretariasList', 'neuronNomesSecretaria');
                }
                selectSecretarias.addEventListener('change', () => {
                     localStorage.setItem('neuronSecretariaSelecionadaTramitar', selectSecretarias.value);
                });
            }
            if (btnAutotramitar) {
                btnAutotramitar.addEventListener('click', () => configurarAutotramitarOriginal('neuronSecretariasList'));
            }

        } else {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Container para o painel de pontos focais não encontrado.`);
            painelPontosFocaisElement = null; // Não foi inserido
        }
    }

    function criarSelectMensagensInterno() {
        if (selectMensagensElement) selectMensagensElement.remove();

        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        const tagsField = document.getElementById(ID_CAMPO_TAGS_INFO); // Para {SECRETARIA}

        if (!mensagemField || !textMessagesConfig.Tramitar) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Campo de mensagem ou config de tramitação não encontrados.`);
            return;
        }

        const select = document.createElement('select');
        select.id = 'neuronSelectMensagensTramitar';
        select.className = 'form-control';
        select.style.marginBottom = '10px';

        const defaultOption = document.createElement('option');
        defaultOption.text = 'Neuron: Selecione um modelo de mensagem...';
        defaultOption.value = '';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        const tramitarMensagens = textMessagesConfig.Tramitar;
        for (const chave in tramitarMensagens) {
            // A chave é o título, o valor é o template da mensagem
            if (typeof tramitarMensagens[chave] === 'string') { // Verifica se é o template direto
                const option = document.createElement('option');
                option.value = chave; // Usa a chave para buscar o template depois
                option.text = chave;  // Usa a chave como texto da opção
                select.appendChild(option);
            }
        }
        
        select.addEventListener('change', function () {
            const dataLimite = calcularDataMenosDezDiasOriginal();
            const secretariaTag = tagsField ? tagsField.value : '{SECRETARIA_NAO_ENCONTRADA}'; // Valor do campo de tags da página original
            
            let template = textMessagesConfig.Tramitar[this.value] || ''; // Pega o template usando a chave selecionada
            template = template.replace('{SECRETARIA}', secretariaTag); // Substitui placeholder {SECRETARIA}
            template = template.replace('{PRAZO}', dataLimite); // Substitui placeholder {PRAZO}
            mensagemField.value = template;
        });

        selectMensagensElement = select;
        mensagemField.parentNode.insertBefore(selectMensagensElement, mensagemField);
    }

    function criarOuAtualizarUI() {
        if (!currentMasterEnabled || !currentScriptEnabled) {
            removerElementosCriados();
            return;
        }
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Criando/Atualizando UI.`);
        preencherDataTratamentoOriginal(); // Preenche a data de tratamento da página
        criarPainelPontosFocaisInterno();
        criarSelectMensagensInterno();

        // Ajustes visuais no textarea que estavam no preencherMensagem original
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        if (mensagemField) {
            mensagemField.style.width = '100%'; // Ajustar para ser responsivo ou usar classe bootstrap
            mensagemField.style.minHeight = '500px'; // Altura mínima, original era 1036px que é muito
        }
    }

    function removerElementosCriados() {
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Removendo UI.`);
        if (painelPontosFocaisElement) {
            painelPontosFocaisElement.remove();
            painelPontosFocaisElement = null;
        }
        if (selectMensagensElement) {
            selectMensagensElement.remove();
            selectMensagensElement = null;
        }
        // Reverter estilos do textarea se foram alterados de forma conflitante
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        if (mensagemField) {
             // Se necessário, restaurar estilos originais. Por ora, não faremos isso
             // a menos que cause problemas, pois o bootstrap/página pode cuidar disso.
        }
    }

    // --- Funções de Controle e Listeners da Extensão ---
    async function verificarEstadoAtualEAgir() {
        const settings = await chrome.storage.local.get([
            'masterEnableNeuron', SCRIPT_ID_STORAGE_KEY,
            'userPontosFocaisJson', 'userTextJson'
        ]);
        currentMasterEnabled = settings.masterEnableNeuron !== false;
        currentScriptEnabled = settings[SCRIPT_ID_STORAGE_KEY] !== false;

        await carregarPontosFocaisConfig();
        await carregarTextMessagesConfig();

        // Esperar que os elementos da página onde a UI será inserida estejam prontos
        await new Promise(resolve => {
            const checkPageElements = () => {
                if (document.getElementById(ID_CAMPO_MENSAGEM) && document.querySelector(CONTAINER_PAINEL_SELECTOR)) {
                    resolve();
                } else {
                    setTimeout(checkPageElements, 300);
                }
            };
            checkPageElements();
        });
        
        if (currentMasterEnabled && currentScriptEnabled) {
            criarOuAtualizarUI();
        } else {
            removerElementosCriados();
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            let precisaReavaliar = false;
            if (changes.masterEnableNeuron || changes[SCRIPT_ID_STORAGE_KEY] || 
                changes.userPontosFocaisJson || changes.userTextJson) {
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
        // Não foi identificado um MutationObserver no script original de tramitar.js,
        // mas se a página TramitarManifestacao.aspx tiver atualizações AJAX que removem
        // os elementos Neuron, um observer similar ao de tratar.js seria necessário.
    }

    if (window.location.href.includes('/Manifestacao/TramitarManifestacao.aspx')) {
        init();
    }

})();