"use client";
import { findLinkedRepeatPaper } from "@/lib/repeat-paper-link";
import { RepeatLockedScreen } from "@/components/repeat/repeat-locked-screen";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, FileText, ImageIcon, Loader2, Menu, MessageSquare, PanelLeftClose, RotateCcw, Search, Sigma, Square, UserRound, X, ZoomIn } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MathMarkdown } from "@/components/repeat/math-markdown";
import { boundedChatHistory } from "@/lib/repeat-v2-chat";
import { formatPaperChoice } from "@/lib/repeat-v2-presentation";
import type { RepeatV2AcademicYear, RepeatV2Catalog, RepeatV2ChatTurn, RepeatV2Membership, RepeatV2Paper, RepeatV2PaperSummary, RepeatV2Question, RepeatV2SourceImage } from "@/lib/repeat-v2-types";

type Chat = { turns: RepeatV2ChatTurn[]; solutionComplete?: boolean; error?: string; locked?: boolean };
type ActiveQuestion = { paper: RepeatV2Paper; question: RepeatV2Question };
type Preview = { title: string; images: RepeatV2SourceImage[]; href: string; notes: string[] };

function subscribeToLayout(onChange: () => void) {
  const queries = [window.matchMedia("(max-width: 680px)"), window.matchMedia("(max-width: 1000px)")];
  queries.forEach(query => query.addEventListener("change", onChange));
  return () => queries.forEach(query => query.removeEventListener("change", onChange));
}
function getLayout() {
  return window.matchMedia("(max-width: 680px)").matches ? "mobile" : window.matchMedia("(max-width: 1000px)").matches ? "tablet" : "desktop";
}
function getServerLayout() { return "desktop"; }

function memberships(paper: RepeatV2PaperSummary): RepeatV2Membership[] {
  return paper.memberships?.length ? paper.memberships : [paper];
}
function titleCase(value: string) {
  return value.replace(/\b[A-Z]{4,}\b/g, (word) => word[0] + word.slice(1).toLowerCase());
}
function SelectFilter({ label, value, onChange, children, className = "" }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; className?: string }) {
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={label} className={`repeat-filter ${className}`}><SelectValue /></SelectTrigger>
    <SelectContent className="repeat-portal dark" position="popper">{children}</SelectContent>
  </Select>;
}
async function readJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load the question library. Please try again.");
  return data as T;
}

function QuestionCard({ question, paper, selected, working, onSolve, onPreview }: { question: RepeatV2Question; paper: RepeatV2Paper; selected: boolean; working: boolean; onSolve: () => void; onPreview: (preview: Preview) => void }) {
  const images = question.sourceImages.length ? question.sourceImages : paper.pages.filter(page => question.pageNumbers.includes(page.number)).map(page => ({ src: page.image, pageNumber: page.number }));
  const notes = [...new Set([...question.reviewNotes, ...paper.warnings])];
  return <article className="repeat-question-card" aria-label={`Question ${question.number}`} data-selected={selected} id={`question-${question.id}`}>
    <div className="repeat-question-content">
    <MathMarkdown>{question.markdown}</MathMarkdown>
    {question.diagrams.map((diagram) => <figure className="repeat-diagram" key={diagram.id}>
      <button onClick={() => onPreview({ title: `Question ${question.number}: original figure`, images: [diagram], href: paper.href, notes })} aria-label={`Enlarge figure for question ${question.number}`} aria-haspopup="dialog">
        {/* Original scans should not be recompressed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={diagram.src} alt={diagram.caption || `Original figure for question ${question.number}`} loading="lazy" />
      </button>
      <figcaption><ImageIcon size={11} /><MathMarkdown className="repeat-figure-caption">{diagram.caption || "Figure from the original paper"}</MathMarkdown><ZoomIn size={11} /></figcaption>
    </figure>)}
    {question.confidence === "low" && <>
      <div className="repeat-review-note">Some symbols are unclear. Check the original scan.</div>
      {images.length > 0 && question.diagrams.length === 0 && <figure className="repeat-diagram">
        <button onClick={() => onPreview({ title: `Question ${question.number}: original scan`, images, href: paper.href, notes })} aria-label={`Enlarge original scan for question ${question.number}`} aria-haspopup="dialog">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0].src} alt={`Original question ${question.number}, page ${images[0].pageNumber}`} loading="lazy" />
        </button><figcaption><FileText size={11} /> Original scan <ZoomIn className="ml-auto" size={11} /></figcaption>
      </figure>}
    </>}
    </div>
    <div className="repeat-question-footer">
      {images.length ? <button className="repeat-source-button" aria-haspopup="dialog" onClick={() => onPreview({ title: `Question ${question.number}: original scan`, images, href: paper.href, notes })}><FileText size={13} /> Original scan</button>
        : <a href={`${paper.href}#page=${question.pageNumbers[0] || 1}`} target="_blank" rel="noopener noreferrer" className="repeat-source-button"><FileText size={12} /> View paper</a>}
      <Button className="repeat-solve" onClick={onSolve} aria-busy={working} aria-controls="repeat-study-tutor">{working && <Loader2 size={14} className="animate-spin" />}{working ? "Solving..." : selected ? "View solution" : "Solve question"}</Button>
    </div>
  </article>;
}

export default function RepeatV2Client({ initialPaperId = "", initialSource = "" }: { initialPaperId?: string; initialSource?: string }) {
  const { profile, isLoading:authLoading } = useAuth();
  const hasPass=!!(profile?.isPaid||profile?.midsemPaid);
  const [catalog, setCatalog] = useState<RepeatV2Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [year, setYear] = useState<RepeatV2AcademicYear>(1);
  const [exam,setExam]=useState("MIDSEM");
  const [branch, setBranch] = useState("all");
  const [chosenSubject, setChosenSubject] = useState("");
  const [paperId, setPaperId] = useState("");
  const [paper, setPaper] = useState<RepeatV2Paper | null>(null);
  const [paperError, setPaperError] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [questionId, setQuestionId] = useState("");
  const [chats, setChats] = useState<Record<string, Chat>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const questionRequests = useRef(new Map<string, AbortController>());
  const tutorScroll = useRef<HTMLDivElement>(null);
  const shouldScroll = useRef(true);
  const libraryScroll = useRef<HTMLDivElement>(null);
  const previewOpener = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const tutorRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  const layout = useSyncExternalStore(subscribeToLayout, getLayout, getServerLayout);
  const modal = sidebarOpen ? "sidebar" : layout !== "desktop" && tutorOpen ? "tutor" : null;
  const isBusy = !!busyId;

  useEffect(() => {
    const abort = new AbortController();
    readJson<RepeatV2Catalog>("/api/repeat/v2/catalog", abort.signal).then(data => { setCatalog(data); setCatalogError("");
      const linked = findLinkedRepeatPaper(data, initialPaperId, initialSource);
      if (linked) {
        const scope = memberships(linked).find(m => m.examType === "MIDSEM") || memberships(linked)[0];
        if (scope) { setYear(scope.academicYear); setExam(scope.examType); setBranch(scope.branch); setChosenSubject(scope.subject); setPaperId(linked.id); }
      } }).catch(error => { if (!abort.signal.aborted) setCatalogError(error.message); });
    return () => abort.abort();
  }, [refresh, initialPaperId, initialSource]);
  useEffect(() => {
    if (!modal) return;
    const panel = modal === "tutor" ? tutorRef.current : sidebarRef.current;
    if (!panel) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = (modal === "sidebar"
      ? [workspaceRef.current, skipLinkRef.current]
      : [sidebarRef.current, topbarRef.current, libraryScroll.current, skipLinkRef.current])
      .filter((element): element is HTMLElement => element !== null);
    const previousInert = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const nestedPopupOpen = () => !!document.querySelector('.repeat-portal[data-state="open"][data-slot="select-content"], .repeat-portal[data-state="open"][data-slot="dialog-content"]');
    const focusable = () => [...panel.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, summary, [tabindex]')]
      .filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest("[inert]") && element.getClientRects().length > 0);
    panel.focus({ preventScroll: true });
    function handleModalKey(event: KeyboardEvent) {
      if (event.defaultPrevented || nestedPopupOpen()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (modal === "tutor") setTutorOpen(false); else setSidebarOpen(false);
      } else if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements.at(-1);
        if (!first) { event.preventDefault(); panel!.focus(); return; }
        const focused = document.activeElement;
        if (event.shiftKey && (focused === first || focused === panel || !panel!.contains(focused))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (focused === last || !panel!.contains(focused))) {
          event.preventDefault(); first.focus();
        }
      }
    }
    function handleModalFocus(event: FocusEvent) {
      if (!nestedPopupOpen() && event.target instanceof Node && !panel!.contains(event.target)) panel!.focus({ preventScroll: true });
    }
    document.addEventListener("keydown", handleModalKey);
    document.addEventListener("focusin", handleModalFocus);
    return () => {
      document.removeEventListener("keydown", handleModalKey);
      document.removeEventListener("focusin", handleModalFocus);
      background.forEach((element, index) => { element.inert = previousInert[index]; });
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && previousFocus.getClientRects().length && !previousFocus.closest("[inert]")) previousFocus.focus({ preventScroll: true });
    };
  }, [modal]);
  const yearPapers = useMemo(() => catalog?.papers.filter(item => (profile?.isPaid || memberships(item).some(m=>m.examType === "MIDSEM")) && memberships(item).some(m => m.academicYear === year && (exam === "all" || m.examType === exam))) || [], [catalog, year, exam, profile?.isPaid]);
  const branches = useMemo(() => [...new Set(yearPapers.flatMap(item => memberships(item).filter(m => m.academicYear === year).map(m => m.branch)))].filter(Boolean).sort(), [yearPapers, year]);
  const scopePapers = useMemo(() => yearPapers.filter(item => memberships(item).some(m => m.academicYear === year && (branch === "all" || m.branch === branch))), [yearPapers, year, branch]);
  const subjects = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const item of scopePapers) for (const m of memberships(item)) {
      if (m.academicYear !== year || (branch !== "all" && m.branch !== branch)) continue;
      if (!map.has(m.subject)) map.set(m.subject, new Set());
      map.get(m.subject)!.add(item.id);
    }
    return [...map.entries()].map(([name, ids]) => ({ name, count: ids.size })).sort((a, b) => a.name.localeCompare(b.name));
  }, [scopePapers, year, branch]);
  const subject = subjects.find(item => item.name === chosenSubject)?.name || subjects.find(item => /^(Computational|Engineering) Mathematics\s*-?\s*I$/i.test(item.name))?.name || subjects.find(item => /math/i.test(item.name))?.name || subjects[0]?.name || "";
  const subjectPapers = useMemo(() => scopePapers.filter(item => memberships(item).some(m => m.academicYear === year && m.subject === subject && (branch === "all" || m.branch === branch))), [scopePapers, subject, year, branch]);
  const filteredPapers = useMemo(() => [...subjectPapers].sort((a, b) => (b.examYear || 0) - (a.examYear || 0) || b.questionCount - a.questionCount || a.name.localeCompare(b.name)), [subjectPapers]);
  const selectedSummary = filteredPapers.find(item => item.id === paperId) || filteredPapers[0];
  const selectedId = selectedSummary?.id;
  const visiblePaper = paper?.id === selectedId ? paper : null;
  const visibleQuestions = visiblePaper?.questions || [];
  const currentQuestion = visibleQuestions.find(question => question.id === questionId) || visibleQuestions[0];
  const currentQuestionIndex = currentQuestion ? visibleQuestions.indexOf(currentQuestion) : -1;
  const active: ActiveQuestion | null = visiblePaper && currentQuestion ? { paper: visiblePaper, question: currentQuestion } : null;
  const activeKey = active ? `${active.paper.id}:${active.question.id}` : "";
  const currentChat = chats[activeKey];

  // Each visible question owns its conversation. Moving on stops the old stream.
  useEffect(() => () => controller.current?.abort(), [activeKey]);

  useEffect(() => {
    if (!selectedId) return;
    const abort = new AbortController();
    readJson<RepeatV2Paper>(`/api/repeat/v2/papers/${encodeURIComponent(selectedId)}`, abort.signal).then(data => { setPaper(data); setPaperError(""); }).catch(error => { if (!abort.signal.aborted) setPaperError(error.message); });
    libraryScroll.current?.scrollTo({ top: 0 });
    return () => abort.abort();
  }, [selectedId, refresh]);
  useEffect(() => { if (shouldScroll.current && tutorScroll.current) tutorScroll.current.scrollTop = tutorScroll.current.scrollHeight; }, [currentChat, activeKey]);

  function resetSelection() { setPaperId(""); setQuestionId(""); setDraft(""); setPaperError(""); }
  function changeSubject(value: string) { setChosenSubject(value); resetSelection(); setSidebarOpen(false); }
  function changeYear(value: RepeatV2AcademicYear) { setYear(value); if (value === 2) setExam("MIDSEM"); setBranch("all"); setChosenSubject(""); resetSelection(); }
  function chooseQuestion(question: RepeatV2Question) {
    setQuestionId(question.id); setDraft(""); setCopied(false); shouldScroll.current = true;
    libraryScroll.current?.scrollTo({ top: 0 });
  }
  function openPreview(value: Preview) {
    previewOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPreview(value);
  }

  async function solve(context: ActiveQuestion, prompt?: string, restart = false) {
    const key = `${context.paper.id}:${context.question.id}`;
    setQuestionId(context.question.id); setTutorOpen(true); setSidebarOpen(false); setDraft(""); shouldScroll.current = true;
    if (controller.current && questionRequests.current.get(key) === controller.current && !controller.current.signal.aborted) return;
    if (controller.current && questionRequests.current.get(key) !== controller.current) controller.current.abort();
    if (!prompt && !restart && chats[key]?.solutionComplete && !chats[key]?.error) return;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    questionRequests.current.set(key, abort);
    const history = restart ? [] : (chats[key]?.turns || []).filter(turn => turn.content.trim());
    const solutionComplete = !restart && !!chats[key]?.solutionComplete;
    const userPrompt = prompt || "Walk me through this question, step by step.";
    const turns: RepeatV2ChatTurn[] = [...history, { role: "user", content: userPrompt }, { role: "assistant", content: "" }];
    setChats(prev => ({ ...prev, [key]: { turns, solutionComplete } })); setBusyId(key);
    let answer = ""; let ended = false;
    const update = () => setChats(prev => questionRequests.current.get(key) !== abort ? prev : ({ ...prev, [key]: { turns: [...turns.slice(0, -1), { role: "assistant", content: answer }], solutionComplete: solutionComplete || (!prompt && ended) } }));
    try {
      const response = await fetch("/api/repeat/v2/solve", { method: "POST", signal: abort.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paperId: context.paper.id, questionId: context.question.id, prompt, history: boundedChatHistory(history) }) });
      if (response.status === 401 || response.status === 402) {
        setChats(prev => ({ ...prev, [key]: { turns: prev[key]?.turns.filter(turn => turn.content.trim()) ?? [], locked: true } }));
        setBusyId(null); controller.current = null;
        return;
      }
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "The tutor is unavailable. Please try again."); }
      if (!response.body) throw new Error("Could not start the solution. Please try again.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      const consume = (frame: string) => {
        const event = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
        const payload = frame.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
        if (!payload) return;
        const data = JSON.parse(payload);
        if (event === "delta") { answer += data.text || ""; update(); }
        if (event === "done") { answer = data.answerMarkdown || answer; ended = true; update(); }
        if (event === "error") throw new Error(data.error || "The solution was interrupted. Please try again.");
      };
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
        const frames = buffer.split("\n\n"); buffer = frames.pop() || ""; frames.forEach(consume);
        if (done) { if (buffer.trim()) consume(buffer); break; }
      }
      if (!ended) throw new Error("The connection ended before the solution was complete. Please try again.");
    } catch (error) {
      setChats(prev => questionRequests.current.get(key) !== abort ? prev : ({ ...prev, [key]: { ...prev[key], error: abort.signal.aborted ? "Solution stopped. You can ask a follow-up or start again." : error instanceof Error ? error.message : "Something went wrong. Please try again." } }));
    } finally { if (controller.current === abort) { setBusyId(null); controller.current = null; } }
  }
  const lastAnswer = currentChat?.turns.filter(turn => turn.role === "assistant" && turn.content).at(-1)?.content;



  const linkedPaper = catalog ? findLinkedRepeatPaper(catalog, initialPaperId, initialSource) : undefined;
  const hasLinkedRequest = !!(initialPaperId || initialSource);
  const linkedOutsidePass = linkedPaper && !profile?.isPaid && !memberships(linkedPaper).some(m => m.examType === "MIDSEM");
  if (!authLoading && catalog && hasLinkedRequest && (!linkedPaper || linkedOutsidePass)) {
    return <main className="mx-auto max-w-xl px-5 py-16"><Link href="/browse" className="text-sm text-muted-foreground">← Free papers</Link><h1 className="mt-8 text-2xl font-semibold">{linkedPaper ? "This paper is outside the midsem pass" : "This paper is not in Repeat 2.0 yet"}</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">{linkedPaper ? "The ₹29 pass covers midsem AI practice. This original paper remains free to read and download." : "You can still read and download the original PDF for free. Choose an available midsem paper to use AI practice."}</p><Link href="/repeat/library" className="mt-6 inline-block rounded-lg border px-4 py-3 text-sm">Browse Repeat 2.0 midsem papers</Link></main>;
  }
  const linkedNext = initialPaperId ? `/repeat/library?paper=${encodeURIComponent(initialPaperId)}` : initialSource ? `/repeat/library?source=${encodeURIComponent(initialSource)}` : "/repeat/library";
  if (authLoading || !hasPass || (hasLinkedRequest && !catalog)) return <RepeatLockedScreen loading={authLoading || (hasLinkedRequest && !catalog && !catalogError)} next={linkedNext}/>;
  return <main className="repeat-app dark">
    <a ref={skipLinkRef} href="#repeat-questions" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-neutral-900 focus:p-3">Skip to questions</a>
    {modal === "sidebar" && <button className="fixed inset-0 z-40 bg-black/60" tabIndex={-1} aria-label="Close subject menu" onClick={() => setSidebarOpen(false)} />}
    <aside ref={sidebarRef} id="repeat-subjects" className="repeat-sidebar" data-open={sidebarOpen} aria-label="Study subjects" role={modal === "sidebar" ? "dialog" : undefined} aria-modal={modal === "sidebar" ? true : undefined} tabIndex={-1}>
      <Link href="/repeat" className="repeat-brand" aria-label="Repeat 2.0 home"><span className="repeat-brand-symbol"><RotateCcw size={19} strokeWidth={2.2} /></span><span className="repeat-brand-name">repeat<span className="repeat-version ml-2">2.0</span></span></Link>
      <p className="repeat-sidebar-caption">Past papers · AI-transcribed questions</p><div className="px-2 mb-3"><label className="repeat-label" htmlFor="exam-filter">Exam</label><select id="exam-filter" className="w-full rounded-lg border bg-black p-2" value={exam} onChange={e=>{setExam(e.target.value);resetSelection();}}><option value="MIDSEM">Midsem</option>{year === 1 && <><option value="all">All exams</option><option value="ENDSEM">Endsem</option><option value="REGULAR">Regular</option><option value="MAKEUP">Makeup</option></>}</select><Link href="/midsem" className="mt-3 block text-xs underline">Free papers + worked solutions</Link></div>
      <div className="px-2"><span className="repeat-label">Your study year</span><div className="repeat-year-toggle" aria-label="Academic year">{([1, 2] as const).map(value => <button key={value} aria-pressed={year === value} onClick={() => changeYear(value)}>Year {value}</button>)}</div></div>
      {branches.length > 1 && <div className="px-2 mt-3"><SelectFilter label="Branch" value={branch} onChange={value => { setBranch(value); setChosenSubject(""); resetSelection(); }} className="w-full"><SelectItem value="all">All branches</SelectItem>{branches.map(value => <SelectItem value={value} key={value}>{value}</SelectItem>)}</SelectFilter></div>}
      <div className="repeat-subject-search"><Search size={13} /><input id="repeat-subject-search" name="subjectSearch" aria-label="Find a subject" placeholder="Find a subject..." value={subjectSearch} onChange={event => setSubjectSearch(event.target.value)} /></div>
      <div className="flex justify-between items-center px-2 my-2"><span className="repeat-label">Subjects</span><span className="text-[10px] text-[#a3a3a3]">{subjects.length || ""}</span></div>
      <nav className="repeat-subjects">
        {!catalog && !catalogError && <div className="repeat-loading"><Loader2 className="animate-spin" size={14} /> Loading subjects</div>}
        {subjects.filter(item => item.name.toLowerCase().includes(subjectSearch.toLowerCase())).map(item => <button key={item.name} className="repeat-subject" aria-current={item.name === subject} onClick={() => changeSubject(item.name)}>{/math|\bem\b|\bcm\b/i.test(item.name) ? <Sigma size={15} /> : <BookOpen size={14} />}<span>{titleCase(item.name)}</span><span className="repeat-subject-count">{item.count}</span></button>)}
        {catalog && !subjects.some(item => item.name.toLowerCase().includes(subjectSearch.toLowerCase())) && <p className="px-3 py-6 text-xs text-[#a3a3a3]">No subjects found.</p>}
      </nav>
      <div className="repeat-sidebar-bottom"><Link href="/" className="inline-flex items-center gap-2"><ArrowLeft size={12} /> Back to Papers</Link></div>
      <Button variant="ghost" size="icon" className="repeat-mobile-menu absolute right-3 top-3" aria-label="Close subjects" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={17} /></Button>
    </aside>
    <div ref={workspaceRef} className="repeat-workspace">
      <header ref={topbarRef} className="repeat-topbar"><div className="repeat-topbar-context">
        <Link href="/repeat" className="repeat-brand repeat-topbar-brand" aria-label="Repeat 2.0 home"><span className="repeat-brand-symbol"><RotateCcw size={18} strokeWidth={2.2} /></span><span className="repeat-brand-name">repeat<span className="repeat-version">2.0</span></span></Link>
        <span className="repeat-topbar-divider" />
        <Button variant="ghost" size="sm" className="repeat-mobile-menu repeat-subject-trigger" aria-label="Open subjects" aria-haspopup="dialog" aria-controls="repeat-subjects" aria-expanded={sidebarOpen} onClick={() => { setTutorOpen(false); setSidebarOpen(true); }}><Menu size={16} /><span>Subjects</span></Button>
        <span className="repeat-study-badge">Year {year}</span></div>
        <div className="flex items-center gap-2">
          <Link href="/profile" className="repeat-account-chip" title={profile?.email ?? "Profile"}><UserRound size={13} /><span>{profile?.name?.split(" ")[0] || "Account"}</span></Link>
          <Button variant="ghost" size="icon-sm" className="repeat-mobile-tutor" aria-label="Open study tutor" aria-haspopup="dialog" aria-controls="repeat-study-tutor" aria-expanded={tutorOpen} onClick={() => setTutorOpen(true)}><MessageSquare size={16} /></Button>
        </div>
      </header>
      <div className="repeat-columns">
        <section className="repeat-library" ref={libraryScroll} id="repeat-questions" tabIndex={-1} aria-label="Question library"><div className="repeat-library-inner">
          <div className="repeat-paper-heading"><h1 className="repeat-subject-title">{subject ? titleCase(subject) : "Choose a subject"}</h1></div>
          {catalogError ? <div className="repeat-error mt-7" role="alert">{catalogError}<Button variant="ghost" size="sm" className="ml-2" onClick={() => setRefresh(value => value + 1)}>Try again</Button></div> : !catalog ? <div className="mt-7"><div className="repeat-skeleton" /><div className="repeat-skeleton" /></div> : <>
            {selectedSummary && <Select value={selectedSummary.id} onValueChange={value => { setPaperId(value); setQuestionId(""); setDraft(""); setPaperError(""); }}><SelectTrigger className="repeat-paper-select" aria-label="Choose exam paper" title={formatPaperChoice(selectedSummary).detail}><SelectValue>{formatPaperChoice(selectedSummary).label}</SelectValue></SelectTrigger><SelectContent className="repeat-portal dark max-w-[min(700px,90vw)]" position="popper">{filteredPapers.map(item => { const choice = formatPaperChoice(item); return <SelectItem value={item.id} key={item.id} textValue={choice.label}><span className="repeat-paper-option"><span>{choice.label}</span><span className="repeat-paper-option-detail">{choice.detail}</span></span></SelectItem>; })}</SelectContent></Select>}
            {paperError ? <div className="repeat-error mt-5" role="alert">{paperError}<Button variant="ghost" size="sm" onClick={() => setRefresh(value => value + 1)}>Try again</Button></div> : !selectedSummary ? <div className="repeat-empty"><Search size={22} className="mx-auto mb-3" /><p>No papers are available for this subject yet.</p></div> : !visiblePaper ? <><div className="repeat-skeleton" /><div className="repeat-skeleton" /></> : <>
              {currentQuestion && <>
                {visiblePaper.provenance&&<p className="mb-4 text-xs text-[#a3a3a3]">{visiblePaper.provenance}</p>}
                <nav className="repeat-reading-toolbar" aria-label="Question navigation">
                  <Select value={currentQuestion.id} onValueChange={value => { const question = visibleQuestions.find(item => item.id === value); if (question) chooseQuestion(question); }}><SelectTrigger className="repeat-question-jump" aria-label="Choose question"><SelectValue>{currentQuestion.number.toLowerCase().startsWith("page") ? currentQuestion.number : `Question ${currentQuestion.number}`}</SelectValue></SelectTrigger><SelectContent className="repeat-portal dark" position="popper">{visibleQuestions.map(question => <SelectItem key={question.id} value={question.id}>Question {question.number}</SelectItem>)}</SelectContent></Select>
                  <div className="repeat-reading-controls">
                    {currentQuestion.marks !== null && <span className="repeat-marks">{currentQuestion.marks} marks</span>}
                    <span className="repeat-question-position" aria-live="polite" aria-atomic="true"><span className="sr-only">Question </span>{currentQuestionIndex + 1} of {visibleQuestions.length}</span>
                    <Button variant="ghost" size="icon-sm" className="repeat-step-button" aria-label="Previous question" title="Previous question" disabled={currentQuestionIndex === 0} onClick={() => chooseQuestion(visibleQuestions[currentQuestionIndex - 1])}><ArrowLeft size={15} /></Button>
                    <Button variant="ghost" size="icon-sm" className="repeat-step-button" aria-label="Next question" title="Next question" disabled={currentQuestionIndex === visibleQuestions.length - 1} onClick={() => chooseQuestion(visibleQuestions[currentQuestionIndex + 1])}><ArrowRight size={15} /></Button>
                  </div>
                </nav>
                <div className="repeat-question-stage"><QuestionCard key={currentQuestion.id} question={currentQuestion} paper={visiblePaper} selected={!!currentChat?.solutionComplete} working={busyId === activeKey} onSolve={() => solve({ paper: visiblePaper, question: currentQuestion })} onPreview={openPreview} /></div>
              </>}
              {visibleQuestions.length === 0 && <div className="repeat-empty"><FileText size={24} className="mx-auto mb-3" /><p>The transcription for this paper is not ready yet.</p><a href={visiblePaper.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Read the original paper</a></div>}
            </>}
          </>}
        </div></section>
        <aside ref={tutorRef} id="repeat-study-tutor" className="repeat-tutor" data-open={tutorOpen} aria-label="Study tutor" role={modal === "tutor" ? "dialog" : undefined} aria-modal={modal === "tutor" ? true : undefined} tabIndex={-1}>
          <div className="repeat-tutor-header"><h2 className="repeat-tutor-title">Solution <span className="ml-2 text-[10px] font-normal text-[#a3a3a3]">AI generated</span></h2><div className="ml-auto flex items-center gap-1">{active && currentChat?.turns.length ? <Button variant="ghost" size="icon-sm" aria-label="Start solution again" title="Start solution again" disabled={isBusy} onClick={() => solve(active, undefined, true)}><RotateCcw size={13} className="text-[#a3a3a3]" /></Button> : null}<Button variant="ghost" size="icon-sm" className="repeat-tutor-close" aria-label="Close tutor" onClick={() => setTutorOpen(false)}><X size={16} /></Button></div></div>
          <div className="repeat-tutor-scroll" ref={tutorScroll} onScroll={() => { const element = tutorScroll.current; if (element) shouldScroll.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100; }}>
            {currentChat?.locked ? <div className="repeat-tutor-locked"><p className="repeat-tutor-locked-lead">Your session ended. <Link href="/auth?next=/repeat" className="underline underline-offset-4">Sign in again</Link> to keep going.</p></div>
            : !active || !currentChat?.turns.length ? <div className="repeat-tutor-empty"><p>Your step-by-step solution will appear here.</p><p className="repeat-tutor-empty-hint">Pick a question and press <strong>Solve question</strong>.</p>{active&&<div className="mt-5 flex flex-wrap justify-center gap-2">{["Give me a hint without the final answer.","Quiz me on this topic, one question at a time.","Explain the common mistakes in this type of question."].map(prompt=><button key={prompt} className="rounded-lg border border-[#333] px-3 py-2 text-xs" disabled={isBusy} onClick={()=>solve(active,prompt)}>{prompt}</button>)}</div>}</div> : <>
              {currentChat?.turns.map((turn, index) => <div key={index} className="repeat-chat-turn">{turn.role === "user" ? (index === 0 && turn.content === "Walk me through this question, step by step." ? null : <div className="repeat-chat-user">{turn.content}</div>) : <>{turn.content ? <MathMarkdown streaming={busyId === activeKey && index === currentChat.turns.length - 1}>{turn.content}</MathMarkdown> : busyId === activeKey ? <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3]" role="status"><Loader2 size={12} className="animate-spin" /> Reading the question and its figures...</div> : null}</>}</div>)}
              {currentChat?.error && <div className="repeat-error" role="alert">{currentChat.error}<button className="block underline underline-offset-4 mt-2" disabled={isBusy} onClick={() => solve(active, undefined, true)}>Try again</button></div>}
              {lastAnswer && !isBusy && <div className="mt-5 flex flex-wrap items-center gap-4">
                <button className="repeat-source-button" onClick={async () => { try { await navigator.clipboard.writeText(lastAnswer); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } }}>{copied ? <Check size={11} /> : <FileText size={11} />}{copied ? "Copied" : "Copy solution"}</button>
                {active && <button className="repeat-source-button" aria-haspopup="dialog" onClick={() => { const images = active.question.sourceImages.length ? active.question.sourceImages : active.paper.pages.filter(page => active.question.pageNumbers.includes(page.number)).map(page => ({ src: page.image, pageNumber: page.number })); openPreview({ title: `Question ${active.question.number}: original scan`, images, href: active.paper.href, notes: [...new Set([...active.question.reviewNotes, ...active.paper.warnings])] }); }}><ZoomIn size={11} /> Check against the original scan</button>}
              </div>}
            </>}
          </div>
          {!!currentChat?.turns.length && !currentChat.locked && <div className="repeat-tutor-compose"><form className="repeat-compose-box" onSubmit={event => { event.preventDefault(); if (active && draft.trim() && !isBusy) void solve(active, draft.trim()); }}>
            <Textarea id="repeat-follow-up" name="followUp" className="repeat-compose-input" aria-label="Ask the tutor a follow-up" placeholder={active ? "Ask about this question..." : "Choose a question to get started"} value={draft} disabled={!active || isBusy} maxLength={4000} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (active && draft.trim() && !isBusy) void solve(active, draft.trim()); } }} />
            <div className="repeat-compose-actions">{isBusy ? <Button type="button" className="repeat-compose-send" onClick={() => controller.current?.abort()} aria-label="Stop generating"><Square size={10} fill="currentColor" /></Button> : <Button type="submit" className="repeat-compose-send" disabled={!active || !draft.trim()} aria-label="Send message"><ArrowUp size={14} /></Button>}</div>
          </form></div>}
        </aside>
      </div>
    </div>
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="repeat-portal dark repeat-image-dialog" onCloseAutoFocus={event => { event.preventDefault(); const opener = previewOpener.current; if (opener?.isConnected && !opener.closest("[inert]") && opener.getClientRects().length) opener.focus({ preventScroll: true }); }}><DialogTitle className="text-sm text-[#f5f5f5]">{preview?.title}</DialogTitle><DialogDescription className="text-xs text-[#a3a3a3]">Preserved from the original exam paper. Zoom in to check symbols and labels.</DialogDescription>
      {preview?.images.map((source, index) => <figure key={`${source.src}-${index}`} className="border border-[#262626] rounded-lg overflow-hidden"><figcaption className="px-3 py-2 text-[10px] text-[#a3a3a3] bg-[#141414]">Page {source.pageNumber}</figcaption>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={source.src} alt={`Original exam scan, page ${source.pageNumber}`} />
      </figure>)}
      {!!preview?.notes.length && <details className="repeat-source-notes"><summary>Transcription notes</summary>{preview.notes.map((note, index) => <p key={index}>{note}</p>)}</details>}
      {preview && <a className="repeat-source-button justify-center py-2" target="_blank" rel="noopener noreferrer" href={`${preview.href}#page=${preview.images[0]?.pageNumber || 1}`}><FileText size={13} /> Open the full original PDF <ArrowUp size={12} className="rotate-45" /></a>}
    </DialogContent></Dialog>
  </main>;
}
