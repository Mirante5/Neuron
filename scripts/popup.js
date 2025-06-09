// Neuron/popup/popup.js
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Chave para config no storage e caminho para config padrão.
  const CONFIG_STORAGE_KEY_POPUP = 'neuronUserConfig'; // Config centralizada
  const DEFAULT_CONFIG_PATH_POPUP = 'config/config.json';

  // Elementos da UI.
  const masterEnableCheckbox = document.getElementById('masterEnable');
  const scriptsListDiv = document.getElementById('scriptsList');
  const saveAndReloadButton = document.getElementById('saveAndReloadButton');
  const qtdItensContainer = document.getElementById('qtdItensContainer');
  const qtdItensTratarTriarPopupInput = document.getElementById('qtdItensTratarTriarPopup');

  let currentPopupConfig = {}; // Armazena a configuração carregada.

  // Busca a configuração padrão (usada como fallback).
  async function fetchDefaultPopupConfig() {
    try {
      const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_POPUP));
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Neuron Popup: Erro ao carregar config padrão:", error);
      return null;
    }
  }

  // Atualiza a visibilidade e estado do input 'qtdItensTratarTriar'.
  function updateQtdItensInputState() {
    const masterEnabled = masterEnableCheckbox.checked;
    // Encontra o checkbox da funcionalidade 'tratarTriar' dinamicamente.
    const tratarTriarCheckbox = document.getElementById('chk_tratarTriar');
    const tratarTriarEnabled = tratarTriarCheckbox ? tratarTriarCheckbox.checked : false;

    const displayStyle = (masterEnabled && tratarTriarEnabled) ? 'flex' : 'none';
    const isDisabled = !(masterEnabled && tratarTriarEnabled);

    if (qtdItensContainer) qtdItensContainer.style.display = displayStyle;
    if (qtdItensTratarTriarPopupInput) qtdItensTratarTriarPopupInput.disabled = isDisabled;
  }

  // Carrega as configurações do storage ou do arquivo padrão.
  async function loadSettings() {
    const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY_POPUP);
    const defaultConfig = await fetchDefaultPopupConfig();

    if (result[CONFIG_STORAGE_KEY_POPUP] && typeof result[CONFIG_STORAGE_KEY_POPUP] === 'object') {
      currentPopupConfig = result[CONFIG_STORAGE_KEY_POPUP];
    } else if (defaultConfig) {
      currentPopupConfig = defaultConfig; // Usa o default se não houver config salva.
    } else {
      // Fallback crítico se nem config salva nem default puderem ser carregados.
      currentPopupConfig = {
        masterEnableNeuron: true,
        featureSettings: {},
        generalSettings: { qtdItensTratarTriar: 15 }
      };
      console.warn("Neuron Popup: Usando config de fallback crítico.");
    }

    // Garante que as seções da config existam para evitar erros.
    currentPopupConfig.featureSettings = currentPopupConfig.featureSettings || {};
    currentPopupConfig.generalSettings = currentPopupConfig.generalSettings || {};

    // Define o estado do masterEnable e dos checkboxes de funcionalidades.
    masterEnableCheckbox.checked = currentPopupConfig.masterEnableNeuron !== false;

    const featureSettings = currentPopupConfig.featureSettings;
    // Cria um array de scripts para ordenação e popul popula a lista.
    const scriptsArrayForPopup = Object.keys(featureSettings)
      .map(id => ({
        id: id,
        // Usa o label da config; se não houver, um label genérico.
        label: featureSettings[id].label || `Funcionalidade ${id}`,
        // Usa enabled da config; default true se não definido.
        enabled: featureSettings[id].enabled !== undefined ? featureSettings[id].enabled : true
      }))
      .sort((a, b) => a.label.localeCompare(b.label)); // Ordena alfabeticamente.

    scriptsListDiv.innerHTML = ''; // Limpa para recriar.
    scriptsArrayForPopup.forEach(scriptConfig => {
      const scriptId = scriptConfig.id;
      const itemDiv = document.createElement('div');
      itemDiv.classList.add('setting-item');

      const label = document.createElement('label');
      label.htmlFor = `chk_${scriptId}`;
      label.textContent = scriptConfig.label;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `chk_${scriptId}`; // ID usado por updateQtdItensInputState
      checkbox.name = `chk_${scriptId}`;
      checkbox.checked = scriptConfig.enabled;
      checkbox.disabled = !masterEnableCheckbox.checked; // Desabilitado se master estiver OFF.

      // Listener para salvar mudanças no estado da funcionalidade.
      checkbox.addEventListener('change', async () => {
        currentPopupConfig.featureSettings[scriptId].enabled = checkbox.checked;
        await chrome.storage.local.set({ [CONFIG_STORAGE_KEY_POPUP]: currentPopupConfig });
        console.log(`Neuron Popup: '${scriptConfig.label}' ${checkbox.checked ? 'habilitado' : 'desabilitado'}.`);
        // Se a funcionalidade 'tratarTriar' mudar, atualiza o estado do input de quantidade.
        if (scriptId === 'tratarTriar') { // ID da feature conforme config.json
          updateQtdItensInputState();
        }
      });

      itemDiv.appendChild(label);
      itemDiv.appendChild(checkbox);
      scriptsListDiv.appendChild(itemDiv);
    });

    // Define valor do input de quantidade.
    if (qtdItensTratarTriarPopupInput) {
      qtdItensTratarTriarPopupInput.value = currentPopupConfig.generalSettings?.qtdItensTratarTriar || 15;
    }

    // Ajusta a opacidade da lista de scripts e o estado do input de quantidade.
    toggleScriptsListOpacity(masterEnableCheckbox.checked);
    updateQtdItensInputState();
  }

  // Controla a opacidade da lista de scripts baseada no masterEnable.
  function toggleScriptsListOpacity(masterEnabled) {
    const h3Element = scriptsListDiv.previousElementSibling; // Assume H3 antes de scriptsListDiv.
    if (h3Element && h3Element.tagName === 'H3') {
      h3Element.style.opacity = masterEnabled ? '1' : '0.5';
    }
    scriptsListDiv.style.opacity = masterEnabled ? '1' : '0.5';
  }

  // Listener para o checkbox master (habilitar/desabilitar tudo).
  masterEnableCheckbox.addEventListener('change', async () => {
    const isEnabled = masterEnableCheckbox.checked;
    currentPopupConfig.masterEnableNeuron = isEnabled;
    await chrome.storage.local.set({ [CONFIG_STORAGE_KEY_POPUP]: currentPopupConfig });
    console.log(`Neuron Popup: Master switch ${isEnabled ? 'ON' : 'OFF'}.`);

    // Habilita/desabilita todos os checkboxes de funcionalidades.
    Object.keys(currentPopupConfig.featureSettings).forEach(scriptId => {
      const checkbox = document.getElementById(`chk_${scriptId}`);
      if (checkbox) {
        checkbox.disabled = !isEnabled;
      }
    });
    toggleScriptsListOpacity(isEnabled);
    updateQtdItensInputState();
  });

  // Listener para o input de quantidade de itens (Triar/Tratar).
  if (qtdItensTratarTriarPopupInput) {
    qtdItensTratarTriarPopupInput.addEventListener('change', async () => {
      let value = parseInt(qtdItensTratarTriarPopupInput.value, 10);
      const min = parseInt(qtdItensTratarTriarPopupInput.min, 10);
      const max = parseInt(qtdItensTratarTriarPopupInput.max, 10);
      // Busca valor padrão do config.json em caso de entrada inválida.
      const defaultConfigValue = (await fetchDefaultPopupConfig())?.generalSettings?.qtdItensTratarTriar || 15;

      // Validação do valor.
      if (isNaN(value) || value < min || value > max) {
        value = defaultConfigValue; // Restaura para o padrão se inválido.
        qtdItensTratarTriarPopupInput.value = value;
        console.warn(`Neuron Popup: Valor inválido para qtdItens. Restaurado para ${value}.`);
      }
      currentPopupConfig.generalSettings.qtdItensTratarTriar = value;
      await chrome.storage.local.set({ [CONFIG_STORAGE_KEY_POPUP]: currentPopupConfig });
      console.log(`Neuron Popup: Qtd Itens (Triar/Tratar) salvo como: ${value}.`);
    });
  }

  // Listener para o botão "Aplicar e Recarregar Aba".
  if (saveAndReloadButton) {
    saveAndReloadButton.addEventListener('click', async () => {
      console.log('Neuron Popup: Configurações aplicadas. Tentando recarregar a aba...');
      try {
        // Obtém a aba ativa na janela atual.
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id) {
          // Recarrega apenas se a URL for do Fala.br.
          if (activeTab.url && activeTab.url.startsWith("https://falabr.cgu.gov.br/")) {
            await chrome.tabs.reload(activeTab.id);
          } else {
            console.log("Neuron Popup: Aba ativa não é do Fala.br. Não será recarregada.");
          }
          window.close(); // Fecha o popup.
        } else {
          console.error("Neuron Popup: Não foi possível encontrar a aba ativa.");
        }
      } catch (error) {
        console.error("Neuron Popup: Erro ao recarregar aba:", error);
      }
    });
  }

  // Carrega as configurações iniciais ao abrir o popup.
  loadSettings();
});