"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

const TOKEN_RE =
  /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(const|let|var|function|return|if|else|for|while|import|from|export|default|new|typeof|void|uniform|in|out| inout|vec2|vec3|vec4|mat2|float|int|bool|main|precision|highp|layout|location|sampler2D|useEffect|useRef|useState|interface|type)\b|(\b\d+\.?\d*(?:[eE][+-]?\d+)?\b)/g;

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of code.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(code.slice(last, idx));
    const [full, comment, str, kw, num] = m;
    let cls = "";
    if (comment) cls = "text-faint italic";
    else if (str) cls = "text-coral-ink/90";
    else if (kw) cls = "text-peach-ink";
    else if (num) cls = "text-peach-ink";
    out.push(
      <span key={key++} className={cls}>
        {full}
      </span>,
    );
    last = idx + full.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function CodeViewer({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const nodes = useMemo(() => highlight(code), [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-paper">
      <div className="flex items-center justify-between border-b border-line bg-panel px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{label}</span>
        <button
          type="button"
          onClick={copy}
          className={`flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] transition-colors ${
            copied ? "text-coral-ink" : "text-muted hover:bg-overlay hover:text-ink"
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-[1.55] text-ink/85">
        <code>{nodes}</code>
      </pre>
    </div>
  );
}