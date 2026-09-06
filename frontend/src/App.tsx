import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  canonicalJson,
  config,
  closeWalletChooser,
  currentChainName,
  disconnectWallet,
  expectedChainId,
  getWalletSession,
  getWalletState,
  openWalletChooser,
  reconcileJournalRecord,
  readView,
  subscribeWalletSession,
  selectWallet,
  switchToConfiguredNetwork,
  WriteRequest,
  writeAndVerify,
} from "./contract";
import { archiveJournalRecord, JournalRecord, rebuildJournalIndex, serializeJournalRecord } from "./pending";
import { isPendingPhase, PROGRESS_COPY, WriteProgress } from "./progress";
import {
  defaultMappingRow,
  initialMappingRows,
  isTargetAvailable,
  MAX_MAPPING_ROWS,
  MappingRow,
  nextUnmappedOldId,
} from "./mapping";
import { chainMatches } from "./network";
import "./styles.css";

type FieldType = "TEXT" | "INT" | "BOOL" | "ENUM";
type Field = { id: string; type: FieldType; required: boolean; meaning: string; values: string[] };
type DefaultRow = { new_id: string; value: string };

const blankField = (id: string): Field => ({ id, type: "TEXT", required: true, meaning: "same declared meaning", values: [] });
const initialOld: Field[] = [blankField("name")];
const initialNew: Field[] = [blankField("name")];

function parseJson(text: string, label: string): any {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}_JSON_INVALID`);
  }
}

function recordPhase(record: Record<string, any> | null): string {
  return record?.phase ?? "None";
}

function TransactionProgress({ progress, onReconcile }: { progress: WriteProgress; onReconcile: () => void }) {
  const [copyState, setCopyState] = useState("");
  if (progress.phase === "IDLE") return null;
  const copy = PROGRESS_COPY[progress.phase];
  const pending = isPendingPhase(progress.phase);
  const phaseClass = pending ? "is-pending" : `is-${progress.phase.toLowerCase()}`;

  async function copyHash() {
    if (!progress.hash || !navigator.clipboard) {
      setCopyState("Clipboard unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText(progress.hash);
      setCopyState("Copied");
    } catch {
      setCopyState("Copy failed");
    }
  }

  return (
    <section className={`transaction-progress ${phaseClass}`} data-transaction-phase={progress.phase} aria-live="polite" aria-atomic="true">
      <div className="transaction-progress__heading">
        {pending && <span className="transaction-progress__spinner" aria-hidden="true" />}
        <strong>{copy.title}</strong>
        <span className="transaction-progress__phase">{progress.phase}</span>
      </div>
      <p>{progress.message || copy.detail}</p>
      {progress.hash && (
        <div className="transaction-progress__hash">
          <code>{progress.hash}</code>
          <button type="button" className="quiet-button" onClick={copyHash}>Copy hash</button>
          {copyState && <span className="muted">{copyState}</span>}
        </div>
      )}
      {progress.phase === "RECONCILIATION_REQUIRED" && (
        <p className="transaction-progress__warning">Do not submit this operation again until the retained hash and journal record are reconciled.</p>
      )}
      {progress.phase === "RECONCILIATION_REQUIRED" && (
        <button type="button" className="quiet-button" onClick={onReconcile}>Rebuild local journal</button>
      )}
    </section>
  );
}

function SchemaTable({ title, fields, setFields }: { title: string; fields: Field[]; setFields: (fields: Field[]) => void }) {
  const update = (index: number, patch: Partial<Field>) => {
    setFields(fields.map((field, item) => item === index ? { ...field, ...patch } : field));
  };
  return (
    <section className="table-card" aria-labelledby={`${title}-heading`}>
      <div className="section-heading">
        <h3 id={`${title}-heading`}>{title}</h3>
        <button type="button" className="quiet-button" onClick={() => setFields([...fields, blankField(`field_${fields.length + 1}`)])}>Add field</button>
      </div>
      <div className="scroll-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Required</th>
              <th>Meaning</th>
              <th>ENUM values</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={`${title}-${index}`}>
                <td>
                  <input
                    value={field.id}
                    onChange={(event) => update(index, { id: event.target.value })}
                    aria-label={`${title} field ${index + 1} ID`}
                  />
                </td>
                <td>
                  <select
                    value={field.type}
                    aria-label={`${title} field ${index + 1} type`}
                    onChange={(event) => update(index, { type: event.target.value as FieldType, values: event.target.value === "ENUM" ? field.values : [] })}
                  >
                    {(["TEXT", "INT", "BOOL", "ENUM"] as FieldType[]).map((type) => <option key={type}>{type}</option>)}
                  </select>
                </td>
                <td>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) => update(index, { required: event.target.checked })}
                      aria-label={`${title} field ${index + 1} required`}
                    />
                    yes
                  </label>
                </td>
                <td>
                  <input
                    value={field.meaning}
                    onChange={(event) => update(index, { meaning: event.target.value })}
                    aria-label={`${title} field ${index + 1} meaning`}
                  />
                </td>
                <td>
                  <input
                    disabled={field.type !== "ENUM"}
                    value={field.values.join(",")}
                    onChange={(event) => update(index, { values: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                    placeholder="A,B"
                    aria-label={`${title} field ${index + 1} ENUM values`}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={fields.length === 1}
                    onClick={() => setFields(fields.filter((_field, item) => item !== index))}
                    aria-label={`Remove ${title} field ${index + 1}`}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function App() {
  const connection = useSyncExternalStore(subscribeWalletSession, getWalletSession, getWalletSession);
  const wallet = useSyncExternalStore(subscribeWalletSession, getWalletState, getWalletState);
  const [oldFields, setOldFields] = useState(initialOld);
  const [newFields, setNewFields] = useState(initialNew);
  const [mappingRows, setMappingRows] = useState<MappingRow[]>(() => initialMappingRows(["name"], ["name"]));
  const [defaults, setDefaults] = useState<DefaultRow[]>([]);
  const [nonce, setNonce] = useState(cryptoRandomNonce());
  const [mapper, setMapper] = useState("");
  const [caseId, setCaseId] = useState("");
  const [caseRecord, setCaseRecord] = useState<Record<string, any> | null>(null);
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready. No chain read is made until you choose an action.");
  const [error, setError] = useState("");
  const [journalReady, setJournalReady] = useState(false);
  const [journal, setJournal] = useState<JournalRecord[]>([]);
  const [journalReadbacks, setJournalReadbacks] = useState<Record<string, string>>({});
  const [journalExported, setJournalExported] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<WriteProgress>({ phase: "IDLE" });
  const writeAbortRef = useRef<AbortController | null>(null);
  const walletTriggerRef = useRef<HTMLButtonElement | null>(null);
  const walletDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void rebuildJournalIndex()
      .then((records) => {
        setJournal(records);
        setJournalReady(true);
      })
      .catch((caught) => {
        setJournalReady(false);
        setMessage("Journal lock unavailable; signing is disabled. Retained entries could not be loaded.");
        setError(String(caught));
      });
  }, []);

  useEffect(() => () => writeAbortRef.current?.abort(), []);

  const basePayload = useMemo(() => ({ old: oldFields, new: newFields }), [oldFields, newFields]);
  const responsePayload = useMemo(() => ({ mapping: mappingRows, defaults }), [mappingRows, defaults]);
  const sessionKey = `${connection?.account ?? ""}:${connection?.chainId ?? ""}`;
  const previousSessionKey = useRef(sessionKey);
  useEffect(() => {
    if (previousSessionKey.current !== sessionKey) writeAbortRef.current?.abort();
    previousSessionKey.current = sessionKey;
  }, [sessionKey]);
  const onCorrectChain = Boolean(connection && chainMatches(connection.expectedChainId, connection.chainId));
  const canWrite = connection?.canWrite === true;
  const account = connection?.account ?? null;

  useEffect(() => {
    if (account && !mapper) setMapper(account);
  }, [account, mapper]);

  function resetNotice() { setError(""); setMessage(""); }

  async function showWalletChooser() {
    resetNotice();
    await openWalletChooser();
  }

  async function chooseWallet(walletId: string) {
    resetNotice();
    try {
      const next = await selectWallet(walletId);
      setMessage(chainMatches(next.expectedChainId, next.chainId) ? "Wallet connected on the configured network." : "Wallet connected on the wrong network. Switch before writing.");
    } catch { /* The canonical wallet store owns the public connection error. */ }
  }

  const chooserOpen = ["DISCOVERING", "CHOOSER_OPEN", "CONNECTING", "ERROR"].includes(wallet.phase) && !wallet.session;
  useEffect(() => {
    if (!chooserOpen) return;
    const frame = requestAnimationFrame(() => walletDialogRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [chooserOpen]);

  function closeChooser() {
    if (wallet.phase === "CONNECTING") return;
    closeWalletChooser();
    requestAnimationFrame(() => walletTriggerRef.current?.focus());
  }

  function trapWalletFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && wallet.phase !== "CONNECTING") { event.preventDefault(); closeChooser(); return; }
    if (event.key !== "Tab") return;
    const nodes = Array.from(walletDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  async function switchNetwork() {
    resetNotice();
    try {
      const chainId = await switchToConfiguredNetwork();
      setMessage(`Connected to the configured network (${chainId}).`);
    } catch (caught) { setError(String(caught)); }
  }

  async function loadCases() {
    resetNotice();
    try {
      const page = JSON.parse(await readView("list_cases", [1n, 4n])) as { ids: string[] };
      setCaseIds(page.ids);
      setMessage(`Loaded ${page.ids.length} case ID(s). Select one for the explicit detail read.`);
    } catch (caught) { setError(String(caught)); }
  }

  async function openCase(id: string) {
    resetNotice();
    try {
      const encoded = await readView("get_case", [BigInt(id)]);
      if (encoded === "null") throw new Error("CASE_NOT_FOUND");
      const record = JSON.parse(encoded) as Record<string, any>;
      setCaseId(id);
      setCaseRecord(record);
      if (record.base) {
        setOldFields(record.base.old);
        setNewFields(record.base.new);
      }
      setMappingRows(initialMappingRows(
        record.base?.old?.map((field: Field) => field.id) ?? [],
        record.base?.new?.map((field: Field) => field.id) ?? [],
        Array.isArray(record.response?.mapping) ? record.response.mapping : [],
      ));
      if (record.response?.defaults) setDefaults(record.response.defaults);
      setMessage(`Case ${id} loaded from one explicit detail read.`);
    } catch (caught) { setError(String(caught)); }
  }

  function expectedRevision(): string {
    return caseRecord ? String(caseRecord.revision) : "0";
  }

  async function run(request: WriteRequest) {
    resetNotice();
    if (!journalReady) { setError("Journal lock unavailable; signing is disabled."); return; }
    setProgress({ phase: "IDLE" });
    setBusy(true);
    const controller = new AbortController();
    writeAbortRef.current = controller;
    try {
      const result = await writeAndVerify(request, setProgress, { signal: controller.signal });
      setCaseId(result.caseId);
      const record = JSON.parse(result.encoded) as Record<string, any>;
      setCaseRecord(record);
      if (request.method === "create_schema_case" || request.method === "replace_schemas") {
        setMappingRows(initialMappingRows(
          record.base?.old?.map((field: Field) => field.id) ?? [],
          record.base?.new?.map((field: Field) => field.id) ?? [],
        ));
        setDefaults([]);
      }
      setMessage(`${request.method}: VERIFIED from exact historical readback at revision ${record.revision}.`);
    } catch (caught) { setError(String(caught)); }
    finally {
      if (writeAbortRef.current === controller) writeAbortRef.current = null;
      setBusy(false);
    }
  }

  async function reconcileJournal() {
    try {
      const records = await rebuildJournalIndex();
      const reconciled: JournalRecord[] = [];
      const readbacks: Record<string, string> = {};
      for (const record of records) {
        const result = await reconcileJournalRecord(record);
        reconciled.push(result.record);
        if (result.readback !== null) readbacks[result.record.reservation] = result.readback;
      }
      setJournal(reconciled);
      setJournalReadbacks(readbacks);
      setJournalReady(true);
      setMessage("Retained journal reconciled against finalized status and authoritative historical readback; no transaction was resubmitted.");
    } catch (caught) {
      setJournalReady(false);
      setError(String(caught));
    }
  }

  function exportJournal(record: JournalRecord) {
    const blob = new Blob([serializeJournalRecord(record)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `genlayer-journal-${record.reservation}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setJournalExported((current) => ({ ...current, [record.reservation]: true }));
    setMessage(`Journal record ${record.reservation} exported. It may now be archived if its status is VERIFIED or FINALIZED_ERROR.`);
  }

  async function archiveExportedJournal(record: JournalRecord) {
    try {
      await archiveJournalRecord(record.reservation, journalExported[record.reservation] === true);
      setJournal((current) => current.filter((item) => item.reservation !== record.reservation));
      setMessage(`Journal record ${record.reservation} archived after export.`);
    } catch (caught) { setError(String(caught)); }
  }

  function baseRequest(): WriteRequest {
    const revision = expectedRevision();
    return {
      method: "replace_schemas",
      args: [BigInt(caseId), JSON.stringify(basePayload), BigInt(revision)],
      argsForHash: [caseId, basePayload, revision],
      intent: `replace_schemas:${caseId}:${revision}`,
      preRevision: revision,
      preHash: canonicalJson(caseRecord),
      caseId,
      verify: (record) => record.phase === "BASE_DRAFT" && record.base?.old && record.base?.new,
    };
  }

  function caseRequest(method: string, postcondition: (record: Record<string, any>) => boolean): WriteRequest {
    const revision = expectedRevision();
    return {
      method,
      args: [BigInt(caseId), BigInt(revision)],
      argsForHash: [caseId, revision],
      intent: `${method}:${caseId}:${revision}`,
      preRevision: revision,
      preHash: canonicalJson(caseRecord),
      caseId,
      verify: postcondition,
    };
  }

  function putRequest(): WriteRequest {
    const revision = expectedRevision();
    return {
      method: "put_mapping",
      args: [BigInt(caseId), JSON.stringify(responsePayload), BigInt(revision)],
      argsForHash: [caseId, responsePayload, revision],
      intent: `put_mapping:${caseId}:${revision}`,
      preRevision: revision,
      preHash: canonicalJson(caseRecord),
      caseId,
      verify: (record) => record.phase === "RESPONSE_DRAFT" && record.response?.mapping,
    };
  }

  function addMappingRow() {
    const oldId = nextUnmappedOldId(oldFields.map((field) => field.id), mappingRows);
    if (!oldId) {
      setError("Each old field already has a mapping row.");
      return;
    }
    setMappingRows([...mappingRows, defaultMappingRow(oldId, newFields.map((field) => field.id))]);
  }

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main workstation</a>
      <main className="app-shell" id="main-content" inert={chooserOpen ? true : undefined}>
        <header className="header-row">
          <div className="brand-unit">
            <div className="brand-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h4v6H4z" />
                <path d="M16 4h4v6h-4z" />
                <path d="M6 10v3l4 3" />
                <path d="M18 10v3l-4 3" />
                <path d="M9 19l2 2 4-4" />
              </svg>
            </div>
            <div>
              <span className="brand-label">GenLayer Evidence Workstation</span>
              <p className="eyebrow">C3 · Public Evidence Gate</p>
            </div>
          </div>
          <div className="wallet-header" id="wallet">
            {connection ? (
              <>
                <div className={`wallet-identity ${onCorrectChain ? "good" : "warn"}`}>
                  <span className="status-dot" />
                  <span><strong>{connection.wallet.name}</strong><small>{`${connection.account.slice(0, 6)}…${connection.account.slice(-4)}`} · {onCorrectChain ? currentChainName() : "Wrong network"}</small></span>
                </div>
                {!onCorrectChain && <button type="button" onClick={switchNetwork}>Switch network</button>}
                <button type="button" className="quiet-button" onClick={() => { disconnectWallet(); setMessage("Wallet disconnected."); }}>Disconnect</button>
              </>
            ) : (
              <button ref={walletTriggerRef} type="button" className="wallet-connect" onClick={() => void showWalletChooser()}>
                <span className="status-dot" /> Connect wallet
              </button>
            )}
          </div>
        </header>

        <section className="hero" id="overview">
          <div>
            <h1>Schema migration loss gate</h1>
            <p className="lede">
              Deterministic information preservation verification for declared schema transitions, evaluated by GenLayer leader-validator consensus against a deterministic truth table before storing the outcome on-chain.
            </p>
          </div>
        </section>

        <section className="notice warning" role="region" aria-label="Public data disclosure">
          <strong>Public-data warning</strong>
          <span>All submitted text will be public and permanent. Do not include private information, credentials or personal records.</span>
        </section>
        <p className="scope-copy">Assessment of this exact submitted material only; not verification of external facts.</p>

        <nav className="nav-anchor-bar" aria-label="Section shortcuts">
          <span>Jump to:</span>
          <a href="#wallet" className="nav-anchor-link">Wallet</a>
          <a href="#how-it-works" className="nav-anchor-link">How It Works</a>
          <a href="#create-case" className="nav-anchor-link">1. Create Case</a>
          <a href="#existing-cases" className="nav-anchor-link">2. Existing Cases</a>
          <a href="#recovery-journal" className="nav-anchor-link">Recovery Journal</a>
        </nav>

        <section className="panel docs-panel" id="how-it-works" aria-labelledby="docs-heading">
          <div className="section-heading">
            <div>
              <h2 id="docs-heading">Workstation guide & how it works</h2>
              <p className="muted">Public evidence lifecycle, actor responsibilities, and deterministic evaluation rules</p>
            </div>
            <span className="actor-badge evaluator">Independent Consensus</span>
          </div>

          <div className="docs-grid">
            <article className="docs-card">
              <h3>1. Core Evaluation Question</h3>
              <p>
                Does an explicit mapping from a declared Old Schema to a declared New Schema preserve all existing information? GenLayer intelligent contract execution coordinates leader-validator consensus to evaluate the frozen mapping against an immutable truth table before storing the outcome on-chain.
              </p>
            </article>

            <article className="docs-card">
              <h3>2. Legible Public Actors</h3>
              <p>
                <strong>Schema Owner:</strong> Declares, edits, and locks the Old and New schema definitions.<br />
                <strong>Mapper:</strong> Supplies transformation rules (IDENTITY, RENAME, CAST, DROP) and defaults.<br />
                <strong>Evaluator:</strong> Triggers GenLayer consensus evaluation or retries after cooldown.
              </p>
            </article>

            <article className="docs-card">
              <h3>3. Case Lifecycle & Revisions</h3>
              <p>
                <strong>BASE_DRAFT:</strong> Schema Owner drafts Old and New fields.<br />
                <strong>BASE_LOCKED:</strong> Schemas are sealed; mapper provides field transformations.<br />
                <strong>RESPONSE_DRAFT:</strong> Mapping rows and defaults are drafted.<br />
                <strong>FROZEN:</strong> Sealed mapping ready for consensus evaluation.
              </p>
            </article>
          </div>

          <div className="docs-table-wrapper">
            <table className="docs-rule-table">
              <thead>
                <tr>
                  <th>Transform Type</th>
                  <th>Requirements for Preservation</th>
                  <th>Default Preservation Outcome</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>IDENTITY</code></td>
                  <td>Identical ID, identical type. ENUM new values must be a superset of old values.</td>
                  <td><span className="docs-badge lossless">LOSSLESS</span> if types and ENUMs align</td>
                </tr>
                <tr>
                  <td><code>RENAME</code></td>
                  <td>Distinct new ID, identical type. ENUM new values must be a superset of old values.</td>
                  <td><span className="docs-badge lossless">LOSSLESS</span> if types and ENUMs align</td>
                </tr>
                <tr>
                  <td><code>CAST</code></td>
                  <td>Allowed only for ENUM to TEXT, ENUM to ENUM superset, or identical types.</td>
                  <td><span className="docs-badge loss">LOSS_FOUND</span> on invalid cast</td>
                </tr>
                <tr>
                  <td><code>DROP</code></td>
                  <td>Discards the old field. Permitted only with SKIP_DROP semantic tag.</td>
                  <td><span className="docs-badge loss">LOSS_FOUND</span> unconditionally</td>
                </tr>
                <tr>
                  <td><code>DEFAULTS</code></td>
                  <td>Applies only to unmapped required new fields. Cannot restore dropped old fields.</td>
                  <td>Required if new field has no mapping</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel journal-panel" id="recovery-journal" aria-labelledby="journal-heading">
          <div className="section-heading">
            <div>
              <h2 id="journal-heading">Recovery journal</h2>
              <p className="muted">Read-only retained transaction context. Export a record before archiving it.</p>
            </div>
            <button type="button" className="quiet-button" onClick={() => void reconcileJournal()}>Reconcile stored context</button>
          </div>
          {journal.length === 0 ? (
            <p className="muted">No retained transaction records.</p>
          ) : (
            <div className="journal-list">
              {journal.map((record) => (
                <article className="journal-entry" data-journal-reservation={record.reservation} key={record.reservation}>
                  <div className="detail-header">
                    <div>
                      <p className="eyebrow">{record.method}</p>
                      <h3>{record.status}</h3>
                    </div>
                    <code>{record.tx_hash || "No transaction hash"}</code>
                  </div>
                  {record.status === "QUARANTINED" && (
                    <p className="journal-quarantine">
                      Stored chain or contract differs from this runtime. This record is preserved for export and must be reconciled in its original environment.
                    </p>
                  )}
                  <dl className="facts journal-facts">
                    <div><dt>Chain</dt><dd>{record.chain}</dd></div>
                    <div><dt>Contract</dt><dd>{record.contract}</dd></div>
                    <div><dt>Account</dt><dd>{record.account}</dd></div>
                    <div><dt>Intent</dt><dd>{record.intent}</dd></div>
                    <div><dt>Pre revision</dt><dd>{record.pre_revision}</dd></div>
                    <div><dt>Pre-state hash</dt><dd>{record.pre_hash}</dd></div>
                  </dl>
                  <details>
                    <summary>Stored arguments</summary>
                    <pre className="record-view">{record.args_json}</pre>
                  </details>
                  {journalReadbacks[record.reservation] && (
                    <details open>
                      <summary>Authoritative readback</summary>
                      <pre className="record-view">{journalReadbacks[record.reservation]}</pre>
                    </details>
                  )}
                  <div className="toolbar journal-actions">
                    <button type="button" className="quiet-button" onClick={() => exportJournal(record)}>Export JSON</button>
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={() => void reconcileJournalRecord(record).then((result) => {
                        setJournal((current) => current.map((item) => item.reservation === result.record.reservation ? result.record : item));
                        if (result.readback !== null) setJournalReadbacks((current) => ({ ...current, [result.record.reservation]: result.readback as string }));
                        setMessage(result.detail);
                      }).catch((caught) => setError(String(caught)))}
                    >
                      Reconcile record
                    </button>
                    <button
                      type="button"
                      className="quiet-button"
                      disabled={!journalExported[record.reservation] || !["VERIFIED", "FINALIZED_ERROR"].includes(record.status)}
                      onClick={() => void archiveExportedJournal(record)}
                    >
                      Archive after export
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel" id="create-case" aria-labelledby="create-heading">
          <div className="section-heading">
            <div>
              <h2 id="create-heading">1. Create schema case</h2>
              <p className="muted">Primary owns the schemas · mapper supplies the mapping</p>
            </div>
            <span className="actor-badge owner">Schema Owner</span>
          </div>
          <div className="form-grid compact">
            <label>Creator nonce<input value={nonce} onChange={(event) => setNonce(event.target.value)} maxLength={32} /></label>
            <label>Mapper address<input value={mapper} onChange={(event) => setMapper(event.target.value)} placeholder="0x…" /></label>
          </div>
          <div className="schema-grid">
            <SchemaTable title="old" fields={oldFields} setFields={setOldFields} />
            <SchemaTable title="new" fields={newFields} setFields={setNewFields} />
          </div>
          <button
            type="button"
            onClick={() => run({
              method: "create_schema_case",
              args: [nonce, mapper.trim(), JSON.stringify(basePayload), 0n],
              argsForHash: [nonce, mapper.trim().toLowerCase(), basePayload, "0"],
              intent: `create:${(account ?? "").toLowerCase()}:${nonce}`,
              preRevision: "0",
              preHash: "null",
              creator: account ?? "",
              nonce,
              verify: (record) => record.phase === "BASE_DRAFT" && record.revision === "1",
            })}
            disabled={busy || !journalReady || !account || !canWrite || !config.contractAddress}
          >
            Create case
          </button>
        </section>

        <section className="panel" id="existing-cases" aria-labelledby="cases-heading">
          <div className="section-heading">
            <div>
              <h2 id="cases-heading">2. Existing cases</h2>
              <p className="muted">Inspect, configure, and evaluate frozen migration cases</p>
            </div>
            <div className="toolbar">
              <span className="actor-badge mapper">Mapper & Evaluator</span>
              <button type="button" className="quiet-button" onClick={loadCases}>Load IDs</button>
            </div>
          </div>
          <div className="case-list">
            {caseIds.length ? (
              caseIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  className={id === caseId ? "case-chip selected" : "case-chip"}
                  onClick={() => openCase(id)}
                >
                  Case {id}
                </button>
              ))
            ) : (
              <span className="muted">No IDs loaded.</span>
            )}
          </div>
          {caseRecord && (
            <div className="case-detail">
              <div className="detail-header">
                <div>
                  <p className="eyebrow">Case {caseId}</p>
                  <h3>{recordPhase(caseRecord)} · revision {caseRecord.revision}</h3>
                </div>
                <span className={`outcome ${caseRecord.outcome ? (caseRecord.outcome === "LOSS_FOUND" ? "is-loss" : (caseRecord.outcome === "UNRESOLVED" ? "is-unresolved" : "has-value")) : ""}`}>
                  {caseRecord.outcome || "Awaiting evaluation"}
                </span>
              </div>
              <dl className="facts">
                <div><dt>Primary</dt><dd>{caseRecord.primary}</dd></div>
                <div><dt>Mapper</dt><dd>{caseRecord.secondary}</dd></div>
                <div><dt>Attempts</dt><dd>{caseRecord.accepted_attempts}</dd></div>
                <div><dt>Last operation</dt><dd>{caseRecord.last_operation?.method ?? "None"}</dd></div>
              </dl>
              <div className="schema-grid">
                <SchemaTable title="case-old" fields={oldFields} setFields={setOldFields} />
                <SchemaTable title="case-new" fields={newFields} setFields={setNewFields} />
              </div>
              <section className="table-card">
                <div className="section-heading">
                  <div>
                    <h3>Mapping rows</h3>
                    <p className="muted">Transform rules for each old schema field</p>
                  </div>
                  <div className="toolbar">
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={addMappingRow}
                      disabled={mappingRows.length >= MAX_MAPPING_ROWS || !nextUnmappedOldId(oldFields.map((field) => field.id), mappingRows)}
                    >
                      Add mapping row
                    </button>
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={() => setDefaults([...defaults, { new_id: "", value: "" }])}
                    >
                      Add default
                    </button>
                  </div>
                </div>
                <div className="scroll-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Old ID</th>
                        <th>New ID</th>
                        <th>Transform</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappingRows.map((row, index) => (
                        <tr key={`${row.old_id}-${index}`}>
                          <td>
                            <select
                              value={row.old_id}
                              aria-label={`Mapping row ${index + 1} old field`}
                              onChange={(event) => setMappingRows(mappingRows.map((item, itemIndex) => itemIndex === index ? { ...item, old_id: event.target.value } : item))}
                            >
                              <option value="">Select old field</option>
                              {oldFields.map((field, fieldIndex) => (
                                <option
                                  key={`${field.id}-${fieldIndex}`}
                                  value={field.id}
                                  disabled={mappingRows.some((item, itemIndex) => itemIndex !== index && item.old_id === field.id)}
                                >
                                  {field.id}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={row.new_id}
                              disabled={row.transform === "DROP"}
                              aria-label={`Mapping row ${index + 1} new field`}
                              onChange={(event) => setMappingRows(mappingRows.map((item, itemIndex) => itemIndex === index ? { ...item, new_id: event.target.value } : item))}
                            >
                              <option value="">No target (DROP)</option>
                              {newFields.map((field, fieldIndex) => (
                                <option
                                  key={`${field.id}-${fieldIndex}`}
                                  value={field.id}
                                  disabled={!isTargetAvailable(mappingRows, index, field.id)}
                                >
                                  {field.id}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={row.transform}
                              aria-label={`Mapping row ${index + 1} transform`}
                              onChange={(event) => setMappingRows(mappingRows.map((item, itemIndex) => itemIndex === index ? { ...item, transform: event.target.value as MappingRow["transform"], new_id: event.target.value === "DROP" ? "" : item.new_id } : item))}
                            >
                              {(["IDENTITY", "RENAME", "CAST", "DROP"] as MappingRow["transform"][]).map((transform) => <option key={transform}>{transform}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!!defaults.length && (
                  <div className="defaults-list">
                    {defaults.map((item, index) => (
                      <div className="default-row" key={index}>
                        <input
                          value={item.new_id}
                          placeholder="new_id"
                          aria-label={`Default row ${index + 1} new ID`}
                          onChange={(event) => setDefaults(defaults.map((row, rowIndex) => rowIndex === index ? { ...row, new_id: event.target.value } : row))}
                        />
                        <input
                          value={item.value}
                          placeholder="default value"
                          aria-label={`Default row ${index + 1} value`}
                          onChange={(event) => setDefaults(defaults.map((row, rowIndex) => rowIndex === index ? { ...row, value: event.target.value } : row))}
                        />
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => setDefaults(defaults.filter((_row, rowIndex) => rowIndex !== index))}
                          aria-label={`Remove default row ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <div className="action-row">
                <button
                  type="button"
                  onClick={() => run(baseRequest())}
                  disabled={busy || !journalReady || !canWrite || caseRecord.phase !== "BASE_DRAFT"}
                >
                  Replace schemas
                </button>
                <button
                  type="button"
                  onClick={() => run(caseRequest("lock_schemas", (record) => record.phase === "BASE_LOCKED"))}
                  disabled={busy || !journalReady || !canWrite || caseRecord.phase !== "BASE_DRAFT"}
                >
                  Lock schemas
                </button>
                <button
                  type="button"
                  onClick={() => run(putRequest())}
                  disabled={busy || !journalReady || !canWrite || !["BASE_LOCKED", "RESPONSE_DRAFT"].includes(caseRecord.phase)}
                >
                  Put mapping
                </button>
                <button
                  type="button"
                  onClick={() => run(caseRequest("freeze_mapping", (record) => record.phase === "FROZEN"))}
                  disabled={busy || !journalReady || !canWrite || caseRecord.phase !== "RESPONSE_DRAFT"}
                >
                  Freeze mapping
                </button>
                <button
                  type="button"
                  onClick={() => run(caseRequest("evaluate_migration", (record) => ["DONE", "UNRESOLVED"].includes(record.phase)))}
                  disabled={busy || !journalReady || !canWrite || caseRecord.phase !== "FROZEN"}
                >
                  Evaluate
                </button>
                <button
                  type="button"
                  onClick={() => run(caseRequest("retry_migration", (record) => ["UNRESOLVED", "EXHAUSTED", "DONE"].includes(record.phase)))}
                  disabled={busy || !journalReady || !canWrite || caseRecord.phase !== "UNRESOLVED"}
                >
                  Retry
                </button>
              </div>
              <pre className="record-view">{JSON.stringify(caseRecord, null, 2)}</pre>
            </div>
          )}
        </section>

        <TransactionProgress progress={progress} onReconcile={() => void reconcileJournal()} />
        <div className="status-line" role="status">
          {busy ? "Writing, finalizing, and reconciling exact historical state…" : message}
          {error && <span className="error-text">{error}</span>}
        </div>
      </main>
      {chooserOpen && (
        <div className="wallet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && wallet.phase !== "CONNECTING") closeChooser(); }}>
          <div className="wallet-dialog" role="dialog" aria-modal="true" aria-labelledby="wallet-dialog-title" tabIndex={-1} ref={walletDialogRef} onKeyDown={trapWalletFocus}>
            <div className="wallet-dialog__heading">
              <div><p className="eyebrow">Studionet · {expectedChainId()}</p><h2 id="wallet-dialog-title">Connect wallet</h2></div>
              <button type="button" className="wallet-dialog__close" aria-label="Close wallet picker" disabled={wallet.phase === "CONNECTING"} onClick={closeChooser}>×</button>
            </div>
            <p className="muted">Choose a detected wallet. Opening this picker does not request account access.</p>
            {wallet.phase === "CONNECTING" && <p className="wallet-connecting" role="status">Waiting for wallet approval…</p>}
            {wallet.phase === "DISCOVERING" ? <p className="wallet-empty">Detecting supported wallets…</p> : wallet.wallets.length ? (
              <div className="wallet-options">
                {wallet.wallets.map((option) => (
                  <button type="button" className="wallet-option" key={option.id} disabled={wallet.phase === "CONNECTING"} onClick={() => void chooseWallet(option.id)}>
                    {option.icon ? <img src={option.icon} alt="" /> : <span className={`wallet-fallback wallet-fallback--${option.rdns.replaceAll(".", "-")}`} aria-hidden="true">{option.name === "MetaMask" ? "M" : option.name === "Rabby" ? "R" : "OKX"}</span>}
                    <span><strong>{option.name}</strong><small>Detected in this browser</small></span><span aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            ) : <p className="wallet-empty">No supported wallet was detected. Install or enable MetaMask, OKX Wallet, or Rabby, then reopen this picker.</p>}
            {(wallet.error || error) && <p className="wallet-error" role="alert">{wallet.error || error}</p>}
            <button type="button" className="wallet-cancel" disabled={wallet.phase === "CONNECTING"} onClick={closeChooser}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

function cryptoRandomNonce(): string {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) return "00000000000000000000000000000000";
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default App;
