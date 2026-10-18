
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Bot,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LayoutDashboard,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Workflow,
  Zap,
} from "lucide-react";

import {
  askPolicyQuestion,
  checkHealth,
  createWorkflow,
  investigateOrder,
  runMultiAgentInvestigation,
} from "./api";

import "./App.css";

type Page =
  | "overview"
  | "investigation"
  | "agents"
  | "policy"
  | "workflows";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const navigation: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "investigation", label: "Order investigation", icon: Search },
  { id: "agents", label: "AI agents", icon: Bot },
  { id: "policy", label: "Policy assistant", icon: BookOpen },
  { id: "workflows", label: "Workflows", icon: Workflow },
];

function readableError(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as { response?: { data?: { detail?: unknown } } }
    ).response;

    if (response?.data?.detail) {
      return String(response.data.detail);
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function JsonViewer({ data }: { data: JsonValue }) {
  return (
    <pre className="json-viewer">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function App() {
  const [page, setPage] = useState<Page>("overview");
  const [health, setHealth] = useState<"checking" | "online" | "offline">(
    "checking"
  );

  const [orderNumber, setOrderNumber] = useState("ORD-1042");
  const [investigation, setInvestigation] = useState<JsonValue>(null);
  const [agentResults, setAgentResults] = useState<JsonValue>(null);
  const [workflowResult, setWorkflowResult] = useState<JsonValue>(null);

  const [question, setQuestion] = useState("");
  const [policyAnswer, setPolicyAnswer] = useState<JsonValue>(null);

  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const refreshHealth = useCallback(async () => {
    setHealth("checking");

    try {
      await checkHealth();
      setHealth("online");
    } catch {
      setHealth("offline");
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  async function performAction(
    actionName: string,
    action: () => Promise<unknown>,
    saveResult: (result: JsonValue) => void
  ) {
    setLoading(actionName);
    setError("");

    try {
      const result = await action();
      saveResult(result as JsonValue);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading("");
    }
  }

  function handleOrderSubmit(
    event: React.FormEvent<HTMLFormElement>,
    action: (order: string) => Promise<unknown>,
    saveResult: (result: JsonValue) => void,
    actionName: string
  ) {
    event.preventDefault();

    const normalizedOrder = orderNumber.trim().toUpperCase();

    if (!/^ORD-\d{4,}$/.test(normalizedOrder)) {
      setError("Enter a valid order number, for example ORD-1042.");
      return;
    }

    void performAction(
      actionName,
      () => action(normalizedOrder),
      saveResult
    );
  }

  const currentTitle =
    navigation.find((item) => item.id === page)?.label ?? "Overview";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Zap size={23} />
          </div>
          <div>
            <h1>EnterpriseOps</h1>
            <span>AI WORKFLOW PLATFORM</span>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => {
                  setPage(item.id);
                  setError("");
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="backend-card">
            <span className="backend-label">PYTHON API</span>
            <div className="backend-status">
              <span className={`status-dot ${health}`} />
              {health === "online"
                ? "Connected"
                : health === "offline"
                  ? "Unavailable"
                  : "Checking..."}
            </div>
            <button className="text-button" onClick={() => void refreshHealth()}>
              <RefreshCw size={14} /> Check connection
            </button>
          </div>
          <p className="sidebar-footer">EnterpriseOps AI · Portfolio Project</p>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Workspace / {currentTitle}</div>
            <h2>{currentTitle}</h2>
          </div>

          <div className="topbar-right">
            <span className="environment-tag">
              <span className="status-dot online" />
              LOCAL DEVELOPMENT
            </span>
            <button
              className="icon-button"
              aria-label="Refresh backend status"
              onClick={() => void refreshHealth()}
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="error-banner">
              <CircleAlert size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}

          {page === "overview" && (
            <>
              <section className="welcome-row">
                <div>
                  <p className="eyebrow">BUSINESS OPERATIONS INTELLIGENCE</p>
                  <h3>Welcome to EnterpriseOps AI</h3>
                  <p className="muted">
                    Investigate orders, retrieve support policies, and prepare
                    human-reviewed workflows with AI.
                  </p>
                </div>
                <div className="welcome-art">
                  <Bot size={42} />
                </div>
              </section>

              <section className="stats-grid">
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Python API</span>
                    <Activity size={19} />
                  </div>
                  <strong className="stat-value">
                    {health === "online"
                      ? "Online"
                      : health === "offline"
                        ? "Offline"
                        : "Checking"}
                  </strong>
                  <span className="stat-caption">FastAPI · Port 8000</span>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span>AI investigation</span>
                    <Bot size={19} />
                  </div>
                  <strong className="stat-value">Multi-agent</strong>
                  <span className="stat-caption">Specialized agent pipeline</span>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span>Knowledge base</span>
                    <BookOpen size={19} />
                  </div>
                  <strong className="stat-value">RAG</strong>
                  <span className="stat-caption">Policy-grounded answers</span>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span>Approval model</span>
                    <ShieldCheck size={19} />
                  </div>
                  <strong className="stat-value">Human review</strong>
                  <span className="stat-caption">Workflow proposals</span>
                </article>
              </section>

              <section className="content-grid">
                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">GET STARTED</p>
                      <h3>Investigate an order</h3>
                    </div>
                    <Search size={20} />
                  </div>

                  <p className="muted">
                    Start with a known order, such as ORD-1042, and retrieve
                    its AI investigation.
                  </p>

                  <form
                    className="inline-form"
                    onSubmit={(event) =>
                      handleOrderSubmit(
                        event,
                        investigateOrder,
                        setInvestigation,
                        "overview-investigate"
                      )
                    }
                  >
                    <input
                      value={orderNumber}
                      onChange={(event) => setOrderNumber(event.target.value)}
                      placeholder="ORD-1042"
                      aria-label="Order number"
                    />
                    <button
                      className="primary-button"
                      disabled={loading !== ""}
                      type="submit"
                    >
                      {loading === "overview-investigate" ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Search size={17} />
                      )}
                      Investigate
                    </button>
                  </form>

                  {investigation !== null && (
                    <div className="result-section">
                      <h4>Latest investigation result</h4>
                      <JsonViewer data={investigation} />
                    </div>
                  )}
                </article>

                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">PLATFORM FLOW</p>
                      <h3>How it works</h3>
                    </div>
                    <Workflow size={20} />
                  </div>

                  <div className="flow-list">
                    <div className="flow-item">
                      <span className="flow-icon"><Search size={17} /></span>
                      <div>
                        <strong>1. Investigate</strong>
                        <p>Retrieve order information from the backend.</p>
                      </div>
                    </div>
                    <div className="flow-item">
                      <span className="flow-icon"><Bot size={17} /></span>
                      <div>
                        <strong>2. Analyze with AI</strong>
                        <p>Agents analyze the order and relevant policies.</p>
                      </div>
                    </div>
                    <div className="flow-item">
                      <span className="flow-icon"><ShieldCheck size={17} /></span>
                      <div>
                        <strong>3. Review the proposal</strong>
                        <p>Submit a workflow for human approval.</p>
                      </div>
                    </div>
                  </div>

                  <button
                    className="secondary-button full-button"
                    onClick={() => setPage("agents")}
                  >
                    Explore AI agents
                  </button>
                </article>
              </section>
            </>
          )}

          {page === "investigation" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">ORDER OPERATIONS</p>
                  <h3>Order investigation</h3>
                </div>
                <Search size={21} />
              </div>

              <p className="muted">
                Fetch an AI-generated investigation for an order in your
                Spring Boot business system.
              </p>

              <form
                className="stack-form"
                onSubmit={(event) =>
                  handleOrderSubmit(
                    event,
                    investigateOrder,
                    setInvestigation,
                    "investigation"
                  )
                }
              >
                <label htmlFor="investigation-order">Order number</label>
                <div className="inline-form">
                  <input
                    id="investigation-order"
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                    placeholder="ORD-1042"
                  />
                  <button
                    className="primary-button"
                    disabled={loading !== ""}
                  >
                    {loading === "investigation" ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Search size={17} />
                    )}
                    Run investigation
                  </button>
                </div>
              </form>

              {investigation !== null && (
                <div className="result-section">
                  <h4>Investigation response</h4>
                  <JsonViewer data={investigation} />
                </div>
              )}
            </section>
          )}

          {page === "agents" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">AI ORCHESTRATION</p>
                  <h3>Multi-agent investigation</h3>
                </div>
                <Bot size={22} />
              </div>

              <p className="muted">
                Run the order investigator, policy agent, and triage agent
                through your existing FastAPI orchestration endpoint.
              </p>

              <form
                className="stack-form"
                onSubmit={(event) =>
                  handleOrderSubmit(
                    event,
                    runMultiAgentInvestigation,
                    setAgentResults,
                    "agents"
                  )
                }
              >
                <label htmlFor="agent-order">Order number</label>
                <div className="inline-form">
                  <input
                    id="agent-order"
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                    placeholder="ORD-1042"
                  />
                  <button
                    className="primary-button"
                    disabled={loading !== ""}
                  >
                    {loading === "agents" ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Bot size={17} />
                    )}
                    Run all agents
                  </button>
                </div>
              </form>

              <div className="agent-cards">
                <div className="agent-card">
                  <Search size={19} />
                  <strong>Order investigator</strong>
                  <span>Collects order facts</span>
                </div>
                <div className="agent-card">
                  <BookOpen size={19} />
                  <strong>Policy agent</strong>
                  <span>Retrieves policy context</span>
                </div>
                <div className="agent-card">
                  <ShieldCheck size={19} />
                  <strong>Triage agent</strong>
                  <span>Proposes next steps</span>
                </div>
              </div>

              {agentResults !== null && (
                <div className="result-section">
                  <h4>Multi-agent result</h4>
                  <JsonViewer data={agentResults} />
                </div>
              )}
            </section>
          )}

          {page === "policy" && (
            <section className="panel policy-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">RETRIEVAL-AUGMENTED GENERATION</p>
                  <h3>Policy assistant</h3>
                </div>
                <BookOpen size={22} />
              </div>

              <p className="muted">
                Ask questions about your support policies. Answers depend on
                the knowledge documents indexed by your Python RAG service.
              </p>

              <form
                className="policy-form"
                onSubmit={(event) => {
                  event.preventDefault();

                  if (question.trim().length < 3) {
                    setError("Enter a question with at least 3 characters.");
                    return;
                  }

                  void performAction(
                    "policy",
                    () => askPolicyQuestion(question.trim()),
                    setPolicyAnswer
                  );
                }}
              >
                <label htmlFor="policy-question">Your question</label>
                <textarea
                  id="policy-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Can we promise a delivery date for a delayed order?"
                  rows={4}
                />
                <div className="form-footer">
                  <span className="muted small-text">
                    Answers are generated by your configured RAG pipeline.
                  </span>
                  <button
                    className="primary-button"
                    disabled={loading !== ""}
                  >
                    {loading === "policy" ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Send size={17} />
                    )}
                    Ask policy assistant
                  </button>
                </div>
              </form>

              <div className="suggested-questions">
                <span>Try asking:</span>
                {[
                  "Can we promise a delivery date for a delayed order?",
                  "When should a support ticket be created?",
                  "How should we handle a delayed shipment?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    className="suggestion-chip"
                    onClick={() => setQuestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {policyAnswer !== null && (
                <div className="result-section">
                  <h4>
                    <MessageSquareText size={17} /> Assistant response
                  </h4>
                  <JsonViewer data={policyAnswer} />
                </div>
              )}
            </section>
          )}

          {page === "workflows" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">HUMAN-IN-THE-LOOP AUTOMATION</p>
                  <h3>Workflow proposals</h3>
                </div>
                <Workflow size={22} />
              </div>

              <div className="notice">
                <ShieldCheck size={19} />
                <div>
                  <strong>Human approval is required</strong>
                  <p>
                    This action asks your backend to prepare a workflow
                    proposal. Ticket creation and approval decisions remain
                    controlled by your backend.
                  </p>
                </div>
              </div>

              <form
                className="stack-form"
                onSubmit={(event) =>
                  handleOrderSubmit(
                    event,
                    createWorkflow,
                    setWorkflowResult,
                    "workflow"
                  )
                }
              >
                <label htmlFor="workflow-order">Order number</label>
                <div className="inline-form">
                  <input
                    id="workflow-order"
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                    placeholder="ORD-1042"
                  />
                  <button
                    className="primary-button"
                    disabled={loading !== ""}
                  >
                    {loading === "workflow" ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Clock3 size={17} />
                    )}
                    Create proposal
                  </button>
                </div>
              </form>

              {workflowResult !== null && (
                <div className="result-section">
                  <h4>
                    <CheckCircle2 size={17} /> Workflow API response
                  </h4>
                  <JsonViewer data={workflowResult} />
                </div>
              )}
            </section>
          )}

          <footer className="page-footer">
            <span>EnterpriseOps AI</span>
            <span>AI-assisted operations · Human-reviewed decisions</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
