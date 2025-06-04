// Neuron/background.js
'use strict';

// Define o ícone da extensão (ON/OFF) para uma aba específica.
async function setIcon(tabId, isEnabled) {
  const iconPath = isEnabled ? "images/neuronon128.png" : "images/neuronoff128.png";
  try {
    await chrome.action.setIcon({
      tabId: tabId,
      path: { "128": iconPath }
    });
  } catch (error) {
    // Erro comum se a aba for fechada enquanto a operação está pendente.
    console.log(`Neuron (background.js): Falha ao definir ícone para aba ${tabId}. ${error.message}`);
  }
}

// Verifica o estado da extensão (URL da aba e 'masterEnableNeuron' da config central) e atualiza o ícone.
async function checkExtensionStatus(tabId) {
  try {
    // Valida se a aba ainda existe e é acessível.
    // Se chrome.tabs.get falhar (lançar exceção), o catch abaixo trata.
    await chrome.tabs.get(tabId);

    // Envia 'ping' para content.js para verificar masterEnableNeuron.
    const response = await chrome.tabs.sendMessage(tabId, { action: "ping" });
    // response.masterEnabled vem da config centralizada via content.js.
    if (response && response.status === "alive") {
      await setIcon(tabId, response.masterEnabled);
    } else {
      // Se content.js não responder 'alive', ícone OFF.
      await setIcon(tabId, false);
    }
  } catch (error) {
    // Se houver erro (ex: aba fechada, página restrita, content script não injetado), ícone OFF.
    console.log(`Neuron (background.js): Falha ao verificar status na aba ${tabId}. ${error.message}`);
    await setIcon(tabId, false);
  }
}

// Ao instalar/atualizar a extensão.
chrome.runtime.onInstalled.addListener(() => {
  console.log('Neuron (background.js): Extensão instalada/atualizada.');
  // O estado inicial do ícone é tratado por onActivated e onUpdated.
});

// Atualiza o ícone quando uma aba é ativada.
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    // Verifica se a URL é do Fala.BR antes de checar o status.
    if (tab && tab.url && tab.url.startsWith("https://falabr.cgu.gov.br/")) {
      await checkExtensionStatus(tabId);
    } else {
      // Se não for Fala.BR, ícone OFF.
      await setIcon(tabId, false);
    }
  } catch (error) {
    console.log(`Neuron (background.js): Erro em onActivated para aba ${tabId}. ${error.message}`);
    // Garante ícone OFF se houver erro ao obter informações da aba.
    await setIcon(tabId, false);
  }
});

// Atualiza o ícone quando uma aba é totalmente carregada/atualizada.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    if (tab.url && tab.url.startsWith("https://falabr.cgu.gov.br/")) {
      await checkExtensionStatus(tabId);
    } else {
      await setIcon(tabId, false);
    }
  }
});

// Processa mensagens de outras partes da extensão.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Mensagem de content.js quando 'masterEnableNeuron' (config central) muda.
  if (message.action === "updateIcon" && sender.tab && sender.tab.id) {
    // Função async auto-executável para usar await dentro do listener síncrono.
    (async () => {
      try {
        const tab = await chrome.tabs.get(sender.tab.id);
        // Revalida URL e status para a aba que originou a mudança.
        if (tab.url && tab.url.startsWith("https://falabr.cgu.gov.br/")) {
          await checkExtensionStatus(sender.tab.id);
        } else {
          await setIcon(sender.tab.id, false);
        }
      } catch (error) {
        console.log(`Neuron (background.js): Erro ao processar updateIcon para aba ${sender.tab.id}: ${error.message}`);
        // Tenta definir ícone OFF se a aba ainda existir.
         if (sender.tab?.id) await setIcon(sender.tab.id, false);
      }
    })();
    return false; // Nenhuma resposta assíncrona é enviada para 'updateIcon'.
  }
  // Mensagem do popup.js para executar scripts de funcionalidade.
  else if (message.type === "executarScript") {
    if (sender.tab && sender.tab.id && message.script) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        files: [message.script] // 'message.script' é o caminho do arquivo do script.
      })
      .then(() => {
        console.log(`Neuron (background.js): Script ${message.script} executado na aba ${sender.tab.id}.`);
        sendResponse({ status: "success", script: message.script });
      })
      .catch(err => {
        console.error(`Neuron (background.js): Erro ao executar ${message.script} na aba ${sender.tab.id}:`, err);
        sendResponse({ status: "error", message: err.message });
      });
      return true; // Resposta assíncrona.
    } else {
      console.warn("Neuron (background.js): Falha em executarScript: ID da aba ou script ausente.");
      // Envia resposta síncrona em caso de erro na validação dos parâmetros.
      sendResponse({ status: "error", message: "ID da aba ou script ausente." });
      return false;
    }
  }
  // Para outras mensagens não tratadas ou se sendResponse não for necessário.
  return false;
});