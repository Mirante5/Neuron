// Neuron 0.1.5 β/popup/popup.js - COM MODIFICAÇÕES
document.addEventListener('DOMContentLoaded', () => {
  const masterEnableCheckbox = document.getElementById('masterEnable');
  const scriptsListDiv = document.getElementById('scriptsList');
  const saveAndReloadButton = document.getElementById('saveAndReloadButton');

  // NOVO: Elementos para Qtd Itens
  const qtdItensContainer = document.getElementById('qtdItensContainer');
  const qtdItensTratarTriarPopupInput = document.getElementById('qtdItensTratarTriarPopup');
  const QTD_ITENS_STORAGE_KEY_POPUP = 'neuronTratarTriarQtdItens'; // Mesma chave usada em tratar-triar.js e options.js
  const QTD_ITENS_DEFAULT_POPUP = 15;

  const toggleableScripts = { //
    'style': { label: 'Animação de Loading', default: true }, //
    'arquivar': { label: 'Assistente de Arquivamento', default: true }, //
    'encaminhar': { label: 'Assistente de Encaminhamento', default: true }, //
    'prorrogar': { label: 'Assistente de Prorrogação', default: true }, //
    'tramitar': { label: 'Assistente de Tramitação', default: true }, //
    'tratarTriar': { label: 'Melhorias Triar/Tratar', default: true }, //
    'tratar': { label: 'Melhorias Tratar Manifestação', default: true } //
    // Se 'resposta.js' for controlado individualmente, adicionar:
    // 'resposta': { label: 'Assistente de Resposta Rápida', default: true },
  };

  // Função para controlar visibilidade e estado do input Qtd Itens
  function updateQtdItensInputState() {
    const masterEnabled = masterEnableCheckbox.checked;
    const tratarTriarEnabled = document.getElementById('chk_tratarTriar')?.checked || false;

    if (masterEnabled && tratarTriarEnabled) {
      if (qtdItensContainer) qtdItensContainer.style.display = 'flex'; // Ou 'block' conforme seu CSS
      if (qtdItensTratarTriarPopupInput) qtdItensTratarTriarPopupInput.disabled = false;
    } else {
      if (qtdItensContainer) qtdItensContainer.style.display = 'none';
      if (qtdItensTratarTriarPopupInput) qtdItensTratarTriarPopupInput.disabled = true;
    }
  }

  async function loadSettings() { //
    const scriptKeysToGet = Object.keys(toggleableScripts).map(id => `scriptEnabled_${id}`); //
    const keysToGet = ['masterEnableNeuron', ...scriptKeysToGet, QTD_ITENS_STORAGE_KEY_POPUP]; //
    
    const result = await chrome.storage.local.get(keysToGet); //

    const masterEnabled = result.masterEnableNeuron !== false; //
    masterEnableCheckbox.checked = masterEnabled; //
    // toggleScriptCheckboxesAvailability(masterEnabled); // Será chamado dentro de updateQtdItensInputState indiretamente ou após scripts

    for (const scriptId in toggleableScripts) { //
      const scriptConfig = toggleableScripts[scriptId]; //
      const checkbox = document.getElementById(`chk_${scriptId}`); //
      if (checkbox) { //
        checkbox.checked = result[`scriptEnabled_${scriptId}`] !== undefined ? result[`scriptEnabled_${scriptId}`] : scriptConfig.default; //
        checkbox.disabled = !masterEnabled; // Desabilita se master estiver off
      }
    }
    
    // Carregar valor de Qtd Itens
    if (qtdItensTratarTriarPopupInput) {
      qtdItensTratarTriarPopupInput.value = result[QTD_ITENS_STORAGE_KEY_POPUP] !== undefined ? result[QTD_ITENS_STORAGE_KEY_POPUP] : QTD_ITENS_DEFAULT_POPUP;
    }

    // Atualizar estado do input de Qtd Itens e opacidade da lista de scripts
    toggleScriptsListOpacity(masterEnabled); // Função separada para opacidade
    updateQtdItensInputState(); // Atualiza visibilidade/estado do input Qtd Itens
  }

  // Função para controlar opacidade da lista de scripts
  function toggleScriptsListOpacity(masterEnabled) {
    const h3Element = scriptsListDiv.previousElementSibling; //
    if (h3Element && h3Element.tagName === 'H3') { //
      h3Element.style.opacity = masterEnabled ? '1' : '0.5'; //
    }
    scriptsListDiv.style.opacity = masterEnabled ? '1' : '0.5'; //
  }

  masterEnableCheckbox.addEventListener('change', async () => { //
    const isEnabled = masterEnableCheckbox.checked; //
    await chrome.storage.local.set({ masterEnableNeuron: isEnabled }); //
    console.log(`Neuron master switch: ${isEnabled}`); //
    
    // Atualizar estado de todos os checkboxes de scripts
    for (const scriptId in toggleableScripts) { //
      const checkbox = document.getElementById(`chk_${scriptId}`); //
      if (checkbox) { //
        checkbox.disabled = !isEnabled; //
      }
    }
    toggleScriptsListOpacity(isEnabled); //
    updateQtdItensInputState(); // Atualiza o input de Qtd Itens também
  });

  // Criar checkboxes para scripts
  for (const scriptId in toggleableScripts) { //
    const scriptConfig = toggleableScripts[scriptId]; //
    const itemDiv = document.createElement('div'); //
    itemDiv.classList.add('setting-item'); //

    const label = document.createElement('label'); //
    label.htmlFor = `chk_${scriptId}`; //
    label.textContent = scriptConfig.label; //

    const checkbox = document.createElement('input'); //
    checkbox.type = 'checkbox'; //
    checkbox.id = `chk_${scriptId}`; //
    checkbox.name = `chk_${scriptId}`; //

    checkbox.addEventListener('change', async () => { //
      await chrome.storage.local.set({ [`scriptEnabled_${scriptId}`]: checkbox.checked }); //
      console.log(`${scriptConfig.label} ${checkbox.checked ? 'habilitado' : 'desabilitado'}`); //
      if (scriptId === 'tratarTriar') { // Se o checkbox de Melhorias Triar/Tratar mudou
        updateQtdItensInputState(); // Atualiza o estado do input Qtd Itens
      }
    });

    itemDiv.appendChild(label); //
    itemDiv.appendChild(checkbox); //
    scriptsListDiv.appendChild(itemDiv); //
  }

  // NOVO: Event listener para o input Qtd Itens
  if (qtdItensTratarTriarPopupInput) {
    qtdItensTratarTriarPopupInput.addEventListener('change', async () => {
      let value = parseInt(qtdItensTratarTriarPopupInput.value, 10);
      const min = parseInt(qtdItensTratarTriarPopupInput.min, 10);
      const max = parseInt(qtdItensTratarTriarPopupInput.max, 10);

      if (isNaN(value) || value < min || value > max) {
        value = QTD_ITENS_DEFAULT_POPUP; // Reseta para o padrão se inválido
        qtdItensTratarTriarPopupInput.value = value;
        // Poderia mostrar um pequeno aviso aqui, mas o popup é pequeno
      }
      await chrome.storage.local.set({ [QTD_ITENS_STORAGE_KEY_POPUP]: value });
      console.log(`Neuron: Qtd Itens (Triar/Tratar) salvo como: ${value}`);
    });
  }


  if (saveAndReloadButton) { //
    saveAndReloadButton.addEventListener('click', async () => { //
      // As configurações (checkboxes e qtdItens) já são salvas no evento 'change' deles.
      // Este botão apenas recarrega a aba.
      console.log('Configurações aplicadas (salvas no evento change). Recarregando a aba...'); //
      try { //
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true }); //
        if (activeTab && activeTab.id) { //
          if (activeTab.url && activeTab.url.startsWith("https://falabr.cgu.gov.br/")) { //
            await chrome.tabs.reload(activeTab.id); //
          } else { //
            console.log("Aba ativa não é do Fala.br. Não será recarregada pelo botão do popup."); //
          }
          window.close(); //
        } else { //
          console.error("Não foi possível encontrar a aba ativa."); //
        }
      } catch (error) { //
        console.error("Erro ao recarregar aba:", error); //
      }
    });
  }

  loadSettings(); //
});