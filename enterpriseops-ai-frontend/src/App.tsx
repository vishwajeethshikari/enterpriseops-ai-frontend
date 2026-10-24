import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  askPolicyQuestion,
  checkHealth,
  createWorkflow,
  investigateOrder,
  runMultiAgentInvestigation,
} from "./api";
import "./App.css";

type Page = "overview" | "investigation" | "assistant" | "workflows";
type Health = "checking" | "online" | "offline";
type ActivityEntry = {
  order: string;
  action: string;
  occurredAt: string;
};
type AssistantMessage = {
  role: "user" | "assistant";
  content: unknown;
  sources: string[];
};

const navigation: {
  id: Page;
  path: string;
  label: string;
  icon: string;
}[] = [
  { id: "overview", path: "/", label: "Overview", icon: "speedometer2" },
  { id: "investigation", path: "/investigations", label: "Investigations", icon: "search" },
  { id: "assistant", path: "/assistant", label: "AI assistant", icon: "chat-square-text" },
  { id: "workflows", path: "/workflows", label: "Workflows", icon: "diagram-3" },
];

function Icon({
  name,
  size = 16,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <i
      aria-hidden="true"
      className={`bi bi-${name}${className ? ` ${className}` : ""}`}
      style={{ fontSize: size }}
    />
  );
}

function recordOf(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readableError(error: unknown): string {
  const responseData = recordOf(
    recordOf(error)?.response &&
      recordOf(recordOf(error)?.response)?.data
  );

  if (responseData?.detail) {
    return String(responseData.detail);
  }
  if (responseData?.message) {
    return String(responseData.message);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "The request could not be completed. Please try again.";
}

function displayValue(value: unknown): string {
  if (value === null) return "Not provided";
  if (typeof value === "string") return value || "Not provided";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.every((item) => item === null || typeof item !== "object")) {
      return value.map((item) => displayValue(item)).join(", ");
    }
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (recordOf(value)) return "Structured response";
  return String(value);
}

function formatLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

function collectMatchingValues(
  value: unknown,
  pattern: RegExp,
  depth = 0
): { label: string; value: unknown }[] {
  if (depth > 5) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMatchingValues(item, pattern, depth + 1));
  }
  const record = recordOf(value);
  if (!record) return [];

  return Object.entries(record).flatMap(([key, item]) => {
    const matches = pattern.test(key);
    pattern.lastIndex = 0;
    if (matches) return [{ label: formatLabel(key), value: item }];
    return collectMatchingValues(item, pattern, depth + 1);
  });
}

function sourceNames(value: unknown): string[] {
  const values = collectMatchingValues(
    value,
    /source|citation|reference|document|policy.?name/i
  );
  const names = values.flatMap(({ value: item }) => {
    if (typeof item === "string") return [item];
    if (Array.isArray(item)) {
      return item.flatMap((entry) => {
        if (typeof entry === "string") return [entry];
        const record = recordOf(entry);
        const name = record?.name ?? record?.source ?? record?.title ?? record?.id;
        return name === undefined ? [] : [displayValue(name)];
      });
    }
    const record = recordOf(item);
    const name = record?.name ?? record?.source ?? record?.title ?? record?.id;
    return name === undefined ? [] : [displayValue(name)];
  });
  return [...new Set(names)];
}

function ResponseTree({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  const record = recordOf(value);
  if (record) {
    const entries = Object.entries(record);
    if (!entries.length) {
      return <p className="response-empty">The response contains no fields.</p>;
    }
    return (
      <dl className={`response-fields ${depth > 0 ? "nested-fields" : ""}`}>
        {entries.map(([key, item]) => (
          <div className="response-field" key={`${depth}-${key}`}>
            <dt>{formatLabel(key)}</dt>
            <dd>
              {recordOf(item) || Array.isArray(item) ? (
                depth < 4 ? (
                  <ResponseTree value={item} depth={depth + 1} />
                ) : (
                  <span>{displayValue(item)}</span>
                )
              ) : (
                <span>{displayValue(item)}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  if (Array.isArray(value)) {
    return (
      <ol className="response-list">
        {value.map((item, index) => (
          <li key={index}>
            {recordOf(item) ? (
              <ResponseTree value={item} depth={depth + 1} />
            ) : (
              displayValue(item)
            )}
          </li>
        ))}
      </ol>
    );
  }
  return <p className="response-copy">{displayValue(value)}</p>;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const page =
    navigation.find((item) => item.path === location.pathname)?.id ?? "overview";
  const [health, setHealth] = useState<Health>("checking");
  const [orderNumber, setOrderNumber] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [investigation, setInvestigation] = useState<unknown>(null);
  const [agentResults, setAgentResults] = useState<unknown>(null);
  const [workflowResult, setWorkflowResult] = useState<unknown>(null);
  const [workflowSubmitted, setWorkflowSubmitted] = useState(false);
  const [workflowOrder, setWorkflowOrder] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const assistantEndRef = useRef<HTMLDivElement>(null);
  const navigateTo = useCallback(
    (destination: Page) => {
      const route = navigation.find((item) => item.id === destination);
      if (route) navigate(route.path);
      setMobileNavOpen(false);
    },
    [navigate]
  );

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
    let active = true;
    checkHealth()
      .then(() => {
        if (active) setHealth("online");
      })
      .catch(() => {
        if (active) setHealth("offline");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    assistantEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const currentTitle =
    navigation.find((item) => item.id === page)?.label ?? "Overview";

  function addActivity(order: string, action: string) {
    setActivity((current) =>
      [{ order, action, occurredAt: new Date().toISOString() }, ...current].slice(
        0,
        8
      )
    );
  }

  async function runRequest(
    name: string,
    action: () => Promise<unknown>,
    onSuccess: (result: unknown) => void
  ) {
    setLoading(name);
    setError("");
    try {
      const result = await action();
      onSuccess(result);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading("");
    }
  }

  function validateOrder(value: string): string | null {
    const normalized = value.trim().toUpperCase();
    if (!/^ORD-\d{4,}$/.test(normalized)) {
      setError("Enter an order number in the format ORD-1042.");
      return null;
    }
    return normalized;
  }

  function submitInvestigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const order = validateOrder(orderNumber);
    if (!order) return;
    setOrderNumber(order);
    setInvestigation(null);
    setAgentResults(null);
    void runRequest("investigation", () => investigateOrder(order), (result) => {
      setInvestigation(result);
      addActivity(order, "Order investigation");
    });
  }

  function submitAgentRun() {
    const order = validateOrder(orderNumber);
    if (!order) return;
    setOrderNumber(order);
    void runRequest("agents", () => runMultiAgentInvestigation(order), (result) => {
      setAgentResults(result);
      addActivity(order, "Multi-agent investigation");
    });
  }

  function submitWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const order = validateOrder(workflowOrder);
    if (!order) return;
    setWorkflowOrder(order);
    setWorkflowResult(null);
    setWorkflowSubmitted(false);
    void runRequest("workflow", () => createWorkflow(order), (result) => {
      setWorkflowResult(result);
      setWorkflowSubmitted(true);
      addActivity(order, "Workflow proposal request");
    });
  }

  function openInvestigation(value: string) {
    const order = validateOrder(value);
    if (!order) return;
    setOrderNumber(order);
    navigateTo("investigation");
    setError("");
    setInvestigation(null);
    setAgentResults(null);
    void runRequest("investigation", () => investigateOrder(order), (result) => {
      setInvestigation(result);
      addActivity(order, "Order investigation");
    });
  }

  async function submitQuestion(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 3 || loading) return;
    setQuestion("");
    setError("");
    setMessages((current) => [
      ...current,
      { role: "user", content: trimmed, sources: [] },
    ]);
    setLoading("assistant");
    try {
      const result = await askPolicyQuestion(trimmed);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result, sources: sourceNames(result) },
      ]);
    } catch (requestError) {
      setError(readableError(requestError));
      setMessages((current) => current.slice(0, -1));
      setQuestion(trimmed);
    } finally {
      setLoading("");
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitQuestion();
    }
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <NavLink
          className="brand"
          to="/"
          end
          onClick={() => setMobileNavOpen(false)}
          aria-label="EnterpriseOps home"
        >
          <span className="brand-mark"><Icon name="command" size={19} /></span>
          <span className="brand-name">
            <strong>enterpriseops</strong>
            <small>OPERATIONS INTELLIGENCE</small>
          </span>
        </NavLink>

        <div className="workspace-switcher">
          <span className="workspace-avatar">E</span>
          <span className="workspace-copy">
            <strong>Operations workspace</strong>
            <small>Development environment</small>
          </span>
          <Icon name="chevron-right" size={15} />
        </div>

        <div className="nav-section-label">WORKSPACE</div>
        <nav
          id="main-navigation"
          className={`navigation ${mobileNavOpen ? "mobile-open" : ""}`}
          aria-label="Main navigation"
        >
          {navigation.map((item) => {
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.id === "overview"}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                aria-label={item.label}
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => {
                  setMobileNavOpen(false);
                  setError("");
                }}
              >
                <Icon name={item.icon} size={17} />
                <span>{item.label}</span>
                {item.id === "workflows" && (
                  <span className="nav-note">PROPOSALS</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection">
            <span className={`status-dot ${health}`} />
            <span>
              <strong>Python API</strong>
              <small>
                {health === "online"
                  ? "Connected"
                  : health === "offline"
                    ? "Unavailable"
                    : "Checking connection"}
              </small>
            </span>
            <button
              className="quiet-icon"
              onClick={() => void refreshHealth()}
              aria-label="Check API connection"
              title="Check API connection"
            >
              <Icon name="arrow-clockwise" size={14} />
            </button>
          </div>
          <div className="sidebar-legal">EnterpriseOps AI</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="topbar-menu desktop-menu-toggle"
            onClick={() => {
              setSidebarCollapsed((collapsed) => !collapsed);
            }}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-controls="main-navigation"
            aria-expanded={!sidebarCollapsed}
          >
            <Icon name={sidebarCollapsed ? "layout-sidebar" : "layout-sidebar-inset"} size={17} />
          </button>
          <button
            className="topbar-menu mobile-menu-toggle"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-controls="main-navigation"
            aria-expanded={mobileNavOpen}
          >
            <Icon name={mobileNavOpen ? "x-lg" : "list"} size={17} />
          </button>
          <div className="topbar-context">
            <span>Workspace</span>
            <Icon name="chevron-right" size={13} />
            <strong>{currentTitle}</strong>
          </div>
          <div className="topbar-tools">
            <form
              className="top-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                openInvestigation(globalSearch);
              }}
            >
              <Icon name="search" size={16} />
              <input
                aria-label="Search by order number"
                placeholder="Find an order…"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <span className="topbar-divider" />
            <button
              className="topbar-health"
              onClick={() => void refreshHealth()}
              aria-label={`API status: ${health}. Refresh status`}
              title="Refresh API status"
            >
              <span className={`status-dot ${health}`} />
              <span>{health === "online" ? "API connected" : health === "offline" ? "API offline" : "Connecting"}</span>
            </button>
          </div>
        </header>

        <div className="page-content container-fluid">
          {error && (
            <div className="error-banner alert alert-danger" role="alert">
              <Icon name="exclamation-circle" size={17} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <Icon name="x-lg" size={16} />
              </button>
            </div>
          )}

          <Routes>
            <Route path="/" element={(
            <section className="overview-page">
              <div className="page-heading overview-heading">
                <div>
                  <p className="eyebrow">OPERATIONS / OVERVIEW</p>
                  <h1>Good work starts with clarity.</h1>
                  <p className="page-description">
                    Investigate an order, consult operating policy, or prepare a workflow proposal for review.
                  </p>
                </div>
                <button className="btn button-primary" onClick={() => navigateTo("investigation")}>
                  <Icon name="search" size={16} />
                  Investigate an order
                  <Icon name="arrow-right" size={15} />
                </button>
              </div>

              <div className="overview-grid row g-4">
                <section className="overview-main col-lg-8">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">START AN INVESTIGATION</p>
                      <h2>What needs attention?</h2>
                    </div>
                    <span className="section-index">01</span>
                  </div>
                  <p className="section-copy">
                    Look up an order using its business identifier. Results are retrieved from your connected operations services.
                  </p>
                  <form
                    className="order-search-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      openInvestigation(orderNumber);
                    }}
                  >
                    <label htmlFor="overview-order">Order number</label>
                    <div className="input-action-row">
                      <div className="input-wrap">
                        <Icon name="search" size={17} />
                        <input
                          id="overview-order"
                          className="form-control"
                          value={orderNumber}
                          onChange={(event) => setOrderNumber(event.target.value)}
                          placeholder="ORD-1042"
                          autoComplete="off"
                        />
                      </div>
                      <button className="btn button-primary" disabled={loading !== ""}>
                        {loading === "investigation" ? <Icon name="arrow-repeat" className="spin" size={16} /> : <Icon name="arrow-right" size={16} />}
                        Investigate
                      </button>
                    </div>
                  </form>

                  <div className="overview-divider" />
                  <div className="section-heading activity-heading">
                    <div>
                      <p className="eyebrow">THIS SESSION</p>
                      <h2>Recent activity</h2>
                    </div>
                    <span className="section-caption">Only actions completed in this browser session</span>
                  </div>
                  {activity.length === 0 ? (
                    <div className="empty-state compact-empty">
                      <span className="empty-icon"><Icon name="activity" size={17} /></span>
                      <div>
                        <strong>No activity yet</strong>
                        <p>Completed investigations and proposal requests will appear here.</p>
                      </div>
                    </div>
                  ) : (
                    <ul className="activity-list">
                      {activity.map((item, index) => (
                        <li className="activity-row" key={`${item.occurredAt}-${index}`}>
                          <span className="activity-symbol">
                            {item.action.includes("Workflow") ? <Icon name="diagram-3" size={15} /> : <Icon name="search" size={15} />}
                          </span>
                          <span className="activity-detail">
                            <strong>{item.action}</strong>
                            <small><code>{item.order}</code> · {new Date(item.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                          </span>
                          <span className="activity-time">
                            <Icon name="check-lg" size={14} /> Response received
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <aside className="overview-aside col-lg-4">
                  <section className="service-panel">
                    <div className="service-heading">
                      <span className="service-icon"><Icon name="activity" size={17} /></span>
                      <span className="service-kicker">SERVICE STATUS</span>
                    </div>
                    <h2>Connected services</h2>
                    <p>Live health check from the configured API.</p>
                    <div className="service-row">
                      <span className={`status-dot ${health}`} />
                      <span>
                        <strong>Python operations API</strong>
                        <small>{health === "online" ? "Health check succeeded" : health === "offline" ? "Could not reach health endpoint" : "Checking /health"}</small>
                      </span>
                      <button className="quiet-icon" onClick={() => void refreshHealth()} aria-label="Refresh service status">
                        <Icon name="arrow-clockwise" size={14} />
                      </button>
                    </div>
                    <div className="service-footnote">Business data availability depends on the connected services.</div>
                  </section>

                  <section className="capabilities-panel">
                    <p className="eyebrow">AVAILABLE TOOLS</p>
                    <NavLink to="/investigations" onClick={() => setMobileNavOpen(false)}>
                      <span className="tool-icon"><Icon name="search" size={16} /></span>
                      <span><strong>Order investigation</strong><small>Retrieve order context</small></span>
                      <Icon name="arrow-up-right" size={14} />
                    </NavLink>
                    <NavLink to="/assistant" onClick={() => setMobileNavOpen(false)}>
                      <span className="tool-icon"><Icon name="book" size={16} /></span>
                      <span><strong>Policy assistant</strong><small>Ask a policy-grounded question</small></span>
                      <Icon name="arrow-up-right" size={14} />
                    </NavLink>
                    <NavLink to="/workflows" onClick={() => setMobileNavOpen(false)}>
                      <span className="tool-icon"><Icon name="diagram-3" size={16} /></span>
                      <span><strong>Workflow proposal</strong><small>Request a backend proposal</small></span>
                      <Icon name="arrow-up-right" size={14} />
                    </NavLink>
                  </section>
                  <section className="workflow-visibility-panel">
                    <div className="visibility-icon"><Icon name="shield-exclamation" size={16} /></div>
                    <p className="eyebrow">WORKFLOW VISIBILITY</p>
                    <h2>Approval queue not connected</h2>
                    <p>The current API integration has no workflow list, approval queue, or history endpoint. No pending work is inferred.</p>
                    <NavLink to="/workflows" onClick={() => setMobileNavOpen(false)}>
                      View proposal tools <Icon name="arrow-right" size={13} />
                    </NavLink>
                  </section>
                </aside>
              </div>
            </section>
            )} />

            <Route path="/investigations" element={(
            <section className="investigation-page">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ORDERS / INVESTIGATION</p>
                  <h1>Investigate an order</h1>
                  <p className="page-description">Review the response from your order service, then run a coordinated agent analysis when you need more context.</p>
                </div>
              </div>
              <form className="investigation-toolbar" onSubmit={submitInvestigation}>
                <label htmlFor="investigation-order">Order number</label>
                <div className="input-action-row">
                  <div className="input-wrap">
                    <Icon name="search" size={17} />
                    <input
                      className="form-control"
                      id="investigation-order"
                      value={orderNumber}
                      onChange={(event) => setOrderNumber(event.target.value)}
                      placeholder="ORD-1042"
                      autoComplete="off"
                    />
                  </div>
                  <button className="btn button-primary" disabled={loading !== ""}>
                    {loading === "investigation" ? <Icon name="arrow-repeat" className="spin" size={16} /> : <Icon name="search" size={16} />}
                    Run investigation
                  </button>
                </div>
              </form>

              {investigation === null ? (
                <div className="investigation-empty">
                  <span className="empty-icon large"><Icon name="search" size={20} /></span>
                  <h2>Investigation results will appear here</h2>
                  <p>Enter an order number to retrieve its current information from the connected service.</p>
                </div>
              ) : (
                <InvestigationReport
                  order={orderNumber}
                  result={investigation}
                  agents={agentResults}
                  agentLoading={loading === "agents"}
                  onRunAgents={submitAgentRun}
                />
              )}
            </section>
            )} />

            <Route path="/assistant" element={(
            <section className="assistant-page">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">KNOWLEDGE / POLICY ASSISTANT</p>
                  <h1>Ask operations a question.</h1>
                  <p className="page-description">Answers come from the configured policy service. Review any references returned with the answer.</p>
                </div>
              </div>
              <div className="assistant-workspace">
                <div className="conversation-header">
                  <span className="assistant-avatar"><Icon name="robot" size={16} /></span>
                  <div><strong>Operations assistant</strong><small>Policy questions · Connected to your RAG service</small></div>
                  <span className="conversation-mode"><span className={`status-dot ${health}`} /> {health === "online" ? "Service connected" : health === "offline" ? "Service offline" : "Checking"}</span>
                </div>
                <div className="conversation">
                  {messages.length === 0 ? (
                    <div className="conversation-empty">
                      <span className="empty-icon large"><Icon name="chat-square-text" size={20} /></span>
                      <h2>Start with a specific question</h2>
                      <p>Ask about a policy or process. The assistant will use your configured knowledge service.</p>
                      <div className="prompt-suggestions">
                        {[
                          "When should a support ticket be created?",
                          "How should we handle a delayed shipment?",
                        ].map((suggestion) => (
                          <button key={suggestion} onClick={() => setQuestion(suggestion)}>
                            <span>{suggestion}</span><Icon name="arrow-up-right" size={14} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="message-list">
                      {messages.map((message, index) => (
                        <article className={`message-row ${message.role}`} key={`${message.role}-${index}`}>
                          <span className={`message-avatar ${message.role}`}>
                            {message.role === "assistant" ? <Icon name="robot" size={15} /> : <Icon name="person" size={14} />}
                          </span>
                          <div className="message-content">
                            <div className="message-meta">
                              <strong>{message.role === "assistant" ? "Operations assistant" : "You"}</strong>
                            </div>
                            {message.role === "user" ? (
                              <p className="message-text">{displayValue(message.content)}</p>
                            ) : (
                              <>
                                <ResponseTree value={message.content} />
                                {message.sources.length > 0 && (
                                  <div className="message-sources">
                                    <span>REFERENCES</span>
                                    {message.sources.map((source) => <span className="source-tag" key={source}><Icon name="file-earmark-text" size={12} />{source}</span>)}
                                  </div>
                                )}
                                {message.sources.length === 0 && (
                                  <p className="source-disclaimer">No source references were included in this response.</p>
                                )}
                              </>
                            )}
                          </div>
                        </article>
                      ))}
                      {loading === "assistant" && (
                        <div className="assistant-loading" role="status">
                          <Icon name="arrow-repeat" className="spin" size={16} /> Searching policy context…
                        </div>
                      )}
                      <div ref={assistantEndRef} />
                    </div>
                  )}
                </div>
                <form className="composer" onSubmit={(event) => void submitQuestion(event)}>
                  <label className="sr-only" htmlFor="assistant-question">Your question</label>
                  <textarea
                    className="form-control"
                    id="assistant-question"
                    rows={2}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="Ask about a policy or operational process…"
                    disabled={loading === "assistant"}
                  />
                  <div className="composer-footer">
                    <span>Enter to send <span className="key-separator">·</span> Shift + Enter for a new line</span>
                    <button className="btn button-primary send-button" disabled={loading === "assistant" || question.trim().length < 3}>
                      {loading === "assistant" ? <Icon name="arrow-repeat" className="spin" size={15} /> : <Icon name="send" size={15} />}
                      Send question
                    </button>
                  </div>
                </form>
              </div>
            </section>
            )} />

            <Route path="/workflows" element={(
            <section className="workflows-page">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">AUTOMATION / WORKFLOWS</p>
                  <h1>Workflow proposals</h1>
                  <p className="page-description">Prepare a proposal through the API. No business action is taken here.</p>
                </div>
              </div>
              <div className="workflow-layout row g-4">
                <section className="workflow-main col-lg-8">
                  <div className="workflow-status-strip">
                    <span className="workflow-status-icon"><Icon name="shield-check" size={17} /></span>
                    <div>
                      <strong>Human approval remains outside this interface</strong>
                      <p>The connected frontend API can request a proposal. It does not expose approval, rejection, workflow listing, or history operations.</p>
                    </div>
                  </div>
                  <h2>Prepare a workflow proposal</h2>
                  <p className="section-copy">Choose the order that needs follow-up. The backend will return the proposal details it supports.</p>
                  <form className="workflow-form" onSubmit={submitWorkflow}>
                    <label htmlFor="workflow-order">Associated order</label>
                    <div className="input-action-row">
                      <div className="input-wrap">
                        <Icon name="search" size={17} />
                        <input
                          className="form-control"
                          id="workflow-order"
                          value={workflowOrder}
                          onChange={(event) => setWorkflowOrder(event.target.value)}
                          placeholder="ORD-1042"
                          autoComplete="off"
                        />
                      </div>
                      <button className="btn button-primary" disabled={loading !== ""}>
                        {loading === "workflow" ? <Icon name="arrow-repeat" className="spin" size={16} /> : <Icon name="arrow-right" size={16} />}
                        Request proposal
                      </button>
                    </div>
                  </form>
                  {workflowSubmitted && (
                    <WorkflowResponse order={workflowOrder} result={workflowResult} />
                  )}
                  {!workflowSubmitted && (
                    <div className="workflow-empty">
                      <span className="empty-icon"><Icon name="clock" size={17} /></span>
                      <div><strong>No proposal requested in this session</strong><p>A proposal will be shown here only after the backend returns a response.</p></div>
                    </div>
                  )}
                </section>
                <aside className="workflow-aside col-lg-4">
                  <p className="eyebrow">CONTROL BOUNDARY</p>
                  <h2>Proposed is not executed.</h2>
                  <p>Creating a proposal request does not mean a workflow was approved or a ticket was opened. This UI will only show those outcomes if the backend explicitly returns them.</p>
                  <div className="boundary-list">
                    <div><span className="boundary-number">01</span><span><strong>Proposal</strong><small>Supported · POST /ai/create-workflow/{`{orderNumber}`}</small></span></div>
                    <div><span className="boundary-number muted-number">02</span><span><strong>Approval decision</strong><small>Not exposed by the frontend integration</small></span></div>
                    <div><span className="boundary-number muted-number">03</span><span><strong>Workflow history</strong><small>No list or event operation exposed</small></span></div>
                  </div>
                </aside>
              </div>
            </section>
            )} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <footer className="page-footer">
            <span>EnterpriseOps AI</span>
            <span>Connected operations tools · Human-reviewed decisions</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function InvestigationReport({
  order,
  result,
  agents,
  agentLoading,
  onRunAgents,
}: {
  order: string;
  result: unknown;
  agents: unknown;
  agentLoading: boolean;
  onRunAgents: () => void;
}) {
  const references = [...new Set([...sourceNames(result), ...sourceNames(agents)])];
  const summary = collectMatchingValues(result, /summary|conclusion/i).find(
    ({ value }) => value !== null && value !== undefined
  );
  const identified = collectMatchingValues(result, /order.?id|order.?number|severity|priority|status/i);
  const verified = collectMatchingValues(result, /known|confirmed|verified|fact/i);
  const unverified = collectMatchingValues(result, /missing|unverified|inferred|assumption|question|unknown/i);

  return (
    <div className="report-shell">
      <div className="report-heading">
        <div>
          <p className="eyebrow">INVESTIGATION REPORT</p>
          <h2><code>{order}</code></h2>
          <p>Response retrieved from the connected investigation endpoint.</p>
        </div>
        <span className="response-received"><span className="status-dot online" /> RESPONSE RECEIVED</span>
      </div>
      {identified.length > 0 && (
        <div className="report-facts">
          {identified.slice(0, 4).map((item, index) => (
            <div className="report-fact" key={`${item.label}-${index}`}>
              <span>{item.label}</span>
              <strong>{displayValue(item.value)}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="report-content row g-4">
        <div className="report-primary col-lg-8">
          <section className="report-section">
            {summary && (
              <div className="report-summary">
                <p className="eyebrow">AI INVESTIGATION SUMMARY</p>
                {recordOf(summary.value) || Array.isArray(summary.value) ? (
                  <ResponseTree value={summary.value} />
                ) : (
                  <p>{displayValue(summary.value)}</p>
                )}
              </div>
            )}
            <div className="report-section-title"><span className="report-step">01</span><div><span className="eyebrow">BACKEND RESPONSE</span><h3>Investigation findings</h3></div></div>
            <ResponseTree value={result} />
          </section>
          <section className="agent-section">
            <div className="agent-section-heading">
              <div><p className="eyebrow">COORDINATED ANALYSIS</p><h3>Multi-agent findings</h3></div>
              {agents === null && (
                <button className="btn button-secondary" onClick={onRunAgents} disabled={agentLoading}>
                  {agentLoading ? <Icon name="arrow-repeat" className="spin" size={15} /> : <Icon name="robot" size={15} />}
                  Run agent analysis
                </button>
              )}
            </div>
            {agents === null ? (
              <p className="muted-inline">Agent results are not requested automatically. Run the existing multi-agent endpoint when additional analysis is useful.</p>
            ) : (
              <MultiAgentResults value={agents} />
            )}
          </section>
        </div>
        <aside className="report-context col-lg-4">
          <section className="context-section">
            <div className="context-heading"><Icon name="book" size={16} /><h3>Policy &amp; source evidence</h3></div>
            {references.length > 0 ? (
              <ul className="reference-list">{references.map((reference) => <li key={reference}><Icon name="file-earmark-text" size={14} /><span>{reference}</span></li>)}</ul>
            ) : (
              <p className="context-empty">No source or policy references were included in this response.</p>
            )}
          </section>
          <section className="context-section">
            <div className="context-heading"><Icon name="shield-check" size={16} /><h3>Confidence boundaries</h3></div>
            {verified.length > 0 && (
              <div className="boundary-group"><span className="boundary-label confirmed">RETURNED AS CONFIRMED</span>{verified.slice(0, 4).map((item, index) => <p key={`${item.label}-${index}`}><strong>{item.label}</strong> {displayValue(item.value)}</p>)}</div>
            )}
            {unverified.length > 0 && (
              <div className="boundary-group"><span className="boundary-label unverified">UNRESOLVED / INFERRED</span>{unverified.slice(0, 4).map((item, index) => <p key={`${item.label}-${index}`}><strong>{item.label}</strong> {displayValue(item.value)}</p>)}</div>
            )}
            {verified.length === 0 && unverified.length === 0 && (
              <p className="context-empty">The response does not identify which fields are confirmed or inferred. Review the returned fields directly.</p>
            )}
          </section>
          <section className="context-note">
            <Icon name="exclamation-circle" size={15} /><p>Only information returned by the backend is shown. No order facts or policy evidence have been added by the interface.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MultiAgentResults({ value }: { value: unknown }) {
  const resultGroups = [
    { name: "Investigator", pattern: /investigator/i },
    { name: "Policy", pattern: /policy/i },
    { name: "Triage", pattern: /triage/i },
  ].flatMap(({ name, pattern }) => {
    const entries = collectMatchingValues(value, pattern);
    return entries.length > 0 ? [{ name, entries }] : [];
  });

  if (resultGroups.length === 0) {
    return <ResponseTree value={value} />;
  }

  return (
    <>
      <div className="agent-result-groups">
        {resultGroups.map(({ name, entries }) => (
          <section className="agent-result-card" key={name}>
            <h4>{name} results</h4>
            {entries.map((entry, index) => (
              <div className="agent-result-entry" key={`${entry.label}-${index}`}>
                <h5>{formatLabel(entry.label)}</h5>
                <ResponseTree value={entry.value} />
              </div>
            ))}
          </section>
        ))}
      </div>
      <details className="agent-raw-response">
        <summary>View complete multi-agent response</summary>
        <ResponseTree value={value} />
      </details>
    </>
  );
}

function WorkflowResponse({ order, result }: { order: string; result: unknown }) {
  const status = collectMatchingValues(result, /status|state|approval|approved|rejected/i);
  const ticket = collectMatchingValues(result, /ticket.?id|ticket.?number|case.?id/i);
  const approved = status.some(
    ({ label, value }) =>
      /^(approved|accepted)$/i.test(displayValue(value)) ||
      (/approval|approved/i.test(label) && value === true)
  );
  const rejected = status.some(
    ({ label, value }) =>
      /^(rejected|declined)$/i.test(displayValue(value)) ||
      (/rejected/i.test(label) && value === true)
  );

  return (
    <section className="workflow-response">
      <div className="workflow-response-heading">
        <div>
          <p className="eyebrow">BACKEND RESPONSE</p>
          <h3>Proposal response</h3>
        </div>
        <span className={`workflow-result-tag ${approved ? "confirmed" : rejected ? "rejected" : "pending"}`}>
          <span className="status-dot" />
          {approved ? "APPROVAL RETURNED" : rejected ? "REJECTION RETURNED" : "NO DECISION CONFIRMED"}
        </span>
      </div>
      <div className="workflow-associated-order">Associated order <code>{order}</code></div>
      <ResponseTree value={result} />
      {ticket.length > 0 && <div className="ticket-confirmation"><Icon name="check-lg" size={15} /><span>Backend returned a ticket reference:</span><strong>{ticket.map(({ value }) => displayValue(value)).join(", ")}</strong></div>}
      {!approved && !rejected && ticket.length === 0 && (
        <p className="workflow-honesty"><Icon name="arrow-return-left" size={14} /> This response does not confirm an approval decision or ticket reference.</p>
      )}
    </section>
  );
}

export default App;
