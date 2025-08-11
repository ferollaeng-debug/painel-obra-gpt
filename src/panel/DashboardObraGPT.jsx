import React, { useMemo, useState } from "react";
import { Check, Calculator, ClipboardList, Building2, Truck, Hammer, ClipboardCheck, FileSpreadsheet, Mail, Share2, Settings, FileText } from "lucide-react";
import { motion } from "framer-motion";

const styles = {
  container: { fontFamily: 'Inter, system-ui, Arial, sans-serif', padding: '24px', maxWidth: 1400, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  subtitle: { color: '#666', marginTop: 4 },
  button: { display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #ddd', borderRadius: 12, padding: '8px 12px', background: '#fff', cursor: 'pointer' },
  tabsList: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 8, marginTop: 16 },
  tab: (active) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid', borderColor: active ? '#222' : '#ddd', background: active ? '#111' : '#fff', color: active ? '#fff' : '#111', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
  searchRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 },
  input: { flex: 1, border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginTop: 16 },
  card: { border: '1px solid #eee', borderRadius: 16, padding: 16, background: '#fff' },
  badge: { display: 'inline-block', border: '1px solid #eee', padding: '4px 8px', borderRadius: 999, fontSize: 12, color: '#444', background: '#f9f9f9' },
  footer: { marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, border: '1px solid #eee', borderRadius: 16, padding: 16 },
  small: { fontSize: 13, color: '#666' }
};

const PHASES = [
  { id: "planejamento", label: "1. Planejamento / Pré-Obra", icon: Settings },
  { id: "projeto", label: "2. Projeto", icon: FileText },
  { id: "suprimentos", label: "3. Suprimentos", icon: Truck },
  { id: "execucao", label: "4. Execução", icon: Hammer },
  { id: "posobra", label: "5. Pós-Obra", icon: Building2 },
  { id: "automacoes", label: "6. Automações", icon: ClipboardCheck },
];

const ACTIONS = {
  planejamento: [
    { id: "viabilidade", title: "Estudo de Viabilidade (TE + ECO)", summary: "Quadro-resumo: potencial, restrições, CAPEX/OPEX, VGV e sensibilidade.", metric: "PDF/planilha", tags: ["potencial","leis","custos"], prompt: "Crie um estudo de viabilidade para um edifício residencial em Belo Horizonte: 1) parâmetros urbanísticos (zoneamento, CA, TO, gabarito, recuos, vagas) com base na legislação municipal; 2) estimativa de VGV e tipologias (mix por m²); 3) CAPEX por macroetapas (terraplanagem, estrutura, alvenaria, instalações, acabamentos, fachada, elevadores, indiretos); 4) curva de caixa mensal; 5) análise de sensibilidade (±10% em custos e VGV); 6) riscos e medidas mitigatórias; 7) checklist de licenças. Estruture como sumário executivo + tabelas. Assuma dados onde faltarem e explicite premissas." },
    { id: "licenciamento", title: "Checklist de Licenciamento", summary: "Documentos por órgão, taxas e prazos médios.", metric: "Checklist + cronograma", tags: ["documentos","prazos"], prompt: "Monte um checklist de licenciamento para obra predial em BH: 1) Prefeitura (etapas, taxas, prazos médios, documentos); 2) CBMMG (PPCI, ARTs, memoriais); 3) Concessionárias (água, esgoto, energia, telecom); 4) Ambientais (se aplicável). Gere também um cronograma com dependências e caminho crítico. Saída em tabela Markdown." },
    { id: "contratos", title: "Minutas e Cláusulas Críticas", summary: "Empreitada, subempreita e fornecimento com SLAs, medições e reajuste.", metric: "Minutas editáveis", tags: ["jurídico","SLA"], prompt: "Crie minutas contratuais (empreitada global, subempreita e fornecimento) com: escopo, medições, reajuste por índice, retenções, garantias, cronograma físico-financeiro, multas, confidencialidade e resolução de conflitos. Inclua checklists de documentos e matriz RACI." },
    { id: "planejamento-exec", title: "Cronograma Executivo + Curva S", summary: "EAP por macro/microetapas com marcos e caixa.", metric: "CSV/Excel", tags: ["prazo","custos"], prompt: "Elabore uma EAP (WBS) detalhada para obra predial de 18-24 meses, com durações, predecessoras, marcos, recursos críticos e curva S físico-financeira. Saída em CSV para importação no MS Project/Primavera." },
  ],
  projeto: [
    { id: "compatibilizacao", title: "Compatibilização de Projetos", summary: "Clash list (ARQ x STR x MEP) + RFIs.", tags: ["clash","RFI"], prompt: "Gere checklist de compatibilização entre arquitetura, estrutural, elétrico, hidráulico e HVAC. Identifique conflitos típicos e redija 10 RFIs padrão com campos preenchíveis. Saída em tabela." },
    { id: "memorial", title: "Memorial Descritivo Padronizado", summary: "Especificações por ambiente + NBR 15575.", tags: ["NBR","desempenho"], prompt: "Produza um memorial descritivo conforme NBR 15575: requisitos de desempenho por sistema, especificações por ambiente, marcas de referência, equivalência técnica e plano de ensaios. Inclua tabela de rastreabilidade de versões." },
    { id: "encargos", title: "Caderno de Encargos", summary: "Diretrizes técnicas e entregáveis padrão.", prompt: "Elabore um caderno de encargos para projetistas (ARQ, STR, ELÉ, HID, GÁS, SPDA, INCÊNDIO): escopo mínimo, nível de detalhamento por pranchas, convenções gráficas, formatos de entrega (DWG/IFC/PDF), e prazos de revisão." },
  ],
  suprimentos: [
    { id: "cotacao", title: "Pacote de Cotação Comparativa", summary: "Termo de referência + planilha comparativa.", prompt: "Crie termo de referência e modelo de planilha comparativa para 3-5 fornecedores: campos de preço unitário, prazo, garantia, frete, impostos, condições de pagamento e compliance. Incluir critérios de desempate." },
    { id: "negociacao", title: "Script de Negociação Técnica", summary: "Argumentos por categoria.", prompt: "Liste argumentos técnicos e comerciais para negociação de cimento, aço CA-50, esquadrias de alumínio, elevadores e louças/metais, com faixas de preço de mercado (coloque como variável) e concessões escalonadas." },
    { id: "estoque", title: "Controle de Estoque (Kanban)", summary: "Mínimos/máximos e alertas.", prompt: "Monte um quadro Kanban de estoque por família de itens com níveis mínimo/máximo, lead time e gatilhos de reposição. Gere também um CSV de exemplo." },
  ],
  execucao: [
    { id: "seguranca", title: "Plano de Segurança (SST)", summary: "APRs por serviço, checklists e DDS.", tags: ["NRs","APR","DDS"], prompt: "Crie um plano de segurança com APRs por serviço (escavação, fôrma, armação, concretagem, alvenaria, cobertura, fachada), checklists diários e 12 roteiros de DDS." },
    { id: "check-inspecao", title: "Checklists de Inspeção por Serviço", summary: "Fundação, estrutura, alvenaria, instalações, acabamento e fachada.", prompt: "Gere checklists de inspeção por etapa (fundação, estrutura, alvenaria, elétrico, hidráulico, impermeabilização, revestimentos, esquadrias, fachada) com critérios de aceitação e evidências fotográficas." },
    { id: "financeiro", title: "Orçado x Real", summary: "% físico/financeiro, desvios e plano de ação.", prompt: "Monte uma planilha de controle orçado vs. realizado com % físico, % financeiro, desvios absolutos e relativos, causas-raiz e plano de ação. Saída em CSV." },
  ],
  posobra: [
    { id: "entrega", title: "Plano de Entrega ao Condomínio", summary: "Dossiê técnico, manuais e vistorias.", prompt: "Crie um plano de entrega: dossiê técnico (as built, ARTs, manuais), cronograma de vistorias, termos de recebimento e plano de manutenção por sistema." },
    { id: "assistencia", title: "Assistência Técnica e SLA", summary: "Fluxo de chamados e KPIs.", prompt: "Desenhe um processo de assistência: canais, triagem, criticidade, prazos de atendimento/solução, registros e relatórios mensais com KPIs." },
  ],
  automacoes: [
    { id: "comunicados", title: "Comunicados e A Pagar (padrões)", summary: "Textos no padrão definido, incluindo múltiplos docs.", prompt: "Use o padrão registrado para comunicados e solicitações: (1) A Pagar com lista numerada dos documentos (Fornecedor, Mês, Vencimento, Valor); (2) Reembolsos com descrição, valor, total e dados bancários fixos. Produza o texto pronto para envio." },
    { id: "comparativos", title: "Planilhas Comparativas Automáticas", summary: "De NF/propostas para quadro comparativo.", prompt: "Converta PDFs de propostas/Notas Fiscais em tabela e gere quadro comparativo com recomendação técnica e comercial." },
    { id: "checkflows", title: "Checklists e Fluxos Padrão", summary: "Modelos reutilizáveis por etapa.", prompt: "Crie checklists e fluxos operacionais por etapa da obra com campos de responsável, data, evidência e observações." },
  ],
};

function ActionCard({ action }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>{action.title}</div>
          <span style={styles.badge}>{action.metric || 'Pronto'}</span>
        </div>
        <p style={{ color: '#555', fontSize: 14, marginBottom: 8 }}>{action.summary}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {(action.tags || []).map((t) => (<span key={t} style={styles.badge}>{t}</span>))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...styles.button, background: '#111', color: '#fff', borderColor: '#111' }} onClick={() => setOpen(true)}>
            <ClipboardList size={16} /> Gerar
          </button>
        </div>
        {open && (
          <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Prompt pronto para uso</div>
            <textarea readOnly value={action.prompt} style={{ width: '100%', height: 180, border: '1px solid #ddd', borderRadius: 8, padding: 10 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button style={styles.button} onClick={() => navigator.clipboard.writeText(action.prompt)}><ClipboardList size={16} /> Copiar</button>
              <button style={styles.button} onClick={() => window.open('https://chat.openai.com', '_blank')}><Share2 size={16} /> Abrir ChatGPT</button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function DashboardObraGPT() {
  const [phase, setPhase] = useState('planejamento');
  const [query, setQuery] = useState('');
  const items = React.useMemo(() => ACTIONS[phase], [phase]);
  const filtered = React.useMemo(() => items.filter(a => (a.title + a.summary + (a.tags||[]).join(' ')).toLowerCase().includes(query.toLowerCase())), [items, query]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Painel de Execução Predial</h1>
          <p style={styles.subtitle}>Selecione a fase, gere entregáveis e padronize processos.</p>
        </div>
        <button style={styles.button}><Calculator size={16} /> Modelos Financeiros</button>
      </div>

      <div style={styles.tabsList}>
        {PHASES.map(p => {
          const Icon = p.icon;
          return (
            <button key={p.id} style={styles.tab(phase===p.id)} onClick={() => setPhase(p.id)}>
              <Icon size={16} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.searchRow}>
        <input placeholder="Buscar ação nesta fase…" value={query} onChange={(e) => setQuery(e.target.value)} style={styles.input} />
        <button title="Limpar" style={styles.button} onClick={() => setQuery('')}><Check size={16} /></button>
      </div>

      <div style={styles.grid}>
        {filtered.length === 0 ? (
          <div style={{ ...styles.card, gridColumn: '1 / -1', color: '#666' }}>Nenhuma ação encontrada com o filtro atual.</div>
        ) : filtered.map(a => (<ActionCard key={a.id} action={a} />))}
      </div>

      <div style={styles.footer}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={16} /><span>Comunicados do condomínio no padrão definido.</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileSpreadsheet size={16} /><span>Quadros comparativos a partir de NF/propostas.</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardCheck size={16} /><span>Checklists de inspeção por etapa.</span></div>
        </div>
        <div style={styles.small}>
          Dica: ao clicar em <b>Gerar</b>, copie o prompt pronto e execute no ChatGPT. Podemos conectar entradas padronizadas (PDFs, imagens e planilhas) para acelerar a produção dos entregáveis.
        </div>
      </div>
    </div>
  );
}
