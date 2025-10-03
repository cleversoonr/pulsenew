"use client";

import { Command, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEffect, useState } from "react";

const shortcuts = [
  { id: "insights", label: "Gerar nova síntese de reuniões", shortcut: "⌘" },
  { id: "tasks", label: "Criar tarefa com insight", shortcut: "⇧" },
  { id: "playbooks", label: "Abrir playbook de alinhamento", shortcut: "⌥" },
  { id: "approvals", label: "Acessar fila de aprovações", shortcut: "A" },
  { id: "governance", label: "Ver trilha de auditoria", shortcut: "G" },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-0 text-slate-200 shadow-2xl backdrop-blur">
        <Command value={value} onValueChange={setValue} className="bg-transparent text-slate-200">
          <CommandInput placeholder="Busque por projetos, insights, tarefas ou pergunte ao agente..." className="placeholder:text-slate-500" />
          <CommandGroup heading="Ações rápidas">
            {shortcuts.map((shortcut) => (
              <CommandItem key={shortcut.id} className="flex items-center justify-between text-slate-100">
                {shortcut.label}
                <kbd className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300">
                  {shortcut.shortcut}
                </kbd>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
