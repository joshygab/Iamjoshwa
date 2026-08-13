"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Headphones, LockKeyhole, Search, Sparkles, Ticket, Zap } from "lucide-react";
import { useUniverse } from "./universe-provider";

const baseCommands = [
  { label: "Play latest signal", hint: "Open music", href: "/musica", icon: Headphones },
  { label: "Next show", hint: "Shows and calendar", href: "/fechas", icon: CalendarDays },
  { label: "Open my Pass", hint: "Inner Circle", href: "/perfil", icon: Sparkles },
  { label: "The Vault", hint: "Drops and rewards", href: "/the-vault", icon: LockKeyhole },
  { label: "Booking", hint: "Professional request", href: "/booking", icon: Ticket },
  { label: "EPK", hint: "Media kit", href: "/epk", icon: Zap },
] as const;

export function CommandMenu() {
  const router = useRouter();
  const { universe, setUniverse } = useUniverse();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const commands = useMemo(() => {
    const universeCommand = {
      label: universe === "afterluv" ? "Switch to IAMJOSHWA" : "Switch to AFTERLUV",
      hint: universe === "afterluv" ? "House / Latin / Club" : "Hard / Rave / Trance",
      href: "/",
      icon: Zap,
      universe: universe === "afterluv" ? "iamjoshwa" : "afterluv",
    } as const;
    const normalized = query.trim().toLowerCase();
    return [...baseCommands, universeCommand].filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(normalized));
  }, [query, universe]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function runCommand(command: (typeof commands)[number]) {
    if ("universe" in command) setUniverse(command.universe);
    close();
    router.push(command.href);
  }

  return (
    <>
      <button className="command-trigger" type="button" onClick={() => setOpen(true)} aria-label="Abrir búsqueda rápida">
        <Search />
        <span>⌘K</span>
      </button>

      {open ? (
        <div className="command-overlay" role="dialog" aria-modal="true" aria-label="Search IAMJOSHWA">
          <button className="command-backdrop" type="button" aria-label="Cerrar búsqueda" onClick={close} />
          <div className="command-panel">
            <div className="command-search">
              <Search />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SEARCH IAMJOSHWA" />
            </div>
            <div className="command-results">
              {commands.length ? commands.map((command) => {
                const Icon = command.icon;
                return (
                  <button key={`${command.label}-${command.href}`} type="button" onClick={() => runCommand(command)}>
                    <Icon />
                    <span>
                      <strong>{command.label}</strong>
                      <small>{command.hint}</small>
                    </span>
                  </button>
                );
              }) : (
                <Link href="/booking" onClick={close}>
                  <Ticket />
                  <span>
                    <strong>NO ACTIVE SIGNAL</strong>
                    <small>Contact booking</small>
                  </span>
                </Link>
              )}
            </div>
            <p>Enter para abrir · Esc para cerrar · / o ⌘K para buscar</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
