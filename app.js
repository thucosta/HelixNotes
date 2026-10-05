"use strict";

/*
  HelixNotes — demonstração.
  As notas vivem no array `estado.notas`.
  A cópia que sobrevive ao recarregar fica em localStorage, na chave CHAVE.
  Dá para criar, listar, buscar, abrir em modo foco e excluir.
*/

var CHAVE = "helixnotes.v1";

var nos = {};
var estado = {
  notas: [],
  ativaId: null,
  busca: "",
  foco: false,
  confirmando: false,
  salvando: false,
  erro: "",
  mensagem: "",
  memoria: false
};
var silencioso = false;
var notaDesenhada = null;
var timerSalvar = 0;
var travarConfirmar = 0;

function iniciar() {
  document.documentElement.classList.add("js");

  nos.lista = document.getElementById("lista");
  nos.titulo = document.getElementById("titulo");
  nos.texto = document.getElementById("texto");
  nos.busca = document.getElementById("busca");
  nos.nova = document.getElementById("btn-nova");
  nos.foco = document.getElementById("btn-foco");
  nos.excluir = document.getElementById("btn-excluir");
  nos.confirmar = document.getElementById("painel-confirmar");
  nos.textoConfirmar = document.getElementById("texto-confirmar");
  nos.btnConfirmar = document.getElementById("btn-confirmar");
  nos.btnCancelar = document.getElementById("btn-cancelar");
  nos.vazio = document.getElementById("estado-vazio");
  nos.editor = document.getElementById("editor");
  nos.status = document.getElementById("status-salvar");
  nos.contagem = document.getElementById("contagem");
  nos.chars = document.getElementById("chars");
  nos.avisoFiltro = document.getElementById("aviso-filtro");
  nos.menu = document.getElementById("menu-principal");
  nos.btnMenu = document.getElementById("btn-menu");
  nos.prateleira = document.getElementById("prateleira");
  nos.form = document.getElementById("form-nota");
  nos.criarVazio = document.getElementById("btn-criar-vazio");
  nos.anuncio = document.getElementById("anuncio");

  if (!nos.lista || !nos.titulo || !nos.texto || !nos.editor) return;

  estado.notas = carregarNotas();
  if (estado.notas[0]) estado.ativaId = estado.notas[0].id;

  ligarEventos();
  desenhar();
}

function carregarNotas() {
  try {
    var bruto = localStorage.getItem(CHAVE);
    if (!bruto) return [];
    var dados = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    return dados.filter(notaValida).map(normalizarNota).sort(porRecente);
  } catch (erro) {
    estado.memoria = true;
    estado.erro = "Não foi possível ler as notas salvas neste navegador.";
    return [];
  }
}

function notaValida(item) {
  return !!item && typeof item.id === "string" && typeof item.titulo === "string" && typeof item.texto === "string";
}

function normalizarNota(item) {
  return {
    id: item.id,
    titulo: item.titulo.slice(0, 120),
    texto: item.texto.slice(0, 8000),
    atualizadoEm: typeof item.atualizadoEm === "string" ? item.atualizadoEm : new Date().toISOString()
  };
}

function porRecente(a, b) {
  if (a.atualizadoEm === b.atualizadoEm) return 0;
  return a.atualizadoEm < b.atualizadoEm ? 1 : -1;
}

function salvarAgora() {
  window.clearTimeout(timerSalvar);
  estado.salvando = false;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado.notas));
    estado.erro = "";
    estado.memoria = false;
  } catch (erro) {
    estado.memoria = true;
    estado.erro = "Não foi possível gravar no navegador. Se recarregar, estas alterações podem sumir.";
    anunciar(estado.erro);
  }
}

function agendarSalvar() {
  estado.salvando = true;
  estado.erro = "";
  window.clearTimeout(timerSalvar);
  timerSalvar = window.setTimeout(function () {
    salvarAgora();
    desenharEditor();
  }, 200);
}

function criarId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "nota-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function notaAtiva() {
  for (var i = 0; i < estado.notas.length; i += 1) {
    if (estado.notas[i].id === estado.ativaId) return estado.notas[i];
  }
  return null;
}

function tituloVisivel(nota) {
  var limpo = nota.titulo.trim();
  return limpo || "Sem título";
}

function resumo(nota) {
  var limpo = nota.texto.replace(/\s+/g, " ").trim();
  if (!limpo) return "Sem texto ainda";
  if (limpo.length <= 90) return limpo;
  return limpo.slice(0, 90).trim() + "…";
}

function normalizar(valor) {
  return String(valor)
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function corresponde(nota, termo) {
  if (!termo) return true;
  var alvo = normalizar(nota.titulo + " " + nota.texto);
  return alvo.indexOf(normalizar(termo)) !== -1;
}

function formatarData(iso) {
  var data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(data);
}

function textoContagem(qtd, filtrando) {
  if (qtd === 0) return filtrando ? "Nenhuma nota encontrada" : "Nenhuma nota";
  if (qtd === 1) return filtrando ? "1 nota encontrada" : "1 nota";
  return filtrando ? qtd + " notas encontradas" : qtd + " notas";
}

function definirTexto(el, texto) {
  if (el && el.textContent !== texto) el.textContent = texto;
}

function anunciar(texto) {
  if (!nos.anuncio) return;
  nos.anuncio.textContent = "";
  window.setTimeout(function () {
    nos.anuncio.textContent = texto;
  }, 30);
}

function criarNota() {
  var nota = {
    id: criarId(),
    titulo: "Nova nota",
    texto: "",
    atualizadoEm: new Date().toISOString()
  };
  estado.notas.unshift(nota);
  estado.ativaId = nota.id;
  estado.busca = "";
  estado.confirmando = false;
  estado.mensagem = "";
  if (nos.busca) nos.busca.value = "";
  notaDesenhada = null;
  salvarAgora();
  desenhar();
  nos.titulo.focus();
  nos.titulo.select();
  anunciar("Nota criada.");
}

function pedirExclusao() {
  if (!notaAtiva()) return;
  estado.confirmando = true;
  desenharEditor();
  nos.btnConfirmar.disabled = true;
  window.clearTimeout(travarConfirmar);
  travarConfirmar = window.setTimeout(function () {
    if (estado.confirmando) nos.btnConfirmar.disabled = false;
  }, 320);
  nos.btnCancelar.focus();
}

function fecharConfirmacao() {
  estado.confirmando = false;
  desenharEditor();
  if (!nos.excluir.hidden) nos.excluir.focus();
}

function excluirAtiva() {
  var id = estado.ativaId;
  if (!id) return;
  estado.notas = estado.notas.filter(function (nota) { return nota.id !== id; });
  estado.ativaId = estado.notas[0] ? estado.notas[0].id : null;
  estado.confirmando = false;
  estado.mensagem = "Nota excluída. A lista deste navegador foi atualizada.";
  if (!estado.ativaId) estado.foco = false;
  notaDesenhada = null;
  salvarAgora();
  desenhar();
  anunciar("Nota excluída.");
  var ativa = nos.lista.querySelector(".item-nota.ativa");
  if (ativa) ativa.focus();
  else nos.nova.focus();
}

function aoEditar() {
  if (silencioso) return;
  var nota = notaAtiva();
  if (!nota) return;
  nota.titulo = nos.titulo.value;
  nota.texto = nos.texto.value;
  nota.atualizadoEm = new Date().toISOString();
  estado.mensagem = "";
  agendarSalvar();
  if (!atualizarItem(nota)) desenharLista();
  desenharEditor();
}

function atualizarItem(nota) {
  if (!window.CSS || typeof CSS.escape !== "function") return false;
  var botao = nos.lista.querySelector('[data-id="' + CSS.escape(nota.id) + '"]');
  if (!botao) return false;
  var tituloEl = botao.querySelector(".item-titulo");
  var resumoEl = botao.querySelector(".item-resumo");
  var tempoEl = botao.querySelector("time");
  if (!tituloEl || !resumoEl || !tempoEl) return false;
  if (!corresponde(nota, estado.busca.trim())) return false;
  tituloEl.textContent = tituloVisivel(nota);
  resumoEl.textContent = resumo(nota);
  tempoEl.dateTime = nota.atualizadoEm;
  tempoEl.textContent = formatarData(nota.atualizadoEm);
  return true;
}

function desenhar() {
  desenharLista();
  desenharEditor();
  aplicarFoco();
}

function desenharLista() {
  var termo = estado.busca.trim();
  var visiveis = estado.notas.filter(function (nota) { return corresponde(nota, termo); });
  var scroll = nos.lista.scrollTop;
  nos.lista.replaceChildren();

  if (visiveis.length === 0) {
    var vazio = document.createElement("li");
    vazio.className = "lista-vazia";
    vazio.textContent = termo ? "Nenhuma nota com \"" + termo + "\"." : "Nenhuma nota ainda.";
    nos.lista.appendChild(vazio);
  } else {
    visiveis.forEach(function (nota) {
      var item = document.createElement("li");
      var botao = document.createElement("button");
      botao.type = "button";
      botao.className = "item-nota" + (nota.id === estado.ativaId ? " ativa" : "");
      botao.setAttribute("data-id", nota.id);
      if (nota.id === estado.ativaId) botao.setAttribute("aria-current", "true");

      var forte = document.createElement("span");
      forte.className = "item-titulo";
      forte.textContent = tituloVisivel(nota);

      var pequeno = document.createElement("span");
      pequeno.className = "item-resumo";
      pequeno.textContent = resumo(nota);

      var tempo = document.createElement("time");
      tempo.dateTime = nota.atualizadoEm;
      tempo.textContent = formatarData(nota.atualizadoEm);

      botao.append(forte, pequeno, tempo);
      item.appendChild(botao);
      nos.lista.appendChild(item);
    });
  }

  nos.lista.scrollTop = scroll;
  definirTexto(nos.contagem, textoContagem(visiveis.length, termo !== ""));
}

function textoStatus() {
  if (estado.erro) return estado.erro;
  if (estado.salvando) return "Salvando…";
  if (estado.mensagem) return estado.mensagem;
  if (estado.memoria) return "O navegador não deixou gravar. As notas valem só nesta sessão.";
  return "Salvo neste navegador";
}

function desenharEditor() {
  var nota = notaAtiva();
  var tem = !!nota;
  nos.vazio.hidden = tem;
  nos.editor.hidden = !tem;
  nos.foco.disabled = !tem;
  if (!tem) {
    notaDesenhada = null;
    return;
  }

  if (notaDesenhada !== nota.id) {
    silencioso = true;
    nos.titulo.value = nota.titulo;
    nos.texto.value = nota.texto;
    silencioso = false;
    notaDesenhada = nota.id;
  }

  nos.confirmar.hidden = !estado.confirmando;
  nos.excluir.hidden = estado.confirmando;
  if (estado.confirmando) {
    nos.textoConfirmar.textContent = "Excluir \"" + tituloVisivel(nota) + "\"? Ela sai só deste navegador.";
  }

  var termo = estado.busca.trim();
  nos.avisoFiltro.hidden = !(termo && !corresponde(nota, termo));
  nos.chars.textContent = String(nota.texto.length) + "/8000";
  nos.chars.classList.toggle("limite", nota.texto.length >= 7600);
  definirTexto(nos.status, textoStatus());
}

function aplicarFoco() {
  nos.prateleira.hidden = estado.foco;
  var caixa = document.getElementById("app");
  if (caixa) caixa.classList.toggle("em-foco", estado.foco);
  nos.foco.setAttribute("aria-pressed", estado.foco ? "true" : "false");
  nos.foco.textContent = estado.foco ? "Sair do foco" : "Modo foco";
}

function abrirMenu(aberto) {
  nos.menu.classList.toggle("aberto", aberto);
  nos.btnMenu.setAttribute("aria-expanded", aberto ? "true" : "false");
  nos.btnMenu.textContent = aberto ? "Fechar" : "Menu";
}

function ligarEventos() {
  nos.nova.addEventListener("click", criarNota);
  nos.criarVazio.addEventListener("click", criarNota);
  nos.excluir.addEventListener("click", pedirExclusao);
  nos.btnCancelar.addEventListener("click", fecharConfirmacao);
  nos.btnConfirmar.addEventListener("click", excluirAtiva);

  nos.form.addEventListener("submit", function (evento) {
    evento.preventDefault();
  });
  nos.titulo.addEventListener("input", aoEditar);
  nos.texto.addEventListener("input", aoEditar);
  nos.titulo.addEventListener("keydown", function (evento) {
    if (evento.key === "Enter") {
      evento.preventDefault();
      nos.texto.focus();
    }
  });

  nos.busca.addEventListener("input", function () {
    estado.busca = nos.busca.value;
    desenharLista();
    desenharEditor();
  });

  nos.lista.addEventListener("click", function (evento) {
    var botao = evento.target.closest("button[data-id]");
    if (!botao || !nos.lista.contains(botao)) return;
    estado.ativaId = botao.getAttribute("data-id");
    estado.confirmando = false;
    notaDesenhada = null;
    desenhar();
  });

  nos.foco.addEventListener("click", function () {
    if (nos.foco.disabled) return;
    estado.foco = !estado.foco;
    aplicarFoco();
    if (estado.foco) nos.texto.focus();
    else nos.busca.focus();
  });

  nos.btnMenu.addEventListener("click", function () {
    abrirMenu(!nos.menu.classList.contains("aberto"));
  });

  var links = document.querySelectorAll(".site-header a[href^='#']");
  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener("click", function () { abrirMenu(false); });
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key !== "Escape") return;
    if (estado.confirmando) {
      fecharConfirmacao();
      return;
    }
    if (nos.menu.classList.contains("aberto")) {
      abrirMenu(false);
      nos.btnMenu.focus();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      salvarAgora();
      desenharEditor();
    }
  });

  var mq = window.matchMedia("(max-width: 720px)");
  var aoMudarTela = function () {
    if (!mq.matches) abrirMenu(false);
  };
  if (mq.addEventListener) mq.addEventListener("change", aoMudarTela);
  else if (mq.addListener) mq.addListener(aoMudarTela);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
