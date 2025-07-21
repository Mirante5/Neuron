<p align="center">
  <img src="https://github.com/Mirante5/Neuron/blob/main/images/Intro-Neuron.gif" alt="Animação de Carregamento do Neuron" width="500"/>
</p>

<h1 align="center">Neuron</h1>

<p align="center">
  <strong>Um otimizador de fluxos de trabalho para a plataforma Fala.BR</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.5.0-blue.svg" alt="Versão 1.5.0">
  <img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg" alt="Manifest V3">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-CC0%201.0-lightgrey.svg" alt="Licença CC0 1.0 Universal">
  </a>
  <img src="https://img.shields.io/badge/Status-Ativo-success.svg" alt="Status do Projeto: Ativo">
</p>

<p align="center">
  <a href="#-sobre-o-projeto">Sobre</a> •
  <a href="#-principais-funcionalidades">Funcionalidades</a> •
  <a href="#-instalação">Instalação</a> •
  <a href="#-como-usar">Uso</a> •
  <a href="#-tecnologias-e-arquitetura">Arquitetura</a> •
  <a href="#-como-contribuir">Contribuir</a>
</p>

---

## 🚀 Sobre o Projeto

O **Neuron** é uma extensão para Google Chrome criada para otimizar e agilizar tarefas repetitivas na plataforma **Fala.BR**. A extensão injeta scripts e estilos nas páginas da plataforma, adicionando automações, assistentes inteligentes e melhorias de interface que tornam o trabalho dos operadores mais rápido, intuitivo e eficiente.

### 🎯 Plataforma Alvo
* **Site:** Controladoria-Geral da União - Fala.BR
* **URL:** `https://falabr.cgu.gov.br/*`

## ✨ Principais Funcionalidades

O Neuron é composto por um conjunto de módulos independentes que podem ser ativados ou desativados conforme a sua necessidade.

###  interfaz de usuario e Experiência do Usuário (UI/UX)
* **Animação de Loading Personalizada:** Substitui a tela de carregamento padrão do Fala.BR por uma animação mais moderna e informativa. (Arte por Bia)
* **Layout Modernizado (Triar/Tratar):** Renova a interface da tela de tratamento de manifestações, organizando as informações em cards, aplicando um design mais limpo e melhorando a legibilidade.
* **Cópia Rápida de Protocolo:** Permite copiar o número do protocolo (NUP) com um único clique, eliminando a necessidade de selecionar e copiar manualmente.

### 🤖 Assistentes e Automação
* **Assistente de Tramitação:**
    * Calcula e preenche automaticamente a data de tratamento com base em regras de negócio configuráveis (dias úteis, feriados, etc.).
    * Oferece um painel para selecionar **Pontos Focais** e realizar a tramitação para múltiplos destinatários de forma automática.
    * Disponibiliza modelos de texto customizáveis para o despacho da tramitação, preenchendo variáveis como `{PRAZO}` e `{SECRETARIA}`.
* **Assistentes de Ações Rápidas:** Para as telas de **Arquivar**, **Encaminhar** e **Prorrogar**, o Neuron adiciona menus com modelos de justificativa pré-definidos, agilizando o preenchimento dos formulários.
* **Assistente de Resposta:** Na tela de análise, oferece um sistema de respostas rápidas com base no tipo de interação (intermediária, conclusiva, etc.), preenchendo o texto e o responsável com um clique.

### 📅 Gerenciamento Avançado de Prazos
* **Cálculos Detalhados:** Na tela "Tratar/Triar", exibe um bloco com cálculos detalhados de prazos: Prazo Original, Prazo Interno, Data de Cobrança e Data Improrrogável.
* **Regras Customizáveis:** Todos os cálculos de data respeitam as configurações de dias úteis vs. corridos, ajuste de fim de semana e a lista de feriados cadastrados na página de opções da extensão.

### 🔔 Sistema de Notificações
* **Painel de Notificações:** Adiciona um ícone flutuante que centraliza demandas importantes, como aquelas com prazo curto, respondidas pela área técnica, com observações, prorrogadas ou complementadas.
* **Filtros Inteligentes:** Permite alternar a visualização entre "Minhas Demandas" (atribuídas ao usuário logado) e "Todas as Demandas".
* **Status Visual:** O ícone muda de cor e pulsa para alertar sobre novas notificações ou prazos críticos.

## 📦 Instalação

### Para Desenvolvedores (Instalação Local)
1.  Faça o download ou clone o repositório: `git clone https://github.com/seu-usuario/Neuron.git`.
2.  Abra o Google Chrome e navegue até `chrome://extensions`.
3.  Ative o **"Modo do desenvolvedor"** no canto superior direito.
4.  Clique em **"Carregar sem compactação"**.
5.  Selecione o diretório onde você clonou ou descompactou o projeto.
6.  A extensão Neuron aparecerá na sua lista e estará pronta para uso.

## ⚙️ Como Usar

* **Popup de Acesso Rápido:** Clique no ícone do Neuron na barra de ferramentas do Chrome para ativar/desativar a extensão e ajustar a quantidade de itens por página.
* **Página de Opções Avançadas:** Clique com o botão direito no ícone da extensão e selecione **"Opções"** para acessar a página de configurações completas. Lá, você pode:
    * Habilitar ou desabilitar cada módulo individualmente.
    * Editar todos os modelos de texto e respostas rápidas.
    * Gerenciar a lista de Pontos Focais.
    * Adicionar ou remover feriados para o cálculo de prazos.
    * Importar ou exportar suas configurações em formato JSON.

## 🛠️ Tecnologias e Arquitetura

O Neuron foi construído com tecnologias web modernas e uma arquitetura modular para garantir performance e manutenibilidade.

* **Tecnologias:**
    * JavaScript (ES6+ com Async/Await)
    * Manifest V3 do Google Chrome
    * HTML5 e CSS3
    * JSON para configurações dinâmicas

* **Arquitetura:**
    * **Design Modular:** Cada funcionalidade reside em seu próprio módulo na pasta `/modules`, com seus próprios arquivos JS, CSS e, quando necessário, HTML.
    * **Fábrica de Módulos (`module_factory.js`):** Um padrão de projeto foi utilizado para criar módulos de forma padronizada, gerenciando o ciclo de vida (ativação, desativação) e a leitura de configurações de forma consistente.
    * **Orientado a Configuração:** O comportamento da extensão é amplamente controlado pelo arquivo `config/config.json`. Isso permite que textos, regras e parâmetros sejam alterados sem a necessidade de modificar o código-fonte principal.
    * **Utilitários Compartilhados (`lib/`):** Funções complexas e reutilizáveis, como os cálculos de data, são centralizadas em bibliotecas na pasta `/lib` para evitar duplicação de código.

## 🤝 Como Contribuir

Contribuições são muito bem-vindas! Se você tem ideias para novas funcionalidades, melhorias ou correções:

1.  **Faça um Fork** do projeto.
2.  **Crie uma Branch** para sua modificação (`git checkout -b feature/NovaFuncionalidade`).
3.  **Faça o Commit** das suas alterações (`git commit -m 'Adiciona NovaFuncionalidade'`).
4.  **Faça o Push** para a sua branch (`git push origin feature/NovaFuncionalidade`).
5.  **Abra um Pull Request**.

## 📄 Licença

Este projeto é dedicado ao domínio público sob a licença **CC0 1.0 Universal**. Você é livre para copiar, modificar, distribuir e usar a obra, mesmo para fins comerciais, sem pedir permissão.

Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

* **Arte da Animação de Loading:** Bia.
