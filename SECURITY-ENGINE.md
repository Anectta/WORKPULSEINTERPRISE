# SECURITY ENGINE — ESPECIFICAÇÃO DO MOTOR DE SEGURANÇA

## 1. Visão Geral
O **Security Engine** é o núcleo de inteligência, análise de risco e orquestração de testes de segurança do WorkPulse Enterprise. Opera de forma totalmente desacoplada da camada web para garantir estabilidade, segurança e isolamento.

---

## 2. Tecnologias e Dependências
- **Linguagem**: Node.js 22 LTS / TypeScript 5.8.
- **Protocolos Suportados**: HTTP/HTTPS (TLS 1.2/1.3), TCP, DNS, NTP, ICMP controlado.
- **Normalização de Vulnerabilidades**: Padrões CVSS v3.1, CWE (Common Weakness Enumeration), CVE e OWASP Top 10.
- **Safe Mode**: Restrição nativa que proíbe payloads destrutivos em ambientes de produção.

---

## 3. Arquitetura de Comunicação e Fila

```text
[ API Gateway / BFF ] ──(REST Enqueue)──▶ [ Redis / BullMQ Job Queue ]
                                                   │
                                                   ▼
                                        [ Security Engine Worker ]
                                                   │
                                        (Scope Validation & SSRF Guard)
                                                   │
                                                   ▼
                                        [ Isolated Runner Sandbox ]
```

---

## 4. Parâmetros de Execução e Hardening

- **Anti-SSRF Enforcement**: Resolução estrita de DNS com verificação de blacklist de IPs antes da abertura do socket.
- **Rate Limit por Alvo**: Máximo de 5 requisições por segundo por alvo para evitar sobrecarga ou indisponibilidade de infraestrutura.
- **Timeout de Conexão**: Limite padrão de 4000ms por requisição individual e 15000ms para jobs de varredura.
- **Tratamento de Exceções**: Se um host alvo rejeitar conexões ou sofrer timeout, o estado da varredura é finalizado com o status `COMPLETED_WITH_WARNINGS` sem travar o worker.
