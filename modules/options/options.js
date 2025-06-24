// Neuron/modules/options/options.js (Corrigido)
document.addEventListener('DOMContentLoaded', () => {
    const CONFIG_STORAGE_KEY = 'neuronUserConfig';
    const CUSTOM_RESPONSES_STORAGE_KEY = 'customResponses';
    const CUSTOM_TEXT_MODELS_STORAGE_KEY = 'customTextModels';
    const CUSTOM_FOCAL_POINTS_STORAGE_KEY = 'customFocalPoints';
    const DEFAULT_CONFIG_PATH = 'config/config.json';

    // --- Mapeamento de Elementos da UI ---
    const uiElements = {
        tabLinks: document.querySelectorAll('.tab-link'),
        tabContents: document.querySelectorAll('.tab-content'),
        masterEnableCheckbox: document.getElementById('masterEnableOptions'),
        scriptsListDiv: document.getElementById('scriptsListOptions'),
        qtdItensTratarTriarInput: document.getElementById('qtdItensTratarTriar'),
        showRespondidaCheckbox: document.getElementById('showRespondidaNotifications'),
        showProrrogadaCheckbox: document.getElementById('showProrrogadaNotifications'),
        showComplementadaCheckbox: document.getElementById('showComplementadaNotifications'),
        daysLookaheadInput: document.getElementById('daysLookaheadNotifications'),
        prazosTab: document.getElementById('tab-prazos'),
        holidayInput: document.getElementById('holidayInput'),
        holidayDescriptionInput: document.getElementById('holidayDescriptionInput'),
        addHolidayButton: document.getElementById('addHolidayButton'),
        holidaysListUl: document.getElementById('holidaysList'),
        holidaysStatus: document.getElementById('holidaysStatus'),
        saveHolidaysButton: document.getElementById('saveHolidays'),
        resetHolidaysButton: document.getElementById('resetHolidays'),
        selectTextModelCategory: document.getElementById('selectTextModelCategory'),
        textModelsContainer: document.getElementById('textModelsContainer'),
        currentTextModelCategory: document.getElementById('currentTextModelCategory'),
        textModelsList: document.getElementById('textModelsList'),
        addTextModelBtn: document.getElementById('addTextModelBtn'),
        saveTextModelsBtn: document.getElementById('saveTextModelsBtn'),
        resetTextModelsBtn: document.getElementById('resetTextModelsBtn'),
        textModelsStatus: document.getElementById('textModelsStatus'),
        focalPointsList: document.getElementById('focalPointsList'),
        addFocalPointBtn: document.getElementById('addFocalPointBtn'),
        saveFocalPointsBtn: document.getElementById('saveFocalPointsBtn'),
        resetFocalPointsBtn: document.getElementById('resetFocalPointsBtn'),
        focalPointsStatus: document.getElementById('focalPointsStatus'),
        selectTipoRespostaConfig: document.getElementById('selectTipoRespostaConfig'),
        optionsContainer: document.getElementById('optionsContainer'),
        currentTipoRespostaSpan: document.getElementById('currentTipoResposta'),
        dropdownOptionsList: document.getElementById('dropdownOptionsList'),
        addOptionBtn: document.getElementById('addOptionBtn'),
        saveResponsesBtn: document.getElementById('saveResponsesBtn'),
        resetResponsesBtn: document.getElementById('resetResponsesBtn'),
        respostasStatus: document.getElementById('respostasStatus'),
        rawConfigJsonEditor: document.getElementById('rawConfigJsonEditor'),
        saveRawConfigJsonButton: document.getElementById('saveRawConfigJson'),
        resetRawConfigJsonButton: document.getElementById('resetRawConfigJson'),
        rawConfigJsonStatus: document.getElementById('rawConfigJsonStatus'),
        exportConfigButton: document.getElementById('exportConfigButton'),
        importConfigFileInput: document.getElementById('importConfigFileInput'),
        importConfigButton: document.getElementById('importConfigButton'),
        importConfigStatus: document.getElementById('importConfigStatus'),
        saveAllOptionsButton: document.getElementById('saveAllOptionsButton'),
        globalStatus: document.getElementById('globalStatus'),
    };

    let currentFullConfig = {};
    let localHolidaysList = [];
    let customResponses = {};
    let customTextModels = {};
    let customFocalPoints = {};
    let defaultFullConfig = {};

    // --- Funções Utilitárias (Definidas no início para garantir acessibilidade) ---

    function displayStatus(element, message, isError = false, duration = 4000) {
        if (!element) return;
        element.textContent = message;
        element.className = `status-message ${isError ? 'error' : 'success'}`;
        setTimeout(() => {
            if (element && element.textContent === message) {
                element.className = 'status-message';
                element.textContent = '';
            }
        }, duration);
    }

    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    function deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (isObject(target) && isObject(source)) {
            for (const key in source) {
                if (isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        return deepMerge(target, ...sources);
    }

    // Função utilitária para escapar HTML (necessária para values e textareas)
    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function fetchDefaultConfig() {
        try {
            const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Falha ao carregar config padrão:`, error);
            displayStatus(uiElements.globalStatus, `ERRO FATAL: Não foi possível carregar o arquivo de configuração base. A página pode não funcionar.`, true, 15000);
            return null;
        }
    }

    // --- Lógica de Manipulação de Dados para Modelos de Texto ---
    function updateTextModelKey(event) {
        const oldKey = event.target.dataset.originalKey;
        const newKey = event.target.value.trim();
        const category = uiElements.selectTextModelCategory.value;

        if (oldKey === newKey) return; 
        if (!newKey) {
            displayStatus(uiElements.textModelsStatus, 'A chave do modelo não pode ser vazia.', true);
            event.target.value = oldKey; 
            return;
        }
        if (customTextModels[category] && customTextModels[category][newKey] !== undefined) {
            displayStatus(uiElements.textModelsStatus, `A chave "${newKey}" já existe.`, true);
            event.target.value = oldKey;
            return;
        }

        const content = customTextModels[category][oldKey];
        delete customTextModels[category][oldKey];
        customTextModels[category][newKey] = content;
        event.target.dataset.originalKey = newKey; 
        displayStatus(uiElements.textModelsStatus, `Chave atualizada para "${newKey}".`, false);
    }

    function updateTextModelContent(event) {
        const key = event.target.dataset.key;
        const category = uiElements.selectTextModelCategory.value;
        if (customTextModels[category]) {
            customTextModels[category][key] = event.target.value;
        }
    }

    function removeTextModelOption(event) {
        const key = event.target.dataset.key;
        const category = uiElements.selectTextModelCategory.value;
        if (customTextModels[category]) {
            if (confirm(`Tem certeza que deseja remover o modelo "${key}" da categoria "${category}"?`)) {
                delete customTextModels[category][key];
                renderTextModelsOptions(category);
                displayStatus(uiElements.textModelsStatus, 'Modelo removido!', false);
            }
        }
    }

    // --- Lógica de Manipulação de Dados para Pontos Focais ---
    function updateFocalPointKey(event) {
        const oldKey = event.target.dataset.originalKey;
        const newKey = event.target.value.trim();
        if (oldKey === newKey) return; 
        if (!newKey) {
            displayStatus(uiElements.focalPointsStatus, 'A sigla da unidade não pode ser vazia.', true);
            event.target.value = oldKey; 
            return;
        }
        if (customFocalPoints[newKey] !== undefined) {
            displayStatus(uiElements.focalPointsStatus, `A sigla "${newKey}" já existe.`, true);
            event.target.value = oldKey;
            return;
        }
        const names = customFocalPoints[oldKey];
        delete customFocalPoints[oldKey];
        customFocalPoints[newKey] = names;
        event.target.dataset.originalKey = newKey; 
        displayStatus(uiElements.focalPointsStatus, `Sigla atualizada para "${newKey}".`, false);
    }

    function updateFocalPointNames(event) {
        const key = event.target.dataset.key;
        if (customFocalPoints[key]) {
            customFocalPoints[key] = event.target.value.split('\n').map(name => name.trim()).filter(name => name !== '');
        }
    }

    function removeFocalPoint(key) {
        if (confirm(`Tem certeza que deseja remover o ponto focal "${key}"?`)) {
            delete customFocalPoints[key];
            renderFocalPoints();
            displayStatus(uiElements.focalPointsStatus, 'Ponto focal removido!', false);
        }
    }
    
    // As funções addFocalPointName e removeFocalPointName foram removidas, pois a edição é via textarea.
    // Se você precisar de edição por linha para os nomes, precisaremos adicionar complexidade aqui.

    // --- Lógica de Navegação por Abas ---

    function setupTabs() {
        uiElements.tabLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                const tabId = event.currentTarget.dataset.tab;
                uiElements.tabLinks.forEach(item => item.classList.remove('active'));
                uiElements.tabContents.forEach(item => item.classList.remove('active'));

                event.currentTarget.classList.add('active');
                document.getElementById(tabId)?.classList.add('active');

                if (tabId === 'tab-config-raw') {
                    collectAllSettingsFromUI(); 
                    const fullConfigForRaw = deepMerge({}, currentFullConfig, { 
                        defaultResponses: customResponses,
                        textModels: customTextModels,
                        focalPoints: customFocalPoints
                    });
                    uiElements.rawConfigJsonEditor.value = JSON.stringify(fullConfigForRaw, null, 2);
                } else if (tabId === 'tab-respostas') {
                    uiElements.selectTipoRespostaConfig.value = '';
                    uiElements.optionsContainer.style.display = 'none';
                    uiElements.dropdownOptionsList.innerHTML = '';
                } else if (tabId === 'tab-textos') {
                    populateTextModelsCategories();
                    uiElements.selectTextModelCategory.value = '';
                    uiElements.textModelsContainer.style.display = 'none';
                    uiElements.textModelsList.innerHTML = '';
                } else if (tabId === 'tab-pontosfocais') {
                    renderFocalPoints();
                }
            });
        });
    }

    // --- Lógica de Preenchimento da UI a partir da Configuração ---

    function populateGeneralTab(config) {
        uiElements.masterEnableCheckbox.checked = config.masterEnableNeuron !== false;
        uiElements.scriptsListDiv.innerHTML = '';

        const featureSettings = config.featureSettings || {};
        Object.keys(featureSettings)
            .map(id => ({ ...featureSettings[id], id }))
            .sort((a, b) => a.label.localeCompare(b.label))
            .forEach(script => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'setting-item';
                itemDiv.innerHTML = `
                    <label for="chk_options_${script.id}">${script.label}</label>
                    <input type="checkbox" id="chk_options_${script.id}" name="chk_options_${script.id}">
                `;
                const checkbox = itemDiv.querySelector('input');
                checkbox.checked = script.enabled !== false;
                checkbox.addEventListener('change', () => {
                    if (script.id === 'tratarTriar') {
                        toggleQtdItensInputAvailability();
                    }
                });
                uiElements.scriptsListDiv.appendChild(itemDiv);
            });

        uiElements.qtdItensTratarTriarInput.value = config.generalSettings?.qtdItensTratarTriar || 15;
        toggleQtdItensInputAvailability();
    }

    function populateNotificationsTab(config) {
        const notifConfig = config.featureSettings?.notificacoes?.config || {};
        uiElements.showRespondidaCheckbox.checked = notifConfig.showRespondida !== false;
        uiElements.showProrrogadaCheckbox.checked = notifConfig.showProrrogada !== false;
        uiElements.showComplementadaCheckbox.checked = notifConfig.showComplementada !== false;
        uiElements.daysLookaheadInput.value = notifConfig.daysLookahead ?? 2;
    }

    function populatePrazosTab(config) {
        const prazosSettings = config.prazosSettings || {};
        for (const key in prazosSettings) {
            const inputElement = document.getElementById(key);
            if (inputElement) {
                if (inputElement.type === 'checkbox') inputElement.checked = prazosSettings[key];
                else inputElement.value = prazosSettings[key];
            }
        }
    }

    function populateHolidays(holidays) {
        uiElements.holidaysListUl.innerHTML = '';
        localHolidaysList = JSON.parse(JSON.stringify(holidays || []));
        localHolidaysList.sort((a, b) => {
            const dateA = a.date.split('/').reverse().join('-');
            const dateB = b.date.split('/').reverse().join('-');
            return new Date(dateA) - new Date(dateB);
        });
        
        localHolidaysList.forEach(holiday => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="holiday-text">${holiday.date} - ${holiday.description || 'Sem descrição'}</span>
                <button class="remove-holiday" data-date="${holiday.date}">Remover</button>
            `;
            uiElements.holidaysListUl.appendChild(li);
        });
    }

    function populateAllTabs(config) {
        populateGeneralTab(config);
        populateNotificationsTab(config);
        populatePrazosTab(config);
        populateHolidays(config.holidays);
        toggleGlobalUIEnableState();
    }

    // --- Lógica de Coleta de Dados da UI para a Configuração ---

    function collectGeneralTabData() {
        currentFullConfig.masterEnableNeuron = uiElements.masterEnableCheckbox.checked;
        uiElements.scriptsListDiv.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            const scriptId = chk.id.replace('chk_options_', '');
            if (currentFullConfig.featureSettings[scriptId]) {
                currentFullConfig.featureSettings[scriptId].enabled = chk.checked;
            }
        });
        currentFullConfig.generalSettings.qtdItensTratarTriar = parseInt(uiElements.qtdItensTratarTriarInput.value, 10);
    }
    
    function collectNotificationsTabData() {
        const notifConfig = currentFullConfig.featureSettings.notificacoes.config || {};
        notifConfig.showRespondida = uiElements.showRespondidaCheckbox.checked;
        notifConfig.showProrrogada = uiElements.showProrrogadaCheckbox.checked;
        notifConfig.showComplementada = uiElements.showComplementadaCheckbox.checked;
        notifConfig.daysLookahead = parseInt(uiElements.daysLookaheadInput.value, 10);
        currentFullConfig.featureSettings.notificacoes.config = notifConfig;
    }

    function collectPrazosTabData() {
        const prazosSettings = currentFullConfig.prazosSettings || {};
        for (const key in prazosSettings) {
            const inputElement = document.getElementById(key);
            if (inputElement) {
                if (inputElement.type === 'checkbox') prazosSettings[key] = inputElement.checked;
                else if (inputElement.type === 'number') prazosSettings[key] = parseInt(inputElement.value, 10) || 0;
                else prazosSettings[key] = inputElement.value;
            }
        }
    }
    
    // Função universal para coletar dados do editor JSON RAW
    function collectJsonDataFromEditor(editor, configKey, statusElement) {
        try {
            const parsedContent = JSON.parse(editor.value);
            
            if (configKey === null) { 
                customResponses = parsedContent.defaultResponses || {};
                customTextModels = parsedContent.textModels || {};
                customFocalPoints = parsedContent.focalPoints || {};

                delete parsedContent.defaultResponses;
                delete parsedContent.textModels;
                delete parsedContent.focalPoints;

                currentFullConfig = parsedContent;
            } else { 
                currentFullConfig[configKey] = parsedContent;
            }
            return true;
        } catch (e) {
            displayStatus(statusElement, `JSON inválido. As alterações nesta aba não serão salvas. Erro: ${e.message}`, true);
            return false;
        }
    }

    function collectAllSettingsFromUI() {
        collectGeneralTabData();
        collectNotificationsTabData();
        collectPrazosTabData();
        currentFullConfig.holidays = localHolidaysList;
    }

    // --- Gerenciamento de Estado da UI ---

    function toggleQtdItensInputAvailability() {
        const masterEnabled = uiElements.masterEnableCheckbox.checked;
        const tratarTriarChk = document.getElementById('chk_options_tratarTriar');
        const tratarTriarEnabled = tratarTriarChk ? tratarTriarChk.checked : false;
        const isEnabled = masterEnabled && tratarTriarEnabled;
        uiElements.qtdItensTratarTriarInput.disabled = !isEnabled;
        uiElements.qtdItensTratarTriarInput.closest('.setting-item').style.opacity = isEnabled ? '1' : '0.5';
    }

    function toggleGlobalUIEnableState() {
        const masterEnabled = uiElements.masterEnableCheckbox.checked;
        const allFields = document.querySelectorAll('.tab-content input, .tab-content select, .tab-content textarea, .tab-content button');
        allFields.forEach(field => {
            if (field.id !== 'masterEnableOptions' && !field.closest('.options-header')) {
                field.disabled = !masterEnabled;
            }
        });
        document.querySelectorAll('.setting-item, .prazo-group, .holiday-manager, .tab-description, .action-buttons, .example-collapsible, .option-item')
            .forEach(el => {
                if (!el.classList.contains('master-switch')) {
                    el.style.opacity = masterEnabled ? '1' : '0.5';
                }
            });
        toggleQtdItensInputAvailability();
    }

    // --- Lógica de Ações (Salvar, Resetar, Importar, Exportar) ---

    async function saveFullConfig() {
        try {
            await chrome.storage.local.set({ 
                [CONFIG_STORAGE_KEY]: currentFullConfig,
                [CUSTOM_RESPONSES_STORAGE_KEY]: customResponses,
                [CUSTOM_TEXT_MODELS_STORAGE_KEY]: customTextModels,
                [CUSTOM_FOCAL_POINTS_STORAGE_KEY]: customFocalPoints
            });
            return true;
        } catch (error) {
            console.error('Erro ao salvar config:', error);
            displayStatus(uiElements.globalStatus, `Erro ao salvar configurações: ${error.message}`, true);
            return false;
        }
    }

    function setupActionButtons() {
        uiElements.saveAllOptionsButton.addEventListener('click', async () => {
            collectAllSettingsFromUI();
            if (await saveFullConfig()) {
                displayStatus(uiElements.globalStatus, "Todas as alterações foram salvas com sucesso!", false);
                const fullConfigForRaw = deepMerge({}, currentFullConfig, { 
                    defaultResponses: customResponses,
                    textModels: customTextModels,
                    focalPoints: customFocalPoints
                });
                uiElements.rawConfigJsonEditor.value = JSON.stringify(fullConfigForRaw, null, 2);
            }
        });

        uiElements.saveRawConfigJsonButton.addEventListener('click', saveRawConfig);
        uiElements.resetRawConfigJsonButton.addEventListener('click', resetRawConfig);
        uiElements.saveHolidaysButton.addEventListener('click', saveHolidays);
        uiElements.resetHolidaysButton.addEventListener('click', resetHolidays);

        uiElements.addHolidayButton.addEventListener('click', addHoliday);
        uiElements.holidaysListUl.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-holiday')) {
                removeHoliday(e.target.dataset.date);
            }
        });

        // Respostas Automáticas
        uiElements.selectTipoRespostaConfig.addEventListener('change', (event) => {
            const selectedType = event.target.value;
            if (selectedType) {
                uiElements.optionsContainer.style.display = 'block';
                uiElements.currentTipoRespostaSpan.textContent = selectedType;
                renderResponsesOptions(selectedType);
            } else {
                uiElements.optionsContainer.style.display = 'none';
                uiElements.dropdownOptionsList.innerHTML = '';
            }
        });
        uiElements.addOptionBtn.addEventListener('click', addResponsesOption);
        uiElements.saveResponsesBtn.addEventListener('click', saveResponsesConfig);
        uiElements.resetResponsesBtn.addEventListener('click', resetResponsesConfig);

        // Modelos de Texto
        uiElements.selectTextModelCategory.addEventListener('change', (event) => {
            const selectedCategory = event.target.value;
            if (selectedCategory) {
                uiElements.textModelsContainer.style.display = 'block';
                uiElements.currentTextModelCategory.textContent = selectedCategory;
                renderTextModelsOptions(selectedCategory);
            } else {
                uiElements.textModelsContainer.style.display = 'none';
                uiElements.textModelsList.innerHTML = '';
            }
        });
        uiElements.addTextModelBtn.addEventListener('click', addTextModelOption);
        uiElements.saveTextModelsBtn.addEventListener('click', saveTextModelsConfig);
        uiElements.resetTextModelsBtn.addEventListener('click', resetTextModelsConfig);

        // Pontos Focais
        uiElements.addFocalPointBtn.addEventListener('click', addFocalPoint);
        // O listener de input para atualização em tempo real dos names
        uiElements.focalPointsList.addEventListener('input', (e) => {
            if (e.target.classList.contains('focal-point-names')) {
                updateFocalPointNames(e);
            }
        });
        // O listener de change para atualização da key
        uiElements.focalPointsList.addEventListener('change', (e) => {
            if (e.target.classList.contains('focal-point-key')) {
                updateFocalPointKey(e);
            }
        });
        uiElements.focalPointsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-focal-point-btn')) {
                removeFocalPoint(e.target.dataset.key);
            }
        });
        uiElements.saveFocalPointsBtn.addEventListener('click', saveFocalPointsConfig);
        uiElements.resetFocalPointsBtn.addEventListener('click', resetFocalPointsConfig);


        // Import/Export
        uiElements.exportConfigButton.addEventListener('click', exportConfig);
        uiElements.importConfigButton.addEventListener('click', importConfig);
        
        // Toggle Master
        uiElements.masterEnableCheckbox.addEventListener('change', toggleGlobalUIEnableState);
    }

    async function saveRawConfig() {
        if (collectJsonDataFromEditor(uiElements.rawConfigJsonEditor, null, uiElements.rawConfigJsonStatus)) {
            if(await saveFullConfig()) {
                displayStatus(uiElements.rawConfigJsonStatus, 'Configuração completa salva com sucesso!', false);
                populateAllTabs(currentFullConfig); 
                if (document.getElementById('tab-respostas')?.classList.contains('active')) {
                     renderResponsesOptions(uiElements.selectTipoRespostaConfig.value);
                }
                if (document.getElementById('tab-textos')?.classList.contains('active')) {
                     populateTextModelsCategories();
                     renderTextModelsOptions(uiElements.selectTextModelCategory.value);
                }
                 if (document.getElementById('tab-pontosfocais')?.classList.contains('active')) {
                     renderFocalPoints();
                }
            }
        }
    }
    
    async function resetRawConfig() {
        const defaultConfig = await fetchDefaultConfig();
        if (defaultConfig) {
            currentFullConfig = defaultConfig;
            customResponses = JSON.parse(JSON.stringify(defaultConfig.defaultResponses || {})); 
            customTextModels = JSON.parse(JSON.stringify(defaultConfig.textModels || {})); 
            customFocalPoints = JSON.parse(JSON.stringify(defaultConfig.focalPoints || {})); 

            if(await saveFullConfig()) {
                displayStatus(uiElements.rawConfigJsonStatus, 'Configuração global restaurada para o padrão e salva.', false);
                populateAllTabs(currentFullConfig);
                if (document.getElementById('tab-respostas')?.classList.contains('active')) {
                     uiElements.selectTipoRespostaConfig.value = '';
                     renderResponsesOptions('');
                }
                if (document.getElementById('tab-textos')?.classList.contains('active')) {
                     populateTextModelsCategories();
                     uiElements.selectTextModelCategory.value = '';
                     renderTextModelsOptions('');
                }
                if (document.getElementById('tab-pontosfocais')?.classList.contains('active')) {
                     renderFocalPoints();
                }
            }
        }
    }
    
    function addHoliday() {
        const dateStr = uiElements.holidayInput.value.trim();
        const descStr = uiElements.holidayDescriptionInput.value.trim() || "Feriado";
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            if (!localHolidaysList.some(h => h.date === dateStr)) {
                localHolidaysList.push({ date: dateStr, description: descStr });
                populateHolidays(localHolidaysList);
                uiElements.holidayInput.value = '';
                uiElements.holidayDescriptionInput.value = '';
                displayStatus(uiElements.holidaysStatus, 'Feriado adicionado!', false);
            } else {
                displayStatus(uiElements.holidaysStatus, 'Esta data já existe na lista.', true);
            }
        } else {
            displayStatus(uiElements.holidaysStatus, 'Formato de data inválido. Use DD/MM/AAAA.', true);
        }
    }

    function removeHoliday(date) {
        localHolidaysList = localHolidaysList.filter(h => h.date !== date);
        populateHolidays(localHolidaysList);
        displayStatus(uiElements.holidaysStatus, 'Feriado removido!', false);
    }
    
    async function saveHolidays() {
        currentFullConfig.holidays = localHolidaysList;
        if (await saveFullConfig()) {
            displayStatus(uiElements.holidaysStatus, 'Lista de feriados salva.', false);
        }
    }
    
    async function resetHolidays() {
        const defaultConfig = await fetchDefaultConfig();
        if (defaultConfig) {
            populateHolidays(defaultConfig.holidays);
            await saveHolidays(); 
            displayStatus(uiElements.holidaysStatus, 'Feriados restaurados para o padrão.', false);
        }
    }

    // --- Lógica da Aba de Respostas Automáticas ---

    function renderResponsesOptions(type) {
        uiElements.dropdownOptionsList.innerHTML = ''; 
        const options = customResponses[type]?.novoDropdownOptions || [];

        if (options.length === 0 && type) {
            const noOptionsMsg = document.createElement('p');
            noOptionsMsg.textContent = 'Nenhuma opção configurada para este tipo de resposta. Clique em "Adicionar Nova Opção" para começar.';
            uiElements.dropdownOptionsList.appendChild(noOptionsMsg);
        }

        options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.classList.add('option-item', 'card', 'mb-3', 'p-3'); 
            optionDiv.innerHTML = `
                <div class="form-group">
                    <label>Texto da Opção:</label>
                    <input type="text" class="br-input option-text" value="${escapeHtml(option.text || '')}" data-index="${index}" placeholder="Ex: Deferida">
                </div>
                <div class="form-group mt-2">
                    <label>Conteúdo para Textarea:</label>
                    <textarea class="br-textarea option-textarea" data-index="${index}" placeholder="Ex: Prezado(a) manifestante, sua solicitação foi deferida.">${escapeHtml(option.conteudoTextarea || '')}</textarea>
                </div>
                <div class="form-group mt-2">
                    <label>Responsável (Opcional):</label>
                    <input type="text" class="br-input option-responsavel" value="${option.responsavel ? escapeHtml(option.responsavel) : ''}" data-index="${index}" placeholder="Ex: João da Silva">
                </div>
                <button class="br-button danger small mt-3 remove-responses-option-btn" data-index="${index}">Remover Opção</button>
            `;
            uiElements.dropdownOptionsList.appendChild(optionDiv);

            optionDiv.querySelector('.option-text').addEventListener('input', updateResponsesOptionData);
            optionDiv.querySelector('.option-textarea').addEventListener('input', updateResponsesOptionData);
            optionDiv.querySelector('.option-responsavel').addEventListener('input', updateResponsesOptionData);
            optionDiv.querySelector('.remove-responses-option-btn').addEventListener('click', removeResponsesOption);
        });
    }

    function addResponsesOption() {
        const selectedType = uiElements.selectTipoRespostaConfig.value;
        if (!selectedType) {
            displayStatus(uiElements.respostasStatus, 'Selecione um "Tipo de Resposta" primeiro para adicionar uma opção.', true);
            return;
        }

        if (!customResponses[selectedType]) {
            customResponses[selectedType] = { novoDropdownOptions: [] };
        }

        const newOption = {
            value: `new_option_${Date.now()}`, 
            text: '',
            conteudoTextarea: '',
            responsavel: null
        };
        customResponses[selectedType].novoDropdownOptions.push(newOption);
        renderResponsesOptions(selectedType); 
        displayStatus(uiElements.respostasStatus, 'Nova opção adicionada!', false);
    }

    function updateResponsesOptionData(event) {
        const index = parseInt(event.target.dataset.index);
        const type = uiElements.selectTipoRespostaConfig.value;
        const key = event.target.classList.contains('option-text') ? 'text' :
                    event.target.classList.contains('option-textarea') ? 'conteudoTextarea' :
                    'responsavel';
        let value = event.target.value;

        if (key === 'responsavel' && value.trim() === '') {
            value = null;
        }

        if (customResponses[type] && customResponses[type].novoDropdownOptions[index]) {
            customResponses[type].novoDropdownOptions[index][key] = value;
        }
    }

    function removeResponsesOption(event) {
        const index = parseInt(event.target.dataset.index);
        const type = uiElements.selectTipoRespostaConfig.value;

        if (customResponses[type] && customResponses[type].novoDropdownOptions.length > index) {
            if (confirm(`Tem certeza que deseja remover a opção "${customResponses[type].novoDropdownOptions[index].text || 'sem texto'}"?`)) {
                customResponses[type].novoDropdownOptions.splice(index, 1);
                renderResponsesOptions(type); 
                displayStatus(uiElements.respostasStatus, 'Opção removida!', false);
            }
        }
    }

    async function saveResponsesConfig() {
        if (await saveFullConfig()) { 
            displayStatus(uiElements.respostasStatus, 'Configurações de respostas salvas com sucesso!', false);
        } else {
            displayStatus(uiElements.respostasStatus, 'Erro ao salvar configurações de respostas.', true);
        }
    }

    async function resetResponsesConfig() {
        if (confirm('Tem certeza que deseja restaurar as opções de respostas para o padrão?')) {
            customResponses = JSON.parse(JSON.stringify(defaultFullConfig.defaultResponses || {}));
            if (await saveFullConfig()) {
                displayStatus(uiElements.respostasStatus, 'Opções de respostas restauradas para o padrão!', false);
                renderResponsesOptions(uiElements.selectTipoRespostaConfig.value);
            } else {
                displayStatus(uiElements.respostasStatus, 'Erro ao restaurar opções de respostas.', true);
            }
        }
    }

    // --- Lógica da Aba Modelos de Texto ---
    function populateTextModelsCategories() {
        uiElements.selectTextModelCategory.innerHTML = '<option value="">Selecione um Assistente</option>';
        const categories = Object.keys(customTextModels).sort();
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            uiElements.selectTextModelCategory.appendChild(option);
        });
    }

    function renderTextModelsOptions(category) {
        uiElements.textModelsList.innerHTML = '';
        const models = customTextModels[category];

        if (!models) { 
            const noModelsMsg = document.createElement('p');
            noModelsMsg.textContent = 'Nenhum modelo de texto configurado para esta categoria. Clique em "Adicionar Novo Modelo" para começar.';
            uiElements.textModelsList.appendChild(noModelsMsg);
            uiElements.addTextModelBtn.style.display = 'block'; // Mostrar botão de adicionar para categorias vazias
            return;
        }
        
        // Verifica se a categoria é um objeto simples (chave: texto)
        const isSimpleObject = typeof models === 'object' && !Array.isArray(models) && 
                                Object.values(models).every(val => typeof val === 'string');

        if (isSimpleObject) {
            Object.keys(models).forEach((key) => {
                const modelText = models[key];
                const modelDiv = document.createElement('div');
                modelDiv.classList.add('option-item', 'card', 'mb-3', 'p-3');
                modelDiv.innerHTML = `
                    <div class="form-group">
                        <label>Chave do Modelo:</label>
                        <input type="text" class="br-input text-model-key" value="${escapeHtml(key)}" data-original-key="${escapeHtml(key)}" placeholder="Ex: Duplicidade">
                    </div>
                    <div class="form-group mt-2">
                        <label>Conteúdo do Modelo:</label>
                        <textarea class="br-textarea text-model-content" placeholder="Ex: Sua manifestação (NUP) foi arquivada." data-key="${escapeHtml(key)}">${escapeHtml(modelText)}</textarea>
                    </div>
                    <button class="br-button danger small mt-3 remove-text-model-btn" data-key="${escapeHtml(key)}">Remover Modelo</button>
                `;
                uiElements.textModelsList.appendChild(modelDiv);

                modelDiv.querySelector('.text-model-key').addEventListener('change', updateTextModelKey); 
                modelDiv.querySelector('.text-model-content').addEventListener('input', updateTextModelContent);
                modelDiv.querySelector('.remove-text-model-btn').addEventListener('click', removeTextModelOption);
            });
            uiElements.addTextModelBtn.style.display = 'block'; // Mostrar botão para categorias simples
        } else {
            const complexJsonEditor = document.createElement('textarea');
            complexJsonEditor.id = 'complexTextModelEditor';
            complexJsonEditor.rows = 10;
            complexJsonEditor.spellcheck = false;
            complexJsonEditor.value = JSON.stringify(models, null, 2);
            complexJsonEditor.style.marginBottom = '15px'; 
            
            const warningMsg = document.createElement('p');
            warningMsg.classList.add('warning');
            warningMsg.innerHTML = '<strong>Atenção:</strong> Esta categoria tem uma estrutura JSON mais complexa. Edite diretamente no campo abaixo. JSON inválido pode causar problemas. Use os botões Salvar/Restaurar Modelos para esta seção.';

            uiElements.textModelsList.appendChild(warningMsg);
            uiElements.textModelsList.appendChild(complexJsonEditor);

            complexJsonEditor.addEventListener('input', () => {
                try {
                    customTextModels[category] = JSON.parse(complexJsonEditor.value);
                    displayStatus(uiElements.textModelsStatus, 'Edição temporariamente aplicada. Clique em Salvar Modelos para persistir.', false);
                } catch (e) {
                    displayStatus(uiElements.textModelsStatus, `JSON inválido para ${category}. Erro: ${e.message}`, true);
                }
            });

            uiElements.addTextModelBtn.style.display = 'none'; // Oculta o botão de adicionar para categorias complexas
        }
    }

    function addTextModelOption() {
        const selectedCategory = uiElements.selectTextModelCategory.value;
        if (!selectedCategory) {
            displayStatus(uiElements.textModelsStatus, 'Selecione um "Assistente" primeiro para adicionar um modelo.', true);
            return;
        }

        if (typeof customTextModels[selectedCategory] !== 'object' || Array.isArray(customTextModels[selectedCategory])) {
             customTextModels[selectedCategory] = {};
        }

        const newKey = `Novo Modelo ${Object.keys(customTextModels[selectedCategory]).length + 1}`;
        customTextModels[selectedCategory][newKey] = ''; 
        renderTextModelsOptions(selectedCategory);
        displayStatus(uiElements.textModelsStatus, 'Novo modelo adicionado!', false);
    }

    async function saveTextModelsConfig() {
        if (await saveFullConfig()) {
            displayStatus(uiElements.textModelsStatus, 'Modelos de texto salvos com sucesso!', false);
        } else {
            displayStatus(uiElements.textModelsStatus, 'Erro ao salvar modelos de texto.', true);
        }
    }

    async function resetTextModelsConfig() {
        if (confirm('Tem certeza que deseja restaurar os modelos de texto para o padrão?')) {
            customTextModels = JSON.parse(JSON.stringify(defaultFullConfig.textModels || {}));
            if (await saveFullConfig()) {
                displayStatus(uiElements.textModelsStatus, 'Modelos de texto restaurados para o padrão!', false);
                populateTextModelsCategories(); 
                renderTextModelsOptions(uiElements.selectTextModelCategory.value);
            } else {
                displayStatus(uiElements.textModelsStatus, 'Erro ao restaurar modelos de texto.', true);
            }
        }
    }

    // --- Lógica da Aba Pontos Focais ---

    function renderFocalPoints() {
        uiElements.focalPointsList.innerHTML = ''; 
        const focalPointsKeys = Object.keys(customFocalPoints).sort();

        if (focalPointsKeys.length === 0) {
            const noFocalPointsMsg = document.createElement('p');
            noFocalPointsMsg.textContent = 'Nenhum ponto focal configurado. Clique em "Adicionar Novo Ponto Focal" para começar.';
            uiElements.focalPointsList.appendChild(noFocalPointsMsg);
        }

        focalPointsKeys.forEach((key) => {
            const names = customFocalPoints[key]; 
            const focalPointDiv = document.createElement('div');
            focalPointDiv.classList.add('option-item', 'card', 'mb-3', 'p-3');
            focalPointDiv.innerHTML = `
                <div class="form-group">
                    <label>Sigla da Unidade (Chave):</label>
                    <input type="text" class="br-input focal-point-key" value="${escapeHtml(key)}" data-original-key="${escapeHtml(key)}" placeholder="Ex: GABINETE">
                </div>
                <div class="form-group mt-2">
                    <label>Nomes dos Responsáveis (um por linha):</label>
                    <textarea class="br-textarea focal-point-names" data-key="${escapeHtml(key)}" placeholder="Ex:&#10;Gabinete do Ministro&#10;Fulano de Tal (GM)">${escapeHtml(names.join('\n'))}</textarea>
                </div>
                <div class="action-buttons">
                    <button class="br-button danger small mt-3 remove-focal-point-btn" data-key="${escapeHtml(key)}">Remover Ponto Focal</button>
                </div>
            `;
            uiElements.focalPointsList.appendChild(focalPointDiv);

            // Listeners adicionados diretamente aos elementos criados
            focalPointDiv.querySelector('.focal-point-key').addEventListener('change', updateFocalPointKey);
            focalPointDiv.querySelector('.focal-point-names').addEventListener('input', updateFocalPointNames);
        });
    }

    function addFocalPoint() {
        let newKey = `Nova_Unidade_${Object.keys(customFocalPoints).length + 1}`;
        while(customFocalPoints[newKey] !== undefined) {
             newKey = `Nova_Unidade_${Date.now()}`;
        }
        customFocalPoints[newKey] = ['']; 
        renderFocalPoints();
        displayStatus(uiElements.focalPointsStatus, 'Novo ponto focal adicionado!', false);
    }

    async function saveFocalPointsConfig() {
        if (await saveFullConfig()) {
            displayStatus(uiElements.focalPointsStatus, 'Pontos focais salvos com sucesso!', false);
        } else {
            displayStatus(uiElements.focalPointsStatus, 'Erro ao salvar pontos focais.', true);
        }
    }

    async function resetFocalPointsConfig() {
        if (confirm('Tem certeza que deseja restaurar os pontos focais para o padrão?')) {
            customFocalPoints = JSON.parse(JSON.stringify(defaultFullConfig.focalPoints || {}));
            if (await saveFullConfig()) {
                displayStatus(uiElements.focalPointsStatus, 'Pontos focais restaurados para o padrão!', false);
                renderFocalPoints();
            } else {
                displayStatus(uiElements.focalPointsStatus, 'Erro ao restaurar pontos focais.', true);
            }
        }
    }

    // --- Import/Export (revisado para incluir customTextModels e customFocalPoints) ---

    function exportConfig() {
        collectAllSettingsFromUI(); 
        const configToExport = deepMerge({}, currentFullConfig, { 
            defaultResponses: customResponses, 
            textModels: customTextModels, 
            focalPoints: customFocalPoints 
        });
        const configString = JSON.stringify(configToExport, null, 2);
        const blob = new Blob([configString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neuron_config_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        displayStatus(uiElements.globalStatus, 'Configuração exportada com sucesso!', false);
    }

    function importConfig() {
        const file = uiElements.importConfigFileInput.files[0];
        if (!file) {
            displayStatus(uiElements.importConfigStatus, "Nenhum arquivo selecionado.", true);
            return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedConfig = JSON.parse(event.target.result);
                if (typeof importedConfig.masterEnableNeuron !== 'boolean' || !importedConfig.featureSettings) {
                    throw new Error("Estrutura do arquivo de configuração inválida.");
                }

                customResponses = importedConfig.defaultResponses || {};
                customTextModels = importedConfig.textModels || {};
                customFocalPoints = importedConfig.focalPoints || {};
                
                delete importedConfig.defaultResponses;
                delete importedConfig.textModels;
                delete importedConfig.focalPoints;
                
                currentFullConfig = importedConfig;

                if (await saveFullConfig()) { 
                    populateAllTabs(currentFullConfig); 
                    if (document.getElementById('tab-respostas')?.classList.contains('active')) {
                        uiElements.selectTipoRespostaConfig.value = ''; 
                        uiElements.optionsContainer.style.display = 'none';
                        uiElements.dropdownOptionsList.innerHTML = '';
                    }
                    if (document.getElementById('tab-textos')?.classList.contains('active')) {
                        populateTextModelsCategories();
                        uiElements.selectTextModelCategory.value = '';
                        uiElements.textModelsContainer.style.display = 'none';
                        uiElements.textModelsList.innerHTML = '';
                    }
                    if (document.getElementById('tab-pontosfocais')?.classList.contains('active')) {
                        renderFocalPoints();
                    }
                    displayStatus(uiElements.importConfigStatus, "Configurações importadas com sucesso!", false);
                }
            } catch (error) {
                displayStatus(uiElements.importConfigStatus, `Erro ao importar: ${error.message}`, true);
            } finally {
                 uiElements.importConfigFileInput.value = "";
            }
        };
        reader.readAsText(file);
    }

    // --- Inicialização ---

    async function initializeOptionsPage() {
        defaultFullConfig = await fetchDefaultConfig();
        if (!defaultFullConfig) return;

        const localResult = await chrome.storage.local.get([
            CONFIG_STORAGE_KEY, 
            CUSTOM_RESPONSES_STORAGE_KEY, 
            CUSTOM_TEXT_MODELS_STORAGE_KEY, 
            CUSTOM_FOCAL_POINTS_STORAGE_KEY
        ]);

        currentFullConfig = deepMerge({}, defaultFullConfig, localResult[CONFIG_STORAGE_KEY] || {});
        customResponses = deepMerge({}, defaultFullConfig.defaultResponses || {}, localResult[CUSTOM_RESPONSES_STORAGE_KEY] || {});
        customTextModels = deepMerge({}, defaultFullConfig.textModels || {}, localResult[CUSTOM_TEXT_MODELS_STORAGE_KEY] || {});
        customFocalPoints = deepMerge({}, defaultFullConfig.focalPoints || {}, localResult[CUSTOM_FOCAL_POINTS_STORAGE_KEY] || {});

        setupTabs();
        populateAllTabs(currentFullConfig); 
        setupActionButtons();

        uiElements.optionsContainer.style.display = 'none';
        uiElements.selectTipoRespostaConfig.value = '';
        uiElements.textModelsContainer.style.display = 'none';
        uiElements.selectTextModelCategory.value = '';
    }

    initializeOptionsPage();
});