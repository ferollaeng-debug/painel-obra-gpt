import React, { useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { utils as XLSXUtils, writeFile as writeXLSX } from "xlsx";

// PDF.js worker setup
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker&url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  button: { border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px', background: '#fff', cursor: 'pointer' },
  input: { border: '1px solid #ddd', borderRadius: 8, padding: 10 },
  textarea: { border: '1px solid #ddd', borderRadius: 8, padding: 10, width: '100%', height: 140 },
  card: { border: '1px solid #eee', borderRadius: 14, padding: 14, background: '#fff' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 },
  section: { marginTop: 16 }
};

function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (s) => {
    const v = String(s ?? '');
    return /[\";\n]/.test(v) ? '\"' + v.replace(/\"/g,'\"\"') + '\"' : v;
  };
  const csv = [headers.join(';')].concat(rows.map(r => headers.map(h => esc(r[h])).join(';'))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function downloadXLSX(filename, rows) {
  const ws = XLSXUtils.json_to_sheet(rows);
  const wb = XLSXUtils.book_new();
  XLSXUtils.book_append_sheet(wb, ws, "Materiais");
  writeXLSX(wb, filename);
}

// Heurísticas simples para extrair itens de materiais de texto
function extractMaterialsFromText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const patterns = [
    // elétrico
    /(cabo|condutor)\s+([0-9]{1,2},?[0-9]?\s*mm²)\s*(pvc|pe|xlpe)?/i,
    /(disjuntor|dj)\s*(\d{1,3})\s*a\b/i,
    /(eletroduto|eletrocalha|eletrocalha|perfil)\s*(pvc|metálico|metalico)?\s*(\d{1,3}mm)?/i,
    // hidráulico
    /(tubo|tubulação)\s*(pvc|ppr|cpvc|pex)\s*(\d{1,3})\s*mm/i,
    /(joelho|curva|luva|tê|valvula|registro)\s*(\d{1,3})\s*mm/i,
    // estrutura
    /(aço|aco)\s*ca-?50|ca-?60|resina|chumbador/i,
    /(concreto)\s*fck\s*(\d{10,60})\s*mpa/i,
    // arquitetura
    /(revestimento|porcelanato|piso|pintura|massa corrida|argamassa)\b.*?(\d+[,\.]?\d*)\s*m²/i,
    /(porta|janela|esquadria)\s*(alumínio|aluminio|madeira|pvc)?\s*(\d+[x×]\d+)?/i
  ];

  const items = [];
  for (const line of lines) {
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) {
        items.push({
          item: (m[1] || line.split(' ')[0]).toUpperCase(),
          especificacao: line,
          unidade: '',
          quantidade: ''
        });
        break;
      }
    }
  }

  // Deduplicar por especificacao
  const dedup = [];
  const seen = new Set();
  for (const it of items) {
    const key = it.especificacao.toLowerCase();
    if (!seen.has(key)) { seen.add(key); dedup.push(it); }
  }
  return dedup;
}

export default function App() {
  const [pdfName, setPdfName] = useState('');
  const [rawText, setRawText] = useState('');
  const [materials, setMaterials] = useState([]);

  const handlePDF = async (file) => {
    setPdfName(file.name);
    const buf = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: buf });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = content.items.map(it => it.str).join(' ');
      fullText += '\n' + text;
    }
    setRawText(fullText.trim());

    const mats = extractMaterialsFromText(fullText);
    setMaterials(mats);
  };

  const exportCSV = () => downloadCSV(`materiais_${pdfName.replace(/\.pdf$/i,'')||'projeto'}.csv`, materials);
  const exportXLSX = () => downloadXLSX(`materiais_${pdfName.replace(/\.pdf$/i,'')||'projeto'}.xlsx`, materials);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 className="title">Painel — Análise de PDF & Lista de Materiais (V3)</h1>
          <p className="subtitle">Upload de PDF → leitura de texto → heurísticas técnicas → planilha de materiais.</p>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'center'}}>
          <input className="input" type="file" accept="application/pdf" onChange={(e)=> e.target.files?.[0] && handlePDF(e.target.files[0])} />
          <button className="button" onClick={()=>{ if(materials.length){ exportXLSX(); }}}>Exportar XLSX</button>
          <button className="button" onClick={()=>{ if(materials.length){ exportCSV(); }}}>Exportar CSV</button>
        </div>
        <div style={{marginTop:8}} className="muted">PDF: {pdfName || 'nenhum arquivo carregado'}</div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div style={{fontWeight:700, marginBottom:8}}>Prévia — Materiais detectados (heurística)</div>
        {materials.length === 0 ? (
          <div className="muted">Nada detectado ainda. Se o PDF for escaneado (imagem), será necessário OCR — posso adicionar isso na V4.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Item</th><th>Especificação (linha de origem)</th><th>Unidade</th><th>Quantidade</th></tr></thead>
            <tbody>
              {materials.map((m,i)=>(
                <tr key={i}><td>{m.item}</td><td>{m.especificacao}</td><td>{m.unidade}</td><td>{m.quantidade}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{marginTop:12}}>
        <div style={{fontWeight:700, marginBottom:8}}>Texto bruto extraído do PDF</div>
        <textarea className="textarea" readOnly value={rawText} />
        <div className="muted" style={{marginTop:6}}>Use para conferência. A lista final pode ser editada após exportar para Excel.</div>
      </div>
    </div>
  );
}
