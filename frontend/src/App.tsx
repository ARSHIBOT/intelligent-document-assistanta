import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from "react";
import {
  askQuestion,
  deleteDocument,
  getDocuments,
  uploadDocuments,
  type Document,
  type Source,
} from "./services/api";
import "./App.css";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function refreshDocuments() {
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch {
      setError("Could not connect to the backend. Check that FastAPI is running.");
    }
  }

  useEffect(() => {
    void refreshDocuments();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const invalidFiles = files.filter(
      (file) => file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
    );

    if (invalidFiles.length) {
      setError("Please select PDF files only.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError("");

    try {
      await uploadDocuments(files);
      await refreshDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleDelete(documentId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document?"
    );
    if (!confirmed) return;

    setError("");

    try {
      await deleteDocument(documentId);
      await refreshDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document deletion failed.");
    }
  }

  async function handleAsk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    if (documents.length === 0) {
      setError("Upload a PDF before asking questions.");
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((previous) => [...previous, userMessage]);
    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const result = await askQuestion(trimmedQuestion);

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate an answer.");
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    setMessages([]);
    setQuestion("");
    setError("");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">D</div>
          <div>
            <h1>DocuMind</h1>
            <span>AI RESEARCH ASSISTANT</span>
          </div>
        </div>

        <button className="new-chat-button" onClick={startNewChat}>
          <span>＋</span> New conversation
        </button>

        <div className="sidebar-section">
          <div className="section-heading">
            <span>YOUR LIBRARY</span>
            <span className="document-count">{documents.length}</span>
          </div>

          <button
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <span>↑</span>
            {uploading ? "Uploading..." : "Upload PDF"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            hidden
            onChange={handleUpload}
          />

          <div className="document-list">
            {documents.length === 0 ? (
              <div className="empty-library">
                <span className="empty-icon">▤</span>
                <p>No documents yet</p>
                <span>Upload a PDF to get started.</span>
              </div>
            ) : (
              documents.map((document) => (
                <div className="document-item" key={document.document_id}>
                  <div className="pdf-icon">PDF</div>
                  <div className="document-info">
                    <span className="document-name" title={document.filename}>
                      {document.filename}
                    </span>
                    <span className="document-meta">
                      {document.chunks_count} text chunks
                    </span>
                  </div>
                  <button
                    className="delete-button"
                    title={`Delete ${document.filename}`}
                    aria-label={`Delete ${document.filename}`}
                    onClick={() => handleDelete(document.document_id)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="status-dot" />
          <span>AI engine connected</span>
          <span className="version-label">v1.0</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="breadcrumb">WORKSPACE</span>
            <span className="breadcrumb-divider">/</span>
            <span className="breadcrumb-current">Research assistant</span>
          </div>
          <div className="topbar-right">
            <span className="secure-label">✦ Document-grounded AI</span>
          </div>
        </header>

        <section className="workspace">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-eyebrow">
                <span className="welcome-sparkle">✳</span>
                YOUR PERSONAL RESEARCH SPACE
              </div>

              <h2>
                Understand your
                <br />
                documents <em>better.</em>
              </h2>

              <p className="welcome-description">
                Upload your PDFs, ask meaningful questions, and discover
                insights from your documents with AI-powered research.
              </p>

              <div className="welcome-stats">
                <div>
                  <strong>{documents.length.toString().padStart(2, "0")}</strong>
                  <span>DOCUMENTS</span>
                </div>
                <div className="stat-divider" />
                <div>
                  <strong>
                    {documents.reduce(
                      (total, document) => total + document.chunks_count,
                      0
                    ).toString().padStart(2, "0")}
                  </strong>
                  <span>TEXT CHUNKS</span>
                </div>
                <div className="stat-divider" />
                <div>
                  <strong>AI</strong>
                  <span>POWERED SEARCH</span>
                </div>
              </div>

              <div className="suggestion-heading">TRY ASKING SOMETHING</div>

              <div className="suggestion-grid">
                {[
                  "Summarize my uploaded documents",
                  "What are the key skills mentioned?",
                  "Find the most important information",
                ].map((suggestion) => (
                  <button
                    className="suggestion-card"
                    key={suggestion}
                    onClick={() => setQuestion(suggestion)}
                    disabled={documents.length === 0}
                  >
                    <span>↗</span>
                    {suggestion}
                  </button>
                ))}
              </div>

              {documents.length === 0 && (
                <p className="upload-hint">
                  Start by uploading a PDF from the left sidebar.
                </p>
              )}
            </div>
          ) : (
            <div className="chat-container">
              <div className="chat-heading">
                <div>
                  <span className="breadcrumb">CONVERSATION</span>
                  <h2>Document research</h2>
                </div>
                <button className="clear-chat-button" onClick={startNewChat}>
                  ↺ New chat
                </button>
              </div>

              <div className="messages">
                {messages.map((message) => (
                  <article className={`message ${message.role}`} key={message.id}>
                    <div className="message-avatar">
                      {message.role === "user" ? "Y" : "D"}
                    </div>
                    <div className="message-body">
                      <div className="message-author">
                        {message.role === "user" ? "You" : "DocuMind"}
                        {message.role === "assistant" && (
                          <span className="ai-label">AI RESPONSE</span>
                        )}
                      </div>
                      <div className="markdown-content">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>

                      {message.sources && message.sources.length > 0 && (
                        <div className="sources">
                          <span className="sources-title">
                            REFERENCED SOURCES
                          </span>
                          {message.sources.map((source, index) => (
                            <div className="source-item" key={`${source.filename}-${source.page_number}-${index}`}>
                              <span className="source-file-icon">PDF</span>
                              <span>{source.filename}</span>
                              <span className="source-page">
                                Page {source.page_number}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}

                {loading && (
                  <div className="thinking-indicator">
                    <div className="thinking-dots"><span /><span /><span /></div>
                    <span>Researching your documents...</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>
          )}

          {error && (
            <div className="error-message" role="alert">
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}

          <div className="composer-area">
            <form className="composer" onSubmit={handleAsk}>
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask anything about your documents..."
                disabled={loading}
                maxLength={1000}
              />
              <span className="composer-hint">↵</span>
              <button
                type="submit"
                disabled={!question.trim() || loading || documents.length === 0}
                aria-label="Send question"
              >
                ↑
              </button>
            </form>
            <p className="composer-disclaimer">
              AI-generated answers are based on retrieved document content.
              Always verify important information against the original PDF.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
