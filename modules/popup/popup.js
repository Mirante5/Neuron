// Neuron/modules/popup/popup.js (Refatorado)
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const CONFIG_STORAGE_KEY_POPUP = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_POPUP = 'config/config.json';

    // Elementos da UI
    const masterEnableCheckbox = document.getElementById('masterEnable');
    const scriptsListDiv = document.getElementById('scriptsList');
    const saveAndReloadButton = document.getElementById('saveAndReloadButton');
    const qtdItensContainer = document.getElementById('qtdItensContainer');
    const qtdItensInput = document.getElementById('qtdItensTratarTriarPopup');

    let currentConfig = {};

    // --- Funções Auxiliares ---

    async function fetchDefaultConfig() {
        try {
            const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_POPUP));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Neuron Popup: Erro ao carregar config padrão:", error);
            return null;
        }
    }

    // Atualiza a visibilidade e estado do input 'qtdItensTratarTriar'
    function updateQtdItensInputState() {
        if (!qtdItensContainer || !qtdItensInput) return;

        const masterEnabled = masterEnableCheckbox.checked;
        const tratarTriarCheckbox = document.getElementById('chk_tratarTriar');
        const tratarTriarEnabled = tratarTriarCheckbox ? tratarTriarCheckbox.checked : false;

        const shouldBeVisible = masterEnabled && tratarTriarEnabled;
        
        qtdItensContainer.style.display = shouldBeVisible ? 'flex' : 'none';
        qtdItensInput.disabled = !shouldBeVisible;
    }

    // Popula a lista de funcionalidades e outros controles da UI
    function populatePopupUI() {
        // Garante que as seções da config existam para evitar erros.
        currentConfig.featureSettings = currentConfig.featureSettings || {};
        currentConfig.generalSettings = currentConfig.generalSettings || {};

        // Define o estado do masterEnable
        masterEnableCheckbox.checked = currentConfig.masterEnableNeuron !== false;

        // Cria os checkboxes de funcionalidades
        scriptsListDiv.innerHTML = '';
        Object.keys(currentConfig.featureSettings)
            .map(id => ({ id, ...currentConfig.featureSettings[id] }))
            .sort((a, b) => a.label.localeCompare(b.label)) // Ordena alfabeticamente pelo label
            .forEach(script => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'setting-item';

                const label = document.createElement('label');
                label.htmlFor = `chk_${script.id}`;
                label.textContent = script.label;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `chk_${script.id}`;
                checkbox.name = `chk_${script.id}`;
                checkbox.checked = script.enabled !== false;
                
                itemDiv.appendChild(label);
                itemDiv.appendChild(checkbox);
                scriptsListDiv.appendChild(itemDiv);
            });

        // Define o valor do input de quantidade
        qtdItensInput.value = currentConfig.generalSettings.qtdItensTratarTriar || 15;

        // Ajusta a visibilidade inicial dos elementos
        toggleScriptsListAvailability(masterEnableCheckbox.checked);
        updateQtdItensInputState();
    }

    // Carrega as configurações (storage ou padrão) e popula a UI
    async function loadSettingsAndPopulateUI() {
        const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY_POPUP);
        const defaultConfig = await fetchDefaultConfig();

        if (result[CONFIG_STORAGE_KEY_POPUP]) {
            // Usa a config salva, mas mescla com a padrão para garantir novas chaves
            currentConfig = { ...defaultConfig, ...result[CONFIG_STORAGE_KEY_POPUP] };
            currentConfig.featureSettings = { ...defaultConfig.featureSettings, ...result[CONFIG_STORAGE_KEY_POPUP].featureSettings };
            currentConfig.generalSettings = { ...defaultConfig.generalSettings, ...result[CONFIG_STORAGE_KEY_POPUP].generalSettings };
        } else if (defaultConfig) {
            currentConfig = defaultConfig; // Usa o default se não houver config salva.
        } else {
            // Fallback crítico
            currentConfig = { masterEnableNeuron: true, featureSettings: {}, generalSettings: { qtdItensTratarTriar: 15 } };
            console.warn("Neuron Popup: Usando config de fallback crítico.");
        }
        
        populatePopupUI();
    }
    
    // Controla a aparência da lista de scripts baseada no masterEnable.
    function toggleScriptsListAvailability(masterEnabled) {
        const h3Element = scriptsListDiv.previousElementSibling;
        if (h3Element && h3Element.tagName === 'H3') {
            h3Element.style.opacity = masterEnabled ? '1' : '0.5';
        }
        scriptsListDiv.style.opacity = masterEnabled ? '1' : '0.5';
        
        // Habilita/desabilita todos os checkboxes de funcionalidades.
        scriptsListDiv.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.disabled = !masterEnabled;
        });
    }

    // --- Listeners de Eventos ---

    // Listener para o checkbox master (habilitar/desabilitar tudo).
    masterEnableCheckbox.addEventListener('change', async () => {
        const isEnabled = masterEnableCheckbox.checked;
        currentConfig.masterEnableNeuron = isEnabled;
        await chrome.storage.local.set({ [CONFIG_STORAGE_KEY_POPUP]: currentConfig });
        
        toggleScriptsListAvailability(isEnabled);
        updateQtdItensInputState();
    });

    // Listener dinâmico para os checkboxes de funcionalidades
    scriptsListDiv.addEventListener('change', async (event) => {
        if (event.target.type === 'checkbox') {
            const scriptId = event.target.id.replace('chk_', '');
            if (currentConfig.featureSettings[scriptId]) {
                currentConfig.featureSettings[scriptId].enabled = event.target.checked;
                await chrome.storage.local.set({ [CONFIG_STORAGE_KEY_POPUP]: currentConfig });
                
                if (scriptId === 'tratarTriar') {
                    updateQtdItensInputState();
                }
            }
        }
    });

    // Listener para o input de quantidade de itens (Triar/Tratar).
    qtdItensInput.addEventListener('change', async () => {
        let value = parseInt(qtdItensInput.value, 10);
        const min = parseInt(qtdItensInput.min, 10);
        const max = parseInt(qtdItensInput.max, 10);
        
        if (isNaN(value) || value < min || value > max) {
            value = (await fetchDefaultConfig())?.generalSettings?.qtdItensTratarTriar || 15;
            qtdItensInput.value = value;
        }
        
        currentConfig.generalSettings.qtdItensTratarTriar = value;
        await chrome.storage.local.set({ [CONFIG_STORAGE_KEY_POPUP]: currentConfig });
    });

    // Listener para o botão "Aplicar e Recarregar Aba".
    saveAndReloadButton.addEventListener('click', async () => {
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab?.id && activeTab.url?.startsWith("https://falabr.cgu.gov.br/")) {
                chrome.tabs.reload(activeTab.id);
            }
            window.close();
        } catch (error) {
            console.error("Neuron Popup: Erro ao recarregar aba:", error);
            window.close();
        }
    });

    // Inicialização
    loadSettingsAndPopulateUI();
});