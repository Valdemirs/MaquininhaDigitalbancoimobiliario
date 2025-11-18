/* Maquininha — versão simples: sem temas, sem torneio. Botões: som, imprimir, finalizar, reset. */

// storage keys
const LS_PLAYERS = 'md_simple_players';
const LS_HISTORY = 'md_simple_history';
const LS_SOUND = 'md_simple_sound';

// state
let players = JSON.parse(localStorage.getItem(LS_PLAYERS) || '{}');
let history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
let soundOn = (localStorage.getItem(LS_SOUND) || '1') === '1';

// DOM helper
const $ = id => document.getElementById(id);

// Audio (WebAudio small tones)
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioCtx ? new AudioCtx() : null;
function playTone(freq = 440, type = 'sine', duration = 0.08, gain = 0.05) {
    if (!soundOn || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    osc.connect(g); g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.005);
    osc.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.stop(now + duration + 0.02);
}
const soundClick = () => playTone(880, 'square', 0.06, 0.02);
const soundCash = () => playTone(620, 'sawtooth', 0.14, 0.05);
const soundErr = () => playTone(220, 'sine', 0.14, 0.06);

// speech (optional)
function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const ut = new SpeechSynthesisUtterance(text);
    ut.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(ut);
}

// save
function saveAll() { localStorage.setItem(LS_PLAYERS, JSON.stringify(players)); localStorage.setItem(LS_HISTORY, JSON.stringify(history)); }

// init after DOM ready
window.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    renderAll();
    updateSoundUI();
});

// bind UI
function bindEvents() {
    $('#addPlayerBtn').addEventListener('click', handleAddPlayer);
    $('#autoFillBtn').addEventListener('click', autoFill);
    $('#addSaldoBtn').addEventListener('click', handleAddSaldo);
    $('#remSaldoBtn').addEventListener('click', handleRemSaldo);

    $('#soundToggle').addEventListener('click', toggleSound);
    $('#printBtn').addEventListener('click', handlePrint);
    $('#finishGameBtn').addEventListener('click', handleFinish);
    $('#resetBtn').addEventListener('click', handleReset);
    $('#leaderRefreshBtn').addEventListener('click', updateRanking);

    $('#novoJogador').addEventListener('keydown', e => { if (e.key === 'Enter') handleAddPlayer(); });
}

// render everything
function renderAll() {
    renderPlayersList();
    renderSelectOptions();
    renderHistory();
    updateRanking();
    saveAll();
}

function renderSelectOptions() {
    const sel = $('jogadorSelect'); if (!sel) return;
    sel.innerHTML = '';
    Object.keys(players).forEach(name => {
        const opt = document.createElement('option'); opt.value = name; opt.textContent = name; sel.appendChild(opt);
    });
}

function renderPlayersList() {
    const ul = $('listaSaldos'); if (!ul) return;
    ul.innerHTML = '';
    const keys = Object.keys(players);
    if (keys.length === 0) { ul.innerHTML = `<div class="muted">Nenhum jogador cadastrado.</div>`; return; }
    keys.forEach(name => {
        const p = players[name];
        const li = document.createElement('li'); li.className = 'player-item';
        li.innerHTML = `
      <div class="player-meta">
        <strong>${p.nome}</strong>
        <span>Saldo: <strong style="color:${p.saldo < 0 ? '#ff7a7a' : '#a7ffd9'}">R$ ${p.saldo.toFixed(2)}</strong></span>
      </div>
      <div class="actions">
        <button class="btn outline sel-btn" data-name="${p.nome}">Selecionar</button>
      </div>
    `;
        ul.appendChild(li);
    });
    // attach select handlers
    document.querySelectorAll('.sel-btn').forEach(b => {
        b.addEventListener('click', () => {
            $('jogadorSelect').value = b.dataset.name;
            b.classList.add('pulse');
            setTimeout(() => b.classList.remove('pulse'), 220);
        });
    });
}

function renderHistory() {
    const hl = $('historyList'); if (!hl) return;
    hl.innerHTML = '';
    if (history.length === 0) { $('noHistory').style.display = 'block'; return; }
    $('noHistory').style.display = 'none';
    history.slice().reverse().forEach(h => {
        const li = document.createElement('li'); li.className = 'history-item ' + (h.tipo === 'add' ? 'success' : 'danger');
        const dt = new Date(h.ts).toLocaleString();
        li.innerHTML = `<div><strong>${h.jogador}</strong> • ${h.tipo === 'add' ? 'Crédito' : 'Débito'} • ${dt}</div><div class="amt">R$ ${h.valor.toFixed(2)}</div>`;
        hl.appendChild(li);
    });
}

function updateRanking() {
    const ol = $('rankingList'); if (!ol) return;
    ol.innerHTML = '';
    const arr = Object.keys(players).map(n => ({ n, s: players[n].saldo })).sort((a, b) => b.s - a.s);
    arr.forEach((p, i) => {
        const li = document.createElement('li');
        li.textContent = `${i + 1}. ${p.n} — R$ ${p.s.toFixed(2)}`;
        ol.appendChild(li);
    });
}

// actions
function handleAddPlayer() {
    const inp = $('novoJogador'); const name = inp.value.trim();
    if (!name) { alert('Digite um nome!'); soundErr(); return; }
    if (players[name]) { alert('Jogador já existe!'); soundErr(); return; }
    players[name] = { nome: name, saldo: 0 };
    inp.value = '';
    soundClick(); renderAll();
}

function handleAddSaldo() {
    const sel = $('jogadorSelect'); if (!sel || !sel.value) { alert('Selecione um jogador!'); soundErr(); return; }
    const name = sel.value; const v = Number($('valor').value);
    if (isNaN(v) || v === 0) { alert('Digite um valor válido!'); soundErr(); return; }
    players[name].saldo += v;
    history.push({ ts: Date.now(), jogador: name, tipo: 'add', valor: Number(v) });
    saveAll();
    soundCash(); speak(`${name} recebeu crédito de ${v} reais`);
    renderAll();
}

function handleRemSaldo() {
    const sel = $('jogadorSelect'); if (!sel || !sel.value) { alert('Selecione um jogador!'); soundErr(); return; }
    const name = sel.value; const v = Number($('valor').value);
    if (isNaN(v) || v === 0) { alert('Digite um valor válido!'); soundErr(); return; }
    players[name].saldo -= v;
    history.push({ ts: Date.now(), jogador: name, tipo: 'remove', valor: Number(v) });
    saveAll();
    soundClick(); speak(`${name} teve débito de ${v} reais`);
    renderAll();
}

// auto sample
function autoFill() {
    const sample = ['Ana', 'Bruno', 'Caio', 'Diana'];
    sample.forEach((n, i) => players[n] = { nome: n, saldo: (i + 1) * 1000 });
    soundClick(); renderAll();
}

// sound control
function toggleSound() { soundOn = !soundOn; localStorage.setItem(LS_SOUND, soundOn ? '1' : '0'); updateSoundUI(); if (soundOn) soundClick(); }
function updateSoundUI() { const b = $('soundToggle'); if (!b) return; b.textContent = soundOn ? '🔊' : '🔈'; }

// print/export (clean extrato)
function handlePrint() {
    if (history.length === 0) { alert('Sem transações para exportar.'); return; }
    const html = buildPrintHtml();
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
}
function buildPrintHtml() {
    const movs = history.slice().map(h => `<tr><td>${h.jogador}</td><td>${h.tipo === 'add' ? 'Crédito' : 'Débito'}</td><td>R$ ${h.valor.toFixed(2)}</td><td>${new Date(h.ts).toLocaleString()}</td></tr>`).join('');
    const saldos = Object.keys(players).map(n => `<tr><td>${n}</td><td>R$ ${players[n].saldo.toFixed(2)}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Extrato</title><style>body{font-family:Arial;padding:18px}h1{margin:0 0 10px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd}th{background:#f5f5f5;text-align:left}</style></head><body><h1>Extrato - Maquininha</h1><p>Gerado em: ${new Date().toLocaleString()}</p><h3>Saldos</h3><table>${saldos}</table><h3>Movimentações</h3><table><thead><tr><th>Jogador</th><th>Tipo</th><th>Valor</th><th>Data</th></tr></thead><tbody>${movs}</tbody></table></body></html>`;
}

// finalize game (winner)
function handleFinish() {
    const names = Object.keys(players);
    if (names.length === 0) { alert('Nenhum jogador cadastrado!'); return; }
    let max = -Infinity; let winners = [];
    names.forEach(n => {
        const s = players[n].saldo;
        if (s > max) { max = s; winners = [n]; }
        else if (s === max) { winners.push(n); }
    });
    if (winners.length === 1) {
        soundCash();
        alert(`🏁 FIM DE JOGO!\n\n🎉 PARABÉNS, ${winners[0]}!\n💰 Venceu com R$ ${max.toFixed(2)}`);
    } else {
        soundClick();
        alert(`🏁 EMPATE!\n\nJogadores:\n• ${winners.join('\n• ')}\n\nSaldo: R$ ${max.toFixed(2)}`);
    }
}

// reset everything
function handleReset() {
    if (!confirm('Tem certeza que deseja resetar tudo? Isso apagará jogadores e histórico.')) return;
    players = {};
    history = [];
    saveAll();
    renderAll();
    soundClick();
}
