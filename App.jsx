import { useState, useRef, useEffect } from "react";

const SAMPLES = [
  {
    label: "NullPointerException",
    value: `com.pega.pegarules.pub.runtime.PublicException: ERROR: Exception running activity 'KrediBasvuruValidate' in 'BANK-CreditApp-Work-KrediBasvuru'
Caused by: java.lang.NullPointerException
  at BANK_CreditApp_Work_KrediBasvuru.validateMusteri(line:892)
Step: 4 - Property-Set: .MusteriGelir = @(Income.ToplamNetGelir)
Property reference: Income.ToplamNetGelir is null
Thread: OPS-KREDI-01 | Rule context: BANK-CreditApp 01-01-01`,
  },
  {
    label: "DB Timeout",
    value: `ERROR - RuleSet: BANK-Integration-KKBConnector
com.pega.pegarules.pub.runtime.PublicException: Database operation failed
Caused by: java.sql.SQLTimeoutException: ORA-01013: user requested cancel of current operation
  Query timeout: 30000ms | Table: pr_data_BANK_KKBSorgulama
  SQL: SELECT * FROM pr_data_BANK_KKBSorgulama WHERE pxCreateDateTime > :startDate
  Missing index on: pxCreateDateTime + pyStatusWork
  Connection pool: BANK_OPS_POOL (active: 48/50)`,
  },
  {
    label: "Circular Reference",
    value: `WARN [PegaRULES] Declare Expression circular dependency detected
Rule: BANK-CreditApp-Data-KrediTeklif.ToplamMaliyet
Expression: ToplamMaliyet = FaizTutari + KomisyonTutari + VERGILER.KDV
  > FaizTutari depends on: ToplamMaliyet (circular!)
  > Evaluation stack depth: 47 (max: 50)
ERROR PRRuntimeException: Maximum declare expression depth exceeded
  Conflicting versions: 02-03-05, 02-02-01, 01-05-12`,
  },
  {
    label: "Agent Deadlock",
    value: `ERROR [PegaRULES Engine] Agent execution failed: BANK-KrediAgent-AutoApproval
Caused by: com.pega.pegarules.pub.PRDeadlockException: Deadlock detected
  Work Object: BANK-KREDI-20241203-K001847
  Lock held by: OPS-ANALIST-03 (idle: 1847 seconds)
  Lock requested by: Agent BANK-KrediAgent-AutoApproval
  Queue depth: 234 pending | Node: PegaNode02
Agent status: SUSPENDED — requires manual restart`,
  },
];

const SYSTEM_PROMPT = `Sen Pega Platform (Pega Infinity) uzmanı bir yapay zeka asistanısın. Bireysel kredi ürünleri üzerinde çalışan bir bankanın Pega ortamındaki AES (Application Exception Service) hata loglarını analiz ediyorsun.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma, markdown kullanma:
{"errorType":"string","pegaComponent":"string","severity":"Kritik|Yüksek|Orta","severityReason":"string","rootCause":"string","impactArea":["string"],"solution":[{"step":1,"action":"string","detail":"string"}],"pegaConfig":[{"item":"string","change":"string"}],"prevention":["string"],"testScenarios":["string"],"estimatedFixTime":"string"}`;

const SEV = {
  Kritik: { c: "#FF4757", bg: "rgba(255,71,87,0.13)" },
  Yüksek: { c: "#FF9F43", bg: "rgba(255,159,67,0.13)" },
  Orta:   { c: "#FFC048", bg: "rgba(255,192,72,0.10)" },
};

function Block({ title, color, children }) {
  return (
    <div style={{ background: "#0D1117", border: `1px solid ${color}25`, borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ color, fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

export default function App() {
  const [log, setLog]         = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);
  const [tab, setTab]         = useState("cozum");
  const [hist, setHist]       = useState([]);
  const bottomRef             = useRef(null);

  useEffect(() => {
    if (result) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [result]);

  const analyze = async () => {
    if (!log.trim()) return;
    setLoading(true); setErr(null); setResult(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Pega AES logunu Türkçe analiz et:\n\n${log}` }],
        }),
      });
      const data   = await res.json();
      const text   = data.content?.map((i) => i.text || "").join("") || "";
      const clean  = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setTab("cozum");
      setHist((p) => [
        { snippet: log.slice(0, 60) + "…", r: parsed, t: new Date().toLocaleTimeString("tr-TR") },
        ...p.slice(0, 3),
      ]);
    } catch {
      setErr("Analiz başarısız. Geçerli bir Pega exception log yapıştırın.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060912", color: "#C9D1D9", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink   { 50% { opacity:0; } }
        .fade { animation: fadeUp .35s ease; }
        textarea { font-family: inherit; outline: none; }
        button   { font-family: inherit; cursor: pointer; }
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #21262D; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#0D1117", borderBottom: "1px solid #21262D", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, border: "1px solid #00FF88", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: "rgba(0,255,136,0.07)", boxShadow: "0 0 14px rgba(0,255,136,0.15)" }}>⚡</div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#00FF88", fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>PEGA AES</span>
            <span style={{ color: "#3D4451" }}>|</span>
            <span style={{ color: "#8B949E", fontSize: 11 }}>Exception Intelligence Engine</span>
            <span style={{ width: 6, height: 6, background: "#00FF88", borderRadius: "50%", display: "inline-block", animation: "blink 1.4s infinite", boxShadow: "0 0 5px #00FF88" }} />
          </div>
          <div style={{ color: "#3D4451", fontSize: 10, marginTop: 1 }}>AI-Powered Root Cause Analysis · Pega Infinity · Bireysel Krediler</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px" }}>

        {/* Input */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "#3D4451", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>// Örnek Loglar</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {SAMPLES.map((s, i) => (
              <button key={i} onClick={() => setLog(s.value)}
                style={{ background: "#0D1117", border: "1px solid #21262D", color: "#8B949E", fontSize: 10, padding: "5px 11px", borderRadius: 6, transition: "all .15s" }}
                onMouseEnter={(e) => { e.target.style.borderColor = "#00FF88"; e.target.style.color = "#00FF88"; }}
                onMouseLeave={(e) => { e.target.style.borderColor = "#21262D"; e.target.style.color = "#8B949E"; }}
              >{s.label}</button>
            ))}
          </div>

          <textarea
            value={log}
            onChange={(e) => setLog(e.target.value)}
            placeholder={"// Pega AES exception logunu buraya yapıştır...\n\ncom.pega.pegarules.pub.runtime.PublicException: ..."}
            style={{ width: "100%", height: 200, background: "#0D1117", border: "1px solid #21262D", borderRadius: 10, color: "#C9D1D9", fontSize: 11, lineHeight: 1.8, padding: "12px 14px", resize: "vertical", boxSizing: "border-box", transition: "border-color .2s" }}
            onFocus={(e) => (e.target.style.borderColor = "#00FF88")}
            onBlur={(e)  => (e.target.style.borderColor = "#21262D")}
          />

          <button onClick={analyze} disabled={loading || !log.trim()}
            style={{ marginTop: 10, width: "100%", background: loading || !log.trim() ? "#0D1117" : "linear-gradient(135deg,#00FF88,#00CC6A)", border: loading || !log.trim() ? "1px solid #21262D" : "none", color: loading || !log.trim() ? "#3D4451" : "#060912", fontWeight: 800, fontSize: 13, padding: "13px 0", borderRadius: 10, letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}
          >
            {loading
              ? (<><div style={{ width: 13, height: 13, border: "2px solid #3D4451", borderTopColor: "#00FF88", borderRadius: "50%", animation: "spin .8s linear infinite" }} />Analiz ediliyor...</>)
              : "⚡ AES Exception Analiz Et"}
          </button>

          {err && <div style={{ marginTop: 10, background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 8, padding: "9px 13px", color: "#FF4757", fontSize: 11 }}>⚠ {err}</div>}
        </div>

        {/* History */}
        {hist.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "#3D4451", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>// Geçmiş Analizler</div>
            {hist.map((h, i) => (
              <div key={i} onClick={() => { setResult(h.r); setTab("cozum"); }}
                style={{ background: "#0D1117", border: "1px solid #21262D", borderRadius: 7, padding: "7px 10px", marginBottom: 5, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#30363D")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#21262D")}
              >
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: SEV[h.r.severity]?.c || "#8B949E", flexShrink: 0 }} />
                <div style={{ flex: 1, color: "#8B949E", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.snippet}</div>
                <div style={{ color: "#3D4451", fontSize: 9 }}>{h.t}</div>
              </div>
            ))}
          </div>
        )}

        {/* Result */}
        <div ref={bottomRef}>
          {!result && !loading && (
            <div style={{ textAlign: "center", opacity: 0.3, paddingTop: 40 }}>
              <div style={{ fontSize: 44 }}>🔬</div>
              <div style={{ color: "#3D4451", fontSize: 12, marginTop: 10, lineHeight: 1.9 }}>
                Örnek loglardan birini seç<br />veya kendi exception logunu yapıştır
              </div>
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, gap: 16 }}>
              <div style={{ position: "relative", width: 50, height: 50 }}>
                <div style={{ position: "absolute", inset: 0, border: "2px solid #21262D", borderTopColor: "#00FF88", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <div style={{ position: "absolute", inset: 7, border: "2px solid #21262D", borderTopColor: "#00CC6A", borderRadius: "50%", animation: "spin 1.5s linear infinite reverse" }} />
              </div>
              <div style={{ color: "#00FF88", fontSize: 12, letterSpacing: 2 }}>ANALİZ EDİLİYOR...</div>
            </div>
          )}

          {result && (
            <div className="fade">
              <div style={{ background: SEV[result.severity]?.bg, border: `1px solid ${SEV[result.severity]?.c}40`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ background: SEV[result.severity]?.c, color: "#060912", fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 20, letterSpacing: 1 }}>{result.severity?.toUpperCase()}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{result.errorType}</span>
                  </div>
                  <div style={{ color: "#8B949E", fontSize: 11, lineHeight: 1.6 }}>{result.severityReason}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#00FF88", fontWeight: 700, fontSize: 12 }}>{result.pegaComponent}</div>
                  <div style={{ color: "#3D4451", fontSize: 9, marginTop: 3 }}>Çözüm: <span style={{ color: "#C9D1D9" }}>{result.estimatedFixTime}</span></div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 3, marginBottom: 16, background: "#0D1117", borderRadius: 8, padding: 3 }}>
                {[["cozum","🔧 Çözüm"],["onleme","🛡 Önleme"],["test","✅ Test"]].map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", background: tab === k ? "#21262D" : "transparent", color: tab === k ? "#C9D1D9" : "#3D4451", fontSize: 11, fontWeight: 600, transition: "all .15s" }}>{l}</button>
                ))}
              </div>

              {tab === "cozum" && <>
                <Block title="// Kök Neden" color="#FF9F43">
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.85, color: "#C9D1D9" }}>{result.rootCause}</p>
                </Block>
                <Block title="// Etki Alanı" color="#FB7185">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.impactArea?.map((x, i) => <span key={i} style={{ background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.2)", color: "#FB7185", fontSize: 10, padding: "3px 9px", borderRadius: 20 }}>{x}</span>)}
                  </div>
                </Block>
                <Block title="// Adım Adım Çözüm" color="#00FF88">
                  {result.solution?.map((s) => (
                    <div key={s.step} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 22, height: 22, background: "#00FF88", color: "#060912", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{s.step}</div>
                      <div>
                        <div style={{ color: "#C9D1D9", fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{s.action}</div>
                        <div style={{ color: "#8B949E", fontSize: 11, lineHeight: 1.7 }}>{s.detail}</div>
                      </div>
                    </div>
                  ))}
                </Block>
                <Block title="// Pega Konfigürasyon" color="#38BDF8">
                  {result.pegaConfig?.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <span style={{ color: "#38BDF8" }}>→</span>
                      <div><span style={{ color: "#38BDF8", fontWeight: 700 }}>{c.item}: </span><span style={{ color: "#8B949E", fontSize: 11 }}>{c.change}</span></div>
                    </div>
                  ))}
                </Block>
              </>}

              {tab === "onleme" && (
                <Block title="// Tekrar Önleme" color="#A78BFA">
                  {result.prevention?.map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <span style={{ color: "#A78BFA", flexShrink: 0 }}>◆</span>
                      <span style={{ fontSize: 12, lineHeight: 1.75 }}>{p}</span>
                    </div>
                  ))}
                </Block>
              )}

              {tab === "test" && (
                <Block title="// Test Senaryoları" color="#FFC048">
                  {result.testScenarios?.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 20, height: 20, border: "1px solid #FFC048", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#FFC048", flexShrink: 0 }}>T{i+1}</div>
                      <span style={{ fontSize: 12, lineHeight: 1.75 }}>{t}</span>
                    </div>
                  ))}
                </Block>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
