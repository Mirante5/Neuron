document.addEventListener('DOMContentLoaded', () => {
    const CONFIG_STORAGE_KEY = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH = '/config/config.json';

    const ui = {
        masterEnable: document.getElementById('masterEnableOptions'),
        saveAllButton: document.getElementById('saveAllOptionsButton'),
        globalStatus: document.getElementById('globalStatus'),
        tabs: document.querySelectorAll('.tab-link'),
        tabContents: document.querySelectorAll('.tab-content'),
        rawConfigEditor: document.getElementById('rawConfigJsonEditor'),
        saveRawConfig: document.getElementById('saveRawConfigJsonButton'),
        resetRawConfig: document.getElementById('resetRawConfigJsonButton'),
        rawConfigStatus: document.getElementById('rawConfigJsonStatus'),
        exportConfig: document.getElementById('exportConfigButton'),
        importFileInput: document.getElementById('importConfigFileInput'),
        importConfig: document.getElementById('importConfigButton'),
        importStatus: document.getElementById('importConfigStatus'),
    };

    let fullConfig = {};
    let defaultConfig = {};

    const displayStatus = (el, msg, isError = false, duration = 4000) => {
        if (!el) return;
        el.textContent = msg;
        el.className = `status-message ${isError ? 'error' : 'success'}`;
        setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, duration);
    };

    const isObject = item => item && typeof item === 'object' && !Array.isArray(item);

    const deepMerge = (target, ...sources) => {
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
    };

    async function loadConfig() {
        try {
            const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            defaultConfig = await response.json();
            const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY);
            fullConfig = deepMerge(JSON.parse(JSON.stringify(defaultConfig)), result[CONFIG_STORAGE_KEY] || {});
        } catch (error) {
            displayStatus(ui.globalStatus, `ERRO CRÍTICO: Falha ao carregar configuração. ${error.message}`, true, 15000);
        }
    }

    async function saveConfig() {
        try {
            await chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: fullConfig });
            displayStatus(ui.globalStatus, "Configurações salvas com sucesso!", false);
        } catch (error) {
            displayStatus(ui.globalStatus, `Erro ao salvar: ${error.message}`, true);
        }
    }

    function populateAllTabs() {
        ui.masterEnable.checked = fullConfig.masterEnableNeuron !== false;
        document.getElementById('qtdItensTratarTriar').value = fullConfig.generalSettings.qtdItensTratarTriar;

        const prazosSettings = fullConfig.prazosSettings || {};
        document.getElementById('tratarNovoPrazoInternoDias').value = prazosSettings.tratarNovoPrazoInternoDias;
        document.getElementById('tratarNovoCobrancaInternaDias').value = prazosSettings.tratarNovoCobrancaInternaDias;
        document.getElementById('tratarNovoModoCalculo').value = prazosSettings.tratarNovoModoCalculo;
        document.getElementById('tratarNovoAjusteFds').value = prazosSettings.tratarNovoAjusteFds;
        document.getElementById('tratarNovoAjusteFeriado').value = prazosSettings.tratarNovoAjusteFeriado;

        updateGlobalUIEnableState();
    }

    function collectSettingsFromUI() {
        fullConfig.masterEnableNeuron = ui.masterEnable.checked;
        fullConfig.generalSettings.qtdItensTratarTriar = parseInt(document.getElementById('qtdItensTratarTriar').value, 10);

        const prazosSettings = fullConfig.prazosSettings || {};
        prazosSettings.tratarNovoPrazoInternoDias = parseInt(document.getElementById('tratarNovoPrazoInternoDias').value, 10);
        prazosSettings.tratarNovoCobrancaInternaDias = parseInt(document.getElementById('tratarNovoCobrancaInternaDias').value, 10);
        prazosSettings.tratarNovoModoCalculo = document.getElementById('tratarNovoModoCalculo').value;
        prazosSettings.tratarNovoAjusteFds = document.getElementById('tratarNovoAjusteFds').value;
        prazosSettings.tratarNovoAjusteFeriado = document.getElementById('tratarNovoAjusteFeriado').value;
        fullConfig.prazosSettings = prazosSettings;
    }

    function updateGlobalUIEnableState() {
        const enabled = ui.masterEnable.checked;
        document.querySelectorAll('.tab-content input, .tab-content select, .tab-content textarea, .tab-content button').forEach(field => {
            if (field.id !== 'masterEnableOptions') {
                field.disabled = !enabled;
            }
        });
    }

    function setupHolidaysTab() {
        renderHolidays();

        const statusEl = document.getElementById('holidaysStatus');

        document.getElementById('addHolidayButton').addEventListener('click', () => {
            const dateInput = document.getElementById('holidayInput');
            const descriptionInput = document.getElementById('holidayDescriptionInput');
            const date = dateInput.value.trim();
            const description = descriptionInput.value.trim();

            if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
                displayStatus(statusEl, 'Formato de data inválido. Use DD/MM/AAAA.', true);
                return;
            }
            if (!description) {
                displayStatus(statusEl, 'A descrição do feriado não pode estar vazia.', true);
                return;
            }

            if (!fullConfig.holidays) {
                fullConfig.holidays = [];
            }

            if (fullConfig.holidays.some(h => h.date === date)) {
                displayStatus(statusEl, `O feriado na data ${date} já existe.`, true);
                return;
            }

            fullConfig.holidays.push({ date, description });
            fullConfig.holidays.sort((a, b) => {
                const dateA = new Date(a.date.split('/').reverse().join('-'));
                const dateB = new Date(b.date.split('/').reverse().join('-'));
                return dateA - dateB;
            });

            renderHolidays();
            dateInput.value = '';
            descriptionInput.value = '';
            displayStatus(statusEl, 'Feriado adicionado à lista. Não se esqueça de salvar.', false);
        });

        document.getElementById('saveHolidaysButton').addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Feriados salvos com sucesso!', false);
        });

        document.getElementById('resetHolidaysButton').addEventListener('click', () => {
            if (confirm('Isso restaurará a lista de feriados para o padrão. Deseja continuar?')) {
                fullConfig.holidays = JSON.parse(JSON.stringify(defaultConfig.holidays));
                renderHolidays();
                displayStatus(statusEl, 'Feriados restaurados para o padrão.', false);
            }
        });
    }

    function renderHolidays() {
        const listEl = document.getElementById('holidaysList');
        if (!listEl) return;
        listEl.innerHTML = '';
        const holidays = fullConfig.holidays || [];

        if (holidays.length === 0) {
            listEl.innerHTML = '<li>Nenhum feriado configurado.</li>';
            return;
        }

        holidays.forEach((holiday, index) => {
            const itemLi = document.createElement('li');
            itemLi.innerHTML = `
                <span class="holiday-text">${holiday.date} - ${holiday.description}</span>
                <button class="remove-btn" data-index="${index}">Remover</button>
            `;
            listEl.appendChild(itemLi);
        });

        listEl.querySelectorAll('.remove-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.target.dataset.index, 10);
                fullConfig.holidays.splice(indexToRemove, 1);
                renderHolidays();
                const statusEl = document.getElementById('holidaysStatus');
                displayStatus(statusEl, 'Feriado removido. Não se esqueça de salvar.', false);
            });
        });
    }

    function setupResponsesTab() {
        const select = document.getElementById('selectTipoRespostaConfig');
        const container = document.getElementById('optionsContainer');
        const statusEl = document.getElementById('respostasStatus');

        select.innerHTML = '<option value="">Selecione um Tipo de Resposta...</option>';
        Object.keys(fullConfig.defaultResponses).sort().forEach(key => {
            select.innerHTML += `<option value="${key}">${key}</option>`;
        });

        select.addEventListener('change', () => {
            const tipoResposta = select.value;
            if (tipoResposta) {
                container.style.display = 'block';
                document.getElementById('currentTipoResposta').textContent = tipoResposta;
                renderResponseOptions(tipoResposta);
            } else {
                container.style.display = 'none';
            }
        });

        document.getElementById('addOptionBtn').addEventListener('click', () => {
            const tipoResposta = select.value;
            if (!tipoResposta) return;
            const newOption = {
                text: "Nova Opção",
                conteudoTextarea: "Escreva o conteúdo aqui...",
                responsavel: "Defina o responsável"
            };
            fullConfig.defaultResponses[tipoResposta].novoDropdownOptions.push(newOption);
            renderResponseOptions(tipoResposta);
        });

        document.getElementById('saveResponsesBtn').addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Respostas salvas com sucesso!', false);
        });

        document.getElementById('resetResponsesBtn').addEventListener('click', () => {
            const tipoResposta = select.value;
            if (!tipoResposta || !confirm(`Isso restaurará as respostas de "${tipoResposta}" para o padrão. Deseja continuar?`)) return;

            fullConfig.defaultResponses[tipoResposta] = JSON.parse(JSON.stringify(defaultConfig.defaultResponses[tipoResposta]));
            renderResponseOptions(tipoResposta);
            displayStatus(statusEl, 'Respostas restauradas para o padrão.', false);
        });
    }

    function renderResponseOptions(tipoResposta) {
        const listEl = document.getElementById('dropdownOptionsList');
        listEl.innerHTML = '';
        const options = fullConfig.defaultResponses[tipoResposta]?.novoDropdownOptions || [];

        options.forEach((option, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'option-item';
            itemDiv.innerHTML = `
                <label>Texto da Opção:</label>
                <input type="text" class="response-text" data-index="${index}" value="${option.text}">

                <label>Conteúdo da Resposta:</label>
                <textarea class="response-textarea" data-index="${index}" rows="4">${option.conteudoTextarea}</textarea>

                <label>Responsável:</label>
                <input type="text" class="response-responsavel" data-index="${index}" value="${option.responsavel}">

                <button class="remove-btn" data-index="${index}">Remover Opção</button>
            `;
            listEl.appendChild(itemDiv);
        });

        listEl.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.target.dataset.index, 10);
                fullConfig.defaultResponses[tipoResposta].novoDropdownOptions.splice(indexToRemove, 1);
                renderResponseOptions(tipoResposta);
            });
        });

        listEl.querySelectorAll('.response-text, .response-textarea, .response-responsavel').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                const property = e.target.classList.contains('response-text') ? 'text'
                    : e.target.classList.contains('response-textarea') ? 'conteudoTextarea'
                        : 'responsavel';
                fullConfig.defaultResponses[tipoResposta].novoDropdownOptions[index][property] = e.target.value;
            });
        });
    }

    function setupTextModelsTab() {
        const categorySelect = document.getElementById('selectTextModelCategory');
        const container = document.getElementById('textModelsContainer');
        const statusEl = document.getElementById('textModelsStatus');

        categorySelect.innerHTML = '<option value="">Selecione um Assistente...</option>';
        Object.keys(fullConfig.textModels).sort().forEach(key => {
            categorySelect.innerHTML += `<option value="${key}">${key}</option>`;
        });

        categorySelect.addEventListener('change', () => {
            const category = categorySelect.value;
            if (category) {
                container.style.display = 'block';
                document.getElementById('currentTextModelCategory').textContent = category;
                renderTextModels(category);
            } else {
                container.style.display = 'none';
            }
        });

        document.getElementById('addTextModelBtn').addEventListener('click', () => {
            const category = categorySelect.value;
            if (!category) return;
            const newKey = `Novo Modelo ${Date.now()}`;
            fullConfig.textModels[category][newKey] = "Novo conteúdo...";
            renderTextModels(category);
        });

        document.getElementById('saveTextModelsBtn').addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Modelos de texto salvos com sucesso!', false);
        });

        document.getElementById('resetTextModelsBtn').addEventListener('click', () => {
            const category = categorySelect.value;
            if (!category || !confirm(`Isso restaurará os modelos de "${category}" para o padrão. Deseja continuar?`)) return;
            fullConfig.textModels[category] = JSON.parse(JSON.stringify(defaultConfig.textModels[category]));
            renderTextModels(category);
            displayStatus(statusEl, 'Modelos restaurados para o padrão.', false);
        });
    }

    function renderTextModels(category) {
        const listEl = document.getElementById('textModelsList');
        listEl.innerHTML = '';
        const models = fullConfig.textModels[category];

        for (const key in models) {
            const value = models[key];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'option-item';
            const removeBtnHTML = `<button class="remove-btn" data-key="${key}">Remover Modelo</button>`;
            if (typeof value === 'string') {
                itemDiv.innerHTML = `
                    <div class="form-group">
                        <label>Chave do Modelo:</label>
                        <input type="text" class="model-key" value="${key}" data-category="${category}" data-original-key="${key}">
                    </div>
                    <div class="form-group mt-2">
                        <label>Conteúdo:</label>
                        <textarea class="model-value" rows="5">${value}</textarea>
                    </div>
                    ${removeBtnHTML}
                `;
            } else if (isObject(value)) {
                let nestedHTML = '';
                for (const subKey in value) {
                    nestedHTML += `
                        <div class="nested-item form-group mt-2">
                            <label><strong>Sub-item:</strong> ${subKey}</label>
                            <textarea class="model-sub-value" data-parent-key="${key}" data-sub-key="${subKey}" rows="5">${value[subKey]}</textarea>
                        </div>
                    `;
                }
                itemDiv.innerHTML = `
                    <fieldset class="nested-fieldset">
                        <legend>${key}</legend>
                        ${nestedHTML}
                    </fieldset>
                    ${removeBtnHTML}
                `;
            }
            listEl.appendChild(itemDiv);
        }
        addTextModelListeners(category);
    }

    function addTextModelListeners(category) {
        document.querySelectorAll('.remove-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                const keyToRemove = e.target.dataset.key;
                if (confirm(`Tem certeza que deseja remover o modelo "${keyToRemove}"?`)) {
                    delete fullConfig.textModels[category][keyToRemove];
                    renderTextModels(category);
                }
            });
        });
        document.querySelectorAll('.model-value').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const key = e.target.closest('.option-item').querySelector('.model-key').value;
                fullConfig.textModels[category][key] = e.target.value;
            });
        });
        document.querySelectorAll('.model-key').forEach(input => {
            input.addEventListener('change', (e) => {
                const originalKey = e.target.dataset.originalKey;
                const newKey = e.target.value;
                if (originalKey !== newKey && newKey) {
                    const value = fullConfig.textModels[category][originalKey];
                    delete fullConfig.textModels[category][originalKey];
                    fullConfig.textModels[category][newKey] = value;
                    e.target.dataset.originalKey = newKey;
                } else if (!newKey) {
                    e.target.value = originalKey;
                }
            });
        });
        document.querySelectorAll('.model-sub-value').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const parentKey = e.target.dataset.parentKey;
                const subKey = e.target.dataset.subKey;
                fullConfig.textModels[category][parentKey][subKey] = e.target.value;
            });
        });
    }

    function setupFocalPointsTab() {
        renderFocalPoints();
        const statusEl = document.getElementById('focalPointsStatus');
        document.getElementById('addFocalPointBtn').addEventListener('click', () => {
            const newKey = `Novo Grupo ${Date.now()}`;
            fullConfig.focalPoints[newKey] = ["Novo Ponto Focal"];
            renderFocalPoints();
        });
        document.getElementById('saveFocalPointsBtn').addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Pontos Focais salvos com sucesso!', false);
        });
        document.getElementById('resetFocalPointsBtn').addEventListener('click', () => {
            if (confirm(`Isso restaurará TODOS os Pontos Focais para o padrão. Deseja continuar?`)) {
                fullConfig.focalPoints = JSON.parse(JSON.stringify(defaultConfig.focalPoints));
                renderFocalPoints();
                displayStatus(statusEl, 'Pontos Focais restaurados para o padrão.', false);
            }
        });
    }

    function renderFocalPoints() {
        const listEl = document.getElementById('focalPointsList');
        listEl.innerHTML = '';
        for (const groupName in fullConfig.focalPoints) {
            const points = fullConfig.focalPoints[groupName];
            const groupDiv = document.createElement('div');
            groupDiv.className = 'focal-point-group';
            let pointsHTML = '';
            points.forEach((point, index) => {
                pointsHTML += `
                    <div class="focal-point-item">
                        <input type="text" class="focal-point-value" value="${point}" data-group="${groupName}" data-index="${index}">
                        <button class="remove-btn small" data-group="${groupName}" data-index="${index}">-</button>
                    </div>
                `;
            });
            groupDiv.innerHTML = `
                <div class="focal-group-header">
                    <input type="text" class="focal-point-group-name" value="${groupName}" data-original-name="${groupName}">
                    <button class="remove-btn" data-group="${groupName}">Remover Grupo</button>
                </div>
                <div class="focal-points-container">${pointsHTML}</div>
                <button class="add-point-btn" data-group="${groupName}">Adicionar Ponto</button>
            `;
            listEl.appendChild(groupDiv);
        }
        addFocalPointListeners();
    }

    function addFocalPointListeners() {
        const listEl = document.getElementById('focalPointsList');

        listEl.addEventListener('click', e => {
            const target = e.target;

            if (target.matches('.focal-group-header .remove-btn')) {
                const groupName = target.dataset.group;
                if (confirm(`Tem certeza que deseja remover o grupo "${groupName}"?`)) {
                    delete fullConfig.focalPoints[groupName];
                    renderFocalPoints();
                }
            }

            if (target.matches('.add-point-btn')) {
                const groupName = target.dataset.group;
                fullConfig.focalPoints[groupName].push("Novo Ponto Focal");
                renderFocalPoints();
            }

            if (target.matches('.focal-point-item .remove-btn')) {
                const groupName = target.dataset.group;
                const index = parseInt(target.dataset.index, 10);
                fullConfig.focalPoints[groupName].splice(index, 1);
                renderFocalPoints();
            }
        });

        listEl.addEventListener('change', e => {
            const target = e.target;

            if (target.matches('.focal-point-group-name')) {
                const originalName = target.dataset.originalName;
                const newName = target.value.trim();

                if (originalName !== newName && newName) {
                    if (fullConfig.focalPoints[newName]) {
                        alert(`O nome de grupo "${newName}" já existe. Por favor, escolha outro nome.`);
                        target.value = originalName;
                        return;
                    }

                    const value = fullConfig.focalPoints[originalName];
                    delete fullConfig.focalPoints[originalName];
                    fullConfig.focalPoints[newName] = value;

                    renderFocalPoints();
                } else if (!newName) {
                    target.value = originalName;
                }
            }
        });

        listEl.addEventListener('input', e => {
            const target = e.target;

            if (target.matches('.focal-point-value')) {
                const groupName = target.dataset.group;
                const index = parseInt(target.dataset.index, 10);
                if (fullConfig.focalPoints[groupName]) {
                    fullConfig.focalPoints[groupName][index] = target.value;
                }
            }
        });
    }

    async function initializePage() {
        await loadConfig();
        populateAllTabs();

        ui.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                ui.tabs.forEach(t => t.classList.remove('active'));
                ui.tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tabId).classList.add('active');

                if (tabId === 'tab-prazos') setupHolidaysTab();
                if (tabId === 'tab-respostas') setupResponsesTab();
                if (tabId === 'tab-textos') setupTextModelsTab();
                if (tabId === 'tab-pontosfocais') setupFocalPointsTab();
                if (tabId === 'tab-config-raw') {
                    ui.rawConfigEditor.value = JSON.stringify(fullConfig, null, 2);
                }
            });
        });

        ui.masterEnable.addEventListener('change', updateGlobalUIEnableState);
        ui.saveAllButton.addEventListener('click', () => {
            collectSettingsFromUI();
            saveConfig();
        });
        ui.saveRawConfig.addEventListener('click', () => {
            try {
                const newConfig = JSON.parse(ui.rawConfigEditor.value);
                fullConfig = newConfig;
                saveConfig();
                populateAllTabs();
                displayStatus(ui.rawConfigStatus, 'Configuração RAW salva com sucesso!', false);
            } catch (e) {
                displayStatus(ui.rawConfigStatus, `Erro no JSON: ${e.message}`, true);
            }
        });
        ui.resetRawConfig.addEventListener('click', () => {
            if (confirm("Isso irá restaurar TODAS as configurações para o padrão. Deseja continuar?")) {
                fullConfig = JSON.parse(JSON.stringify(defaultConfig));
                saveConfig();
                populateAllTabs();
            }
        });
        ui.exportConfig.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(fullConfig, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `neuron_config_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
        ui.importConfig.addEventListener('click', () => {
            const file = ui.importFileInput.files[0];
            if (!file) {
                displayStatus(ui.importStatus, "Nenhum arquivo selecionado.", true);
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedConfig = JSON.parse(event.target.result);
                    if (!importedConfig.featureSettings) throw new Error("Arquivo não parece ser uma configuração válida do Neuron.");
                    fullConfig = importedConfig;
                    saveConfig();
                    populateAllTabs();
                    displayStatus(ui.importStatus, "Configuração importada com sucesso!", false);
                } catch (e) {
                    displayStatus(ui.importStatus, `Erro ao importar: ${e.message}`, true);
                }
            };
            reader.readAsText(file);
        });

        document.querySelector('.tab-link[data-tab="tab-general"]').click();
    }

    initializePage();
});