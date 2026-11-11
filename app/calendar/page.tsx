"use client";

import * as React from "react";
import { Bell, Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CounsellingEvent = {
  id: string;
  title: string;
  round: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "completed";
  category: "registration" | "verification" | "rank" | "counselling" | "allotment";
  description: string;
};

const COUNSELLING_SCHEDULE: CounsellingEvent[] = [
  {
    id: "evt-1",
    title: "Online Application & Registration",
    round: "Stage 1",
    startDate: "2026-05-06",
    endDate: "2026-06-06",
    status: "completed",
    category: "registration",
    description: "Online registration and document upload on official portal tneaonline.org.",
  },
  {
    id: "evt-2",
    title: "10-Digit Random Number Assignment",
    round: "Stage 2",
    startDate: "2026-06-12",
    endDate: "2026-06-12",
    status: "completed",
    category: "registration",
    description: "Unique tie-breaking random numbers generated algorithmically by DoTE.",
  },
  {
    id: "evt-3",
    title: "Certificate Verification at TFCs",
    round: "Stage 3",
    startDate: "2026-06-13",
    endDate: "2026-06-30",
    status: "completed",
    category: "verification",
    description: "Online & physical verification of 10th, 12th, community, and nativity certificates.",
  },
  {
    id: "evt-4",
    title: "General Rank List & Grievance Window",
    round: "Stage 4",
    startDate: "2026-07-10",
    endDate: "2026-07-20",
    status: "completed",
    category: "rank",
    description: "Publication of overall rank list. 10-day window for mark or category corrections.",
  },
  {
    id: "evt-5",
    title: "Special Reservation Counselling (7.5% Govt School, Sports, Ex-S)",
    round: "Special",
    startDate: "2026-07-22",
    endDate: "2026-07-27",
    status: "completed",
    category: "counselling",
    description: "In-person / online counselling for preferential 7.5% quota and differently abled candidates.",
  },
  {
    id: "evt-6",
    title: "Round 1 Choice Filling & Locking",
    round: "Round 1 (Ranks 1 – 26,000)",
    startDate: "2026-07-28",
    endDate: "2026-07-30",
    status: "completed",
    category: "counselling",
    description: "Top ranks choice entry and choice re-ordering. Mandatory locking before 5:00 PM.",
  },
  {
    id: "evt-7",
    title: "Round 1 Provisional Allotment & Upward Confirmation",
    round: "Round 1",
    startDate: "2026-07-31",
    endDate: "2026-08-03",
    status: "completed",
    category: "allotment",
    description: "Seat allotment release. Candidates select Accept & Join or Accept & Upward.",
  },
  {
    id: "evt-8",
    title: "Round 2 Choice Filling & Locking",
    round: "Round 2 (Ranks 26,001 – 95,000)",
    startDate: "2026-08-08",
    endDate: "2026-08-11",
    status: "completed",
    category: "counselling",
    description: "Mid ranks choice entry. Vacancy matrix updated after Round 1 upward shifts.",
  },
  {
    id: "evt-9",
    title: "Round 2 Provisional Allotment",
    round: "Round 2",
    startDate: "2026-08-12",
    endDate: "2026-08-15",
    status: "completed",
    category: "allotment",
    description: "Round 2 seat confirmation and upward movement declaration.",
  },
  {
    id: "evt-10",
    title: "Round 3 Choice Filling & Supplementary Rounds",
    round: "Round 3 (Ranks 95,001 – End)",
    startDate: "2026-08-20",
    endDate: "2026-08-25",
    status: "completed",
    category: "counselling",
    description: "Final general round followed by SCA-to-SC seat conversion and supplementary rounds.",
  },
];

export default function CalendarPage() {
  const [filter, setFilter] = React.useState<string>("all");
  const [notificationsSubscribed, setNotificationsSubscribed] = React.useState(false);

  const filteredEvents =
    filter === "all"
      ? COUNSELLING_SCHEDULE
      : COUNSELLING_SCHEDULE.filter((evt) => evt.category === filter);

  function handleEnableNotifications() {
    if (!("Notification" in window)) {
      toast.error("Browser push notifications are not supported in this browser.");
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        setNotificationsSubscribed(true);
        toast.success("Push notifications enabled! You will receive reminders for key dates.");
      } else {
        toast.error("Notification permission was dismissed or blocked.");
      }
    });
  }

  function handleDownloadIcs() {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TNEA Compass//Counselling Schedule//EN\n";

    COUNSELLING_SCHEDULE.forEach((evt) => {
      const dtStart = evt.startDate.replace(/-/g, "");
      const dtEnd = evt.endDate.replace(/-/g, "");
      icsContent += `BEGIN:VEVENT\nSUMMARY:TNEA: ${evt.title}\nDESCRIPTION:${evt.description}\nDTSTART;VALUE=DATE:${dtStart}\nDTEND;VALUE=DATE:${dtEnd}\nSTATUS:CONFIRMED\nEND:VEVENT\n`;
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tnea-counselling-schedule.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("Downloaded calendar events (.ics) for Google & Apple Calendar");
  }

  return (
    <>
      <PageHeader
        eyebrow="Key Deadlines"
        title="TNEA Counselling Calendar & Alerts"
        description="Track all milestone dates for registration, verification, choice locking, and upward movement allotment rounds."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadIcs}
              className="gap-1.5"
            >
              <Download className="size-3.5" />
              Export to Calendar (.ics)
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleEnableNotifications}
              className="gap-1.5"
            >
              <Bell className="size-3.5" />
              {notificationsSubscribed ? "Alerts Active" : "Get Deadline Alerts"}
            </Button>
          </div>
        }
      />

      <div className="container-page py-8 md:py-12">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Milestones" },
            { id: "registration", label: "Registration" },
            { id: "verification", label: "Verification" },
            { id: "counselling", label: "Choice Rounds" },
            { id: "allotment", label: "Allotments" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Timeline Event Cards */}
        <div className="mt-8 space-y-4">
          {filteredEvents.map((evt) => (
            <Card
              key={evt.id}
              className="p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {evt.round}
                    </Badge>
                    <span className="text-xs font-semibold text-primary">
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(evt.startDate))}
                      {evt.startDate !== evt.endDate &&
                        ` – ${new Intl.DateTimeFormat("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(evt.endDate))}`}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {evt.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {evt.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                  <Badge variant="secondary" className="text-xs">
                    Official Milestone
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
