// Neuron/scripts/tramitar.js - HTML consolidado, com correções e logs para depuração (Adaptado para novas configs)
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tramitar';
    const SCRIPT_ID = 'tramitar';
    const CONFIG_STORAGE_KEY_TRAMITAR = 'neuronUserConfig';
    const CUSTOM_TEXT_MODELS_STORAGE_KEY = 'customTextModels'; // Nova chave para modelos de texto customizados
    const CUSTOM_FOCAL_POINTS_STORAGE_KEY = 'customFocalPoints'; // Nova chave para pontos focais customizados
    const DEFAULT_CONFIG_PATH_TRAMITAR = 'config/config.json';

    const ID_CAMPO_DATA_TRATAMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtDataTratamento';
    const ID_CAMPO_MENSAGEM = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtMensagem';
    const ID_CAMPO_TAGS_INFO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTags';
    const ID_SPAN_PRAZO_ATENDIMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento';
    const CONTAINER_PAINEL_SELECTOR = '.col-md-6.col-md-push-6.hidden-print';

    const TEMPLATE_TRAMITAR_URL = chrome.runtime.getURL('modules/tramitar/tramitar.html');

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let customFocalPoints = {}; // Renomeado para customFocalPoints
    let customTextModels = {}; // Renomeado para customTextModels
    let holidaysTramitar = [];
    let weekendRuleTramitar = 'next';
    let holidayRuleTramitar = 'next';
    let tramitacaoInternaDiasConfig = -10;
    let tramitacaoInternaDiasUteisConfig = false;
    let mensagemManualmenteEditada = false;

    let fetchedHtmlDoc = null;
    let uiElementsTramitar = {}; // Para armazenar refs da UI criada dinamicamente

    async function carregarConfiguracoesTramitar() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Carregando configurações...`, "color: blue; font-weight: bold;");
        const resultGeneral = await chrome.storage.local.get(CONFIG_STORAGE_KEY_TRAMITAR);
        let fullConfig = {};
        if (resultGeneral[CONFIG_STORAGE_KEY_TRAMITAR] && typeof resultGeneral[CONFIG_STORAGE_KEY_TRAMITAR] === 'object') {
            fullConfig = resultGeneral[CONFIG_STORAGE_KEY_TRAMITAR];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_TRAMITAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                fullConfig = await response.json();
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configuração padrão geral carregada.`);
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_TRAMITAR}:`, e);
                fullConfig = {
                    masterEnableNeuron: false, featureSettings: {},
                    prazosSettings: { configTramitacaoInternaDias: -10, configTramitacaoInternaDiasUteis: false, weekendAdjustmentRule: "next", holidayAdjustmentRule: "next" }
                };
            }
        }
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;

        // Carrega Pontos Focais customizados
        const resultFocalPoints = await chrome.storage.local.get(CUSTOM_FOCAL_POINTS_STORAGE_KEY);
        if (resultFocalPoints[CUSTOM_FOCAL_POINTS_STORAGE_KEY] && typeof resultFocalPoints[CUSTOM_FOCAL_POINTS_STORAGE_KEY] === 'object') {
            customFocalPoints = resultFocalPoints[CUSTOM_FOCAL_POINTS_STORAGE_KEY];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_TRAMITAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                const defaultConfig = await response.json();
                customFocalPoints = defaultConfig.focalPoints || {};
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar pontos focais padrão:`, e);
                customFocalPoints = {};
            }
        }

        // Carrega Modelos de Texto customizados
        const resultTextModels = await chrome.storage.local.get(CUSTOM_TEXT_MODELS_STORAGE_KEY);
        if (resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY] && typeof resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY] === 'object') {
            customTextModels = resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_TRAMITAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                const defaultConfig = await response.json();
                customTextModels = defaultConfig.textModels || {};
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar modelos de texto padrão:`, e);
                customTextModels = {};
            }
        }

        // Garante que a seção 'Tramitar' dos modelos de texto esteja acessível
        if (!customTextModels.Tramitar || Object.keys(customTextModels.Tramitar).length === 0) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Tramitar' não encontrada ou vazia nos modelos de texto customizados/padrão.`);
            customTextModels.Tramitar = { "Erro": "Modelos de tramitação não carregados." };
        }

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
    
    function calculateAdjustedDate(baseDateStr, offsetDays, useWorkingDays, holidaysTimestamps, weekendRule, holidayRule) {
        if (typeof baseDateStr !== 'string' || !baseDateStr.trim()) {
            console.warn('calculateAdjustedDate: baseDateStr inválida.');
            return null;
        }

        const parts = baseDateStr.split('/');
        if (parts.length !== 3) return null;

        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

        let date = new Date(year, month, day);
        if (isNaN(date.getTime()) || date.getDate() !== day) {
            return null;
        }

        const isHoliday = (d) => {
            const normalizedTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            return holidaysTimestamps.includes(normalizedTime);
        };

        if (useWorkingDays) {
            let daysToAdd = Math.abs(offsetDays);
            const increment = offsetDays >= 0 ? 1 : -1;
            while (daysToAdd > 0) {
                date.setDate(date.getDate() + increment);
                const dayOfWeek = date.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday(date)) {
                    daysToAdd--;
                }
            }
        } else {
            date.setDate(date.getDate() + offsetDays);
        }

        let maxIterations = 10;
        while (maxIterations > 0) {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isTodayHoliday = !isWeekend && isHoliday(date);

            if (!isWeekend && !isTodayHoliday) {
                break;
            }

            if (isWeekend) {
                if (weekendRule === 'next') {
                    date.setDate(date.getDate() + (dayOfWeek === 6 ? 2 : 1));
                } else if (weekendRule === 'previous') {
                    date.setDate(date.getDate() - (dayOfWeek === 0 ? 2 : 1));
                } else {
                    date.setDate(date.getDate() + (dayOfWeek === 6 ? -1 : 1));
                }
            } else if (isTodayHoliday) {
                 if (holidayRule === 'next') {
                    date.setDate(date.getDate() + 1);
                } else if (holidayRule === 'previous') {
                    date.setDate(date.getDate() - 1);
                } else {
                    break;
                }
            }
            maxIterations--;
        }

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

    function exibirNomesParaSecretaria() {
        const selectElement = uiElementsTramitar.neuronSecretariasList;
        const ulElement = uiElementsTramitar.neuronNomesSecretaria;
        
        if (!selectElement || !ulElement) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos do painel de pontos focais não encontrados para exibirNomesParaSecretaria.`);
            return;
        }
        ulElement.innerHTML = '';
        const sigla = selectElement.value;
        if (sigla && customFocalPoints && customFocalPoints[sigla]) { // Usa customFocalPoints
            const names = customFocalPoints[sigla].slice(1); // O primeiro nome é para o display, os demais para adicionar
            names.forEach(nome => {
                const li = document.createElement('li');
                li.textContent = nome;
                ulElement.appendChild(li);
            });
        }
    }
    
    function configurarAutotramitarOriginal() {
        const selectSecretarias = uiElementsTramitar.neuronSecretariasList;

        if (!selectSecretarias) return;
        const sigla = selectSecretarias.value;
        // Verifica se a sigla é válida e se há pelo menos 2 nomes (o display + 1 para adicionar)
        if (!sigla || !customFocalPoints || !customFocalPoints[sigla] || customFocalPoints[sigla].length < 2) { // Usa customFocalPoints
            alert('Selecione uma secretaria válida com pontos focais definidos (além do nome de display) ou verifique a configuração de Pontos Focais!');
            return;
        }
        const nomesParaAdicionar = customFocalPoints[sigla].slice(1); // Usa customFocalPoints
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

    async function processAndInjectPainelPontosFocais(templateContentNode) {
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
        
        // Remove painel existente para evitar duplicação
        document.getElementById('neuronPainelPontosFocais')?.remove();

        const painelWrapperDiv = document.createElement('div');
        painelWrapperDiv.id = 'neuronPainelPontosFocais';
        painelWrapperDiv.className = 'panel panel-default'; 
        
        let htmlContent = templateContentNode.innerHTML; 
        htmlContent = htmlContent
            .replace('{{PANEL_TITLE}}', 'Neuron - Pontos Focais')
            .replace('{{SELECT_SECRETARIA_LABEL}}', 'Selecione a Secretaria:')
            .replace('{{DEFAULT_SECRETARIA_OPTION_TEXT}}', 'Escolha uma Secretaria...')
            .replace('{{NOMES_RELACIONADOS_LABEL}}', 'Nome(s) relacionado(s) para adicionar:')
            .replace('{{AUTO_TRAMITAR_BUTTON_TEXT}}', 'Auto-Tramitar Pontos Focais');
        
        painelWrapperDiv.innerHTML = htmlContent;
        
        uiElementsTramitar.neuronSecretariasList = painelWrapperDiv.querySelector('#neuronSecretariasList');
        uiElementsTramitar.neuronNomesSecretaria = painelWrapperDiv.querySelector('#neuronNomesSecretaria');
        uiElementsTramitar.neuronBtnAutotramitar = painelWrapperDiv.querySelector('#neuronBtnAutotramitar');

        if (!uiElementsTramitar.neuronSecretariasList || !uiElementsTramitar.neuronNomesSecretaria || !uiElementsTramitar.neuronBtnAutotramitar) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos do painel de pontos focais não encontrados no template processado.`);
            return;
        }

        // Popula o select de secretarias com base em customFocalPoints
        if (customFocalPoints) {
            const sortedSiglas = Object.keys(customFocalPoints).sort((a,b) => a.localeCompare(b));
            for (const sigla of sortedSiglas) {
                const displayText = (Array.isArray(customFocalPoints[sigla]) && customFocalPoints[sigla].length > 0 && typeof customFocalPoints[sigla][0] === 'string') 
                                  ? customFocalPoints[sigla][0] : sigla;
                const option = document.createElement('option');
                option.value = sigla; option.textContent = displayText;
                uiElementsTramitar.neuronSecretariasList.appendChild(option);
            }
        }
        
        uiElementsTramitar.neuronSecretariasList.addEventListener('change', () => {
            exibirNomesParaSecretaria();
            localStorage.setItem('neuronSecretariaSelecionadaTramitar', uiElementsTramitar.neuronSecretariasList.value);
            uiElementsTramitar.neuronBtnAutotramitar.disabled // ativar quando estiver tudo pronto = !uiElementsTramitar.neuronSecretariasList.value;
        });

        const salvo = localStorage.getItem('neuronSecretariaSelecionadaTramitar');
        if (salvo && uiElementsTramitar.neuronSecretariasList.querySelector(`option[value="${salvo}"]`)) {
           uiElementsTramitar.neuronSecretariasList.value = salvo; 
           exibirNomesParaSecretaria();
           uiElementsTramitar.neuronBtnAutotramitar.disabled = !salvo;
        } else {
            uiElementsTramitar.neuronBtnAutotramitar.disabled = true; // Desabilita se não houver seleção inicial
        }
        
        uiElementsTramitar.neuronBtnAutotramitar.addEventListener('click', configurarAutotramitarOriginal);
        container.prepend(painelWrapperDiv);
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Painel Pontos Focais injetado.`);
    }

    async function processAndInjectSelectMensagens(templateContentNode) {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Processando e injetando Select de Mensagens...`, "color: green;");
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        const tagsField = document.getElementById(ID_CAMPO_TAGS_INFO);

        if (!mensagemField) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Campo de mensagem principal (${ID_CAMPO_MENSAGEM}) não encontrado.`);
            return;
        }
        if (!customTextModels.Tramitar || Object.keys(customTextModels.Tramitar).length === 0) { // Usa customTextModels
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Modelos de texto para tramitação vazios.`);
            // Se não há modelos, pode desabilitar o campo de mensagem Neuron ou deixar o original
            mensagemField.classList.remove('neuron-mensagem-expandida'); // Garante que a classe seja removida se não houver modelos
            return;
        }
        if (!templateContentNode) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): templateContentNode para Select de Mensagens não fornecido.`);
            return;
        }
        
        // Remove select existente para evitar duplicação
        document.getElementById('neuronSelectMensagensTramitar')?.remove();
        
        const selectElementTemplate = templateContentNode.querySelector('select');
        if (!selectElementTemplate) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elemento <select> não encontrado dentro do templateContentNode de mensagens.`);
            return;
        }
        const selectElement = selectElementTemplate.cloneNode(true);
        selectElement.id = 'neuronSelectMensagensTramitar'; // Garante o ID no elemento clonado

        const defaultOption = selectElement.querySelector('option[value=""]');
        if (defaultOption) {
            defaultOption.textContent = defaultOption.textContent.replace('{{DEFAULT_MESSAGE_OPTION_TEXT}}', 'Neuron: Selecione um modelo de mensagem...');
        } else {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Opção default não encontrada no template do select de mensagens.`);
        }
            
        // Popula o select de mensagens com base em customTextModels.Tramitar
        const sortedMessageKeys = Object.keys(customTextModels.Tramitar).sort((a,b) => a.localeCompare(b));
        for (const chave of sortedMessageKeys) {
            if (typeof customTextModels.Tramitar[chave] === 'string') { // Verifica se é um texto simples
                const option = document.createElement('option');
                option.value = chave; option.text = chave;
                selectElement.appendChild(option);
            }
        }

        selectElement.addEventListener('change', function () {
            // Limpa o campo de mensagem se a opção "Selecione um modelo..." for escolhida
            if (!this.value) {
                mensagemField.value = '';
                return;
            }

            const dataLimiteCalculada = calcularPrazoParaMensagemTramitar(); 
            const secretariaTag = tagsField ? tagsField.value : '{SECRETARIA_NAO_ENCONTRADA}';
            let templateText = customTextModels.Tramitar[this.value] || ''; // Usa customTextModels
            templateText = templateText.replace(/\{SECRETARIA\}/g, secretariaTag);
            templateText = templateText.replace(/\{PRAZO\}/g, dataLimiteCalculada);
            mensagemField.value = templateText;
            mensagemManualmenteEditada = false; // Reseta flag manual
        });
        
        mensagemField.addEventListener('input', () => { // Adiciona listener para detecção de edição manual
            mensagemManualmenteEditada = true;
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
            if (!fetchedHtmlDoc || !fetchedHtmlDoc.body) {
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
        // Limpa as referências de UI para garantir que sejam recriadas
        uiElementsTramitar = {};
    }

    async function criarOuAtualizarUI() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Tentando criar ou atualizar UI...`, "color: blue; font-weight: bold;");
        
        // Verifica se os elementos âncora existem antes de prosseguir
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        const painelContainer = document.querySelector(CONTAINER_PAINEL_SELECTOR);
        const prazoSpan = document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO);

        if (!mensagemField || !painelContainer || !prazoSpan) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos âncora da página não encontrados. UI não será criada/atualizada.`);
            removerElementosCriados(); // Garante que a UI antiga seja removida se os alvos sumiram
            return;
        }

        // Carrega templates se ainda não estiverem carregados
        const templatesCarregados = await carregarTemplates();
        if (!templatesCarregados || !fetchedHtmlDoc) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Templates não puderam ser carregados. UI não será criada.`);
            return;
        }
        
        // Sempre remove e recria para garantir que as opções estejam atualizadas
        // e para evitar duplicatas em caso de re-renderização completa da página
        removerElementosCriados();

        preencherCampoDataTratamentoConfiguravel(); 
        
        const painelTemplateNode = fetchedHtmlDoc.getElementById('neuron-template-pontos-focais');
        const selectMensagensTemplateNode = fetchedHtmlDoc.getElementById('neuron-template-select-mensagens');

        if (painelTemplateNode) {
            await processAndInjectPainelPontosFocais(painelTemplateNode); // Adicionado await
        } else {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Template para Pontos Focais ('neuron-template-pontos-focais') não encontrado.`);
        }
        
        if (selectMensagensTemplateNode) {
            await processAndInjectSelectMensagens(selectMensagensTemplateNode); // Adicionado await
        } else {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Template para Select de Mensagens ('neuron-template-select-mensagens') não encontrado.`);
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

    // Listener para mudanças nas configurações globais, modelos de texto ou pontos focais
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && (changes[CONFIG_STORAGE_KEY_TRAMITAR] || changes[CUSTOM_TEXT_MODELS_STORAGE_KEY] || changes[CUSTOM_FOCAL_POINTS_STORAGE_KEY])) {
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Configuração, modelos de texto ou pontos focais alterados. Reavaliando...`, "color: orange; font-weight: bold;");
            fetchedHtmlDoc = null; // Força recarregamento do template se necessário
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
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): URL atual (${window.location.href}) não corresponde a /Manifestacao/TramitarManifestacao.aspx. Script não será inicializado.`);
    }
})();