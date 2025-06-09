// Neuron/scripts/tramitar.js - HTML consolidado, com correções e logs para depuração
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tramitar';
    const SCRIPT_ID = 'tramitar';
    const CONFIG_STORAGE_KEY_TRAMITAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_TRAMITAR = 'config/config.json';

    const ID_CAMPO_DATA_TRATAMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtDataTratamento';
    const ID_CAMPO_MENSAGEM = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtMensagem';
    const ID_CAMPO_TAGS_INFO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTags';
    const ID_SPAN_PRAZO_ATENDIMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento';
    const CONTAINER_PAINEL_SELECTOR = '.col-md-6.col-md-push-6.hidden-print';

    const TEMPLATE_TRAMITAR_URL = chrome.runtime.getURL('templates/tramitar.html');

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let focalPointsTramitar = {};
    let textModelsTramitar = {};
    let holidaysTramitar = [];
    let weekendRuleTramitar = 'next';
    let holidayRuleTramitar = 'next';
    let tramitacaoInternaDiasConfig = -10;
    let tramitacaoInternaDiasUteisConfig = false;
    let mensagemManualmenteEditada = false;

    let fetchedHtmlDoc = null; 

    async function carregarConfiguracoesTramitar() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Carregando configurações...`, "color: blue; font-weight: bold;");
        const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY_TRAMITAR);
        let fullConfig = {};
        if (result[CONFIG_STORAGE_KEY_TRAMITAR] && typeof result[CONFIG_STORAGE_KEY_TRAMITAR] === 'object') {
            fullConfig = result[CONFIG_STORAGE_KEY_TRAMITAR];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_TRAMITAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                fullConfig = await response.json();
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configuração padrão carregada.`);
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_TRAMITAR}:`, e);
                fullConfig = { 
                    masterEnableNeuron: false, featureSettings: {}, focalPoints: {}, 
                    textModels: { Tramitar: {} }, holidays: [],
                    prazosSettings: { configTramitacaoInternaDias: -10, configTramitacaoInternaDiasUteis: false, weekendAdjustmentRule: "next", holidayAdjustmentRule: "next" }
                };
            }
        }
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        focalPointsTramitar = fullConfig.focalPoints || {};
        textModelsTramitar = fullConfig.textModels?.Tramitar || {};
        const holidaysFromConfig = fullConfig.holidays || [];
        holidaysTramitar = holidaysFromConfig.map(h => {
            const [dia, mes, ano] = h.date.split('/');
            return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)).getTime();
        });
        const prazosSettings = fullConfig.prazosSettings || {};
        tramitacaoInternaDiasConfig = prazosSettings.configTramitacaoInternaDias !== undefined ? parseInt(prazosSettings.configTramitacaoInternaDias, 10) : -10;
        tramitacaoInternaDiasUteisConfig = prazosSettings.configTramitacaoInternaDiasUteis !== undefined ? prazosSettings.configTramitacaoInternaDiasUteis : false;
        weekendRuleTramitar = prazosSettings.weekendAdjustmentRule || 'next';
        holidayRuleTramitar = prazosSettings.holidayAdjustmentRule || 'next';
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configurações carregadas. Master: ${currentMasterEnabled}, Script: ${currentScriptEnabled}`);
    }
    
    function calculateAdjustedDate(baseDateStr, offsetDays, useWorkingDaysForOffset, holidaysTimestamps, weekendRule, holidayRule) {
        const parts = baseDateStr.split('/');
        if (parts.length !== 3) return null;
        let day = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1, year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1900 || year > 2200) return null;
        let date = new Date(year, month, day);
        if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) return null; 
        const isHoliday = (d) => {
            if (!d || isNaN(d.getTime())) return false;
            const normalizedTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            return holidaysTimestamps.includes(normalizedTime);
        };
        if (useWorkingDaysForOffset) {
            const increment = offsetDays >= 0 ? 1 : -1;
            const absOffset = Math.abs(offsetDays);
            if (absOffset > 0) {
                for (let i = 0; i < absOffset; ) {
                    date.setDate(date.getDate() + increment);
                    if (date.getDay() !== 0 && date.getDay() !== 6 && !isHoliday(date)) i++; 
                }
            }
        } else {
            date.setDate(date.getDate() + offsetDays);
        }
        let keepAdjusting = true, iterations = 0; 
        while (keepAdjusting && iterations < 30) { 
            iterations++; keepAdjusting = false; 
            const dayOfWeek = date.getDay(); 
            if (dayOfWeek === 0 || dayOfWeek === 6) { 
                keepAdjusting = true;
                if (weekendRule === "next") date.setDate(date.getDate() + (dayOfWeek === 6 ? 2 : 1)); 
                else if (weekendRule === "previous") date.setDate(date.getDate() - (dayOfWeek === 0 ? 2 : 1)); 
                else if (weekendRule === "split") { if (dayOfWeek === 6) date.setDate(date.getDate() - 1); else date.setDate(date.getDate() + 1); }                  
                else date.setDate(date.getDate() + (dayOfWeek === 6 ? 2 : 1));
            } else if (isHoliday(date)) { 
                if (holidayRule === "next") { keepAdjusting = true; date.setDate(date.getDate() + 1); } 
                else if (holidayRule === "previous") { keepAdjusting = true; date.setDate(date.getDate() - 1); } 
                else if (holidayRule === "none") keepAdjusting = false; 
                else { keepAdjusting = true; date.setDate(date.getDate() + 1); }
            }
        }
        if (iterations >= 30) console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): calculateAdjustedDate exceeded max iterations for ${baseDateStr}.`);
        return date;
    }

    function calcularPrazoParaMensagemTramitar() {
        const spanPrazo = document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO);
        if (!spanPrazo || !spanPrazo.innerText.trim()) return '';
        const prazoStr = spanPrazo.innerText.trim();
        const dataCalculada = calculateAdjustedDate(prazoStr, tramitacaoInternaDiasConfig, tramitacaoInternaDiasUteisConfig, holidaysTramitar, weekendRuleTramitar, holidayRuleTramitar);
        if (!dataCalculada) return prazoStr;
        const dF = dataCalculada.getDate().toString().padStart(2, '0');
        const mF = (dataCalculada.getMonth() + 1).toString().padStart(2, '0');
        return `${dF}/${mF}/${dataCalculada.getFullYear()}`;
    }

    function preencherCampoDataTratamentoConfiguravel() {
        const campoData = document.getElementById(ID_CAMPO_DATA_TRATAMENTO);
        if (campoData) {
            campoData.value = calcularPrazoParaMensagemTramitar();
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Campo data tratamento (${ID_CAMPO_DATA_TRATAMENTO}) preenchido com ${campoData.value}`);
        } else {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Campo ${ID_CAMPO_DATA_TRATAMENTO} não encontrado para preenchimento.`);
        }
    }

    function exibirNomesParaSecretaria(selectElement, ulElement) {
        if (!selectElement || !ulElement) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos select ou ul não fornecidos para exibirNomesParaSecretaria.`);
            return;
        }
        ulElement.innerHTML = '';
        const sigla = selectElement.value;
        if (sigla && focalPointsTramitar && focalPointsTramitar[sigla]) {
            const nomes = focalPointsTramitar[sigla].slice(1); 
            nomes.forEach(nome => {
                const li = document.createElement('li');
                li.textContent = nome;
                ulElement.appendChild(li);
            });
        }
    }
    
    function configurarAutotramitarOriginal(selectSecretarias) {
        if (!selectSecretarias) return;
        const sigla = selectSecretarias.value;
        if (!sigla || !focalPointsTramitar || !focalPointsTramitar[sigla] || focalPointsTramitar[sigla].length < 2) {
            alert('Selecione uma secretaria válida com pontos focais definidos (além do nome de display) ou verifique a configuração de Pontos Focais!');
            return;
        }
        const nomesParaAdicionar = focalPointsTramitar[sigla].slice(1);
        const tabelaSelector = "#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_grdUsuariosUnidades";
        const inputNomeSelector = 'selectize_0'; 
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
                indexNomeAtual++;
                setTimeout(adicionarProximoNome, 500); 
                return;
            }
            const inputNome = document.getElementById(inputNomeSelector);
            const botaoAdd = document.getElementById(botaoAddSelector);
            if (!inputNome || !botaoAdd) {
                alert('Erro: Elementos da página para adicionar usuário (input ou botão) não encontrados.');
                return;
            }
            inputNome.value = nome;
            inputNome.dispatchEvent(new Event('input', { bubbles: true })); 
            setTimeout(() => {
                inputNome.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
                setTimeout(() => { 
                    botaoAdd.click();
                    indexNomeAtual++;
                    setTimeout(adicionarProximoNome, 3000); 
                }, 1000);
            }, 500);
        }
        adicionarProximoNome();
    }

    function processAndInjectPainelPontosFocais(templateContentNode) {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Processando e injetando Painel Pontos Focais...`, "color: green;");
        const container = document.querySelector(CONTAINER_PAINEL_SELECTOR);
        if (!container) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Container '${CONTAINER_PAINEL_SELECTOR}' para Painel Pontos Focais não encontrado.`);
            return;
        }
        if (!templateContentNode) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): templateContentNode para Painel Pontos Focais não fornecido.`);
            return;
        }
        
        document.getElementById('neuronPainelPontosFocais')?.remove();

        const painelWrapperDiv = document.createElement('div');
        painelWrapperDiv.id = 'neuronPainelPontosFocais';
        painelWrapperDiv.className = 'panel panel-default'; // Preserva classes Bootstrap
        
        let htmlContent = templateContentNode.innerHTML; // Pega o conteúdo do <div id="neuron-template-pontos-focais">
        htmlContent = htmlContent
            .replace('{{PANEL_TITLE}}', 'Neuron - Pontos Focais')
            .replace('{{SELECT_SECRETARIA_LABEL}}', 'Selecione a Secretaria:')
            .replace('{{DEFAULT_SECRETARIA_OPTION_TEXT}}', 'Escolha uma Secretaria...')
            .replace('{{NOMES_RELACIONADOS_LABEL}}', 'Nome(s) relacionado(s) para adicionar:')
            .replace('{{AUTO_TRAMITAR_BUTTON_TEXT}}', 'Auto-Tramitar Pontos Focais');
        
        painelWrapperDiv.innerHTML = htmlContent;
        
        const selectSecretarias = painelWrapperDiv.querySelector('#neuronSecretariasList');
        const ulNomesSecretaria = painelWrapperDiv.querySelector('#neuronNomesSecretaria');
        const btnAutotramitar = painelWrapperDiv.querySelector('#neuronBtnAutotramitar');

        if (!selectSecretarias) console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): select#neuronSecretariasList não encontrado no painel processado.`);
        if (!ulNomesSecretaria) console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): ul#neuronNomesSecretaria não encontrado no painel processado.`);
        if (!btnAutotramitar) console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): button#neuronBtnAutotramitar não encontrado no painel processado.`);

        if (!selectSecretarias || !ulNomesSecretaria || !btnAutotramitar) return;

        if (focalPointsTramitar) {
            const sortedSiglas = Object.keys(focalPointsTramitar).sort((a,b) => a.localeCompare(b));
            for (const sigla of sortedSiglas) {
                const displayText = (Array.isArray(focalPointsTramitar[sigla]) && focalPointsTramitar[sigla].length > 0 && typeof focalPointsTramitar[sigla][0] === 'string') 
                                  ? focalPointsTramitar[sigla][0] : sigla;
                const option = document.createElement('option');
                option.value = sigla; option.textContent = displayText;
                selectSecretarias.appendChild(option);
            }
        }
        
        selectSecretarias.addEventListener('change', () => {
            exibirNomesParaSecretaria(selectSecretarias, ulNomesSecretaria);
            localStorage.setItem('neuronSecretariaSelecionadaTramitar', selectSecretarias.value);
            btnAutotramitar.disabled = !selectSecretarias.value;
        });

        const salvo = localStorage.getItem('neuronSecretariaSelecionadaTramitar');
        if (salvo && selectSecretarias.querySelector(`option[value="${salvo}"]`)) {
           selectSecretarias.value = salvo; 
           exibirNomesParaSecretaria(selectSecretarias, ulNomesSecretaria);
        }
        
        btnAutotramitar.addEventListener('click', () => configurarAutotramitarOriginal(selectSecretarias));
        container.prepend(painelWrapperDiv);
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Painel Pontos Focais injetado.`);
    }

    function processAndInjectSelectMensagens(templateContentNode) {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Processando e injetando Select de Mensagens...`, "color: green;");
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        const tagsField = document.getElementById(ID_CAMPO_TAGS_INFO);

        if (!mensagemField) console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Campo de mensagem principal (${ID_CAMPO_MENSAGEM}) não encontrado.`);
        if (!textModelsTramitar || Object.keys(textModelsTramitar).length === 0) console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Modelos de texto para tramitação vazios.`);
        if (!templateContentNode) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): templateContentNode para Select de Mensagens não fornecido.`);
            return;
        }
        if (!mensagemField) return;


        document.getElementById('neuronSelectMensagensTramitar')?.remove();
        
        const selectElementTemplate = templateContentNode.querySelector('select');
        if (!selectElementTemplate) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elemento <select> não encontrado dentro do templateContentNode (ID: ${templateContentNode.id}) de mensagens.`);
            return;
        }
        const selectElement = selectElementTemplate.cloneNode(true);

        const defaultOption = selectElement.querySelector('option[value=""]');
        if (defaultOption) {
            defaultOption.textContent = defaultOption.textContent.replace('{{DEFAULT_MESSAGE_OPTION_TEXT}}', 'Neuron: Selecione um modelo de mensagem...');
        } else {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Opção default não encontrada no template do select de mensagens.`);
        }
            
        const sortedMessageKeys = Object.keys(textModelsTramitar).sort((a,b) => a.localeCompare(b));
        for (const chave of sortedMessageKeys) {
            if (typeof textModelsTramitar[chave] === 'string') {
                const option = document.createElement('option');
                option.value = chave; option.text = chave;
                selectElement.appendChild(option);
            }
        }
        selectElement.addEventListener('change', function () {
            const dataLimiteCalculada = calcularPrazoParaMensagemTramitar(); 
            const secretariaTag = tagsField ? tagsField.value : '{SECRETARIA_NAO_ENCONTRADA}';
            let templateText = textModelsTramitar[this.value] || '';
            templateText = templateText.replace(/\{SECRETARIA\}/g, secretariaTag);
            templateText = templateText.replace(/\{PRAZO\}/g, dataLimiteCalculada);
            mensagemField.value = templateText;
        });
        
        if (mensagemField.parentNode) {
            mensagemField.parentNode.insertBefore(selectElement, mensagemField);
            mensagemField.classList.add('neuron-mensagem-expandida');
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Select de Mensagens injetado.`);
        } else {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): ParentNode do campo de mensagem (${ID_CAMPO_MENSAGEM}) não encontrado. Select não pode ser injetado.`);
        }
    }

    async function carregarTemplates() {
        if (fetchedHtmlDoc) {
            return true;
        }
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Carregando template unificado de ${TEMPLATE_TRAMITAR_URL}`, "color: orange;");
        try {
            const response = await fetch(TEMPLATE_TRAMITAR_URL);
            if (!response.ok) throw new Error(`HTTP erro ao carregar template unificado: ${response.status} ${response.statusText}`);
            const htmlText = await response.text();
            const parser = new DOMParser();
            fetchedHtmlDoc = parser.parseFromString(htmlText, 'text/html');
            if (!fetchedHtmlDoc || !fetchedHtmlDoc.body) { // Checa se o parseamento resultou em um documento válido
                throw new Error("Falha ao parsear o HTML do template. Documento resultante inválido.");
            }
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Template unificado carregado e parseado. Conteúdo do body:`, fetchedHtmlDoc.body.innerHTML);
            return true;
        } catch (error) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao carregar ou parsear template unificado:`, error);
            fetchedHtmlDoc = null;
            return false;
        }
    }

    function removerElementosCriados() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Removendo elementos da UI Neuron.`, "color: red;");
        document.getElementById('neuronPainelPontosFocais')?.remove();
        document.getElementById('neuronSelectMensagensTramitar')?.remove();
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        if (mensagemField) {
            mensagemField.classList.remove('neuron-mensagem-expandida');
        }
    }

    async function criarOuAtualizarUI() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Tentando criar ou atualizar UI...`, "color: blue; font-weight: bold;");
        // Remove UI antiga antes de tentar criar a nova, para evitar duplicatas em recargas rápidas ou postbacks
        removerElementosCriados();

        if (!currentMasterEnabled || !currentScriptEnabled) {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Master ou script desabilitado. UI não será criada.`);
            // removerElementosCriados() já foi chamado acima.
            return;
        }

        const templatesCarregados = await carregarTemplates();
        if (!templatesCarregados || !fetchedHtmlDoc) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Templates não puderam ser carregados. UI não será criada.`);
            return;
        }
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Documento de template parseado:`, fetchedHtmlDoc);

        preencherCampoDataTratamentoConfiguravel(); 
        
        const painelTemplateNode = fetchedHtmlDoc.getElementById('neuron-template-pontos-focais');
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Nó do template de Pontos Focais obtido:`, painelTemplateNode);
        
        const selectMensagensTemplateNode = fetchedHtmlDoc.getElementById('neuron-template-select-mensagens');
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Nó do template de Select de Mensagens obtido:`, selectMensagensTemplateNode);

        if (painelTemplateNode) {
            processAndInjectPainelPontosFocais(painelTemplateNode);
        } else {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Template para Pontos Focais ('neuron-template-pontos-focais') não encontrado no documento HTML parseado.`);
        }
        
        if (selectMensagensTemplateNode) {
            processAndInjectSelectMensagens(selectMensagensTemplateNode);
        } else {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Template para Select de Mensagens ('neuron-template-select-mensagens') não encontrado no documento HTML parseado.`);
        }
    }

    async function verificarEstadoAtualEAgir() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Verificando estado atual e agindo...`, "color: blue;");
        await carregarConfiguracoesTramitar();
        
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Aguardando elementos essenciais da página...`);
        await new Promise(resolve => {
            const check = () => {
                const msgField = document.getElementById(ID_CAMPO_MENSAGEM);
                const painelContainer = document.querySelector(CONTAINER_PAINEL_SELECTOR);
                const prazoSpan = document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO);
                if (msgField && painelContainer && prazoSpan) {
                    console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos essenciais da página encontrados.`);
                    resolve();
                } else {
                    console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Aguardando elementos. msgField: ${!!msgField}, painelContainer: ${!!painelContainer}, prazoSpan: ${!!prazoSpan}`);
                    setTimeout(check, 300);
                }
            };
            // Garante que o DOM esteja pelo menos interativo
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', check);
            } else {
                check();
            }
        });
        
        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes('TramitarManifestacao.aspx')) {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Condições atendidas para criar UI.`);
            await criarOuAtualizarUI();
        } else {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Condições NÃO atendidas para criar UI. URL: ${window.location.href}, Master: ${currentMasterEnabled}, Script: ${currentScriptEnabled}. Removendo UI se existir.`);
            removerElementosCriados();
        }
    }

    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_TRAMITAR]) {
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Configuração alterada via storage.onChanged. Reavaliando...`, "color: orange; font-weight: bold;");
            fetchedHtmlDoc = null; 
            await verificarEstadoAtualEAgir();
        }
    });
    
    async function init() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Inicializando script...`, "color: purple; font-weight: bold;");
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Documento já carregado/interativo.`);
                resolve();
            } else {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Aguardando evento 'load' ou 'DOMContentLoaded'.`);
                // Espera 'DOMContentLoaded' para ter o DOM básico, 'load' para tudo (imagens, etc.)
                // Para manipulação do DOM, 'DOMContentLoaded' é geralmente suficiente.
                document.addEventListener('DOMContentLoaded', () => {
                     console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Evento DOMContentLoaded disparado.`);
                    resolve();
                }, { once: true });
            }
        });
        await verificarEstadoAtualEAgir();
    }

    if (window.location.href.includes('/Manifestacao/TramitarManifestacao.aspx')) {
        init();
    } else {
        // Este log não deve aparecer se o script só é injetado na página correta via manifest.json
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): URL atual (${window.location.href}) não corresponde a /Manifestacao/TramitarManifestacao.aspx. Script não será inicializado.`);
    }
})();