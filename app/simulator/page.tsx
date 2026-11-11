"use client";

import * as React from "react";
import {
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  ListPlus,
} from "lucide-react";
import { toast } from "sonner";

import { useChoices } from "@/components/choices-provider";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  simulateCounselling,
  type SimulationResult,
  TNEA_ROUND_RANK_BOUNDS,
} from "@/lib/simulator";
import type { ChoiceRecord } from "@/lib/choices";

const COMMUNITIES = ["OC", "BC", "BCM", "MBC", "SC", "SCA", "ST"] as const;

const SAMPLE_CHOICES: ChoiceRecord[] = [
  {
    id: 1,
    collegeCode: "0001",
    collegeName: "College of Engineering, Guindy (CEG), Anna University",
    collegeShortName: "CEG",
    branchCode: "CS",
    branchName: "Computer Science and Engineering",
    district: "Chennai",
    type: "Government",
    community: "BC",
    dataYear: 2026,
    cutoffMark: 199.5,
    rank: 120,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    collegeCode: "0004",
    collegeName: "Madras Institute of Technology (MIT), Chromepet",
    collegeShortName: "MIT",
    branchCode: "IT",
    branchName: "Information Technology",
    district: "Chengalpattu",
    type: "Government",
    community: "BC",
    dataYear: 2026,
    cutoffMark: 198.0,
    rank: 450,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 3,
    collegeCode: "2006",
    collegeName: "PSG College of Technology, Peelamedu, Coimbatore",
    collegeShortName: "PSG Tech",
    branchCode: "CS",
    branchName: "Computer Science and Engineering",
    district: "Coimbatore",
    type: "Aided",
    community: "BC",
    dataYear: 2026,
    cutoffMark: 197.5,
    rank: 850,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 4,
    collegeCode: "1315",
    collegeName: "Sri Sivasubramaniya Nadar College of Engineering (SSN), Kalavakkam",
    collegeShortName: "SSN",
    branchCode: "CS",
    branchName: "Computer Science and Engineering",
    district: "Chengalpattu",
    type: "Self-Financing",
    community: "BC",
    dataYear: 2026,
    cutoffMark: 196.5,
    rank: 2100,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 5,
    collegeCode: "2007",
    collegeName: "Coimbatore Institute of Technology (CIT), Civil Aerodrome",
    collegeShortName: "CIT",
    branchCode: "EC",
    branchName: "Electronics and Communication Engineering",
    district: "Coimbatore",
    type: "Aided",
    community: "BC",
    dataYear: 2026,
    cutoffMark: 194.0,
    rank: 4500,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 6,
    collegeCode: "2712",
    collegeName: "Kumaraguru College of Technology (KCT), Chinnavedampatti",
    collegeShortName: "KCT",
    branchCode: "CS",
    branchName: "Computer Science and Engineering",
    district: "Coimbatore",
    type: "Self-Financing",
    community: "BC",
    dataYear: 2026,
    cutoffMark: 191.0,
    rank: 9800,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 7,
    collegeCode: "1419",
    collegeName: "Sri Sai Ram Engineering College, West Tambaram",
    collegeShortName: "Sai Ram",
    branchCode: "CS",
    branchName: "Computer Science and Engineering",
    district: "Kancheepuram",
    type: "Self-Financing",
    community: "BC",
    dataYear: 2026,
    cutoffMark: 185.0,
    rank: 18500,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
];

export default function SimulatorPage() {
  const { choices: userChoices } = useChoices();
  const [rankInput, setRankInput] = React.useState("4200");
  const [community, setCommunity] = React.useState<string>("BC");
  const [activeChoices, setActiveChoices] = React.useState<ChoiceRecord[]>(SAMPLE_CHOICES);
  const [result, setResult] = React.useState<SimulationResult | null>(null);
  const [selectedRound, setSelectedRound] = React.useState("1");

  // Sync choices with user's stored list if available
  const hasUserChoices = userChoices.length > 0;

  function handleUseUserChoices() {
    if (userChoices.length === 0) {
      toast.error("Your choice list is currently empty. Add colleges from the explorer first!");
      return;
    }
    setActiveChoices(userChoices);
    toast.success(`Loaded ${userChoices.length} choices from your saved list.`);
  }

  function handleUseSampleChoices() {
    setActiveChoices(SAMPLE_CHOICES);
    toast.success("Loaded sample balanced choice list.");
  }

  const handleRunSimulation = React.useCallback(() => {
    const rank = parseInt(rankInput, 10);
    if (Number.isNaN(rank) || rank < 1 || rank > 300000) {
      toast.error("Please enter a valid rank between 1 and 300,000.");
      return;
    }

    if (activeChoices.length === 0) {
      toast.error("Please add choices or load the sample list before simulating.");
      return;
    }

    const sim = simulateCounselling(rank, community, activeChoices);
    setResult(sim);

    // Pick appropriate starting tab based on entry round
    if (rank <= TNEA_ROUND_RANK_BOUNDS[1].max) {
      setSelectedRound("1");
    } else if (rank <= TNEA_ROUND_RANK_BOUNDS[2].max) {
      setSelectedRound("2");
    } else {
      setSelectedRound("3");
    }

    toast.success("Simulation computed against 7-year cutoff records!");
  }, [rankInput, community, activeChoices]);

  // Run on initial load
  React.useEffect(() => {
    handleRunSimulation();
  }, [handleRunSimulation]);

  return (
    <>
      <PageHeader
        eyebrow="Admissions Laboratory"
        title="TNEA Counselling Simulator"
        description="Step through the multi-round seat allotment process before locking your official choices. Test upward movement scenarios and identify hazardous choice-ordering mistakes."
        actions={
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <PlayCircle className="size-3.5 text-primary" />
            Deterministic round algorithm
          </Badge>
        }
      />

      <div className="container-page py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1.9fr]">
          {/* Controls Column */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold">Candidate Parameters</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Set your general rank and reservation category to evaluate your allotment chances.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="rank-input" className="text-xs">
                    Overall Rank (TNEA General Rank)
                  </Label>
                  <Input
                    id="rank-input"
                    type="number"
                    min="1"
                    max="300000"
                    value={rankInput}
                    onChange={(e) => setRankInput(e.target.value)}
                    placeholder="e.g. 5420"
                    className="mt-1 font-mono"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Round 1: 1–26,000 · Round 2: 26,001–95,000 · Round 3: 95,001+
                  </p>
                </div>

                <div>
                  <Label htmlFor="community-select" className="text-xs">
                    Community Category
                  </Label>
                  <Select value={community} onValueChange={setCommunity}>
                    <SelectTrigger id="community-select" className="mt-1">
                      <SelectValue placeholder="Select community" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMUNITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2">
                  <Label className="text-xs">Choice List Source</Label>
                  <div className="mt-2 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseUserChoices}
                      disabled={!hasUserChoices}
                      className="justify-start text-xs"
                    >
                      <ListPlus className="mr-2 size-3.5 text-primary" />
                      Use My Saved Choices ({userChoices.length} items)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseSampleChoices}
                      className="justify-start text-xs"
                    >
                      <RotateCcw className="mr-2 size-3.5" />
                      Load Balanced Demo List (7 top colleges)
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleRunSimulation}
                  className="w-full font-semibold"
                >
                  <PlayCircle className="mr-2 size-4" />
                  Run Allotment Simulation
                </Button>
              </div>
            </Card>

            {/* Inverted Priority & Risk Warnings */}
            {result && (
              <Card className="p-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="size-4 text-primary" />
                  List Health & Risk Balance
                </h3>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg border border-border bg-card p-2.5">
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {result.riskAnalysis.safeCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Safe
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2.5">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {result.riskAnalysis.targetCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Target
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2.5">
                    <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {result.riskAnalysis.ambitiousCount + result.riskAnalysis.unlikelyCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Dream
                    </div>
                  </div>
                </div>

                {result.riskAnalysis.warnings.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {result.riskAnalysis.warnings.map((w, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive leading-relaxed"
                      >
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                        <div>{w}</div>
                      </div>
                    ))}
                  </div>
                )}

                {result.riskAnalysis.recommendations.length > 0 && (
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Recommendations:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {result.riskAnalysis.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Results Column */}
          <div className="space-y-6">
            {result ? (
              <div>
                <Tabs value={selectedRound} onValueChange={setSelectedRound}>
                  <div className="flex items-center justify-between">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="1">Round 1 (Top Ranks)</TabsTrigger>
                      <TabsTrigger value="2">Round 2 (Mid Ranks)</TabsTrigger>
                      <TabsTrigger value="3">Round 3 (General)</TabsTrigger>
                    </TabsList>
                  </div>

                  {result.rounds.map((roundRes) => (
                    <TabsContent
                      key={roundRes.round}
                      value={roundRes.round.toString()}
                      className="mt-6 space-y-6"
                    >
                      {/* Round Allotment Status */}
                      <Card className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              R{roundRes.round}
                            </span>
                            <h3 className="text-base font-semibold">
                              Round {roundRes.round} Allotment Result
                            </h3>
                          </div>
                          {roundRes.status === "allotted" ? (
                            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                              <CheckCircle2 className="mr-1 size-3" />
                              Seat Allotted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No Allotment Yet
                            </Badge>
                          )}
                        </div>

                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                          {roundRes.rationale}
                        </p>

                        {roundRes.allottedChoice && (
                          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                                Priority #{roundRes.allottedChoice.priority} on your list
                              </div>
                              <span className="font-mono text-xs text-muted-foreground">
                                Historic Close: Rank{" "}
                                {roundRes.allottedChoice.rank?.toLocaleString("en-IN") ?? "N/A"}
                              </span>
                            </div>

                            <div className="mt-3 space-y-1">
                              <h4 className="text-base font-bold text-foreground">
                                {roundRes.allottedChoice.collegeName}
                              </h4>
                              <p className="text-sm font-medium text-primary">
                                {roundRes.allottedChoice.branchName} ({roundRes.allottedChoice.branchCode})
                              </p>
                              <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                                <span>District: {roundRes.allottedChoice.district}</span>
                                <span>·</span>
                                <span>Type: {roundRes.allottedChoice.type}</span>
                              </div>
                            </div>

                            {/* Decision Options in TNEA */}
                            <div className="mt-6 border-t border-primary/15 pt-4">
                              <h5 className="text-xs font-semibold text-foreground">
                                TNEA Allotment Options at this Stage:
                              </h5>
                              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 text-xs">
                                <div className="rounded-lg border border-border bg-card p-3">
                                  <div className="font-semibold text-foreground">
                                    Option A: Accept & Join
                                  </div>
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    Confirm this college. Download your provisional allotment letter and report to campus within 5 days.
                                  </p>
                                </div>
                                <div className="rounded-lg border border-border bg-card p-3">
                                  <div className="font-semibold text-foreground">
                                    Option B: Accept & Upward
                                  </div>
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    Lock this seat as a guaranteed backup while competing for higher priority choices in subsequent rounds.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>

                      {/* Upward Movement Analysis */}
                      {roundRes.upwardMovementChoices.length > 0 && (
                        <Card className="p-6">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="size-4 text-primary" />
                            <h4 className="text-sm font-semibold">
                              Upward Movement Forecast (Choices Above Allotment)
                            </h4>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            If you select &quot;Accept &amp; Upward&quot;, you are evaluated for the choices placed higher on your list if seats become vacant.
                          </p>

                          <div className="mt-4 space-y-2.5">
                            {roundRes.upwardMovementChoices.map((upChoice) => (
                              <div
                                key={upChoice.id}
                                className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold text-muted-foreground">
                                      #{upChoice.priority}
                                    </span>
                                    <span className="font-semibold text-foreground">
                                      {upChoice.collegeName}
                                    </span>
                                  </div>
                                  <div className="text-muted-foreground">
                                    {upChoice.branchName} ({upChoice.branchCode})
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <Badge
                                    variant={
                                      upChoice.probability === "likely"
                                        ? "default"
                                        : upChoice.probability === "possible"
                                        ? "outline"
                                        : "secondary"
                                    }
                                    className="text-[10px]"
                                  >
                                    {upChoice.probability === "likely"
                                      ? "Likely Upward"
                                      : upChoice.probability === "possible"
                                      ? "Possible in R3"
                                      : "Low Chance"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            ) : (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Set your parameters and click &quot;Run Allotment Simulation&quot; to begin.
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
