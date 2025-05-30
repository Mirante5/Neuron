// Neuron 0.1.5 β/options.js - COM ORDENAÇÃO DA LISTA DE FUNCIONALIDADES E DESCRIÇÃO NOS FERIADOS
document.addEventListener('DOMContentLoaded', () => {
    const masterEnableCheckbox = document.getElementById('masterEnableOptions'); //
    const scriptsListDiv = document.getElementById('scriptsListOptions'); //
    const textJsonEditor = document.getElementById('textJsonEditor'); //
    const saveTextJsonButton = document.getElementById('saveTextJson'); //
    const resetTextJsonButton = document.getElementById('resetTextJson'); //
    const textJsonStatus = document.getElementById('textJsonStatus'); //
    const pontosFocaisJsonEditor = document.getElementById('pontosFocaisJsonEditor'); //
    const savePontosFocaisJsonButton = document.getElementById('savePontosFocaisJson'); //
    const resetPontosFocaisJsonButton = document.getElementById('resetPontosFocaisJson'); //
    const pontosFocaisJsonStatus = document.getElementById('pontosFocaisJsonStatus'); //
    
    // Elementos de Feriados
    const holidayInput = document.getElementById('holidayInput'); //
    const holidayDescriptionInput = document.getElementById('holidayDescriptionInput'); //
    const addHolidayButton = document.getElementById('addHolidayButton'); //
    const holidaysListUl = document.getElementById('holidaysList'); //
    const holidaysStatus = document.getElementById('holidaysStatus'); //
    const saveHolidaysButton = document.getElementById('saveHolidays'); //
    const resetHolidaysButton = document.getElementById('resetHolidays'); //
    
    const saveAllOptionsButton = document.getElementById('saveAllOptionsButton'); //
    const globalStatus = document.getElementById('globalStatus'); //

    const qtdItensTratarTriarInput = document.getElementById('qtdItensTratarTriar'); //
    const QTD_ITENS_STORAGE_KEY_OPTIONS = 'neuronTratarTriarQtdItens'; //
    const QTD_ITENS_DEFAULT_OPTIONS = 15; //

    // New select elements for date adjustment rules
    const weekendAdjustmentRuleSelect = document.getElementById('weekendAdjustmentRule');
    const holidayAdjustmentRuleSelect = document.getElementById('holidayAdjustmentRule');


    const toggleableScriptsOptions = { //
        'style': { label: 'Animação de Loading Personalizada', default: true }, //
        'arquivar': { label: 'Assistente de Arquivamento', default: true }, //
        'encaminhar': { label: 'Assistente de Encaminhamento', default: true }, //
        'prorrogar': { label: 'Assistente de Prorrogação', default: true }, //
        'tramitar': { label: 'Assistente de Tramitação', default: true }, //
        'tratarTriar': { label: 'Melhorias Telas Triar/Tratar', default: true }, //
        'tratar': { label: 'Melhorias Tela Tratar Manifestação', default: true } //
    };

    const PRAZO_CONFIGS = { //
        configTramitacaoInternaDias: { key: 'neuronSharedTramitacaoInternaDias', default: -10, inputId: 'configTramitacaoInternaDias', type: 'number' }, //
        configTramitacaoInternaDiasUteis: { key: 'neuronSharedTramitacaoInternaDiasUteis', default: false, inputId: 'configTramitacaoInternaDiasUteis', type: 'checkbox' }, //
        cobrancaAntesDias: { key: 'neuronTratarTriarCobrancaAntesDias', default: -5, inputId: 'cobrancaAntesDias', type: 'number' }, //
        cobrancaAntesDiasUteis: { key: 'neuronTratarTriarCobrancaAntesDiasUteis', default: true, inputId: 'cobrancaAntesDiasUteis', type: 'checkbox' }, //
        prorrogarEmDias: { key: 'neuronTratarTriarProrrogarEmDias', default: 0, inputId: 'prorrogarEmDias', type: 'number' }, //
        prorrogarEmDiasUteis: { key: 'neuronTratarTriarProrrogarEmDiasUteis', default: false, inputId: 'prorrogarEmDiasUteis', type: 'checkbox' }, //
        improrrogavelAposProrrogacaoDias: { key: 'neuronTratarTriarImprorrogavelAposProrrogacaoDias', default: 30, inputId: 'improrrogavelAposProrrogacaoDias', type: 'number' }, //
        improrrogavelAposProrrogacaoDiasUteis: { key: 'neuronTratarTriarImprorrogavelAposProrrogacaoDiasUteis', default: true, inputId: 'improrrogavelAposProrrogacaoDiasUteis', type: 'checkbox' }, //
        cobrancaAntesProrrogadoDias: { key: 'neuronTratarTriarCobrancaAntesProrrogadoDias', default: -5, inputId: 'cobrancaAntesProrrogadoDias', type: 'number' }, //
        cobrancaAntesProrrogadoDiasUteis: { key: 'neuronTratarTriarCobrancaAntesProrrogadoDiasUteis', default: true, inputId: 'cobrancaAntesProrrogadoDiasUteis', type: 'checkbox' }, //
        // New date adjustment configurations
        weekendAdjustment: { key: 'neuronWeekendAdjustment', default: 'next', inputId: 'weekendAdjustmentRule', type: 'select' },
        holidayAdjustment: { key: 'neuronHolidayAdjustment', default: 'next', inputId: 'holidayAdjustmentRule', type: 'select' }
    };

    let currentHolidays = []; //
    const FALLBACK_DEFAULT_HOLIDAYS = [ // Renamed to avoid confusion with a fetched default
        { date: "01/01/2025", description: "Confraternização Universal" },
        { date: "03/03/2025", description: "Carnaval" },
        { date: "04/03/2025", description: "Carnaval (Terça-feira)" },
        { date: "18/04/2025", description: "Paixão de Cristo" },
        { date: "21/04/2025", description: "Tiradentes" },
        { date: "01/05/2025", description: "Dia do Trabalho" },
        { date: "19/06/2025", description: "Corpus Christi" },
        { date: "07/09/2025", description: "Independência do Brasil" },
        { date: "12/10/2025", description: "Nossa Senhora Aparecida" },
        { date: "28/10/2025", description: "Dia do Servidor Público" },
        { date: "02/11/2025", description: "Finados" },
        { date: "15/11/2025", description: "Proclamação da República" },
        { date: "20/11/2025", description: "Dia Nacional de Zumbi e da Consciência Negra" },
        { date: "25/12/2025", description: "Natal" }
    ];

    // --- Funções Utilitárias ---
    function displayStatus(element, message, isError = false, duration = 3000) { //
        if (!element) return; //
        element.textContent = message; //
        element.className = `status-message ${isError ? 'error' : 'success'}`; //
        element.style.display = 'block'; //
        setTimeout(() => { //
            if (element) { //
                element.textContent = ''; //
                element.className = 'status-message'; //
                element.style.display = 'none'; //
            }
        }, duration); //
    }

    function isValidDate(dateString) { //
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) return false; //
        const parts = dateString.split("/"); //
        const day = parseInt(parts[0], 10); //
        const month = parseInt(parts[1], 10); //
        const year = parseInt(parts[2], 10); //
        if (year < 2000 || year > 2099 || month === 0 || month > 12) return false; //
        const monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; //
        if (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) monthLength[1] = 29; //
        return day > 0 && day <= monthLength[month - 1]; //
    }

    async function loadJsonConfiguration(storageKey, defaultConfigPath, editorElement, statusElement) { //
        try { //
            const result = await chrome.storage.local.get(storageKey); //
            if (result[storageKey] && typeof result[storageKey] === 'string') { //
                editorElement.value = result[storageKey]; //
            } else { //
                const response = await fetch(chrome.runtime.getURL(defaultConfigPath)); //
                if (!response.ok) throw new Error(`HTTP error ${response.status} ao carregar ${defaultConfigPath}`); //
                const defaultJson = await response.json(); //
                editorElement.value = JSON.stringify(defaultJson, null, 2); //
            }
        } catch (error) { //
            console.error(`Erro ao carregar ${storageKey} de ${defaultConfigPath}:`, error); //
            editorElement.value = `// Erro ao carregar ${defaultConfigPath}: ${error.message}\n// Verifique o console e o caminho do arquivo.`; //
            displayStatus(statusElement, `Erro ao carregar ${storageKey}. Verifique o console.`, true); //
        }
    }

    async function saveJsonConfiguration(storageKey, editorElement, statusElement) { //
        const jsonString = editorElement.value; //
        try { //
            JSON.parse(jsonString);  //
            await chrome.storage.local.set({ [storageKey]: jsonString }); //
            displayStatus(statusElement, 'Configuração salva com sucesso!', false); //
        } catch (error) { //
            displayStatus(statusElement, `JSON inválido: ${error.message}. Verifique a sintaxe.`, true); //
            throw error; //
        }
    }
    
    async function resetJsonToDefault(storageKey, defaultConfigPath, editorElement, statusElement) { //
        try { //
            const response = await fetch(chrome.runtime.getURL(defaultConfigPath)); //
            if (!response.ok) throw new Error(`HTTP error ${response.status} ao restaurar ${defaultConfigPath}`); //
            const defaultJson = await response.json(); //
            const defaultJsonString = JSON.stringify(defaultJson, null, 2); //
            editorElement.value = defaultJsonString; //
            await chrome.storage.local.set({ [storageKey]: defaultJsonString });  //
            displayStatus(statusElement, 'Configuração restaurada para o padrão e salva!', false); //
        } catch (error) { //
            console.error(`Erro ao resetar ${storageKey} para ${defaultConfigPath}:`, error); //
            displayStatus(statusElement, `Erro ao resetar ${storageKey}. Verifique o console.`, true); //
        }
    }


    // --- Lógica para Tabs ---
    const tabLinks = document.querySelectorAll('.tab-link'); //
    const tabContents = document.querySelectorAll('.tab-content'); //
    tabLinks.forEach(link => { //
        link.addEventListener('click', (event) => { //
            const tabId = event.currentTarget.getAttribute('data-tab'); //
            tabLinks.forEach(item => item.classList.remove('active')); //
            tabContents.forEach(item => item.classList.remove('active')); //
            event.currentTarget.classList.add('active'); //
            const activeTabContent = document.getElementById(tabId); //
            if (activeTabContent) { //
                activeTabContent.classList.add('active'); //
            }
        });
    });

    // --- Lógica para Configurações Gerais ---
    async function loadGeneralSettings() { //
        const scriptKeysToGet = Object.keys(toggleableScriptsOptions).map(id => `scriptEnabled_${id}`); //
        const keysToGet = ['masterEnableNeuron', ...scriptKeysToGet, QTD_ITENS_STORAGE_KEY_OPTIONS]; //
        for (const configKey in PRAZO_CONFIGS) { keysToGet.push(PRAZO_CONFIGS[configKey].key); } //
        
        const result = await chrome.storage.local.get(keysToGet); //
        const masterEnabled = result.masterEnableNeuron !== false; //
        masterEnableCheckbox.checked = masterEnabled; //

        scriptsArray.forEach(scriptConfig => { //
            const checkbox = document.getElementById(`chk_options_${scriptConfig.id}`); //
            if (checkbox) { //
                checkbox.checked = result[`scriptEnabled_${scriptConfig.id}`] !== undefined ? result[`scriptEnabled_${scriptConfig.id}`] : scriptConfig.defaultState; //
            }
        });
        
        if (qtdItensTratarTriarInput) { //
            qtdItensTratarTriarInput.value = result[QTD_ITENS_STORAGE_KEY_OPTIONS] !== undefined ? result[QTD_ITENS_STORAGE_KEY_OPTIONS] : QTD_ITENS_DEFAULT_OPTIONS; //
        }

        for (const configKey in PRAZO_CONFIGS) { //
            const config = PRAZO_CONFIGS[configKey]; //
            const inputElement = document.getElementById(config.inputId); //
            if (inputElement) { //
                if (config.type === 'checkbox') { //
                    inputElement.checked = result[config.key] !== undefined ? result[config.key] : config.default; //
                } else if (config.type === 'select') {
                    inputElement.value = result[config.key] !== undefined ? result[config.key] : config.default;
                } else { //
                    inputElement.value = result[config.key] !== undefined ? result[config.key] : config.default; //
                }
            }
        }
        toggleScriptCheckboxesAvailability(masterEnabled); //
        togglePrazoConfigsAvailability(masterEnabled);  //
    }

    async function saveGeneralSettings() { //
        const settingsToSave = { masterEnableNeuron: masterEnableCheckbox.checked }; //
        for (const scriptId in toggleableScriptsOptions) { //
            const checkbox = document.getElementById(`chk_options_${scriptId}`); //
            if (checkbox) settingsToSave[`scriptEnabled_${scriptId}`] = checkbox.checked; //
        }
        if (qtdItensTratarTriarInput) { //
            let qtdValue = parseInt(qtdItensTratarTriarInput.value, 10); //
            const minVal = parseInt(qtdItensTratarTriarInput.min, 10); const maxVal = parseInt(qtdItensTratarTriarInput.max, 10); //
            if (isNaN(qtdValue) || qtdValue < minVal || qtdValue > maxVal) { //
                qtdValue = QTD_ITENS_DEFAULT_OPTIONS; qtdItensTratarTriarInput.value = qtdValue;  //
            }
            settingsToSave[QTD_ITENS_STORAGE_KEY_OPTIONS] = qtdValue; //
        }
        for (const configKey in PRAZO_CONFIGS) { //
            const config = PRAZO_CONFIGS[configKey]; //
            const inputElement = document.getElementById(config.inputId); //
            if (inputElement) { //
                if (config.type === 'checkbox') { //
                     settingsToSave[config.key] = inputElement.checked; //
                } else if (config.type === 'select') {
                    settingsToSave[config.key] = inputElement.value;
                } else { //
                    const val = parseInt(inputElement.value, 10); //
                    settingsToSave[config.key] = isNaN(val) ? config.default : val; //
                    if (isNaN(val)) inputElement.value = config.default; //
                }
            }
        }
        await chrome.storage.local.set(settingsToSave); //
    }

    function setElementsOpacity(elements, opacity) { //
        elements.forEach(el => { //
            if (el) el.style.opacity = opacity; //
        });
    }
    
    function setElementsDisabled(elements, disabled) { //
        elements.forEach(el => { //
            if (el) el.disabled = disabled; //
        });
    }

    function toggleScriptCheckboxesAvailability(masterEnabled) { //
        const h3Funcionalidades = document.querySelector('#scriptsListOptions').previousElementSibling; //
        setElementsOpacity([h3Funcionalidades, scriptsListDiv], masterEnabled ? '1' : '0.5'); //
        const scriptCheckboxes = scriptsListDiv.querySelectorAll('input[type="checkbox"]'); //
        setElementsDisabled(Array.from(scriptCheckboxes), !masterEnabled); //
        
        if (qtdItensTratarTriarInput) { //
            const tratarTriarCheckbox = document.getElementById('chk_options_tratarTriar'); //
            const isTratarTriarEnabled = tratarTriarCheckbox ? tratarTriarCheckbox.checked : false; //
            const enableQtdInput = masterEnabled && isTratarTriarEnabled; //
            qtdItensTratarTriarInput.disabled = !enableQtdInput; //
            const qtdItensSettingItem = qtdItensTratarTriarInput.closest('.setting-item'); //
            const qtdItensDesc = qtdItensSettingItem?.nextElementSibling; //
            setElementsOpacity([qtdItensSettingItem, qtdItensDesc], enableQtdInput ? '1' : '0.5'); //
        }
    }
    
    function togglePrazoConfigsAvailability(masterEnabled) { //
        const h3Prazos = Array.from(document.querySelectorAll('#tab-prazos h3')).find(h3 => h3.textContent === 'Configurações de Prazos:'); //
        const h3DateAdjustment = Array.from(document.querySelectorAll('#tab-prazos h3')).find(h3 => h3.textContent === 'Configurações de Ajuste de Data (Fim de Semana e Feriados):');
        setElementsOpacity([h3Prazos, h3DateAdjustment], masterEnabled ? '1' : '0.5');


        for (const configKey in PRAZO_CONFIGS) { //
            const config = PRAZO_CONFIGS[configKey]; //
            const inputElement = document.getElementById(config.inputId); //
            if (inputElement) { //
                inputElement.disabled = !masterEnabled; //
                const parentSettingItem = inputElement.closest('.setting-item'); //
                const description = parentSettingItem?.nextElementSibling; //
                setElementsOpacity([parentSettingItem, description && description.classList.contains('setting-description') ? description : null], masterEnabled ? '1' : '0.5'); //
            }
        }
        
        const h3Feriados = Array.from(document.querySelectorAll('#tab-prazos h3')).find(h3 => h3.textContent === 'Configuração de Feriados:');  //
        const feriadosDesc = h3Feriados?.nextElementSibling; //
        const holidayManagerDiv = document.querySelector('.holiday-manager'); //
        const holidayActionButtonsDiv = document.querySelector('#tab-prazos .holiday-manager + .status-message + .action-buttons'); //

        setElementsOpacity([h3Feriados, feriadosDesc, holidayManagerDiv, holidayActionButtonsDiv], masterEnabled ? '1' : '0.5'); //
        setElementsDisabled([holidayInput, holidayDescriptionInput, addHolidayButton, saveHolidaysButton, resetHolidaysButton], !masterEnabled); //
        if (holidaysListUl) holidaysListUl.style.opacity = masterEnabled ? '1' : '0.5'; //
    }

    masterEnableCheckbox.addEventListener('change', () => { //
        const isEnabled = masterEnableCheckbox.checked; //
        toggleScriptCheckboxesAvailability(isEnabled); //
        togglePrazoConfigsAvailability(isEnabled);  //
    });

    const scriptsArray = Object.keys(toggleableScriptsOptions).map(id => ({ //
        id: id, //
        label: toggleableScriptsOptions[id].label, //
        defaultState: toggleableScriptsOptions[id].default //
    }));
    scriptsArray.sort((a, b) => a.label.localeCompare(b.label));  //

    scriptsArray.forEach(scriptConfig => { //
        const scriptId = scriptConfig.id; //
        const itemDiv = document.createElement('div'); //
        itemDiv.className = 'setting-item'; //
        const labelEl = document.createElement('label'); //
        labelEl.htmlFor = `chk_options_${scriptId}`; //
        labelEl.textContent = scriptConfig.label;  //
        const checkbox = document.createElement('input'); //
        checkbox.type = 'checkbox'; //
        checkbox.id = `chk_options_${scriptId}`; //
        checkbox.name = `chk_options_${scriptId}`; //
        
        if (scriptId === 'tratarTriar') {  //
            checkbox.addEventListener('change', () => { //
                const isEnabled = masterEnableCheckbox.checked && checkbox.checked; //
                if (qtdItensTratarTriarInput) { //
                    qtdItensTratarTriarInput.disabled = !isEnabled; //
                    const qtdItensSettingItem = qtdItensTratarTriarInput.closest('.setting-item'); //
                    const qtdItensDesc = qtdItensSettingItem?.nextElementSibling; //
                    setElementsOpacity([qtdItensSettingItem, qtdItensDesc && qtdItensDesc.classList.contains('setting-description') ? qtdItensDesc : null], isEnabled ? '1' : '0.5'); //
                }
            });
        }
        itemDiv.appendChild(labelEl); //
        itemDiv.appendChild(checkbox); //
        if (scriptsListDiv) scriptsListDiv.appendChild(itemDiv); //
    });


    // --- Lógica para Feriados ---
    function renderHolidays() {  //
        if (!holidaysListUl) return; //
        holidaysListUl.innerHTML = ''; //
        currentHolidays.sort((a, b) => { //
            const [dayA, monthA, yearA] = a.date.split('/').map(Number); //
            const [dayB, monthB, yearB] = b.date.split('/').map(Number); //
            const dateA = new Date(yearA, monthA - 1, dayA); //
            const dateB = new Date(yearB, monthB - 1, dayB); //
            return dateA - dateB; //
        });
        currentHolidays.forEach(holiday => { //
            const li = document.createElement('li'); //
            const textSpan = document.createElement('span'); //
            textSpan.className = 'holiday-text'; //
            textSpan.textContent = `${holiday.date} - ${holiday.description || 'Sem descrição'}`; //
            li.appendChild(textSpan); //
            const removeButton = document.createElement('button'); //
            removeButton.textContent = 'Remover'; //
            removeButton.className = 'remove-holiday'; //
            removeButton.onclick = () => { //
                currentHolidays = currentHolidays.filter(h => h.date !== holiday.date); //
                renderHolidays(); //
            };
            li.appendChild(removeButton); //
            holidaysListUl.appendChild(li); //
        });
    }

    async function loadHolidays() { //
        if (!holidaysListUl) return; //
        try { //
            let holidaysToUse = null;
            const result = await chrome.storage.local.get('userHolidays'); //

            if (result.userHolidays && Array.isArray(result.userHolidays) && result.userHolidays.length > 0) { //
                if (typeof result.userHolidays[0] === 'object' && result.userHolidays[0].hasOwnProperty('date')) { //
                    holidaysToUse = result.userHolidays; //
                } else {
                     console.warn("Neuron Options: Formato de feriados no storage é inválido ou antigo. Tentando carregar padrão do JSON."); //
                }
            }

            if (!holidaysToUse) { 
                try {
                    const response = await fetch(chrome.runtime.getURL('config/prazos_feriados.json'));
                    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                    const defaultJson = await response.json();
                    if (defaultJson.feriados && Array.isArray(defaultJson.feriados)) {
                        holidaysToUse = defaultJson.feriados.map(h => ({ date: h.date, description: h.description || "Feriado" }));
                        console.log("Neuron Options: Feriados padrão carregados de config/prazos_feriados.json");
                    } else {
                        throw new Error("Formato inválido em config/prazos_feriados.json");
                    }
                } catch (e) {
                    console.error("Neuron Options: Falha ao carregar feriados de config/prazos_feriados.json. Usando fallback hardcoded.", e);
                    holidaysToUse = JSON.parse(JSON.stringify(FALLBACK_DEFAULT_HOLIDAYS));
                }
            }
            currentHolidays = holidaysToUse; //
            renderHolidays(); //
        } catch (error) { //
            console.error("Erro ao carregar feriados:", error); //
            currentHolidays = JSON.parse(JSON.stringify(FALLBACK_DEFAULT_HOLIDAYS)); //
            renderHolidays(); //
            displayStatus(holidaysStatus, 'Erro ao carregar feriados. Usando padrão.', true); //
        }
    }

    async function saveHolidaysToStorage() {  //
        if (!holidaysListUl) return Promise.reject("Elemento da lista de feriados não encontrado."); //
        try { //
            await chrome.storage.local.set({ userHolidays: currentHolidays }); //
            displayStatus(holidaysStatus, 'Feriados salvos com sucesso!', false); //
        } catch (error) { //
            console.error("Erro ao salvar feriados:", error); //
            displayStatus(holidaysStatus, 'Erro ao salvar feriados.', true); //
            throw error;  //
        }
    }

    if (addHolidayButton) { //
        addHolidayButton.addEventListener('click', () => { //
            if (!holidayInput || !holidayDescriptionInput || !holidaysListUl) return; //
            const dateStr = holidayInput.value.trim(); //
            const descriptionStr = holidayDescriptionInput.value.trim() || "Feriado";  //
            if (isValidDate(dateStr)) { //
                if (!currentHolidays.some(h => h.date === dateStr)) { //
                    currentHolidays.push({ date: dateStr, description: descriptionStr }); //
                    renderHolidays(); //
                    holidayInput.value = ''; holidayDescriptionInput.value = ''; //
                } else { displayStatus(holidaysStatus, 'Este feriado (data) já foi adicionado.', true, 2000); } //
            } else { displayStatus(holidaysStatus, 'Data inválida. Use DD/MM/AAAA.', true, 2000); } //
        });
    }
    if (saveHolidaysButton) { saveHolidaysButton.addEventListener('click', async () => await saveHolidaysToStorage()); } //
    if (resetHolidaysButton) { //
        resetHolidaysButton.addEventListener('click', async () => { //
            if (!holidaysListUl) return; //
            try {
                const response = await fetch(chrome.runtime.getURL('config/prazos_feriados.json'));
                if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                const defaultJson = await response.json();
                if (defaultJson.feriados && Array.isArray(defaultJson.feriados)) {
                    currentHolidays = defaultJson.feriados.map(h => ({ date: h.date, description: h.description || "Feriado" }));
                } else {
                    throw new Error("Formato inválido em config/prazos_feriados.json ao resetar.");
                }
            } catch (e) {
                 console.error("Neuron Options: Falha ao resetar feriados de config/prazos_feriados.json. Usando fallback hardcoded.", e);
                 currentHolidays = JSON.parse(JSON.stringify(FALLBACK_DEFAULT_HOLIDAYS)); //
            }
            renderHolidays(); //
            await saveHolidaysToStorage(); //
            displayStatus(holidaysStatus, 'Feriados restaurados para o padrão do arquivo e salvos.', false); //
        });
    }

    // --- Inicialização e Botão Salvar Tudo ---
    async function initializeOptionsPage() { //
        await loadGeneralSettings();  //
        await loadJsonConfiguration('userTextJson', 'config/text.json', textJsonEditor, textJsonStatus); //
        await loadJsonConfiguration('userPontosFocaisJson', 'config/pontosfocais.json', pontosFocaisJsonEditor, pontosFocaisJsonStatus); //
        await loadHolidays(); //

        if (saveTextJsonButton) saveTextJsonButton.addEventListener('click', () => saveJsonConfiguration('userTextJson', textJsonEditor, textJsonStatus)); //
        if (resetTextJsonButton) resetTextJsonButton.addEventListener('click', () => resetJsonToDefault('userTextJson', 'config/text.json', textJsonEditor, textJsonStatus)); //
        
        if (savePontosFocaisJsonButton) savePontosFocaisJsonButton.addEventListener('click', () => saveJsonConfiguration('userPontosFocaisJson', pontosFocaisJsonEditor, pontosFocaisJsonStatus)); //
        if (resetPontosFocaisJsonButton) resetPontosFocaisJsonButton.addEventListener('click', () => resetJsonToDefault('userPontosFocaisJson', 'config/pontosfocais.json', pontosFocaisJsonEditor, pontosFocaisJsonStatus)); //
   
        if (saveAllOptionsButton) { //
            saveAllOptionsButton.addEventListener('click', async () => { //
                let success = true; //
                try { //
                    await saveGeneralSettings();  //
                    await saveJsonConfiguration('userTextJson', textJsonEditor, textJsonStatus);  //
                    await saveJsonConfiguration('userPontosFocaisJson', pontosFocaisJsonEditor, pontosFocaisJsonStatus);  //
                    await saveHolidaysToStorage();  //
                } catch (error) { //
                    console.error("Erro ao salvar todas as opções:", error); //
                    displayStatus(globalStatus, `Erro ao salvar uma ou mais seções. Verifique as mensagens de status individuais.`, true, 5000); //
                    success = false; //
                }
                if (success) { //
                    displayStatus(globalStatus, "Todas as alterações foram salvas!", false, 4000); //
                }
            });
        }
    }
    initializeOptionsPage(); //
});