import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import cmdbRouter from "./server/cmdbRouter";
import wifiRouter from "./server/wifiRouter";
import securityRouter from "./server/securityRouter";
import { SecurityHealthService } from "./server/security/securityHealth";

dotenv.config();

const app = express();
const PORT = 3000;

// Hardening & Security Headers
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  // Content Security Policy compatível com Vite e iframe corporativo
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; connect-src 'self' https: http: ws: wss:; frame-ancestors *;"
  );
  next();
});

app.use(express.json({ limit: '10mb' }));

// Mount CMDB & Agent API Router version 1
app.use("/api/v1", cmdbRouter);
// Mount WIFI Pulse Module API Router
app.use("/api/wifi", wifiRouter);
app.use("/api/v1/wifi", wifiRouter);
// Mount Security & Pentest Module API Router
app.use("/api/v1", securityRouter);

// Initialize Gemini API client lazily
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Health Check Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "UP", app: "WorkPulse Enterprise", timestamp: new Date().toISOString() });
});

app.get("/api/health/database", (req, res) => {
  const health = SecurityHealthService.getHealth();
  const dbHealth = health.components.database;
  res.status(dbHealth.status === 'UNAVAILABLE' ? 503 : 200).json({
    status: dbHealth.status === 'HEALTHY' ? 'UP' : dbHealth.status === 'DEGRADED' ? 'DEGRADED' : 'DOWN',
    component: "database",
    latencyMs: dbHealth.latencyMs,
    message: dbHealth.message,
    details: dbHealth.details,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health/security-engine", (req, res) => {
  const health = SecurityHealthService.getHealth();
  const engineHealth = health.components.securityEngine;
  res.status(engineHealth.status === 'UNAVAILABLE' ? 503 : 200).json({
    status: engineHealth.status === 'HEALTHY' ? 'UP' : engineHealth.status === 'DEGRADED' ? 'DEGRADED' : 'DOWN',
    component: "security-engine",
    latencyMs: engineHealth.latencyMs,
    message: engineHealth.message,
    details: engineHealth.details,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health/queue", (req, res) => {
  const health = SecurityHealthService.getHealth();
  const queueHealth = health.components.executionQueue;
  res.status(queueHealth.status === 'UNAVAILABLE' ? 503 : 200).json({
    status: queueHealth.status === 'HEALTHY' ? 'UP' : queueHealth.status === 'DEGRADED' ? 'DEGRADED' : 'DOWN',
    component: "queue",
    latencyMs: queueHealth.latencyMs,
    message: queueHealth.message,
    details: queueHealth.details,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health/runner", (req, res) => {
  const health = SecurityHealthService.getHealth();
  const runnerHealth = health.components.pentestRunner;
  res.status(runnerHealth.status === 'UNAVAILABLE' ? 503 : 200).json({
    status: runnerHealth.status === 'HEALTHY' ? 'UP' : runnerHealth.status === 'DEGRADED' ? 'DEGRADED' : 'DOWN',
    component: "runner",
    latencyMs: runnerHealth.latencyMs,
    message: runnerHealth.message,
    details: runnerHealth.details,
    timestamp: new Date().toISOString()
  });
});

// AI Executive Insights route using Gemini 3.6 Flash
app.post("/api/ai/insights", async (req, res) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(400).json({
        error: "GEMINI_API_KEY não configurada. Configure na aba Secrets/Settings para habilitar análises inteligentes com IA."
      });
    }

    const { department, persona, metrics, period } = req.body;

    const prompt = `Você é o assistente de IA especialista em People Analytics, Produtividade Corporativa e LGPD da plataforma WorkPulse Enterprise.
Gere um relatório executivo sucinto, profissional e acionável em PORTUGUÊS para a persona: ${persona || 'Diretoria'}.
Foco do departamento: ${department || 'Geral'}.
Período: ${period || 'Esta Semana'}.

Dados do Dashboard:
- Produtividade Média: ${metrics?.productivity || '78%'}
- Horas Trabalhadas: ${metrics?.totalHours || '1,420h'}
- Horas Produtivas: ${metrics?.productiveHours || '1,107h'}
- Horas Ociosas: ${metrics?.idleHours || '142h'}
- Tempo Improdutivo em Redes/Entretenimento: ${metrics?.unproductiveHours || '171h'}
- Modelo de Trabalho: ${metrics?.workModel || 'Híbrido (40% HO, 60% Presencial)'}

Estrutura da Resposta desejada:
1. 📊 **Resumo Executivo de Desempenho** (3 frases com os principais destaques)
2. ⚠️ **Alertas de Ociosidade & Gargalos** (2 a 3 pontos acionáveis sem violar LGPD)
3. 💡 **Recomendações Estratégicas para o Gestor / RH** (Ações para melhorar engajamento e bem-estar, mantendo equilíbrio e prevenindo burnout)
4. 🔒 **Nota de Conformidade LGPD** (Confirmação de monitoramento não-invasivo de metadados).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    res.json({
      insight: response.text,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Erro na API do Gemini:", error);
    res.status(500).json({
      error: "Falha ao gerar insights com Gemini AI.",
      details: error.message
    });
  }
});

// AI App Classification route
app.post("/api/ai/classify-app", async (req, res) => {
  try {
    const ai = getGenAIClient();
    const { appName, domain, department } = req.body;

    if (!ai) {
      // Fallback response if key is missing
      const isProductive = /vscode|excel|figma|sap|jira|teams|github|notion|slack|powerbi/i.test(appName + domain);
      const isUnproductive = /facebook|instagram|tiktok|netflix|steam|twitch|twitter/i.test(appName + domain);
      const category = isProductive ? "Produtivo" : isUnproductive ? "Improdutivo" : "Neutro";
      return res.json({
        appName,
        category,
        reason: "Classificação sugerida via algoritmo de palavras-chave corporativas.",
        confidence: 0.85
      });
    }

    const prompt = `Classifique a seguinte aplicação ou website corporativo para o departamento de ${department || 'Geral'}:
Nome: ${appName}
Domínio/URL: ${domain || 'N/A'}

Responda em formato JSON com os campos:
- category: ("Produtivo", "Improdutivo", ou "Neutro")
- defaultGroup: ("Desenvolvimento", "Comunicação", "Redes Sociais", "Entretenimento", "Gestão/ERP", "Outros")
- reason: explicação sucinta em português da classificação.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Topology Data Persistent Routes
const TOPOLOGY_FILE_PATH = path.join(process.cwd(), "src", "data", "topology_saved.json");

app.get("/api/topology", (req, res) => {
  try {
    if (fs.existsSync(TOPOLOGY_FILE_PATH)) {
      const fileData = fs.readFileSync(TOPOLOGY_FILE_PATH, "utf-8");
      return res.json(JSON.parse(fileData));
    }
  } catch (error: any) {
    console.error("Erro ao ler arquivo de topologia:", error);
  }
  res.json(null);
});

app.post("/api/topology", (req, res) => {
  try {
    const topologyData = req.body;
    fs.mkdirSync(path.dirname(TOPOLOGY_FILE_PATH), { recursive: true });
    fs.writeFileSync(TOPOLOGY_FILE_PATH, JSON.stringify(topologyData, null, 2), "utf-8");
    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error("Erro ao salvar arquivo de topologia:", error);
    res.status(500).json({ error: error.message });
  }
});

// Power BI / FTP Live Feed endpoint simulation
app.get("/api/export/powerbi-feed", (req, res) => {
  res.json({
    updatedAt: new Date().toISOString(),
    companyName: "WorkPulse Enterprise Corp",
    totalEmployeesTracked: 148,
    metricsSummary: {
      avgProductivityPct: 81.4,
      totalProductiveHours: 5420,
      totalIdleHours: 410,
      totalUnproductiveHours: 630,
      lockedStationsPostShift: 12
    },
    datasetUrl: "/api/export/download-csv"
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WorkPulse Enterprise Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
