"use client";

import { useEffect } from "react";
import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";
import { PulseSummary } from "./pulse-summary";
import { ProjectHealthCards } from "./project-health";
import { InsightStream } from "./insight-stream";
import { MeetingTimeline } from "./meeting-timeline";
import { SprintCapacity } from "./sprint-capacity";
import { TaskGrid } from "./task-grid";
import { ApprovalsQueue } from "./approvals-queue";
import { AgentSpotlight } from "./agent-spotlight";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export function DashboardShell() {
  useEffect(() => {
    document.body.classList.add("bg-slate-950");
    return () => document.body.classList.remove("bg-slate-950");
  }, []);

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />
        <div className="mt-6 flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="gap-6">
            <ResizablePanel defaultSize={68} className="overflow-hidden">
              <div className="flex h-full flex-col gap-6 overflow-x-hidden overflow-y-auto pb-12">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <PulseSummary />
                  <AgentSpotlight />
                </div>
                <ProjectHealthCards />
                <TaskGrid />
                <InsightStream />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-white/10" />
            <ResizablePanel defaultSize={32} className="overflow-hidden">
              <div className="flex h-full flex-col gap-6 overflow-y-auto pb-12">
                <SprintCapacity />
                <MeetingTimeline />
                <ApprovalsQueue />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
