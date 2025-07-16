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

        const qtdElement = document.getElementById('qtdItensTratarTriar');
        if (qtdElement) qtdElement.value = fullConfig.generalSettings?.qtdItensTratarTriar || 50;

        const prazosSettings = fullConfig.prazosSettings || {};
        const prazoDiasEl = document.getElementById('tratarNovoPrazoInternoDias');
        if (prazoDiasEl) prazoDiasEl.value = prazosSettings.tratarNovoPrazoInternoDias || -5;

        const cobrancaDiasEl = document.getElementById('tratarNovoCobrancaInternaDias');
        if (cobrancaDiasEl) cobrancaDiasEl.value = prazosSettings.tratarNovoCobrancaInternaDias || -3;

        const modoCalculoEl = document.getElementById('tratarNovoModoCalculo');
        if (modoCalculoEl) modoCalculoEl.value = prazosSettings.tratarNovoModoCalculo || 'corridos';

        const ajusteFdsEl = document.getElementById('tratarNovoAjusteFds');
        if (ajusteFdsEl) ajusteFdsEl.value = prazosSettings.tratarNovoAjusteFds || 'modo1';

        const ajusteFeriadoEl = document.getElementById('tratarNovoAjusteFeriado');
        if (ajusteFeriadoEl) ajusteFeriadoEl.value = prazosSettings.tratarNovoAjusteFeriado || 'proximo_dia';

        updateGlobalUIEnableState();
    }

    function collectSettingsFromUI() {
        fullConfig.masterEnableNeuron = ui.masterEnable.checked;

        if (!fullConfig.generalSettings) fullConfig.generalSettings = {};
        const qtdElement = document.getElementById('qtdItensTratarTriar');
        fullConfig.generalSettings.qtdItensTratarTriar = qtdElement ? parseInt(qtdElement.value, 10) || 50 : 50;

        const prazosSettings = fullConfig.prazosSettings || {};

        const prazoDiasEl = document.getElementById('tratarNovoPrazoInternoDias');
        prazosSettings.tratarNovoPrazoInternoDias = prazoDiasEl ? parseInt(prazoDiasEl.value, 10) || -5 : -5;

        const cobrancaDiasEl = document.getElementById('tratarNovoCobrancaInternaDias');
        prazosSettings.tratarNovoCobrancaInternaDias = cobrancaDiasEl ? parseInt(cobrancaDiasEl.value, 10) || -3 : -3;

        const modoCalculoEl = document.getElementById('tratarNovoModoCalculo');
        prazosSettings.tratarNovoModoCalculo = modoCalculoEl ? modoCalculoEl.value || 'corridos' : 'corridos';

        const ajusteFdsEl = document.getElementById('tratarNovoAjusteFds');
        prazosSettings.tratarNovoAjusteFds = ajusteFdsEl ? ajusteFdsEl.value || 'modo1' : 'modo1';

        const ajusteFeriadoEl = document.getElementById('tratarNovoAjusteFeriado');
        prazosSettings.tratarNovoAjusteFeriado = ajusteFeriadoEl ? ajusteFeriadoEl.value || 'proximo_dia' : 'proximo_dia';

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

    // File: modules/options/options.js (substituir funções existentes)

    function setupHolidaysTab() {
        const listEl = document.getElementById('holidaysList');
        const statusEl = document.getElementById('holidaysStatus');

        renderHolidays(); // Renderiza a lista inicial

        // Event listener único no pai da lista para lidar com a remoção
        listEl.addEventListener('click', (e) => {
            // Verifica se o clique foi num botão de remover
            if (e.target.matches('.remove-btn')) {
                const indexToRemove = parseInt(e.target.dataset.index, 10);
                fullConfig.holidays.splice(indexToRemove, 1);
                renderHolidays(); // Re-renderiza a lista após a remoção
                displayStatus(statusEl, 'Feriado removido. Não se esqueça de salvar.', false);
            }
        });

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

            renderHolidays(); // Re-renderiza a lista
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

        listEl.innerHTML = ''; // Limpa a lista antes de re-renderizar
        const holidays = fullConfig.holidays || [];

        if (holidays.length === 0) {
            listEl.innerHTML = '<li>Nenhum feriado configurado.</li>';
            return;
        }

        holidays.forEach((holiday, index) => {
            const itemLi = document.createElement('li');
            // A lógica do botão está agora no listener delegado em setupHolidaysTab
            itemLi.innerHTML = `
            <span class="holiday-text">${holiday.date} - ${holiday.description}</span>
            <button class="remove-btn" data-index="${index}">Remover</button>
        `;
            listEl.appendChild(itemLi);
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

    // File: modules/options/options.js (substituir funções)

    function setupTextModelsTab() {
        const categorySelect = document.getElementById('selectTextModelCategory');
        const container = document.getElementById('textModelsContainer');
        const statusEl = document.getElementById('textModelsStatus');
        const listEl = document.getElementById('textModelsList');

        // Preenche o seletor de categorias
        categorySelect.innerHTML = '<option value="">Selecione um Assistente...</option>';
        Object.keys(fullConfig.textModels).sort().forEach(key => {
            categorySelect.innerHTML += `<option value="${key}">${key}</option>`;
        });

        // Mostra/Esconde o container de modelos
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

        // Adiciona novo modelo
        document.getElementById('addTextModelBtn').addEventListener('click', () => {
            const category = categorySelect.value;
            if (!category) return;
            const newKey = `Novo Modelo ${Date.now()}`;
            fullConfig.textModels[category][newKey] = "Novo conteúdo...";
            renderTextModels(category);
        });

        // Salva modelos
        document.getElementById('saveTextModelsBtn').addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Modelos de texto salvos com sucesso!', false);
        });

        // Restaura modelos
        document.getElementById('resetTextModelsBtn').addEventListener('click', () => {
            const category = categorySelect.value;
            if (!category || !confirm(`Isso restaurará os modelos de "${category}" para o padrão. Deseja continuar?`)) return;
            fullConfig.textModels[category] = JSON.parse(JSON.stringify(defaultConfig.textModels[category]));
            renderTextModels(category);
            displayStatus(statusEl, 'Modelos restaurados para o padrão.', false);
        });

        // --- DELEGAÇÃO DE EVENTOS ---
        listEl.addEventListener('click', (e) => {
            // Lida com o clique no botão de remover
            if (e.target.matches('.remove-btn')) {
                const keyToRemove = e.target.dataset.key;
                const category = categorySelect.value;
                if (confirm(`Tem certeza que deseja remover o modelo "${keyToRemove}"?`)) {
                    delete fullConfig.textModels[category][keyToRemove];
                    renderTextModels(category);
                }
            }
        });

        listEl.addEventListener('input', (e) => {
            const category = categorySelect.value;
            const target = e.target;

            // Lida com a edição do conteúdo de um modelo simples (string)
            if (target.matches('.model-value')) {
                const key = target.closest('.option-item').querySelector('.model-key').value;
                fullConfig.textModels[category][key] = target.value;
            }

            // Lida com a edição do conteúdo de um sub-item de um modelo complexo (objeto)
            if (target.matches('.model-sub-value')) {
                const parentKey = target.dataset.parentKey;
                const subKey = target.dataset.subKey;
                fullConfig.textModels[category][parentKey][subKey] = target.value;
            }
        });

        listEl.addEventListener('change', (e) => {
            const category = categorySelect.value;
            const target = e.target;

            // Lida com a renomeação da chave de um modelo
            if (target.matches('.model-key')) {
                const originalKey = target.dataset.originalKey;
                const newKey = target.value.trim();

                if (originalKey !== newKey && newKey) {
                    if (fullConfig.textModels[category][newKey]) {
                        alert('Já existe um modelo com este nome. Por favor, escolha outro.');
                        target.value = originalKey;
                        return;
                    }
                    const value = fullConfig.textModels[category][originalKey];
                    delete fullConfig.textModels[category][originalKey];
                    fullConfig.textModels[category][newKey] = value;
                    // Re-renderiza para atualizar os 'data-attributes' de todos os elementos
                    renderTextModels(category);
                } else if (!newKey) {
                    target.value = originalKey; // Restaura se o campo for deixado vazio
                }
            }
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

            // Botão de remover é sempre o mesmo
            const removeBtnHTML = `<button class="remove-btn" data-key="${key}">Remover Modelo</button>`;

            if (typeof value === 'string') {
                itemDiv.innerHTML = `
                <label>Chave do Modelo:</label>
                <input type="text" class="model-key" value="${key}" data-original-key="${key}">
                <label>Conteúdo:</label>
                <textarea class="model-value" rows="5">${value}</textarea>
                ${removeBtnHTML}
            `;
            } else if (isObject(value)) { // isObject é uma função auxiliar que já tens
                let nestedHTML = '';
                for (const subKey in value) {
                    nestedHTML += `
                    <div class="nested-item">
                        <label><strong>Sub-item:</strong> ${subKey}</label>
                        <textarea class="model-sub-value" data-parent-key="${key}" data-sub-key="${subKey}" rows="5">${value[subKey]}</textarea>
                    </div>
                `;
                }
                itemDiv.innerHTML = `
                <fieldset>
                    <legend>${key}</legend>
                    ${nestedHTML}
                </fieldset>
                ${removeBtnHTML}
            `;
            }
            listEl.appendChild(itemDiv);
        }
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