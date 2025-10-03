"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bell, CalendarClock, Command as CommandIcon, Sparkles, SunDim } from "lucide-react";
import { useState } from "react";
import { CommandPalette } from "./command-palette";

export function TopBar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
      <CommandPalette open={open} onOpenChange={setOpen} />
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Busque por projetos, tarefas, insights ou pergunte ao Pulse Agent"
          className="h-11 w-full border-white/10 bg-slate-900/40 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-400"
        />
        <Button
          variant="outline"
          className="hidden items-center gap-2 border-white/10 bg-slate-900/40 text-slate-100 hover:border-emerald-300/60 hover:bg-emerald-400/10 lg:flex"
          onClick={() => setOpen(true)}
        >
          <CommandIcon className="h-4 w-4" />
          <span>Cmd + K</span>
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 border border-white/10 bg-slate-900/40 text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-400/15"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="border border-white/10 bg-slate-900/95 text-slate-200">
              <p>Gerar insight instantâneo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          size="icon"
          variant="ghost"
          className="relative h-10 w-10 border border-white/10 bg-slate-900/40 text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-400/15"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-semibold text-slate-950">
            3
          </span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 border border-white/10 bg-slate-900/40 text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-400/15"
        >
          <SunDim className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-2 pr-3">
          <Avatar className="h-9 w-9 border border-emerald-500/60">
            <AvatarImage src="/avatars/isabelle.png" alt="Isabelle França" />
            <AvatarFallback className="bg-emerald-500/20 text-emerald-200">IF</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Isabelle França</p>
            <p className="text-xs text-emerald-200/70">Produto · Aurora</p>
          </div>
          <Button size="icon" variant="ghost" className="h-9 w-9 border border-white/10 bg-slate-900/60">
            <CalendarClock className="h-4 w-4 text-emerald-200" />
          </Button>
        </div>
      </div>
    </div>
  );
}
