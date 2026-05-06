/**
 * vec-model.js — Modelo VEC/EKC para CarbonTree System
 *
 * Implementa o modelo econométrico do artigo:
 * "Curva de Kuznets Ambiental em Formato de N para o Brasil"
 *
 * MODELO DE LONGO PRAZO:
 *
 *   CO₂pc = β₀ + β₁·y + β₂·y² + β₃·y³ + β₄·CEpc + β₅·DP + β₆·VC + εt
 *
 *   Coeficientes estimados:
 *     β₁ (PIBpc)      =  0,0161        (t = -10,5887***)
 *     β₂ (PIB²pc)     = -2,9495×10⁻⁶  (t =  8,5450***)
 *     β₃ (PIB³pc)     =  1,6166×10⁻¹⁰ (t = -6,2489***)
 *     β₄ (CEpc)       =  0,0008        (t = -2,3192**)
 *     β₅ (DP)         = -0,4748        (t =  3,3389***)
 *     β₆ (VC)         =  2,8354        (t = -5,7392***)
 *
 * PONTOS DE INFLEXÃO — Curva em "N":
 *   Ponto de Máximo (curva começa a cair):  y* = US$ 2.729,27
 *   Ponto de Mínimo (curva volta a subir):  y* = US$ 9.122,54
 *   Fórmula geral: y* = -β₁ / (2·β₂)
 *
 * MODELO DE CURTO PRAZO:
 *   ECM(-1) = 0,1046  → velocidade de ajuste ao equilíbrio
 *   R² = 0,7175
 *
 * ESTATÍSTICAS DESCRITIVAS:
 *   CO₂pc:  média 1,5824  | min 1,0430  | max 2,1913  (t CO₂/hab)
 *   PIBpc:  média 4148,47 | min 2542,36 | max 5750,62 (US$)
 *   CEpc:   média 996,76  | min 709,15  | max 1346,65 (kgoe/hab)
 *   DP:     média 18,13   | min 11,77   | max 23,99   (hab/km²)
 *   VC:     média 0,1875  | min 0,1097  | max 0,3633  (% PIB)
 * ═══════════════════════════════════════════════════════════
 */

const VEC = (function () {

    // ─── COEFICIENTES DE LONGO PRAZO ───
    const COEF = {
        b0:  0,              // intercepto (absorvido pelo benchmark)
        b1:  0.0161,         // PIBpc linear
        b2: -2.9495e-6,      // PIBpc quadrático
        b3:  1.6166e-10,     // PIBpc cúbico (termo que gera o "N")
        b4:  0.0008,         // CEpc — consumo de energia per capita
        b5: -0.4748,         // DP   — densidade populacional
        b6:  2.8354,         // VC   — abertura econômica
    };

    // ─── PONTOS DE INFLEXÃO (do artigo) ───
    const INFLEXAO = {
        maximo: 2729.27,   // US$ — a partir daqui emissões caem
        minimo: 9122.54,   // US$ — a partir daqui emissões voltam a subir
    };

    // ─── BENCHMARKS MÉDIOS BRASIL (Tabela 1) ───
    const BENCH = {
        co2pc_media: 1.5824,
        pibpc_media: 4148.47,
        cepc_media:  996.76,
        dp_media:    18.13,
        vc_media:    0.1875,
    };

    // ─── BENCHMARKS POR SETOR (derivados da classificação LMDI) ───
    // Fatores de intensidade relativa ao benchmark nacional
    const SETOR_FATOR = {
        high:   2.8,   // Alto carbono: siderurgia, mineração, petroquímica
        medium: 1.2,   // Médio carbono: química, papel, cimento
        low:    0.5,   // Baixo carbono: eletrônica, têxtil, alimentos
    };

    // ─── BENCHMARKS SETORIAIS (t CO₂ / R$ 1 milhão faturamento) ───
    const BENCH_SETOR = {
        high:   85.0,   // referência SEEG 2023 — alto carbono
        medium: 22.0,   // referência SEEG 2023 — médio carbono
        low:     6.5,   // referência SEEG 2023 — baixo carbono
    };

    // ─── INSTÂNCIA DOS GRÁFICOS ───
    let _chartCurva   = null;
    let _chartFatores = null;
    let _chartProj    = null;

    //  FUNÇÃO PRINCIPAL — calcula o modelo completo
    function calcular() {
        const inp = id => parseFloat(document.getElementById(id)?.value) || 0;

        // Entradas do usuário
        const pibpc     = inp('vec_pibpc');       // PIB per capita (US$)
        const cepc      = inp('vec_cepc');        // Consumo energia pc (kgoe/hab)
        const dp        = inp('vec_dp');          // Densidade pop (hab/km²)
        const vc        = inp('vec_vc');          // Abertura econômica (% PIB, decimal)
        const emAtual   = inp('vec_em_atual');    // Emissão atual da empresa (t CO₂)
        const faturamento = inp('vec_faturamento'); // Faturamento (R$ mi)
        const funcionarios = inp('vec_funcionarios'); // Funcionários
        const setor     = document.getElementById('vec_setor')?.value || 'medium';
        const anoBase   = parseInt(document.getElementById('vec_ano_base')?.value) || 2024;
        const anoAlvo   = parseInt(document.getElementById('vec_ano_alvo')?.value)  || 2030;

        if (!pibpc || !cepc) {
            alert('Preencha pelo menos PIB per capita e Consumo de Energia para calcular.');
            return;
        }

        // ── 1. CO₂pc estimado pelo modelo VEC de longo prazo ──
        // CO₂pc = β₁·y + β₂·y² + β₃·y³ + β₄·CEpc + β₅·DP + β₆·VC
        const co2pc_modelo = COEF.b1 * pibpc
            + COEF.b2 * pibpc * pibpc
            + COEF.b3 * pibpc * pibpc * pibpc
            + COEF.b4 * cepc
            + COEF.b5 * dp
            + COEF.b6 * vc;

        // ── 2. Fase da curva em N ──
        const fase = _classificarFase(pibpc);

        // ── 3. Fator de ajuste da empresa em relação ao modelo nacional ──
        // Compara emissão real/estimada da empresa com o benchmark nacional
        let emEmpresa_normalizada = null;
        let fatorAjuste = 1.0;
        if (emAtual > 0 && funcionarios > 0) {
            emEmpresa_normalizada = emAtual / funcionarios; // t CO₂ / funcionário
            const co2pc_nacional  = Math.max(co2pc_modelo, 0.1);
            // Ajuste: razão entre intensidade real e modelo nacional (relativa)
            fatorAjuste = emEmpresa_normalizada / co2pc_nacional;
        }

        // ── 4. Benchmark setorial ──
        const benchSetor   = BENCH_SETOR[setor] || BENCH_SETOR.medium;
        const fatorSetor   = SETOR_FATOR[setor] || 1.0;
        let   benchEmpresa = null;
        let   desvioSetor  = null;
        if (faturamento > 0 && emAtual > 0) {
            // Intensidade da empresa: t CO₂ / R$ 1 mi faturamento
            const intensidadeEmpresa = (emAtual / faturamento);
            benchEmpresa = intensidadeEmpresa;
            desvioSetor  = ((intensidadeEmpresa - benchSetor) / benchSetor) * 100;
        }

        // ── 5. Projeção VEC — 3 cenários considerando a curva em N ──
        const proj = _calcularProjecao(pibpc, cepc, dp, vc, emAtual, fatorSetor, anoBase, anoAlvo, fase);

        // ── 6. Ponto de inflexão personalizado ──
        // y* = -β₁ / (2·β₂)  — turning point teórico
        const turningPoint = -COEF.b1 / (2 * COEF.b2);

        // ── Renderizar tudo ──
        _renderResultados({
            co2pc_modelo, fase, fatorAjuste, fatorSetor,
            benchSetor, benchEmpresa, desvioSetor,
            pibpc, cepc, dp, vc, emAtual, faturamento, setor,
            proj, turningPoint, anoBase, anoAlvo
        });

        _renderCurvaN(pibpc, cepc, dp, vc);
        _renderFatores(co2pc_modelo, cepc, dp, vc);
        _renderProjecao(proj, anoBase);

        // Mostrar painel de resultados
        const res = document.getElementById('vecResults');
        if (res) {
            res.style.display = '';
            res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    //  CLASSIFICAÇÃO DE FASE — Curva em N
    function _classificarFase(pibpc) {
        if (pibpc < INFLEXAO.maximo) {
            return {
                fase: 1,
                nome: 'Fase 1 — Crescimento com Aumento de Emissões',
                descricao: 'Renda per capita abaixo de US$ 2.729. Crescimento econômico tende a aumentar emissões proporcionalmente.',
                cor: '#ef4444',
                icone: '📈',
                recomendacao: 'Prioridade máxima em eficiência energética e troca de combustível. A curva está na fase ascendente.',
            };
        } else if (pibpc < INFLEXAO.minimo) {
            return {
                fase: 2,
                nome: 'Fase 2 — Zona de Transição (Queda de Emissões)',
                descricao: 'Renda entre US$ 2.729 e US$ 9.122. Emissões tendem a diminuir com o crescimento — padrão favorável.',
                cor: '#22c55e',
                icone: '📉',
                recomendacao: 'Momento favorável. Mantenha investimentos em eficiência. A empresa está na fase de desacoplamento.',
            };
        } else {
            return {
                fase: 3,
                nome: 'Fase 3 — Curva em N: Risco de Rebound',
                descricao: 'Renda acima de US$ 9.122. A curva em N indica que as emissões voltam a crescer com a renda — efeito "Pollution Haven" e rebound econômico.',
                cor: '#f59e0b',
                icone: '⚠️',
                recomendacao: 'ALERTA: modelo VEC indica risco de rebound. Planeje compensação antecipada e diversifique para energias renováveis.',
            };
        }
    }

    //  PROJEÇÃO VEC — incorpora dinâmica da curva em N
    function _calcularProjecao(pibpc, cepc, dp, vc, emAtual, fatorSetor, anoBase, anoAlvo, fase) {
        const anos    = [];
        const vecProj = [];   // Projeção VEC (considera curva em N)
        const linear  = [];   // Projeção linear simples (BAU)
        const meta    = [];   // Meta de redução 37% (NDC Brasil)

        const horizonte = Math.max(anoAlvo - anoBase, 1);

        // Taxas anuais típicas para Brasil (base SEEG/IBGE):
        const g_pib  = 0.025;   // crescimento real PIB per capita +2,5% a.a.
        const g_ce   = 0.015;   // crescimento consumo energia +1,5% a.a.
        const g_dp   = 0.008;   // crescimento densidade pop +0,8% a.a.
        const g_vc   = 0.005;   // variação abertura econômica +0,5% a.a.

        for (let i = 0; i <= horizonte; i++) {
            anos.push(anoBase + i);

            // VEC: evolução das variáveis explicativas ao longo do tempo
            const y_t   = pibpc * Math.pow(1 + g_pib, i);
            const ce_t  = cepc  * Math.pow(1 + g_ce,  i);
            const dp_t  = dp    * Math.pow(1 + g_dp,  i);
            const vc_t  = vc    * Math.pow(1 + g_vc,  i);

            // CO₂pc projetado pelo modelo
            const co2pc_t = COEF.b1 * y_t
                + COEF.b2 * y_t * y_t
                + COEF.b3 * y_t * y_t * y_t
                + COEF.b4 * ce_t
                + COEF.b5 * dp_t
                + COEF.b6 * vc_t;

            // Escalar para a empresa: usa fatorSetor como multiplicador
            // A empresa está N vezes acima/abaixo do nível nacional
            const escala = emAtual > 0
                ? emAtual * (co2pc_t / Math.max(
                COEF.b1 * pibpc + COEF.b2 * pibpc**2 + COEF.b3 * pibpc**3
                + COEF.b4 * cepc + COEF.b5 * dp + COEF.b6 * vc, 0.001))
                : co2pc_t * fatorSetor * 1000; // estimativa se não tiver emissão real

            vecProj.push(+(Math.max(escala, 0)).toFixed(3));

            // Linear (BAU): crescimento constante de 2% a.a.
            linear.push(+(emAtual * Math.pow(1.02, i)).toFixed(3));

            // Meta NDC: redução de 37% no horizonte
            meta.push(+(emAtual * Math.pow(1 - 0.37, i / horizonte)).toFixed(3));
        }

        return { anos, vecProj, linear, meta };
    }

    //  RENDERIZAR RESULTADOS (cards de KPI)
    function _renderResultados(d) {
        const container = document.getElementById('vecKpis');
        if (!container) return;

        const fmt  = (n, dec) => n != null && !isNaN(n)
            ? n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
            : '—';

        const projFinal = d.proj.vecProj[d.proj.vecProj.length - 1];
        const linFinal  = d.proj.linear[d.proj.linear.length - 1];
        const diff      = projFinal - linFinal;
        const diffSign  = diff > 0 ? '+' : '';

        container.innerHTML = `
      <!-- Fase da Curva em N -->
      <div class="vec-fase-card" style="border-color:${d.fase.cor}20;background:${d.fase.cor}08;grid-column:1/-1">
        <div style="display:flex;align-items:flex-start;gap:14px">
          <span style="font-size:28px;flex-shrink:0">${d.fase.icone}</span>
          <div style="flex:1">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:4px">
              Posição na Curva EKC-N (PIB per capita US$ ${fmt(d.pibpc, 2)})
            </div>
            <div style="font-family:var(--font-mono);font-size:14px;font-weight:800;color:${d.fase.cor};margin-bottom:6px">
              ${d.fase.nome}
            </div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.5;margin-bottom:8px">${d.fase.descricao}</div>
            <div style="font-size:12px;color:var(--text-dim);background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 12px">
              💡 ${d.fase.recomendacao}
            </div>
          </div>
        </div>
        <!-- Régua dos pontos de inflexão -->
        <div style="margin-top:14px">
          ${_renderRegraInflexao(d.pibpc)}
        </div>
      </div>

      <!-- CO₂pc modelo -->
      <div class="vec-kpi">
        <div class="vec-kpi-label">CO₂pc — Modelo VEC</div>
        <div class="vec-kpi-val">${fmt(d.co2pc_modelo, 4)}</div>
        <div class="vec-kpi-unit">t CO₂ / habitante</div>
        <div class="vec-kpi-sub">Estimativa do modelo econométrico</div>
      </div>

      <!-- Ponto de inflexão -->
      <div class="vec-kpi">
        <div class="vec-kpi-label">Turning Point (y*)</div>
        <div class="vec-kpi-val">US$ ${fmt(d.turningPoint, 0)}</div>
        <div class="vec-kpi-unit">PIB per capita</div>
        <div class="vec-kpi-sub">y* = −β₁ / (2·β₂)</div>
      </div>

      <!-- Benchmark setorial -->
      <div class="vec-kpi ${d.desvioSetor != null && d.desvioSetor > 0 ? 'vec-kpi-danger' : (d.desvioSetor != null ? 'vec-kpi-ok' : '')}">
        <div class="vec-kpi-label">Benchmark Setorial</div>
        <div class="vec-kpi-val">${fmt(d.benchSetor, 1)}</div>
        <div class="vec-kpi-unit">t CO₂ / R$ 1 mi faturamento</div>
        <div class="vec-kpi-sub">
          ${d.benchEmpresa != null
            ? 'Sua empresa: ' + fmt(d.benchEmpresa, 2) + ' | Desvio: ' + (d.desvioSetor > 0 ? '+' : '') + fmt(d.desvioSetor, 1) + '%'
            : 'Insira faturamento e emissão atual para comparar'}
        </div>
      </div>

      <!-- Projeção VEC vs Linear -->
      <div class="vec-kpi ${diff > 0 ? 'vec-kpi-danger' : 'vec-kpi-ok'}">
        <div class="vec-kpi-label">Projeção VEC (${d.anoAlvo})</div>
        <div class="vec-kpi-val">${fmt(projFinal, 2)}</div>
        <div class="vec-kpi-unit">t CO₂</div>
        <div class="vec-kpi-sub">
          BAU linear: ${fmt(linFinal, 2)} t |
          Diferença VEC×BAU: ${diffSign}${fmt(diff, 2)} t
        </div>
      </div>

      <!-- Fatores explicativos -->
      <div class="vec-kpi" style="grid-column:1/-1">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:10px">
          Decomposição dos Fatores — Contribuição ao CO₂pc
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
          ${_renderFatorCard('CEpc', d.cepc, 0.0008, 'kgoe/hab', 'Consumo de Energia', '+')}
          ${_renderFatorCard('DP', d.dp, -0.4748, 'hab/km²', 'Densidade Populacional', '')}
          ${_renderFatorCard('VC', d.vc, 2.8354, '% PIB', 'Abertura Econômica', '+')}
        </div>
      </div>
    `;
    }

    function _renderFatorCard(sigla, valor, coef, unidade, nome, sinalEsperado) {
        const contribuicao = coef * valor;
        const cor = contribuicao > 0 ? '#ef4444' : '#22c55e';
        const sinal = contribuicao > 0 ? '+' : '';
        const fmt = (n, d) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
        return `
      <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-bottom:2px">${sigla} = ${fmt(coef, 4)}</div>
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">${nome}</div>
        <div style="font-size:12px;font-weight:700;color:var(--text-muted)">${fmt(valor || 0, 2)} ${unidade}</div>
        <div style="font-size:11px;font-weight:700;color:${cor};margin-top:4px">
          Contribuição: ${sinal}${fmt(contribuicao, 4)}
        </div>
      </div>
    `;
    }

    function _renderRegraInflexao(pibpcAtual) {
        const max = INFLEXAO.maximo;   // 2729.27
        const min = INFLEXAO.minimo;   // 9122.54
        const escala = 12000;
        const pctMax = (max / escala) * 100;
        const pctMin = (min / escala) * 100;
        const pctAtual = Math.min((pibpcAtual / escala) * 100, 100);

        const fmt = n => 'US$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        return `
      <div style="font-size:10px;color:var(--text-dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.8px">
        Posição na Curva em N
      </div>
      <div style="position:relative;height:28px;background:linear-gradient(90deg,#ef444420 0%,#22c55e20 ${pctMax}%,#22c55e20 ${pctMin}%,#f59e0b20 ${pctMin}%,#f59e0b20 100%);border:1px solid var(--border);border-radius:6px;overflow:visible">
        <!-- Marcador ponto máximo -->
        <div style="position:absolute;left:${pctMax}%;top:-1px;bottom:-1px;width:2px;background:#ef4444;opacity:0.7"></div>
        <div style="position:absolute;left:${pctMax}%;top:30px;font-size:9px;color:#ef4444;transform:translateX(-50%);white-space:nowrap">${fmt(max)}</div>
        <!-- Marcador ponto mínimo -->
        <div style="position:absolute;left:${pctMin}%;top:-1px;bottom:-1px;width:2px;background:#f59e0b;opacity:0.7"></div>
        <div style="position:absolute;left:${pctMin}%;top:30px;font-size:9px;color:#f59e0b;transform:translateX(-50%);white-space:nowrap">${fmt(min)}</div>
        <!-- Posição atual -->
        <div style="position:absolute;left:${pctAtual}%;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:white;border:2px solid var(--primary-light);border-radius:50%;z-index:2"></div>
      </div>
      <div style="margin-top:36px;display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim)">
        <span>Fase 1 (↑ emissões)</span>
        <span>Fase 2 (↓ emissões)</span>
        <span>Fase 3 (↑ rebound)</span>
      </div>
    `;
    }

    //  GRÁFICO — Curva em N completa
    function _renderCurvaN(pibpcAtual, cepc, dp, vc) {
        const ctx = document.getElementById('vecCurvaNChart');
        if (!ctx) return;
        if (_chartCurva) { _chartCurva.destroy(); _chartCurva = null; }

        // Gera a curva para renda de US$ 500 a US$ 15.000
        const pontos = [];
        for (let y = 500; y <= 15000; y += 200) {
            const co2 = COEF.b1 * y
                + COEF.b2 * y * y
                + COEF.b3 * y * y * y
                + COEF.b4 * cepc
                + COEF.b5 * dp
                + COEF.b6 * vc;
            pontos.push({ x: y, y: co2 });
        }

        // Ponto atual da empresa
        const co2Atual = COEF.b1 * pibpcAtual
            + COEF.b2 * pibpcAtual ** 2
            + COEF.b3 * pibpcAtual ** 3
            + COEF.b4 * cepc
            + COEF.b5 * dp
            + COEF.b6 * vc;

        _chartCurva = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'CO₂pc — Modelo VEC (Curva N)',
                        data: pontos,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34,197,94,0.06)',
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                    },
                    {
                        label: 'Posição atual',
                        data: [{ x: pibpcAtual, y: co2Atual }],
                        borderColor: '#fff',
                        backgroundColor: '#fff',
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        showLine: false,
                    },
                    {
                        label: 'Ponto máx (US$ 2.729)',
                        data: [{ x: INFLEXAO.maximo, y: COEF.b1 * INFLEXAO.maximo + COEF.b2 * INFLEXAO.maximo**2 + COEF.b3 * INFLEXAO.maximo**3 + COEF.b4 * cepc + COEF.b5 * dp + COEF.b6 * vc }],
                        borderColor: '#ef4444',
                        backgroundColor: '#ef4444',
                        pointRadius: 6, showLine: false,
                    },
                    {
                        label: 'Ponto mín (US$ 9.122)',
                        data: [{ x: INFLEXAO.minimo, y: COEF.b1 * INFLEXAO.minimo + COEF.b2 * INFLEXAO.minimo**2 + COEF.b3 * INFLEXAO.minimo**3 + COEF.b4 * cepc + COEF.b5 * dp + COEF.b6 * vc }],
                        borderColor: '#f59e0b',
                        backgroundColor: '#f59e0b',
                        pointRadius: 6, showLine: false,
                    },
                ],
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: '#8aab95', boxWidth: 10, padding: 14 } },
                    tooltip: {
                        backgroundColor: '#0e1d14', borderColor: '#1f3228', borderWidth: 1,
                        titleColor: '#e2f0e8', bodyColor: '#8aab95',
                        callbacks: {
                            title: ctx => 'PIB per capita: US$ ' + ctx[0].parsed.x.toLocaleString('pt-BR'),
                            label: ctx => ' ' + ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(4) + ' t CO₂/hab',
                        },
                    },
                },
                scales: {
                    x: {
                        type: 'linear',
                        grid: { color: 'rgba(31,50,40,0.8)' },
                        ticks: { color: '#4e7a5c', callback: v => 'US$ ' + v.toLocaleString('pt-BR') },
                        title: { display: true, text: 'PIB per capita (US$)', color: '#4e7a5c' },
                    },
                    y: {
                        grid: { color: 'rgba(31,50,40,0.8)' },
                        ticks: { color: '#4e7a5c' },
                        title: { display: true, text: 'CO₂ per capita (t/hab)', color: '#4e7a5c' },
                    },
                },
            },
        });
    }

    //  GRÁFICO — Decomposição dos fatores
    function _renderFatores(co2pc, cepc, dp, vc) {
        const ctx = document.getElementById('vecFatoresChart');
        if (!ctx) return;
        if (_chartFatores) { _chartFatores.destroy(); _chartFatores = null; }

        const fatores = [
            { label: 'CEpc\n(Energia)',   contrib: COEF.b4 * cepc },
            { label: 'DP\n(Densidade)',   contrib: COEF.b5 * dp   },
            { label: 'VC\n(Abertura)',    contrib: COEF.b6 * vc   },
        ];

        const cores = fatores.map(f => f.contrib > 0
            ? 'rgba(239,68,68,0.75)'
            : 'rgba(34,197,94,0.75)'
        );

        _chartFatores = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: fatores.map(f => f.label),
                datasets: [{
                    label: 'Contribuição ao CO₂pc (t/hab)',
                    data: fatores.map(f => +f.contrib.toFixed(5)),
                    backgroundColor: cores,
                    borderColor: cores.map(c => c.replace('0.75', '1')),
                    borderWidth: 1.5,
                    borderRadius: 6,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0e1d14', borderColor: '#1f3228', borderWidth: 1,
                        callbacks: {
                            label: ctx => (ctx.parsed.y > 0 ? '+' : '') + ctx.parsed.y.toFixed(5) + ' t CO₂/hab',
                        },
                    },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#4e7a5c', font: { size: 10 } } },
                    y: {
                        grid: { color: 'rgba(31,50,40,0.8)' }, ticks: { color: '#4e7a5c' },
                        title: { display: true, text: 't CO₂/hab', color: '#4e7a5c' },
                    },
                },
            },
        });
    }

    //  GRÁFICO — Projeção 3 cenários
    function _renderProjecao(proj, anoBase) {
        const ctx = document.getElementById('vecProjChart');
        if (!ctx) return;
        if (_chartProj) { _chartProj.destroy(); _chartProj = null; }

        _chartProj = new Chart(ctx, {
            type: 'line',
            data: {
                labels: proj.anos,
                datasets: [
                    {
                        label: 'Projeção VEC (curva N)',
                        data: proj.vecProj,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245,158,11,0.06)',
                        borderWidth: 2.5, tension: 0.35, fill: false, pointRadius: 3,
                    },
                    {
                        label: 'Tendência linear (BAU)',
                        data: proj.linear,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239,68,68,0.05)',
                        borderWidth: 2, borderDash: [5, 4],
                        tension: 0.35, fill: false, pointRadius: 2,
                    },
                    {
                        label: 'Meta NDC Brasil (−37%)',
                        data: proj.meta,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34,197,94,0.07)',
                        borderWidth: 2.5, tension: 0.35, fill: false, pointRadius: 3,
                    },
                ],
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: '#8aab95', boxWidth: 10, padding: 14 } },
                    tooltip: {
                        backgroundColor: '#0e1d14', borderColor: '#1f3228', borderWidth: 1,
                        titleColor: '#e2f0e8', bodyColor: '#8aab95',
                        callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(2) + ' t CO₂' },
                    },
                },
                scales: {
                    x: { grid: { color: 'rgba(31,50,40,0.8)' }, ticks: { color: '#4e7a5c' } },
                    y: {
                        grid: { color: 'rgba(31,50,40,0.8)' }, ticks: { color: '#4e7a5c' },
                        title: { display: true, text: 't CO₂', color: '#4e7a5c' },
                    },
                },
            },
        });
    }

    // ── Reset ──
    function resetar() {
        document.querySelectorAll('[id^="vec_"]').forEach(el => { el.value = ''; });
        const res = document.getElementById('vecResults');
        if (res) res.style.display = 'none';
        if (_chartCurva)   { _chartCurva.destroy();   _chartCurva   = null; }
        if (_chartFatores) { _chartFatores.destroy();  _chartFatores = null; }
        if (_chartProj)    { _chartProj.destroy();     _chartProj    = null; }
    }

    return { calcular, resetar };

})();