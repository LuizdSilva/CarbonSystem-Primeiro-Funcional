/**
 * emissions.js — Calculadora de Emissões Industriais
 * 
 * Implementa dois métodos do artigo científico:
 *
 * MÉTODO 1 — IPCC (Fórmula 1 do artigo, Tabela 1):
 *   CO2 = Σ Ei × NCVi × CCi × COFi × (44/12)
 *   onde:
 *     Ei   = consumo do combustível i (kg ou m³)
 *     NCVi = poder calorífico inferior (kJ/kg)
 *     CCi  = teor de carbono (t C / TJ)
 *     COFi = fator de oxidação do carbono (adimensional, IPCC)
 *     44/12 = razão molar CO2/C
 *
 * MÉTODO 2 — LMDI (Fórmulas 2-10 do artigo):
 *   C = ΣΣ Cij = ΣΣ (Cij/Eij) × (Eij/Ej) × (Ej/Yj) × (Yj/Y) × (Y/P) × P
 *       ED_ij     EM_ij         ET_j         ES_j       EE         EP
 *
 *   Variação: IC(t+1) - IC(t) = D_ED + D_EM + D_ET + D_ES + D_EE + D_EP
 *
 *   Cada fator calculado pelo logarithmic mean weight (Fórmula 9):
 *   ω_ij = L(C_ij^(t+1), C_ij^t) = (C_ij^(t+1) - C_ij^t) / (ln C_ij^(t+1) - ln C_ij^t)
 *
 *   D_ED = ω_ij × ln(ED_ij^(t+1) / ED_ij^t)   (intensidade de carbono)
 *   D_EM = ω_ij × ln(EM_ij^(t+1) / EM_ij^t)   (estrutura energética)
 *   D_ET = ω_ij × ln(ET_j^(t+1)  / ET_j^t)    (eficiência energética)
 *   D_ES = ω_ij × ln(ES_j^(t+1)  / ES_j^t)    (estrutura industrial)
 *   D_EE = ω_ij × ln(EE^(t+1)    / EE^t)      (eficiência econômica)
 *   D_EP = ω_ij × ln(P^(t+1)     / P^t)       (escala de emprego)
 */

const EM = (function () {

    // ─────────────────────────────────────────────────────────────
    //  TABELA 1 DO ARTIGO — Coeficientes de emissão (IPCC 2006)
    //  Fonte: Lu Zhang et al., Computational Intelligence and
    //         Neuroscience, 2022.
    //
    //  NCV  = Poder calorífico inferior (kJ/kg ou kJ/m³)
    //  CC   = Teor de carbono (t C / TJ) — carbon content per unit
    //  COF  = Fator de oxidação do carbono (IPCC default)
    //  COEF = Coeficiente de emissão total (kg CO2/kg ou kg CO2/m³)
    //         calculado como: NCV/1e6 × CC × COF × (44/12) × 1000
    //  (Os valores de COEF da tabela já incluem todos os fatores)
    // ─────────────────────────────────────────────────────────────
    const FUELS = [
        {
            id: 'rawCoal',
            name: 'Carvão Mineral (cru)',
            unit: 'kg',
            NCV: 20908,          // kJ/kg
            CC: 26.37,           // t C / TJ
            COF: 0.94,           // adimensional
            COEF: 1.9003,        // kg CO2/kg  (Tabela 1, artigo)
        },
        {
            id: 'gasoline',
            name: 'Gasolina',
            unit: 'kg',
            NCV: 43070,
            CC: 18.9,
            COF: 0.98,
            COEF: 2.9251,        // kg CO2/kg
        },
        {
            id: 'diesel',
            name: 'Óleo Diesel',
            unit: 'kg',
            NCV: 42652,
            CC: 20.2,
            COF: 0.98,
            COEF: 3.0959,        // kg CO2/kg
        },
        {
            id: 'fuelOil',
            name: 'Óleo Combustível',
            unit: 'kg',
            NCV: 41816,
            CC: 21.1,
            COF: 0.98,
            COEF: 3.1705,        // kg CO2/kg
        },
        {
            id: 'naturalGas',
            name: 'Gás Natural',
            unit: 'm³',
            NCV: 38931,          // kJ/m³
            CC: 15.3,
            COF: 0.99,
            COEF: 2.1622,        // kg CO2/m³
        },
    ];

    // Fórmula de verificação:
    // COEF = NCV/1e6 [TJ/kg] × CC [tC/TJ] × COF × (44/12) × 1000 [kg CO2/t CO2] × 1000 [kg/t]
    // Simplificando: COEF = NCV × CC × COF × (44/12) / 1e6 × 1000
    function verificarCoef(f) {
        return (f.NCV * f.CC * f.COF * (44 / 12)) / 1e6 * 1000;
    }

    //  ESTADO GLOBAL
    let _estado = {
        emissaoCombustao: 0,   // t CO2 (escopo 1)
        emissaoEletrica: 0,    // t CO2 (escopo 2)
        emissaoTotal: 0,       // t CO2 total
        lmdi: null,            // resultado da decomposição LMDI
        projChart: null,
        lmdiChart: null,
    };

    //  ABAS
    const TABS = ['tab-ident', 'tab-atual', 'tab-lmdi', 'tab-proj', 'tab-result'];
    let _tabIdx = 0;

    function tab(btn) {
        document.querySelectorAll('.em-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.em-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const id = btn.dataset.tab;
        document.getElementById(id).classList.add('active');
        _tabIdx = TABS.indexOf(id);
        if (id === 'tab-result') renderResultados();
    }

    function nextTab() {
        if (_tabIdx < TABS.length - 1) {
            _tabIdx++;
            _ativarTabPorIdx(_tabIdx);
        }
        if (TABS[_tabIdx] === 'tab-result') renderResultados();
    }

    function prevTab() {
        if (_tabIdx > 0) {
            _tabIdx--;
            _ativarTabPorIdx(_tabIdx);
        }
    }

    function _ativarTabPorIdx(i) {
        const id = TABS[i];
        document.querySelectorAll('.em-tab').forEach((b, idx) => {
            b.classList.toggle('active', idx === i);
        });
        document.querySelectorAll('.em-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    // ─────────────────────────────────────────────────────────────
    //  INICIALIZAÇÃO DA TABELA DE COMBUSTÍVEIS
    // ─────────────────────────────────────────────────────────────
    function initFuelTable() {
        const tbody = document.getElementById('fuelTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        FUELS.forEach(f => {
            const coefVerif = verificarCoef(f).toFixed(4);
            const row = document.createElement('tr');
            row.innerHTML = `
        <td>${f.name}</td>
        <td>
          <input type="number" class="fuel-input" id="fc_${f.id}"
                 min="0" step="0.001" placeholder="0"
                 oninput="EM.calcAtual()"
                 data-fuel="${f.id}"/>
          <span style="font-size:0.65rem;color:var(--text-dim);display:block;margin-top:2px">${f.unit}/ano</span>
        </td>
        <td class="fuel-coef">${f.NCV.toLocaleString('pt-BR')}</td>
        <td class="fuel-coef">${f.CC}</td>
        <td class="fuel-coef">${f.COF}</td>
        <td class="fuel-coef" title="Verificado: ${coefVerif}">${f.COEF}</td>
        <td class="fuel-emission" id="fe_${f.id}">—</td>
      `;
            tbody.appendChild(row);
        });
    }

    //  MÉTODO 1 — CÁLCULO ATUAL (IPCC Fórmula 1)
    //  CO2_i = Ei [kg] × COEF_i [kg CO2/kg] / 1000 → t CO2
    function calcAtual() {
        let totalCombustao = 0;

        FUELS.forEach(f => {
            const inp = document.getElementById('fc_' + f.id);
            const E = inp ? parseFloat(inp.value) || 0 : 0;

            // CO2_i (t) = E (kg) × COEF (kg CO2/kg) / 1000
            const co2 = (E * f.COEF) / 1000;
            totalCombustao += co2;

            const cell = document.getElementById('fe_' + f.id);
            if (cell) cell.textContent = E > 0 ? fmt(co2, 3) : '—';
        });

        _estado.emissaoCombustao = totalCombustao;

        // Emissão elétrica: t CO2 = MWh × fator (t CO2/MWh)
        const mwh    = parseFloat(document.getElementById('consumoEletrico')?.value) || 0;
        const fator  = parseFloat(document.getElementById('fatorEletrico')?.value) || 0.0461;
        const elec   = mwh * fator;
        _estado.emissaoEletrica = elec;

        const elecInput = document.getElementById('emissaoEletrica');
        if (elecInput) elecInput.value = elec > 0 ? elec.toFixed(4) : '';

        const total = totalCombustao + elec;
        _estado.emissaoTotal = total;

        const totalCombInput = document.getElementById('totalCO2Combustao');
        if (totalCombInput) totalCombInput.textContent = totalCombustao > 0 ? fmt(totalCombustao, 3) : '—';

        const totalInput = document.getElementById('emissaoTotal');
        if (totalInput) totalInput.value = total > 0 ? total.toFixed(3) : '';

        const cota  = parseFloat(document.getElementById('cotaMaxima')?.value) || 0;
        const saldo = cota - total;
        const saldoInput = document.getElementById('saldoCota');
        if (saldoInput) {
            saldoInput.value = cota > 0 ? saldo.toFixed(3) : '';
            saldoInput.style.color = saldo >= 0 ? 'var(--primary-light)' : 'var(--danger)';
        }

        atualizarBarra(total, cota);
    }

    //  BARRA DE COTA
    function atualizarBarra(emissao, cota) {
        const fillEl   = document.getElementById('quotaFill');
        const pctEl    = document.getElementById('quotaPct');
        const statusEl = document.getElementById('quotaStatus');
        const stTextEl = document.getElementById('quotaStatusText');
        const atualEl  = document.getElementById('qvAtual');
        const cotaEl   = document.getElementById('qvCota');

        if (atualEl) atualEl.textContent = emissao > 0 ? fmt(emissao, 2) : '—';
        if (cotaEl)  cotaEl.textContent  = cota    > 0 ? fmt(cota, 2)    : '—';

        if (!fillEl || !pctEl) return;

        if (!emissao || !cota || cota <= 0) {
            fillEl.style.width = '0%';
            fillEl.style.background = '#16a34a';
            pctEl.textContent = '—%';
            pctEl.style.color = 'var(--text-muted)';
            if (statusEl) statusEl.className = 'quota-status status-ok';
            if (stTextEl) stTextEl.textContent = 'Preencha consumos e cota máxima.';
            return;
        }

        const pct     = Math.min((emissao / cota) * 100, 150);
        const pctDisp = ((emissao / cota) * 100).toFixed(1);
        fillEl.style.width = Math.min(pct, 100) + '%';
        pctEl.textContent  = pctDisp + '%';

        if (pct <= 60) {
            fillEl.style.background = '#16a34a';
            pctEl.style.color       = '#4ade80';
            if (statusEl) statusEl.className = 'quota-status status-ok';
            if (stTextEl) stTextEl.textContent = '✅ ' + pctDisp + '% da cota — operação regular.';
        } else if (pct <= 80) {
            fillEl.style.background = 'linear-gradient(90deg, #16a34a, #f59e0b)';
            pctEl.style.color       = '#fbbf24';
            if (statusEl) statusEl.className = 'quota-status status-warn';
            if (stTextEl) stTextEl.textContent = '⚠️ ' + pctDisp + '% da cota — ação preventiva recomendada.';
        } else if (pct < 100) {
            fillEl.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
            pctEl.style.color       = '#f87171';
            if (statusEl) statusEl.className = 'quota-status status-danger';
            if (stTextEl) stTextEl.textContent = '🚨 ' + pctDisp + '% da cota — ação imediata necessária!';
        } else {
            fillEl.style.background = '#ef4444';
            pctEl.style.color       = '#f87171';
            if (statusEl) statusEl.className = 'quota-status status-danger';
            if (stTextEl) stTextEl.textContent = '🚨 LIMITE EXCEDIDO! ' + pctDisp + '% — notificação obrigatória ao órgão ambiental.';
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  MÉTODO 2 — DECOMPOSIÇÃO LMDI (Fórmulas 3-10 do artigo)
    //
    //  Notação:
    //    C   = emissão total (mil t CO2)
    //    E   = consumo total de energia (TJ)
    //    Y   = produção/valor adicionado industrial total
    //    P   = nº funcionários
    //    Ej  = consumo de energia do setor j
    //    Yj  = produção do setor j
    //    Eij = consumo do combustível i no setor j
    //    Cij = emissão de CO2 do combustível i no setor j
    //
    //  Fatores derivados (denominador da decomposição):
    //    ED_ij = Cij/Eij  — intensidade de carbono do combustível i
    //    EM_ij = Eij/Ej   — estrutura energética (share do combustível i)
    //    ET_j  = Ej/Yj    — eficiência energética (energia por unidade produzida)
    //    ES_j  = Yj/Y     — estrutura industrial (share do setor j)
    //    EE    = Y/P      — eficiência econômica (produção por funcionário)
    //    EP    = P        — escala de emprego
    //
    //  Peso logarítmico (Fórmula 9):
    //    ω_ij = L(C_ij^t+1, C_ij^t) = (C^t+1 - C^t) / (ln C^t+1 - ln C^t)
    //    Caso especial: se C^t+1 = C^t → ω = C^t  (limite da função)
    //
    //  Decomposição aditiva (Fórmulas 3-8):
    //    D_X = ω_ij × ln(X^t+1 / X^t)
    //
    //  Verificação (Fórmula 10):
    //    C^t+1 - C^t = D_ED + D_EM + D_ET + D_ES + D_EE + D_EP
    // ─────────────────────────────────────────────────────────────
    function calcLMDI() {
        const r = (id) => parseFloat(document.getElementById(id)?.value) || 0;

        // Ano base (t)
        const t = {
            C:   r('lb_C'),    // emissão total (mil t CO2)
            E:   r('lb_E'),    // energia total (TJ)
            Y:   r('lb_Y'),    // produção total
            P:   r('lb_P'),    // funcionários
            Ej:  r('lb_Ej'),   // energia do setor
            Yj:  r('lb_Yj'),   // produção do setor
            Eij: r('lb_Eij'),  // energia do combustível principal
            Cij: r('lb_Cij'),  // CO2 do combustível principal
        };

        // Ano alvo (t+1)
        const t1 = {
            C:   r('la_C'),
            E:   r('la_E'),
            Y:   r('la_Y'),
            P:   r('la_P'),
            Ej:  r('la_Ej'),
            Yj:  r('la_Yj'),
            Eij: r('la_Eij'),
            Cij: r('la_Cij'),
        };

        // Validação básica
        if (!t.C || !t1.C || !t.E || !t1.E || !t.Y || !t1.Y || !t.P || !t1.P) {
            alert('Preencha todos os campos das duas colunas LMDI.');
            return;
        }

        // Evitar divisão por zero: usar ε pequeno se denominador for zero
        const eps = 1e-10;
        const safe = (v) => Math.max(v, eps);

        // ── Fatores do ano base ──
        const ED_ij_t  = t.Cij  / safe(t.Eij);   // intensidade carbono combustível
        const EM_ij_t  = t.Eij  / safe(t.Ej);    // estrutura energética
        const ET_j_t   = t.Ej   / safe(t.Yj);    // eficiência energética
        const ES_j_t   = t.Yj   / safe(t.Y);     // estrutura industrial
        const EE_t     = t.Y    / safe(t.P);      // eficiência econômica
        const EP_t     = t.P;                     // escala de emprego

        // ── Fatores do ano alvo ──
        const ED_ij_t1 = t1.Cij  / safe(t1.Eij);
        const EM_ij_t1 = t1.Eij  / safe(t1.Ej);
        const ET_j_t1  = t1.Ej   / safe(t1.Yj);
        const ES_j_t1  = t1.Yj   / safe(t1.Y);
        const EE_t1    = t1.Y    / safe(t1.P);
        const EP_t1    = t1.P;

        // ── Peso logarítmico ω (Fórmula 9) ──
        // ω = (C^t+1 - C^t) / (ln C^t+1 - ln C^t)
        // Limite quando C^t+1 → C^t: ω = C^t
        function logMeanWeight(a, b) {
            a = safe(a); b = safe(b);
            if (Math.abs(a - b) < eps) return a; // limite
            return (a - b) / (Math.log(a) - Math.log(b));
        }

        const omega = logMeanWeight(t1.Cij, t.Cij);

        // ── Contribuições LMDI (Fórmulas 3-8) ──
        // D_X = ω × ln(X^t+1 / X^t)
        function lmdiContrib(x_t1, x_t) {
            x_t = safe(x_t); x_t1 = safe(x_t1);
            return omega * Math.log(x_t1 / x_t);
        }

        const D_ED = lmdiContrib(ED_ij_t1, ED_ij_t);  // intensidade de carbono
        const D_EM = lmdiContrib(EM_ij_t1, EM_ij_t);  // estrutura energética
        const D_ET = lmdiContrib(ET_j_t1,  ET_j_t);   // eficiência energética
        const D_ES = lmdiContrib(ES_j_t1,  ES_j_t);   // estrutura industrial
        const D_EE = lmdiContrib(EE_t1,    EE_t);     // eficiência econômica
        const D_EP = lmdiContrib(EP_t1,    EP_t);     // escala de emprego

        // ── Verificação (Fórmula 10) ──
        const somaD    = D_ED + D_EM + D_ET + D_ES + D_EE + D_EP;
        const varReal  = t1.C - t.C;
        const residuo  = Math.abs(somaD - varReal);
        const residuoPct = varReal !== 0 ? (residuo / Math.abs(varReal)) * 100 : 0;

        // Contribuição percentual de cada fator
        const totalAbs = Math.abs(D_ED) + Math.abs(D_EM) + Math.abs(D_ET) +
            Math.abs(D_ES) + Math.abs(D_EE) + Math.abs(D_EP);

        function contribPct(d) {
            return totalAbs > 0 ? ((Math.abs(d) / totalAbs) * 100).toFixed(1) + '%' : '—';
        }

        _estado.lmdi = { D_ED, D_EM, D_ET, D_ES, D_EE, D_EP, somaD, varReal, omega, t, t1 };

        // ── Renderizar resultados LMDI ──
        const grid = document.getElementById('lmdiResultsGrid');
        const res  = document.getElementById('lmdiResults');
        if (!grid || !res) return;

        const fatores = [
            { label: 'D_ED', name: 'Intensidade de Carbono', val: D_ED,
                desc: 'kg CO₂ por unidade de energia — se positivo, houve piora no perfil do combustível' },
            { label: 'D_EM', name: 'Estrutura Energética',   val: D_EM,
                desc: 'Mix de combustíveis — negativo indica maior uso de fontes mais limpas' },
            { label: 'D_ET', name: 'Eficiência Energética',  val: D_ET,
                desc: 'Energia por unidade produzida — negativo é ganho de eficiência' },
            { label: 'D_ES', name: 'Estrutura Industrial',   val: D_ES,
                desc: 'Peso do setor no total — reflete mudança na composição industrial' },
            { label: 'D_EE', name: 'Eficiência Econômica',   val: D_EE,
                desc: 'Produção por funcionário — único fator que sempre impulsiona emissões (artigo)' },
            { label: 'D_EP', name: 'Escala de Emprego',      val: D_EP,
                desc: 'Nº de funcionários — crescimento aumenta emissões proporcionalmente' },
        ];

        grid.innerHTML = fatores.map(f => {
            const cls = f.val > 0.001 ? 'positive' : (f.val < -0.001 ? 'negative' : 'neutral');
            const sinal = f.val > 0 ? '+' : '';
            return `
        <div class="lmdi-card">
          <div class="lmdi-card-label">${f.label}</div>
          <div class="lmdi-card-name">${f.name}</div>
          <div class="lmdi-card-val ${cls}">${sinal}${fmt(f.val, 2)} mil t</div>
          <div class="lmdi-card-contrib">Contribuição: ${contribPct(f.val)}</div>
          <div class="lmdi-card-contrib" style="margin-top:4px">${f.desc}</div>
        </div>
      `;
        }).join('');

        const verifEl = document.getElementById('lmdiVerificacao');
        if (verifEl) {
            const ok = residuoPct < 0.1 ? '✅' : '⚠️';
            verifEl.textContent =
                `Soma D = ${fmt(somaD, 2)} | Δ real = ${fmt(varReal, 2)} | ` +
                `Resíduo = ${residuo.toFixed(4)} (${residuoPct.toFixed(3)}%) ${ok}`;
        }

        res.style.display = '';
        renderGraficoLMDI(fatores);
    }

    // ─────────────────────────────────────────────────────────────
    //  PROJEÇÃO FUTURA — 3 cenários
    //
    //  Baseado nos fatores LMDI do artigo e na meta NDC do Brasil:
    //
    //  Cenário 1 — Tendência (Business As Usual):
    //    C(t) = C0 × (1 + g_prod - g_intensidade)^t
    //    onde g_prod = taxa de crescimento da produção
    //         g_intensidade = 0 (sem melhoria)
    //
    //  Cenário 2 — Eficiência Energética:
    //    C(t) = C0 × (1 + g_prod)^t × (1 - r_intensidade)^t × (1 - r_estrutura)^t
    //    Incorpora redução da intensidade energética (D_ET) e
    //    renovação do mix (D_EM) identificados pelo LMDI
    //
    //  Cenário 3 — Meta "Double Carbon" (NDC):
    //    C(t) = C0 × (1 - meta/100)^(t/horizonte)
    //    Trajetória linear para atingir a meta no ano alvo
    // ─────────────────────────────────────────────────────────────
    function calcProjecao(C0, anoBase, anoAlvo) {
        const g1 = (parseFloat(document.getElementById('taxaCrescimentoProd')?.value)     || 3.0) / 100;
        const r2 = (parseFloat(document.getElementById('taxaReducaoIntensidade')?.value)  || 2.0) / 100;
        const r3 = (parseFloat(document.getElementById('taxaReducaoEstrutura')?.value)    || 1.5) / 100;
        const meta = (parseFloat(document.getElementById('metaReducao')?.value)           || 37)  / 100;

        const anos = [];
        const bau  = [];
        const efi  = [];
        const ndc  = [];

        const horizonte = Math.max(anoAlvo - anoBase, 1);

        for (let i = 0; i <= horizonte; i++) {
            anos.push(anoBase + i);
            // Cenário 1: só crescimento da produção, sem melhoria
            bau.push(+(C0 * Math.pow(1 + g1, i)).toFixed(3));
            // Cenário 2: crescimento + eficiência energética + mix
            efi.push(+(C0 * Math.pow(1 + g1, i) * Math.pow(1 - r2, i) * Math.pow(1 - r3, i)).toFixed(3));
            // Cenário 3: trajetória NDC
            ndc.push(+(C0 * Math.pow(1 - meta, i / horizonte)).toFixed(3));
        }

        return { anos, bau, efi, ndc };
    }

    // ─────────────────────────────────────────────────────────────
    //  RENDERIZAÇÃO — KPIs de resultado
    // ─────────────────────────────────────────────────────────────
    function renderResultados() {
        const C0    = _estado.emissaoTotal;
        const cota  = parseFloat(document.getElementById('cotaMaxima')?.value) || 0;
        const pct   = cota > 0 ? (C0 / cota) * 100 : 0;
        const setor = document.getElementById('setor')?.value || 'medium';

        const anoBase = parseInt(document.getElementById('periodoBase')?.value) || 2024;
        const anoAlvo = parseInt(document.getElementById('periodoAlvo')?.value) || 2030;

        const proj = calcProjecao(C0, anoBase, anoAlvo);
        const bauFinal = proj.bau[proj.bau.length - 1];
        const efiFinal = proj.efi[proj.efi.length - 1];
        const ndcFinal = proj.ndc[proj.ndc.length - 1];

        // ─ KPIs ─
        const kpiGrid = document.getElementById('resultKpis');
        if (kpiGrid) {
            const cotaKlasse = pct > 100 ? 'danger' : (pct > 80 ? 'warn' : 'ok');
            kpiGrid.innerHTML = `
        <div class="kpi-card ${cotaKlasse}">
          <span class="kpi-label">Emissão Atual (Esc. 1+2)</span>
          <span class="kpi-value">${fmt(C0, 2)}</span>
          <span class="kpi-unit">t CO₂/ano</span>
          <span class="kpi-sub">Combustão + eletricidade</span>
        </div>
        <div class="kpi-card ${cotaKlasse}">
          <span class="kpi-label">Consumo de Cota</span>
          <span class="kpi-value">${cota > 0 ? pct.toFixed(1) + '%' : '—'}</span>
          <span class="kpi-unit">${cota > 0 ? fmt(cota - C0, 2) + ' t saldo' : 'Sem cota definida'}</span>
          <span class="kpi-sub">${pct > 100 ? '🚨 Acima do limite' : pct > 80 ? '⚠️ Atenção' : '✅ Dentro do limite'}</span>
        </div>
        <div class="kpi-card info">
          <span class="kpi-label">Projeção BAU (${anoAlvo})</span>
          <span class="kpi-value">${fmt(bauFinal, 2)}</span>
          <span class="kpi-unit">t CO₂ (sem ação)</span>
          <span class="kpi-sub">+${fmt(bauFinal - C0, 2)} t vs hoje</span>
        </div>
        <div class="kpi-card ok">
          <span class="kpi-label">Projeção Eficiência (${anoAlvo})</span>
          <span class="kpi-value">${fmt(efiFinal, 2)}</span>
          <span class="kpi-unit">t CO₂ (com ações)</span>
          <span class="kpi-sub">${fmt(efiFinal - C0, 2)} t vs hoje</span>
        </div>
        <div class="kpi-card ok">
          <span class="kpi-label">Meta NDC ${anoAlvo}</span>
          <span class="kpi-value">${fmt(ndcFinal, 2)}</span>
          <span class="kpi-unit">t CO₂ (meta)</span>
          <span class="kpi-sub">Redução de ${fmt(C0 - ndcFinal, 2)} t necessária</span>
        </div>
        <div class="kpi-card ${C0 > 0 ? 'warn' : ''}">
          <span class="kpi-label">Intensidade (Escopo 1)</span>
          <span class="kpi-value">${fmt(_estado.emissaoCombustao, 2)}</span>
          <span class="kpi-unit">t CO₂ combustão direta</span>
          <span class="kpi-sub">${fmt(_estado.emissaoEletrica, 3)} t via eletricidade</span>
        </div>
      `;
        }

        // ─ Classificação de risco ─
        renderRisco(setor, pct, C0, ndcFinal);

        // ─ Gráfico de projeção ─
        renderGraficoProjecao(proj, anoBase);

        // ─ Plano de offset ─
        renderOffset(C0, ndcFinal, anoAlvo - anoBase);
    }

    function renderRisco(setor, pct, emissaoAtual, metaFinal) {
        const block = document.getElementById('riskBlock');
        const content = document.getElementById('riskContent');
        if (!block || !content) return;

        // Alto carbono: mineração, siderurgia, petroquímica
        // Médio carbono: química, papel, cimento, alimentos, têxtil (parte)
        // Baixo carbono: eletrônica, móveis, vestuário
        const catMap = { high: 'Alto Carbono', medium: 'Médio Carbono', low: 'Baixo Carbono' };
        const cat    = catMap[setor] || 'Médio Carbono';

        let riskClass, riskLabel, riskAction;
        if (pct > 100 || setor === 'high') {
            riskClass  = 'risk-high';
            riskLabel  = '🔴 Risco Alto';
            riskAction = 'Compensação obrigatória imediata. Necessário plano de neutralização e relatório ao órgão ambiental. Considere CCSC (captura e armazenamento de carbono) e troca de combustível.';
        } else if (pct > 60 || setor === 'medium') {
            riskClass  = 'risk-medium';
            riskLabel  = '🟡 Risco Médio';
            riskAction = 'Monitoramento mensal obrigatório. Implemente melhorias de eficiência energética (D_ET < 0) e renove o mix para fontes mais limpas (D_EM < 0). Compensação parcial recomendada.';
        } else {
            riskClass  = 'risk-low';
            riskLabel  = '🟢 Risco Baixo';
            riskAction = 'Continue monitorando. Avalie oportunidades de geração de créditos de carbono (D_EE contribui positivamente). Mantenha o mix energético limpo.';
        }

        const gap = Math.max(emissaoAtual - metaFinal, 0);

        block.style.display = '';
        content.innerHTML = `
      <span class="risk-badge ${riskClass}">${riskLabel}</span>
      <p style="font-size:0.82rem;color:var(--text-muted);margin:0 0 12px;line-height:1.6">
        <strong>Setor:</strong> ${cat} &nbsp;|&nbsp;
        <strong>Cota utilizada:</strong> ${pct > 0 ? pct.toFixed(1) + '%' : 'não definida'} &nbsp;|&nbsp;
        <strong>Gap para meta:</strong> ${fmt(gap, 2)} t CO₂
      </p>
      <p style="font-size:0.8rem;color:var(--text-dim);line-height:1.6">${riskAction}</p>
    `;
    }

    function renderOffset(emissaoAtual, metaFinal, anos) {
        const content = document.getElementById('offsetContent');
        if (!content || emissaoAtual <= 0) return;

        const gapAnual = Math.max(emissaoAtual - metaFinal, 0);
        const gapTotal = gapAnual * anos;

        // Métodos de compensação (valores de mercado voluntário de carbono 2024 - VCS/Gold Standard)
        const metodos = [
            { nome: 'Reflorestamento (REDD+)', custoTon: 15, desc: 'Créditos de carbono florestais verificados (VCS/Gold Standard). 1 ha de Mata Atlântica sequestra ~10 t CO₂/ano.' },
            { nome: 'Energia Renovável (I-REC)', custoTon: 8, desc: 'Certificados de energia renovável. Cada MWh de solar/eólica gera ~0,046 t CO₂ de offset (fator SP).' },
            { nome: 'Biodigestor / Biogás', custoTon: 20, desc: 'Captura de metano de resíduos industriais e conversão em energia. Alta rastreabilidade.' },
            { nome: 'Eficiência Energética (projetos MDL)', custoTon: 12, desc: 'Projetos de eficiência industrial certificados pelo mecanismo de desenvolvimento limpo.' },
        ];

        content.innerHTML = `
      <div style="margin-bottom:16px">
        <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:4px">Gap anual a compensar</div>
        <div style="font-size:1.6rem;font-weight:800;font-family:var(--font-mono);color:${gapAnual > 0 ? 'var(--warning)' : 'var(--primary-light)'}">
          ${gapAnual > 0 ? fmt(gapAnual, 2) + ' t CO₂/ano' : '✅ Dentro da meta'}
        </div>
        ${gapAnual > 0 ? `<div style="font-size:0.76rem;color:var(--text-dim);margin-top:4px">Total acumulado ${anos} anos: ${fmt(gapTotal, 1)} t CO₂</div>` : ''}
      </div>
      ${gapAnual > 0 ? `
      <div class="offset-grid">
        ${metodos.map(m => `
          <div class="offset-card">
            <h4>${m.nome}</h4>
            <div class="offset-val">R$ ${fmt(gapAnual * m.custoTon, 2)}/ano</div>
            <p>${m.desc}</p>
            <p style="margin-top:6px;font-size:0.72rem;color:var(--text-dim)">
              Custo: R$ ${m.custoTon}/t CO₂ · Total ${anos}a: R$ ${fmt(gapTotal * m.custoTon, 0)}
            </p>
          </div>
        `).join('')}
      </div>` : '<p style="color:var(--primary-light);font-size:0.82rem">✅ Emissões dentro da meta. Considere vender créditos de carbono excedentes.</p>'}
    `;
    }
    //  GRÁFICOS
    function renderGraficoProjecao(proj, anoBase) {
        const ctx = document.getElementById('projChart');
        if (!ctx) return;

        const CT_colors = {
            bau:  '#ef4444',
            efi:  '#f59e0b',
            ndc:  '#22c55e',
            base: 'rgba(255,255,255,0.2)',
        };

        if (_estado.projChart) {
            _estado.projChart.destroy();
            _estado.projChart = null;
        }

        // Linha do ano base
        const baseData = proj.anos.map(() => _estado.emissaoTotal);

        _estado.projChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: proj.anos,
                datasets: [
                    {
                        label: 'Tendência (BAU)',
                        data: proj.bau,
                        borderColor: CT_colors.bau,
                        backgroundColor: 'rgba(239,68,68,0.06)',
                        borderWidth: 2.5, tension: 0.35, fill: false, pointRadius: 3,
                    },
                    {
                        label: 'Com Eficiência Energética',
                        data: proj.efi,
                        borderColor: CT_colors.efi,
                        backgroundColor: 'rgba(245,158,11,0.06)',
                        borderWidth: 2.5, tension: 0.35, fill: false, pointRadius: 3,
                    },
                    {
                        label: 'Meta NDC / Double Carbon',
                        data: proj.ndc,
                        borderColor: CT_colors.ndc,
                        backgroundColor: 'rgba(34,197,94,0.08)',
                        borderWidth: 2.5, tension: 0.35, fill: false, pointRadius: 3,
                    },
                    {
                        label: 'Emissão Base Hoje',
                        data: baseData,
                        borderColor: 'rgba(255,255,255,0.25)',
                        borderWidth: 1.5, borderDash: [6, 4],
                        fill: false, pointRadius: 0,
                    },
                ],
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'top',
                        labels: { color: '#8aab95', boxWidth: 12, padding: 16 } },
                    tooltip: {
                        backgroundColor: '#111814', borderColor: '#1e3027', borderWidth: 1,
                        titleColor: '#e2f0e8', bodyColor: '#8aab95',
                        callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(2) + ' t CO₂' },
                    },
                },
                scales: {
                    x: { grid: { color: 'rgba(30,48,39,0.8)' },
                        ticks: { color: '#4d7a5e', font: { size: 11 } } },
                    y: { grid: { color: 'rgba(30,48,39,0.8)' },
                        ticks: { color: '#4d7a5e' },
                        title: { display: true, text: 't CO₂/ano', color: '#4d7a5e', font: { size: 11 } } },
                },
            },
        });
    }

    function renderGraficoLMDI(fatores) {
        const block = document.getElementById('lmdiChartBlock');
        const ctx   = document.getElementById('lmdiChart');
        if (!block || !ctx) return;
        block.style.display = '';

        if (_estado.lmdiChart) {
            _estado.lmdiChart.destroy();
            _estado.lmdiChart = null;
        }

        const cores = fatores.map(f =>
            f.val > 0.001 ? 'rgba(239,68,68,0.8)' :
                (f.val < -0.001 ? 'rgba(34,197,94,0.8)' : 'rgba(148,163,184,0.5)')
        );

        _estado.lmdiChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: fatores.map(f => f.label + '\n' + f.name),
                datasets: [{
                    label: 'Contribuição (mil t CO₂)',
                    data: fatores.map(f => +f.val.toFixed(3)),
                    backgroundColor: cores,
                    borderColor: cores.map(c => c.replace('0.8', '1')),
                    borderWidth: 1.5, borderRadius: 6,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#111814', borderColor: '#1e3027', borderWidth: 1,
                        titleColor: '#e2f0e8', bodyColor: '#8aab95',
                        callbacks: {
                            label: ctx => (ctx.parsed.y > 0 ? '+' : '') + ctx.parsed.y.toFixed(3) + ' mil t CO₂',
                            afterLabel: (ctx) => {
                                const f = fatores[ctx.dataIndex];
                                return f ? f.desc : '';
                            },
                        },
                    },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#4d7a5e', font: { size: 10 } } },
                    y: { grid: { color: 'rgba(30,48,39,0.8)' }, ticks: { color: '#4d7a5e' },
                        title: { display: true, text: 'mil t CO₂', color: '#4d7a5e' } },
                },
            },
        });
    }

    //  CALCULAR TUDO
    function calcularTudo() {
        // Sincronizar anos nas labels LMDI
        const anoBase = document.getElementById('periodoBase')?.value || '2024';
        const anoAlvo = document.getElementById('periodoAlvo')?.value || '2030';
        const el1 = document.getElementById('lmdi-ano-base');
        const el2 = document.getElementById('lmdi-ano-alvo');
        if (el1) el1.textContent = anoBase;
        if (el2) el2.textContent = anoAlvo;

        calcAtual();
    }

    //  RESET
    function reset() {
        const presets = ['fatorEletrico'];
        document.querySelectorAll('.em-input').forEach(inp => {
            if (!presets.includes(inp.id) && !inp.readOnly) inp.value = '';
        });
        document.querySelectorAll('.fuel-input').forEach(inp => inp.value = '');
        document.querySelectorAll('.fuel-emission').forEach(el => el.textContent = '—');
        const totEl = document.getElementById('totalCO2Combustao');
        if (totEl) totEl.textContent = '—';
        _estado.emissaoCombustao = 0;
        _estado.emissaoEletrica  = 0;
        _estado.emissaoTotal     = 0;
        _estado.lmdi = null;
        atualizarBarra(0, 0);
        const res = document.getElementById('lmdiResults');
        if (res) res.style.display = 'none';
        const kpi = document.getElementById('resultKpis');
        if (kpi) kpi.innerHTML = '';
        const off = document.getElementById('offsetContent');
        if (off) off.innerHTML = '<div class="em-empty">Clique em "Calcular Tudo" para ver o plano de compensação.</div>';
        const rb = document.getElementById('riskBlock');
        if (rb) rb.style.display = 'none';
        if (_estado.projChart)  { _estado.projChart.destroy();  _estado.projChart = null; }
        if (_estado.lmdiChart)  { _estado.lmdiChart.destroy();  _estado.lmdiChart = null; }
    }

    //  EXPORTAR RELATÓRIO (texto simples para impressão)
    function exportarRelatorio() {
        const empresa = document.getElementById('nomeEmpresa')?.value || 'N/D';
        const resp    = document.getElementById('responsavel')?.value || 'N/D';
        const anoBase = document.getElementById('periodoBase')?.value || '—';
        const anoAlvo = document.getElementById('periodoAlvo')?.value || '—';
        const cota    = document.getElementById('cotaMaxima')?.value  || '—';
        const total   = _estado.emissaoTotal;
        const pct     = parseFloat(cota) > 0 ? ((total / parseFloat(cota)) * 100).toFixed(1) + '%' : '—';

        const lmdiTxt = _estado.lmdi ? `
DECOMPOSIÇÃO LMDI (${anoBase} → ${anoAlvo})
  D_ED (Intensidade Carbono):  ${fmt(_estado.lmdi.D_ED, 3)} mil t CO₂
  D_EM (Estrutura Energética): ${fmt(_estado.lmdi.D_EM, 3)} mil t CO₂
  D_ET (Eficiência Energética):${fmt(_estado.lmdi.D_ET, 3)} mil t CO₂
  D_ES (Estrutura Industrial): ${fmt(_estado.lmdi.D_ES, 3)} mil t CO₂
  D_EE (Eficiência Econômica): ${fmt(_estado.lmdi.D_EE, 3)} mil t CO₂
  D_EP (Escala de Emprego):    ${fmt(_estado.lmdi.D_EP, 3)} mil t CO₂
  ─────────────────────────────────────────
  SOMA (D_x):                  ${fmt(_estado.lmdi.somaD, 3)} mil t CO₂
  VARIAÇÃO REAL:               ${fmt(_estado.lmdi.varReal, 3)} mil t CO₂
` : 'LMDI não calculado.';

        const txt = `
RELATÓRIO DE EMISSÕES — CarbonTree System
══════════════════════════════════════════════
Empresa:          ${empresa}
Responsável:      ${resp}
Ano base:         ${anoBase}  |  Ano alvo: ${anoAlvo}
Gerado em:        ${new Date().toLocaleString('pt-BR')}

EMISSÃO ATUAL
  Escopo 1 (combustão direta): ${fmt(_estado.emissaoCombustao, 3)} t CO₂
  Escopo 2 (eletricidade):     ${fmt(_estado.emissaoEletrica, 3)} t CO₂
  TOTAL:                       ${fmt(total, 3)} t CO₂
  Cota máxima:                 ${cota} t CO₂
  Consumo de cota:             ${pct}

${lmdiTxt}

REFERÊNCIA CIENTÍFICA
  Zhang et al. "Carbon Emission Calculation and Influencing Factor Analysis
  Based on Industrial Big Data in the 'Double Carbon' Era."
  Computational Intelligence and Neuroscience, 2022.
  DOI: 10.1155/2022/1740530

  Coeficientes IPCC: IPCC Guidelines for National Greenhouse Gas
  Inventories, 2006.

═══════════════════════════════════════════
`.trim();

        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'relatorio_emissoes_' + empresa.replace(/\s+/g, '_') + '_' + anoBase + '.txt';
        a.click();
    }

    //  UTILS
    function fmt(n, dec) {
        if (n === null || n === undefined || isNaN(n)) return '—';
        return n.toLocaleString('pt-BR', {
            minimumFractionDigits: dec,
            maximumFractionDigits: dec,
        });
    }

    //  INICIALIZAÇÃO
    document.addEventListener('DOMContentLoaded', function () {
        initFuelTable();
        // Sincronizar anos ao mudar campo
        ['periodoBase', 'periodoAlvo'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', function () {
                const anoBase = document.getElementById('periodoBase')?.value || '2024';
                const anoAlvo = document.getElementById('periodoAlvo')?.value || '2030';
                const el1 = document.getElementById('lmdi-ano-base');
                const el2 = document.getElementById('lmdi-ano-alvo');
                if (el1) el1.textContent = anoBase;
                if (el2) el2.textContent = anoAlvo;
            });
        });
    });

    // ─── API pública ───
    return { tab, nextTab, prevTab, calcAtual, calcLMDI, calcularTudo, reset, exportarRelatorio };

})();