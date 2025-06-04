// Neuron 0.3.1/options.js - CENTRALIZED CONFIG
document.addEventListener('DOMContentLoaded', () => {
    const CONFIG_STORAGE_KEY = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH = 'config/config.json';

    // Elementos da UI
    const masterEnableCheckbox = document.getElementById('masterEnableOptions');
    const scriptsListDiv = document.getElementById('scriptsListOptions');
    const textJsonEditor = document.getElementById('textJsonEditor');
    const saveTextJsonButton = document.getElementById('saveTextJson');
    const resetTextJsonButton = document.getElementById('resetTextJson');
    const textJsonStatus = document.getElementById('textJsonStatus');
    const pontosFocaisJsonEditor = document.getElementById('pontosFocaisJsonEditor');
    const savePontosFocaisJsonButton = document.getElementById('savePontosFocaisJson');
    const resetPontosFocaisJsonButton = document.getElementById('resetPontosFocaisJson');
    const pontosFocaisJsonStatus = document.getElementById('pontosFocaisJsonStatus');
    
    const holidayInput = document.getElementById('holidayInput');
    const holidayDescriptionInput = document.getElementById('holidayDescriptionInput');
    const addHolidayButton = document.getElementById('addHolidayButton');
    const holidaysListUl = document.getElementById('holidaysList');
    const holidaysStatus = document.getElementById('holidaysStatus');
    const saveHolidaysButton = document.getElementById('saveHolidays');
    const resetHolidaysButton = document.getElementById('resetHolidays');
    
    const saveAllOptionsButton = document.getElementById('saveAllOptionsButton');
    const globalStatus = document.getElementById('globalStatus');
    const qtdItensTratarTriarInput = document.getElementById('qtdItensTratarTriar');

    // Raw config editor
    const rawConfigJsonEditor = document.getElementById('rawConfigJsonEditor');
    const saveRawConfigJsonButton = document.getElementById('saveRawConfigJson');
    const resetRawConfigJsonButton = document.getElementById('resetRawConfigJson');
    const rawConfigJsonStatus = document.getElementById('rawConfigJsonStatus');

    // Import/Export
    const exportConfigButton = document.getElementById('exportConfigButton');
    const importConfigFileInput = document.getElementById('importConfigFileInput');
    const importConfigButton = document.getElementById('importConfigButton');
    const importConfigStatus = document.getElementById('importConfigStatus');


    let currentFullConfig = {}; // Armazena a configuração completa carregada

    // --- Funções Utilitárias ---
    function displayStatus(element, message, isError = false, duration = 3000) {
        if (!element) return;
        element.textContent = message;
        element.className = `status-message ${isError ? 'error' : 'success'}`;
        element.style.display = 'block';
        setTimeout(() => {
            if (element) {
                element.textContent = '';
                element.className = 'status-message';
                element.style.display = 'none';
            }
        }, duration);
    }

    function isValidDate(dateString) {
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) return false;
        const parts = dateString.split("/");
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (year < 2000 || year > 2099 || month === 0 || month > 12) return false;
        const monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) monthLength[1] = 29;
        return day > 0 && day <= monthLength[month - 1];
    }

    async function fetchDefaultConfig() {
        try {
            const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH));
            if (!response.ok) throw new Error(`HTTP error ${response.status} ao carregar ${DEFAULT_CONFIG_PATH}`);
            return await response.json();
        } catch (error) {
            console.error(`Erro crítico ao carregar configuração padrão de ${DEFAULT_CONFIG_PATH}:`, error);
            displayStatus(globalStatus, `ERRO FATAL: Não foi possível carregar o arquivo de configuração base (${DEFAULT_CONFIG_PATH}). A página de opções pode não funcionar corretamente.`, true, 10000);
            return null; // Retorna null para indicar falha crítica
        }
    }
    
    async function loadFullConfig() {
        const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY);
        const defaultConfig = await fetchDefaultConfig();
        if (!defaultConfig) return; // Não prossegue se a config padrão falhou

        if (result[CONFIG_STORAGE_KEY] && typeof result[CONFIG_STORAGE_KEY] === 'object') {
            // Merge para garantir que novas chaves do default sejam adicionadas se não existirem no userConfig
            currentFullConfig = глубокоеСлияниеОбъектов({}, defaultConfig, result[CONFIG_STORAGE_KEY]);
        } else {
            currentFullConfig = defaultConfig;
        }
        // Garantir que as seções principais existem
        currentFullConfig.featureSettings = currentFullConfig.featureSettings || {};
        currentFullConfig.generalSettings = currentFullConfig.generalSettings || {};
        currentFullConfig.prazosSettings = currentFullConfig.prazosSettings || {};
        currentFullConfig.holidays = currentFullConfig.holidays || [];
        currentFullConfig.textModels = currentFullConfig.textModels || {};
        currentFullConfig.focalPoints = currentFullConfig.focalPoints || {};

        populateOptionsFromConfig();
    }

    // Helper para deep merge (simplificado, pode precisar de melhorias para arrays complexos)
    function глубокоеСлияниеОбъектов(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (isObject(target) && isObject(source)) {
            for (const key in source) {
                if (isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    глубокоеСлияниеОбъектов(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        return глубокоеСлияниеОбъектов(target, ...sources);
    }

    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }


    function populateOptionsFromConfig() {
        // Tab Geral
        masterEnableCheckbox.checked = currentFullConfig.masterEnableNeuron !== false;

        scriptsListDiv.innerHTML = ''; // Limpa a lista de scripts para recriar
        const featureSettings = currentFullConfig.featureSettings || {};
        const scriptsArray = Object.keys(featureSettings).map(id => ({
            id: id,
            label: featureSettings[id].label || `Funcionalidade ${id}`,
            defaultState: featureSettings[id].enabled !== undefined ? featureSettings[id].enabled : true
        })).sort((a, b) => a.label.localeCompare(b.label));

        scriptsArray.forEach(scriptConfig => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'setting-item';
            const labelEl = document.createElement('label');
            labelEl.htmlFor = `chk_options_${scriptConfig.id}`;
            labelEl.textContent = scriptConfig.label;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `chk_options_${scriptConfig.id}`;
            checkbox.name = `chk_options_${scriptConfig.id}`;
            checkbox.checked = scriptConfig.defaultState; // Default state from config
            
            checkbox.addEventListener('change', () => {
                if (scriptConfig.id === 'tratarTriar') {
                    toggleQtdItensInputAvailability(masterEnableCheckbox.checked, checkbox.checked);
                }
            });

            itemDiv.appendChild(labelEl);
            itemDiv.appendChild(checkbox);
            scriptsListDiv.appendChild(itemDiv);
        });
        
        qtdItensTratarTriarInput.value = currentFullConfig.generalSettings?.qtdItensTratarTriar || 15;
        const tratarTriarChk = document.getElementById('chk_options_tratarTriar');
        toggleQtdItensInputAvailability(masterEnableCheckbox.checked, tratarTriarChk ? tratarTriarChk.checked : false);


        // Tab Prazos
        const prazosSettings = currentFullConfig.prazosSettings || {};
        for (const key in prazosSettings) {
            const inputElement = document.getElementById(keyToInputId(key)); // Precisa de uma função para mapear chaves para IDs de input
            if (inputElement) {
                if (inputElement.type === 'checkbox') {
                    inputElement.checked = prazosSettings[key];
                } else if (inputElement.type === 'select-one') {
                    inputElement.value = prazosSettings[key];
                } else {
                    inputElement.value = prazosSettings[key];
                }
            }
        }
        renderHolidays(currentFullConfig.holidays || []);

        // Tab Textos
        textJsonEditor.value = JSON.stringify(currentFullConfig.textModels || {}, null, 2);

        // Tab Pontos Focais
        pontosFocaisJsonEditor.value = JSON.stringify(currentFullConfig.focalPoints || {}, null, 2);

        // Tab Config Raw
        rawConfigJsonEditor.value = JSON.stringify(currentFullConfig, null, 2);

        toggleGlobalUIEnableState(masterEnableCheckbox.checked);
    }
    
    // Mapeia chaves de config para IDs de input (simplificado)
    function keyToInputId(key) {
        // Casos especiais de mapeamento se os IDs de input não baterem 100% com as chaves do config.json
        // Ex: "configTramitacaoInternaDias" -> "configTramitacaoInternaDias" (já bate)
        // Ex: "weekendAdjustmentRule" -> "weekendAdjustmentRule" (já bate)
        // Se houver divergência, adicione um mapeamento aqui:
        const map = {
            // "configKeyFromJson": "inputIdHtml"
        };
        return map[key] || key; 
    }


    async function saveFullConfig() {
        try {
            await chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: currentFullConfig });
            return true;
        } catch (error) {
            console.error('Erro ao salvar configuração completa:', error);
            return false;
        }
    }
    
    // --- Lógica para Tabs ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    tabLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const tabId = event.currentTarget.getAttribute('data-tab');
            tabLinks.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));
            event.currentTarget.classList.add('active');
            const activeTabContent = document.getElementById(tabId);
            if (activeTabContent) {
                activeTabContent.classList.add('active');
            }
             // Atualizar o editor raw ao mudar para a aba de config raw
            if (tabId === 'tab-config-raw') {
                collectAllSettingsFromUI(); // Garante que currentFullConfig está atualizado com a UI
                rawConfigJsonEditor.value = JSON.stringify(currentFullConfig, null, 2);
            }
        });
    });

    // --- Lógica para Configurações Gerais ---
    masterEnableCheckbox.addEventListener('change', () => {
        const isEnabled = masterEnableCheckbox.checked;
        toggleGlobalUIEnableState(isEnabled);
    });
    
    function toggleGlobalUIEnableState(masterEnabled) {
        // Habilita/desabilita checkboxes de features
        const scriptCheckboxes = scriptsListDiv.querySelectorAll('input[type="checkbox"]');
        scriptCheckboxes.forEach(chk => chk.disabled = !masterEnabled);
        scriptsListDiv.style.opacity = masterEnabled ? '1' : '0.5';
        scriptsListDiv.previousElementSibling.style.opacity = masterEnabled ? '1' : '0.5'; // H3

        // Habilita/desabilita input qtdItensTratarTriar
        const tratarTriarChk = document.getElementById('chk_options_tratarTriar');
        toggleQtdItensInputAvailability(masterEnabled, tratarTriarChk ? tratarTriarChk.checked : false);
        
        // Habilita/desabilita campos na aba Prazos
        const prazosTab = document.getElementById('tab-prazos');
        if (prazosTab) {
            const prazosInputs = prazosTab.querySelectorAll('input, select');
            prazosInputs.forEach(input => input.disabled = !masterEnabled);
            Array.from(prazosTab.querySelectorAll('.setting-item, .setting-description, h3, .holiday-manager, .action-buttons'))
                 .forEach(el => el.style.opacity = masterEnabled ? '1' : '0.5');
            if (holidaysListUl) holidaysListUl.style.opacity = masterEnabled ? '1' : '0.5';
        }
    }
    
    function toggleQtdItensInputAvailability(masterEnabled, tratarTriarScriptEnabled) {
        const enableQtdInput = masterEnabled && tratarTriarScriptEnabled;
        qtdItensTratarTriarInput.disabled = !enableQtdInput;
        const qtdItensSettingItem = qtdItensTratarTriarInput.closest('.setting-item');
        const qtdItensDesc = qtdItensSettingItem?.nextElementSibling;
        if (qtdItensSettingItem) qtdItensSettingItem.style.opacity = enableQtdInput ? '1' : '0.5';
        if (qtdItensDesc && qtdItensDesc.classList.contains('setting-description')) {
            qtdItensDesc.style.opacity = enableQtdInput ? '1' : '0.5';
        }
    }

    // --- Lógica para Feriados ---
    let localHolidaysList = []; // Lista de feriados sendo editada na UI

    function renderHolidays(holidaysArray) {
        if (!holidaysListUl) return;
        holidaysListUl.innerHTML = '';
        localHolidaysList = JSON.parse(JSON.stringify(holidaysArray || [])); // Cria cópia local para edição
        
        localHolidaysList.sort((a, b) => {
            const [dayA, monthA, yearA] = a.date.split('/').map(Number);
            const [dayB, monthB, yearB] = b.date.split('/').map(Number);
            return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
        });

        localHolidaysList.forEach(holiday => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            textSpan.className = 'holiday-text';
            textSpan.textContent = `${holiday.date} - ${holiday.description || 'Sem descrição'}`;
            li.appendChild(textSpan);
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remover';
            removeButton.className = 'remove-holiday';
            removeButton.onclick = () => {
                localHolidaysList = localHolidaysList.filter(h => h.date !== holiday.date);
                renderHolidays(localHolidaysList); // Re-renderiza a lista local
            };
            li.appendChild(removeButton);
            holidaysListUl.appendChild(li);
        });
    }

    if (addHolidayButton) {
        addHolidayButton.addEventListener('click', () => {
            if (!holidayInput || !holidayDescriptionInput || !holidaysListUl) return;
            const dateStr = holidayInput.value.trim();
            const descriptionStr = holidayDescriptionInput.value.trim() || "Feriado";
            if (isValidDate(dateStr)) {
                if (!localHolidaysList.some(h => h.date === dateStr)) {
                    localHolidaysList.push({ date: dateStr, description: descriptionStr });
                    renderHolidays(localHolidaysList); // Re-renderiza a lista local
                    holidayInput.value = ''; holidayDescriptionInput.value = '';
                } else { displayStatus(holidaysStatus, 'Este feriado (data) já foi adicionado.', true, 2000); }
            } else { displayStatus(holidaysStatus, 'Data inválida. Use DD/MM/AAAA.', true, 2000); }
        });
    }

    if (saveHolidaysButton) {
        saveHolidaysButton.addEventListener('click', async () => {
            currentFullConfig.holidays = JSON.parse(JSON.stringify(localHolidaysList)); // Atualiza a config principal
            if (await saveFullConfig()) {
                displayStatus(holidaysStatus, 'Lista de feriados salva com sucesso!', false);
                rawConfigJsonEditor.value = JSON.stringify(currentFullConfig, null, 2); // Atualiza raw editor
            } else {
                displayStatus(holidaysStatus, 'Erro ao salvar feriados.', true);
            }
        });
    }
    
    if (resetHolidaysButton) {
        resetHolidaysButton.addEventListener('click', async () => {
            const defaultConfig = await fetchDefaultConfig();
            if (defaultConfig) {
                currentFullConfig.holidays = JSON.parse(JSON.stringify(defaultConfig.holidays || []));
                renderHolidays(currentFullConfig.holidays); // Renderiza a lista padrão
                if (await saveFullConfig()) {
                    displayStatus(holidaysStatus, 'Feriados restaurados para o padrão e salvos.', false);
                    rawConfigJsonEditor.value = JSON.stringify(currentFullConfig, null, 2); // Atualiza raw editor
                } else {
                    displayStatus(holidaysStatus, 'Erro ao salvar feriados restaurados.', true);
                }
            } else {
                 displayStatus(holidaysStatus, 'Erro ao carregar feriados padrão para restauração.', true);
            }
        });
    }

    // --- Lógica para Editores JSON (Textos, Pontos Focais, Raw Config) ---
    async function saveJsonSection(editorElement, configKey, statusElement, friendlyName) {
        const jsonString = editorElement.value;
        try {
            const parsedJson = JSON.parse(jsonString);
            currentFullConfig[configKey] = parsedJson;
            if (await saveFullConfig()) {
                displayStatus(statusElement, `${friendlyName} salvos com sucesso!`, false);
                // Se estamos salvando textModels ou focalPoints, atualizamos também o editor Raw
                if (configKey === 'textModels' || configKey === 'focalPoints') {
                     rawConfigJsonEditor.value = JSON.stringify(currentFullConfig, null, 2);
                }
            } else {
                displayStatus(statusElement, `Erro ao salvar ${friendlyName}.`, true);
            }
        } catch (error) {
            displayStatus(statusElement, `JSON inválido para ${friendlyName}: ${error.message}. Verifique a sintaxe.`, true);
        }
    }

    async function resetJsonSection(editorElement, configKey, statusElement, friendlyName) {
        const defaultConfig = await fetchDefaultConfig();
        if (defaultConfig && defaultConfig[configKey]) {
            currentFullConfig[configKey] = JSON.parse(JSON.stringify(defaultConfig[configKey]));
            editorElement.value = JSON.stringify(currentFullConfig[configKey], null, 2);
            if (await saveFullConfig()) {
                displayStatus(statusElement, `${friendlyName} restaurados para o padrão e salvos.`, false);
                rawConfigJsonEditor.value = JSON.stringify(currentFullConfig, null, 2); // Atualiza raw editor
            } else {
                displayStatus(statusElement, `Erro ao salvar ${friendlyName} restaurados.`, true);
            }
        } else {
            displayStatus(statusElement, `Erro ao carregar ${friendlyName} padrão para restauração.`, true);
        }
    }

    if (saveTextJsonButton) saveTextJsonButton.addEventListener('click', () => saveJsonSection(textJsonEditor, 'textModels', textJsonStatus, 'Modelos de Texto'));
    if (resetTextJsonButton) resetTextJsonButton.addEventListener('click', () => resetJsonSection(textJsonEditor, 'textModels', textJsonStatus, 'Modelos de Texto'));
    
    if (savePontosFocaisJsonButton) savePontosFocaisJsonButton.addEventListener('click', () => saveJsonSection(pontosFocaisJsonEditor, 'focalPoints', pontosFocaisJsonStatus, 'Pontos Focais'));
    if (resetPontosFocaisJsonButton) resetPontosFocaisJsonButton.addEventListener('click', () => resetJsonSection(pontosFocaisJsonEditor, 'focalPoints', pontosFocaisJsonStatus, 'Pontos Focais'));

    if (saveRawConfigJsonButton) {
        saveRawConfigJsonButton.addEventListener('click', async () => {
            const jsonString = rawConfigJsonEditor.value;
            try {
                const parsedJson = JSON.parse(jsonString);
                currentFullConfig = parsedJson; // Substitui toda a configuração
                if (await saveFullConfig()) {
                    displayStatus(rawConfigJsonStatus, 'Configuração completa salva com sucesso!', false);
                    // Repopular todas as abas para refletir as mudanças do raw editor
                    populateOptionsFromConfig(); 
                } else {
                    displayStatus(rawConfigJsonStatus, 'Erro ao salvar configuração completa.', true);
                }
            } catch (error) {
                displayStatus(rawConfigJsonStatus, `JSON inválido para Configuração Completa: ${error.message}.`, true);
            }
        });
    }
    if (resetRawConfigJsonButton) {
        resetRawConfigJsonButton.addEventListener('click', async () => {
            const defaultConfig = await fetchDefaultConfig();
            if (defaultConfig) {
                currentFullConfig = JSON.parse(JSON.stringify(defaultConfig)); // Restaura toda a config
                 if (await saveFullConfig()) {
                    displayStatus(rawConfigJsonStatus, 'Configuração global restaurada para o padrão e salva!', false);
                    populateOptionsFromConfig(); // Repopula todas as abas
                } else {
                    displayStatus(rawConfigJsonStatus, 'Erro ao salvar configuração global restaurada.', true);
                }
            } else {
                 displayStatus(rawConfigJsonStatus, 'Erro crítico ao carregar configuração padrão para restauração.', true);
            }
        });
    }
    
    // --- Botão Salvar Tudo ---
    function collectAllSettingsFromUI() {
        // Master Enable
        currentFullConfig.masterEnableNeuron = masterEnableCheckbox.checked;

        // Feature Settings (scripts)
        const scriptCheckboxes = scriptsListDiv.querySelectorAll('input[type="checkbox"]');
        scriptCheckboxes.forEach(checkbox => {
            const scriptId = checkbox.id.replace('chk_options_', '');
            if (currentFullConfig.featureSettings[scriptId]) {
                currentFullConfig.featureSettings[scriptId].enabled = checkbox.checked;
            }
        });

        // General Settings
        let qtdValue = parseInt(qtdItensTratarTriarInput.value, 10);
        const minVal = parseInt(qtdItensTratarTriarInput.min, 10); 
        const maxVal = parseInt(qtdItensTratarTriarInput.max, 10);
        if (isNaN(qtdValue) || qtdValue < minVal || qtdValue > maxVal) {
            qtdValue = currentFullConfig.generalSettings?.qtdItensTratarTriar || 15; // Fallback
            qtdItensTratarTriarInput.value = qtdValue;
        }
        currentFullConfig.generalSettings.qtdItensTratarTriar = qtdValue;

        // Prazos Settings
        const prazosSettings = currentFullConfig.prazosSettings || {};
        for (const key in prazosSettings) {
            const inputElement = document.getElementById(keyToInputId(key));
            if (inputElement) {
                if (inputElement.type === 'checkbox') {
                    prazosSettings[key] = inputElement.checked;
                } else if (inputElement.type === 'select-one') {
                     prazosSettings[key] = inputElement.value;
                } else { // number
                    const val = parseInt(inputElement.value, 10);
                    // Usa o valor padrão da config carregada se o input for inválido
                    prazosSettings[key] = isNaN(val) ? (currentFullConfig.prazosSettingsOriginalDefaults && currentFullConfig.prazosSettingsOriginalDefaults[key] !== undefined ? currentFullConfig.prazosSettingsOriginalDefaults[key] : 0) : val;
                    if (isNaN(val)) inputElement.value = prazosSettings[key];
                }
            }
        }
        currentFullConfig.prazosSettings = prazosSettings;
        // Holidays já são atualizados em currentFullConfig.holidays via saveHolidaysButton ou resetHolidaysButton
        // e localHolidaysList. Aqui, garantimos que a versão mais recente de localHolidaysList esteja em currentFullConfig
        currentFullConfig.holidays = JSON.parse(JSON.stringify(localHolidaysList));


        // TextModels e FocalPoints são salvos por seus próprios botões ou quando o "Salvar Todas" da Config Raw é usado.
        // Para o "Salvar Todas as Alterações" principal, podemos tentar parsear o que está nos textareas
        try {
            currentFullConfig.textModels = JSON.parse(textJsonEditor.value);
        } catch (e) {
            // Não para o salvamento global, mas o usuário deve ser notificado na aba de texto
            displayStatus(textJsonStatus, "Modelos de texto contêm JSON inválido. Não foram salvos por 'Salvar Todas'. Use o botão específico da aba.", true, 5000);
        }
        try {
            currentFullConfig.focalPoints = JSON.parse(pontosFocaisJsonEditor.value);
        } catch (e) {
            displayStatus(pontosFocaisJsonStatus, "Pontos focais contêm JSON inválido. Não foram salvos por 'Salvar Todas'. Use o botão específico da aba.", true, 5000);
        }
    }

    if (saveAllOptionsButton) {
        saveAllOptionsButton.addEventListener('click', async () => {
            collectAllSettingsFromUI(); // Pega os valores mais recentes da UI para currentFullConfig
            if (await saveFullConfig()) {
                displayStatus(globalStatus, "Todas as alterações aplicáveis foram salvas!", false, 4000);
                // Atualiza o editor raw, pois "Salvar Todas" afeta seu conteúdo
                rawConfigJsonEditor.value = JSON.stringify(currentFullConfig, null, 2);
            } else {
                displayStatus(globalStatus, `Erro ao salvar uma ou mais seções. Verifique as mensagens de status individuais.`, true, 5000);
            }
        });
    }

    // --- Import/Export ---
    if (exportConfigButton) {
        exportConfigButton.addEventListener('click', () => {
            collectAllSettingsFromUI(); // Garante que a config está atualizada com a UI
            const configString = JSON.stringify(currentFullConfig, null, 2);
            const blob = new Blob([configString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
            a.download = `neuron_config_backup_${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            displayStatus(globalStatus, "Configurações exportadas!", false, 3000);
        });
    }

    if (importConfigButton && importConfigFileInput) {
        importConfigButton.addEventListener('click', () => {
            const file = importConfigFileInput.files[0];
            if (!file) {
                displayStatus(importConfigStatus, "Nenhum arquivo selecionado.", true, 3000);
                return;
            }
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedConfig = JSON.parse(event.target.result);
                    // Validação básica da estrutura (pode ser mais robusta)
                    if (typeof importedConfig.masterEnableNeuron !== 'boolean' || !importedConfig.featureSettings || !importedConfig.textModels) {
                        throw new Error("Arquivo de configuração parece inválido ou com estrutura incorreta.");
                    }
                    currentFullConfig = importedConfig;
                    if (await saveFullConfig()) {
                        populateOptionsFromConfig(); // Recarrega toda a UI com a nova config
                        displayStatus(importConfigStatus, "Configurações importadas e salvas com sucesso! A página de opções foi atualizada.", false, 5000);
                    } else {
                        displayStatus(importConfigStatus, "Configurações importadas, mas houve um erro ao salvar.", true, 4000);
                    }
                } catch (error) {
                    console.error("Erro ao importar configuração:", error);
                    displayStatus(importConfigStatus, `Erro ao importar: ${error.message}`, true, 5000);
                } finally {
                    importConfigFileInput.value = ""; // Limpa o file input
                }
            };
            reader.onerror = () => {
                displayStatus(importConfigStatus, "Erro ao ler o arquivo.", true, 3000);
                 importConfigFileInput.value = "";
            };
            reader.readAsText(file);
        });
    }

    // --- Inicialização ---
    async function initializeOptionsPage() {
        const defaultConfig = await fetchDefaultConfig();
        if (!defaultConfig) {
             // Se a configuração padrão não pôde ser carregada, a página não pode funcionar.
             // A mensagem de erro já foi exibida por fetchDefaultConfig.
            return; 
        }
        // Guarda uma cópia das configurações de prazo padrão para fallback em caso de input inválido
        currentFullConfig.prazosSettingsOriginalDefaults = JSON.parse(JSON.stringify(defaultConfig.prazosSettings || {}));

        await loadFullConfig();
    }

    initializeOptionsPage();
});