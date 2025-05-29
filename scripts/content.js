chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ping") {
    chrome.storage.local.get('masterEnableNeuron', (result) => {
      if (chrome.runtime.lastError) {
        console.warn("content.js: Erro ao ler masterEnableNeuron", chrome.runtime.lastError.message);
        sendResponse({ status: "alive", masterEnabled: true }); // Assume habilitado em caso de erro
        return;
      }
      const masterEnabled = result.masterEnableNeuron !== false;
      sendResponse({ status: "alive", masterEnabled: masterEnabled });
    });
    return true; // Para resposta assíncrona
  }
});

// Opcional: informar o background para atualizar o ícone quando as configurações mudam
// Isso é útil se o usuário mudar as configurações na página de opções e não recarregar a aba.
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.masterEnableNeuron) {
        console.log('content.js: masterEnableNeuron mudou, pedindo atualização do ícone.');
        chrome.runtime.sendMessage({ action: "updateIcon" });
    }
});