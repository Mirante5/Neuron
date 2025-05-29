// Neuron 0.1.5 β/background.js

// Define o ícone padrão ao instalar/atualizar
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extensão Neuron instalada/atualizada.');
  // Não é ideal iterar por todas as abas aqui para definir o ícone inicial.
  // O estado do ícone será definido em onActivated e onUpdated.
});

// Listener para mensagens, por exemplo, do popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "executarScript") {
    if (sender.tab && sender.tab.id && message.script) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        files: [message.script]
      })
      .then(() => {
        console.log(`Script ${message.script} executado na aba ${sender.tab.id}.`);
        sendResponse({ status: "success", script: message.script });
      })
      .catch(err => {
        console.error(`Erro ao executar script ${message.script} na aba ${sender.tab.id}:`, err);
        sendResponse({ status: "error", message: err.message });
      });
      return true; // Resposta assíncrona
    } else {
      console.warn("Não foi possível executar script: ID da aba ou caminho do script ausente.");
      sendResponse({ status: "error", message: "ID da aba ou caminho do script ausente." });
    }
  }
  // Adicione outros handlers de mensagem se necessário
});

// Atualiza o ícone quando uma aba é ativada
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab && tab.url && tab.url.startsWith("https://falabr.cgu.gov.br/")) {
      await checkExtensionStatus(tabId);
    } else {
      await setIcon(tabId, false); // Ícone OFF para abas não correspondentes
    }
  } catch (error) {
    // Aba pode não existir mais ou não ter URL (ex: nova aba)
    console.log(`Erro ao obter aba ${tabId} em onActivated: ${error.message}`);
    await setIcon(tabId, false);
  }
});

// Atualiza o ícone quando uma aba é atualizada
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    if (tab.url && tab.url.startsWith("https://falabr.cgu.gov.br/")) {
      await checkExtensionStatus(tabId);
    } else {
      await setIcon(tabId, false); // Ícone OFF para abas não correspondentes
    }
  }
});

async function setIcon(tabId, isAlive) {
  const path = isAlive ? "images/neuronon128.png" : "images/neuronoff128.png";
  try {
    await chrome.action.setIcon({
      tabId,
      path: { "128": path }
    });
  } catch (error) {
    console.log(`Erro ao definir ícone para aba ${tabId}: ${error.message}. A aba pode ter sido fechada.`);
  }
}

async function checkExtensionStatus(tabId) {
  try {
    // Verifica se a aba ainda existe e é acessível
    await chrome.tabs.get(tabId); 

    const response = await chrome.tabs.sendMessage(tabId, { action: "ping" });
    if (response && response.status === "alive") {
      await setIcon(tabId, true);
    } else {
      await setIcon(tabId, false);
    }
  } catch (error) {
    console.log(`Falha ao verificar status da extensão na aba ${tabId} (pode estar fechada ou ser uma página restrita): ${error.message}`);
    await setIcon(tabId, false); // Assume OFF se houver erro
  }
}