// Neuron 0.1.5 β/options.js - CAMINHOS JSON CORRIGIDOS
document.addEventListener('DOMContentLoaded', () => {
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
    const addHolidayButton = document.getElementById('addHolidayButton');
    const holidaysListUl = document.getElementById('holidaysList');
    const holidaysStatus = document.getElementById('holidaysStatus');
    const saveHolidaysButton = document.getElementById('saveHolidays');
    const resetHolidaysButton = document.getElementById('resetHolidays');
    const saveAllOptionsButton = document.getElementById('saveAllOptionsButton');
    const globalStatus = document.getElementById('globalStatus');

    const qtdItensTratarTriarInput = document.getElementById('qtdItensTratarTriar');
    const QTD_ITENS_STORAGE_KEY_OPTIONS = 'neuronTratarTriarQtdItens';
    const QTD_ITENS_DEFAULT_OPTIONS = 15;

    const toggleableScriptsOptions = {
        'style': { label: 'Animação de Loading Personalizada', default: true },
        'arquivar': { label: 'Assistente de Arquivamento', default: true },
        'encaminhar': { label: 'Assistente de Encaminhamento', default: true },
        'prorrogar': { label: 'Assistente de Prorrogação', default: true },
        'tramitar': { label: 'Assistente de Tramitação', default: true },
        'tratarTriar': { label: 'Melhorias Telas Triar/Tratar', default: true },
        'tratar': { label: 'Melhorias Tela Tratar Manifestação', default: true }
    };

    let currentHolidays = [];
    const DEFAULT_HOLIDAYS = [
        "01/01/2025", "03/03/2025", "04/03/2025", "18/04/2025", "21/04/2025",
        "01/05/2025", "19/06/2025", "28/10/2025", "20/11/2025", "25/12/2025"
    ];

    // --- Funções Utilitárias ---
    function displayStatus(element, message, isError = false, duration = 3000) { //
        if (!element) return;
        element.textContent = message;
        element.className = `status-message ${isError ? 'error' : 'success'}`;
        setTimeout(() => {
            if (element) {
                element.textContent = '';
                element.className = 'status-message';
            }
        }, duration);
    }

    function isValidDate(dateString) { //
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

    async function loadJsonConfiguration(storageKey, defaultConfigPath, editorElement, statusElement) { //
        try {
            const result = await chrome.storage.local.get(storageKey);
            if (result[storageKey]) {
                editorElement.value = result[storageKey];
                displayStatus(statusElement, 'Configuração personalizada carregada.');
            } else {
                // O caminho para chrome.runtime.getURL deve ser relativo à raiz da extensão
                const response = await fetch(chrome.runtime.getURL(defaultConfigPath)); // defaultConfigPath já é 'config/file.json'
                if (!response.ok) throw new Error(`HTTP error ${response.status} ao carregar ${defaultConfigPath}`);
                const defaultJson = await response.json();
                editorElement.value = JSON.stringify(defaultJson, null, 2);
                displayStatus(statusElement, `Configuração padrão de ${defaultConfigPath} carregada.`);
            }
        } catch (error) {
            console.error(`Erro ao carregar ${storageKey} (${defaultConfigPath}):`, error);
            editorElement.value = `// Erro ao carregar ${defaultConfigPath}: ${error.message}\n// Verifique o console e se o arquivo está em web_accessible_resources (se aplicável).`;
            displayStatus(statusElement, `Erro ao carregar ${storageKey}. Verifique o console.`, true);
        }
    }

    async function saveJsonConfiguration(storageKey, editorElement, statusElement) { //
        const jsonString = editorElement.value;
        try {
            JSON.parse(jsonString); 
            await chrome.storage.local.set({ [storageKey]: jsonString });
            displayStatus(statusElement, 'Configuração salva com sucesso!');
        } catch (error) {
            displayStatus(statusElement, `JSON inválido: ${error.message}`, true);
        }
    }

    async function resetJsonToDefault(storageKey, defaultConfigPath, editorElement, statusElement) { //
        try {
            // O caminho para chrome.runtime.getURL deve ser relativo à raiz da extensão
            const response = await fetch(chrome.runtime.getURL(defaultConfigPath)); // defaultConfigPath já é 'config/file.json'
            if (!response.ok) throw new Error(`HTTP error ${response.status} ao restaurar ${defaultConfigPath}`);
            const defaultJson = await response.json();
            const defaultJsonString = JSON.stringify(defaultJson, null, 2);
            editorElement.value = defaultJsonString;
            await chrome.storage.local.set({ [storageKey]: defaultJsonString }); // Salva o padrão no storage também
            displayStatus(statusElement, 'Configuração restaurada para o padrão e salva!');
        } catch (error) {
            console.error(`Erro ao resetar ${storageKey} para ${defaultConfigPath}:`, error);
            displayStatus(statusElement, `Erro ao resetar ${storageKey}. Verifique o console.`, true);
        }
    }

    // --- Lógica para Tabs ---
    const tabLinks = document.querySelectorAll('.tab-link'); //
    const tabContents = document.querySelectorAll('.tab-content'); //
    tabLinks.forEach(link => { //
        link.addEventListener('click', (event) => {
            // console.log('Tab link clicado:', event.currentTarget);
            const tabId = event.currentTarget.getAttribute('data-tab');
            // console.log('Target Tab ID:', tabId);

            tabLinks.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));

            event.currentTarget.classList.add('active');
            const activeTabContent = document.getElementById(tabId);
            if (activeTabContent) {
                activeTabContent.classList.add('active');
                // console.log('Activated Tab Content:', activeTabContent.id);
            } else {
                // console.error('Conteúdo da aba não encontrado para ID:', tabId);
            }
        });
    });

    // --- Lógica para Configurações Gerais ---
    async function loadGeneralSettings() { /* ... (código desta função como na resposta anterior, sem alterações aqui) ... */ //
        const scriptKeysToGet = Object.keys(toggleableScriptsOptions).map(id => `scriptEnabled_${id}`);
        const keysToGet = ['masterEnableNeuron', ...scriptKeysToGet, QTD_ITENS_STORAGE_KEY_OPTIONS]; 
        
        const result = await chrome.storage.local.get(keysToGet);
        
        const masterEnabled = result.masterEnableNeuron !== false;
        masterEnableCheckbox.checked = masterEnabled;

        for (const scriptId in toggleableScriptsOptions) {
            const checkbox = document.getElementById(`chk_options_${scriptId}`);
            if (checkbox) {
                checkbox.checked = result[`scriptEnabled_${scriptId}`] !== undefined ? result[`scriptEnabled_${scriptId}`] : toggleableScriptsOptions[scriptId].default;
            }
        }
        
        if (qtdItensTratarTriarInput) {
            qtdItensTratarTriarInput.value = result[QTD_ITENS_STORAGE_KEY_OPTIONS] !== undefined ? result[QTD_ITENS_STORAGE_KEY_OPTIONS] : QTD_ITENS_DEFAULT_OPTIONS;
        }
        toggleScriptCheckboxesAvailability(masterEnabled);
    }
    async function saveGeneralSettings() { /* ... (código desta função como na resposta anterior, sem alterações aqui) ... */ //
        const settingsToSave = { masterEnableNeuron: masterEnableCheckbox.checked };
        for (const scriptId in toggleableScriptsOptions) {
            const checkbox = document.getElementById(`chk_options_${scriptId}`);
            if (checkbox) settingsToSave[`scriptEnabled_${scriptId}`] = checkbox.checked;
        }

        if (qtdItensTratarTriarInput) {
            let qtdValue = parseInt(qtdItensTratarTriarInput.value, 10);
            const minVal = parseInt(qtdItensTratarTriarInput.min, 10);
            const maxVal = parseInt(qtdItensTratarTriarInput.max, 10);

            if (isNaN(qtdValue) || qtdValue < minVal || qtdValue > maxVal) {
                qtdValue = QTD_ITENS_DEFAULT_OPTIONS; 
                qtdItensTratarTriarInput.value = qtdValue; 
                console.warn(`Valor de "Itens por Página" inválido, restaurado para ${qtdValue}.`);
            }
            settingsToSave[QTD_ITENS_STORAGE_KEY_OPTIONS] = qtdValue;
        }
        
        await chrome.storage.local.set(settingsToSave);
    }
    function toggleScriptCheckboxesAvailability(masterEnabled) { /* ... (código desta função como na resposta anterior, sem alterações aqui) ... */ //
        for (const scriptId in toggleableScriptsOptions) {
            const checkbox = document.getElementById(`chk_options_${scriptId}`);
            if (checkbox) checkbox.disabled = !masterEnabled;
        }
        if (scriptsListDiv) scriptsListDiv.style.opacity = masterEnabled ? '1' : '0.5';
        const h3Element = scriptsListDiv ? scriptsListDiv.previousElementSibling : null;
        if (h3Element && h3Element.tagName === 'H3') {
            h3Element.style.opacity = masterEnabled ? '1' : '0.5';
        }
        
        if (qtdItensTratarTriarInput) {
            const tratarTriarCheckbox = document.getElementById('chk_options_tratarTriar');
            const isTratarTriarEnabled = tratarTriarCheckbox ? tratarTriarCheckbox.checked : false;
            qtdItensTratarTriarInput.disabled = !masterEnabled || !isTratarTriarEnabled;
        }
    }

    masterEnableCheckbox.addEventListener('change', () => { //
        toggleScriptCheckboxesAvailability(masterEnableCheckbox.checked);
    });

    for (const scriptId in toggleableScriptsOptions) { /* ... (código desta função como na resposta anterior, sem alterações aqui) ... */ //
        const config = toggleableScriptsOptions[scriptId];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'setting-item';
        const label = document.createElement('label');
        label.htmlFor = `chk_options_${scriptId}`;
        label.textContent = config.label;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `chk_options_${scriptId}`;
        checkbox.name = `chk_options_${scriptId}`;
        
        if (scriptId === 'tratarTriar') { 
            checkbox.addEventListener('change', () => {
                if (qtdItensTratarTriarInput) { 
                    qtdItensTratarTriarInput.disabled = !masterEnableCheckbox.checked || !checkbox.checked;
                }
            });
        }

        itemDiv.appendChild(label);
        itemDiv.appendChild(checkbox);
        if (scriptsListDiv) scriptsListDiv.appendChild(itemDiv);
    }

    // --- Lógica para Feriados ---
    function renderHolidays() { /* ... (código desta função como na resposta anterior, sem alterações aqui) ... */ } //
    async function loadHolidays() { /* ... (código desta função como na resposta anterior, sem alterações aqui) ... */ } //
    async function saveHolidaysToStorage() { /* ... (código desta função como na resposta anterior, sem alterações aqui) ... */ } //
    if (addHolidayButton) addHolidayButton.addEventListener('click', () => { /* ... (lógica original sem mudanças) ... */ }); //
    if (saveHolidaysButton) saveHolidaysButton.addEventListener('click', async () => { /* ... (lógica original sem mudanças) ... */ }); //
    if (resetHolidaysButton) resetHolidaysButton.addEventListener('click', async () => { /* ... (lógica original sem mudanças) ... */ }); //

    // --- Inicialização e Botão Salvar Tudo ---
    async function initializeOptionsPage() {
        await loadGeneralSettings(); 
        // CORRIGIDO: Caminhos para JSON padrão devem ser relativos à raiz da extensão
        await loadJsonConfiguration('userTextJson', 'config/text.json', textJsonEditor, textJsonStatus);
        await loadJsonConfiguration('userPontosFocaisJson', 'config/pontosfocais.json', pontosFocaisJsonEditor, pontosFocaisJsonStatus);
        await loadHolidays();

        if (saveTextJsonButton) saveTextJsonButton.addEventListener('click', () => saveJsonConfiguration('userTextJson', textJsonEditor, textJsonStatus));
        if (resetTextJsonButton) resetTextJsonButton.addEventListener('click', () => resetJsonToDefault('userTextJson', 'config/text.json', textJsonEditor, textJsonStatus));
        
        if (savePontosFocaisJsonButton) savePontosFocaisJsonButton.addEventListener('click', () => saveJsonConfiguration('userPontosFocaisJson', pontosFocaisJsonEditor, pontosFocaisJsonStatus));
        if (resetPontosFocaisJsonButton) resetPontosFocaisJsonButton.addEventListener('click', () => resetJsonToDefault('userPontosFocaisJson', 'config/pontosfocais.json', pontosFocaisJsonEditor, pontosFocaisJsonStatus));
   
        if (saveAllOptionsButton) { //
            saveAllOptionsButton.addEventListener('click', async () => {
                try {
                    await saveGeneralSettings(); 
                    await saveJsonConfiguration('userTextJson', textJsonEditor, textJsonStatus); 
                    await saveJsonConfiguration('userPontosFocaisJson', pontosFocaisJsonEditor, pontosFocaisJsonStatus); 
                    await saveHolidaysToStorage(); 
                    displayStatus(globalStatus, "Todas as alterações foram salvas!", false, 4000);
                } catch (error) {
                    console.error("Erro ao salvar todas as opções:", error);
                    displayStatus(globalStatus, `Erro ao salvar todas as opções: ${error.message}`, true, 5000);
                }
            });
        }
    }

    initializeOptionsPage();
});