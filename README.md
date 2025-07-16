<p align="center">
  <img src="https://github.com/Mirante5/Neuron/blob/main/images/Intro-Neuron.gif" alt="Neuron Loading Animation" width="500"/>
</p>

# Neuron Extension v1.3.0

**Otimizador de fluxos de trabalho na plataforma Fala.br**

[![Versão](https://img.shields.io/badge/version-1.1.0-red.svg)](manifest.json)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](manifest.json)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![DeepScan grade](https://deepscan.io/api/teams/27437/projects/29889/branches/958626/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=27437&pid=29889&bid=958626)

## Visão Geral

Neuron é uma extensão para o Google Chrome projetada para otimizar e agilizar diversas tarefas repetitivas na plataforma Fala.br do Governo Federal brasileiro. Ela injeta scripts em páginas específicas, adicionando funcionalidades, automações e melhorias de interface do usuário para tornar o trabalho dos operadores mais eficiente.

## Plataforma Alvo

* **Site:** Controladoria-Geral da União - Fala.BR
* **URL:** `https://falabr.cgu.gov.br/*`

## Funcionalidades Principais

A extensão oferece um conjunto de módulos que podem ser habilitados ou desabilitados individualmente através do popup da extensão ou da página de opções:

* **Controle Global:**
    * Habilitar/Desabilitar o Neuron completamente.
* **Módulos Específicos:**
    * **Animação de Loading Personalizada:** Substitui a animação de carregamento padrão do Fala.br por uma customizada com o logo do Neuron e informações da versão. (Arte por Bia)
    * **Assistente de Arquivamento:** Adiciona um dropdown com modelos de justificativa pré-definidos na tela de arquivamento de manifestações.
    * **Assistente de Encaminhamento:** Insere um seletor de modelos de texto para as notificações ao destinatário e ao solicitante na tela de encaminhamento.
    * **Assistente de Prorrogação:** Oferece um dropdown com justificativas pré-definidas para a prorrogação de manifestações.
    * **Assistente de Tramitação:**
        * Preenche automaticamente a data de tratamento.
        * Adiciona um painel para selecionar Secretarias/Pontos Focais (com base no `pontosfocais.json`) e um botão para "Auto-Tramitar" para os nomes relacionados.
        * Insere um dropdown com modelos de mensagem pré-definidos (do `text.json`) para o campo de mensagem da tramitação, com substituição de placeholders como `{SECRETARIA}` e `{PRAZO}`.
    * **Melhorias Telas Triar/Tratar:**
        * Ajusta a quantidade de itens exibidos por página (configurável via popup ou página de opções, padrão 15).
        * Aplica cores distintas para diferentes situações de manifestação (Complementação Solicitada, Complementada, Prorrogada).
        * Exibe informações detalhadas de prazos (Original, Cobrança, Tramitar, Prorrogar, Improrrogável) com base em cálculos de dias úteis e feriados configurados.
        * Remove o link de navegação dos NUPs e adiciona funcionalidade de "copiar ao clicar".
    * **Melhorias Tela Tratar Manifestação:**
        * Adiciona botões para "Importar dados do cidadão" (nome, documento, e-mail) para o campo de contribuição.
        * Adiciona botão para inserir texto padrão de prorrogação (do `text.json`) no campo de contribuição, substituindo `{datalimite}`.

* **Configuração Avançada (Página de Opções - `options.html`):**
    * **Configurações Gerais:**
        * Chave mestra para habilitar/desabilitar a extensão.
        * Toggles individuais para cada funcionalidade.
        * Configuração do número de itens por página para as telas Triar/Tratar.
    * **Editor de Modelos de Texto:** Permite editar diretamente o conteúdo do `text.json` (usado pelos assistentes).
    * **Editor de Pontos Focais:** Permite editar diretamente o conteúdo do `pontosfocais.json` (usado pelo assistente de tramitação).
    * **Gerenciador de Feriados:** Adicionar/remover feriados (DD/MM/AAAA) que são considerados nos cálculos de prazo.
    * Botão para salvar todas as alterações.

## Tecnologias Utilizadas

* Google Chrome Extension Manifest V3
* JavaScript (ES6+ com `async/await`)
* HTML5
* CSS3
* JSON (para configurações e modelos de texto)

## Instalação

1.  Faça o download
2.  Abra o Google Chrome e navegue até `chrome://extensions`.
3.  Habilite o "Modo do Desenvolvedor" (Developer mode) no canto superior direito.
4.  Clique em 
5.  Selecione o diretório `` 
6.  A extensão Neuron deverá aparecer na sua lista de extensões e estará pronta para uso.

## Uso

* **Popup:** Clique no ícone da extensão Neuron na barra de ferramentas do Chrome para acessar os toggles rápidos de funcionalidades e o botão "Aplicar e Recarregar Aba".
* **Página de Opções:** Clique com o botão direito no ícone da extensão e selecione "Opções" para configurações detalhadas, edição de JSONs e gerenciamento de feriados.
* As funcionalidades ativadas serão aplicadas automaticamente nas páginas correspondentes da plataforma Fala.br.

## Como Contribuir

Contribuições são bem-vindas! Se você tem ideias para novas funcionalidades, melhorias ou correções de bugs:

1.  Faça um Fork do projeto.
2.  Crie uma branch para sua Feature.
3.  Commit suas mudanças.
4.  Push para a Branch.
5.  Abra um Pull Request.

## Licença

Este projeto é licenciado sob a Licença Creative Commons Atribuição-NãoComercial-CompartilhaIgual 4.0 Internacional (CC BY-NC-SA 4.0).

<p align="center">
  <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Licença Creative Commons" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a>
</p>

Isso significa que você é livre para:

* **Compartilhar** — copiar e redistribuir o material em qualquer suporte ou formato.
* **Adaptar** — remixar, transformar, e criar a partir do material.

Sob os seguintes termos:

* **Atribuição** — Você deve dar o crédito apropriado, prover um link para a licença e indicar se mudanças foram feitas. Você pode fazê-lo em qualquer forma razoável, mas não de forma a sugerir que o licenciante o apoia ou aprova o seu uso.
* **NãoComercial** — Você não pode usar o material para fins comerciais.
* **CompartilhaIgual** — Se você remixar, transformar, ou criar a partir do material, tem de distribuir as suas contribuições sob a mesma licença que o original.

Você pode encontrar o texto completo da licença [aqui](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.pt). É recomendável incluir o texto completo da licença em um arquivo `LICENSE` ou `LICENSE.md` no seu repositório.

## Agradecimentos

* **Arte da Animação de Loading:** Bia
