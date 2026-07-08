"use client";

import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

export function ScheduleView() {
  return (
    <div
      className="fade-in grid min-h-[60vh] place-items-center p-4"
      onClick={() => {
        toast("Schedule coming soon!", {
          description: "We're working on bringing the schedule feature to Ichidoki.",
        });
      }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <CalendarDays className="h-12 w-12 text-white/20" />
        <p className="text-sm font-medium text-white/70">Schedule</p>
        <p className="text-xs text-white/40">Coming soon</p>
      </div>
    </div>
  );
}
