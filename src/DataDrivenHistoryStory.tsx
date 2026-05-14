import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

// This page is fully data-driven.
// Put the exported file here: public/data/story-data.json
// Vite will serve it as: `${import.meta.env.BASE_URL}data/story-data.json`

const DATA_URL = `${import.meta.env.BASE_URL}data/story-data.json`;

type GroupType = "general" | "religious" | string;
type ModelType = "Education" | "Occupation" | "Period" | "Other" | string;

type StoryMeta = {
  source: string;
  totalKazakhstanRecords: number;
  totalKazakhRecords: number;
  knownEducationN: number;
  knownOccupationN: number;
  educationRawDistinct: number;
  executionFlagColumns: number;
  overallKazakhEducationRate: number;
  overallOccupationRate: number;
  overallAllNationalitiesRate: number;
  model1N: number;
  model2N: number;
  model3N: number;
  model3ReferenceEducation: string;
  model3ReferenceOccupation: string;
  modelReferencePeriod: string;
};

type EducationRate = {
  level: string;
  short: string;
  rate: number;
  n: number;
  group: GroupType;
};

type OccupationRate = {
  category: string;
  short: string;
  rate: number;
  n: number;
  modelIncluded: boolean;
};

type ComparisonRate = {
  level: string;
  kazakhs: number;
  all: number;
  kazakhN: number;
  allN: number;
};

type OddsRatio = {
  variable: string;
  rawVariable: string;
  or: number;
  low: number;
  high: number;
  p: number;
  type: ModelType;
};

type TimelinePoint = {
  year: number;
  sentenced: number;
  executed: number;
};

type StoryData = {
  meta: StoryMeta;
  educationRates: EducationRate[];
  occupationRates: OccupationRate[];
  comparisonRates: ComparisonRate[];
  oddsRatios: OddsRatio[];
  timeline: TimelinePoint[];
};

type DataStatus = "loading" | "loaded" | "error";

function formatPercent(value: number): string {
  return `${Number(value).toFixed(1)}%`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString();
}

function pLabel(p: number): string {
  if (p < 0.001) return "p < .001";
  return `p = ${p.toFixed(3)}`;
}

function Card({ className = "", children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-3xl border border-zinc-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function CardContent({ className = "", children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={className}>{children}</div>;
}

function Badge({ className = "", children }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function Button({
  active,
  children,
  onClick,
}: React.PropsWithChildren<{ active: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          : "rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
      }
    >
      {children}
    </button>
  );
}

function MetricCard({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <Card className="rounded-2xl bg-white/85 backdrop-blur">
      <CardContent className="p-5">
        <div className="text-3xl font-semibold tracking-tight text-zinc-950">{value}</div>
        <div className="mt-1 text-sm font-medium text-zinc-700">{label}</div>
        <div className="mt-3 text-sm leading-6 text-zinc-500">{detail}</div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  eyebrow,
  title,
  children,
}: React.PropsWithChildren<{ eyebrow: string; title: string }>) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">{eyebrow}</div>
      <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-7 text-zinc-600 md:text-lg">{children}</p>}
    </div>
  );
}

type MultilineTickProps = {
  x?: number;
  y?: number;
  payload?: { value: string | number };
};


function MultilineTick({ x = 0, y = 0, payload }: MultilineTickProps) {
  const value = String(payload?.value ?? "");
  const lines = value.split(/\n/);

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={`${line}-${index}`}
          x={0}
          y={index * 14}
          dy={12}
          textAnchor="middle"
          fill="#3f3f46"
          fontSize={12}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};

  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 text-sm shadow-xl backdrop-blur">
      <div className="mb-1 font-semibold text-zinc-900">{label}</div>
      {typeof row.n === "number" && <div className="mb-1 text-xs text-zinc-500">n = {formatNumber(row.n)}</div>}
      {typeof row.kazakhN === "number" && <div className="mb-1 text-xs text-zinc-500">Kazakh n = {formatNumber(row.kazakhN)}</div>}
      {typeof row.allN === "number" && <div className="mb-1 text-xs text-zinc-500">All n = {formatNumber(row.allN)}</div>}
      {payload.map((item: any) => (
        <div key={item.dataKey} className="flex items-center gap-2 text-zinc-700">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          <span>{item.name}: </span>
          <span className="font-semibold text-zinc-900">
            {item.dataKey === "or" || item.name?.toLowerCase().includes("odds")
              ? Number(item.value).toFixed(2)
              : formatPercent(Number(item.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

function EducationBars({ data, overallRate }: { data: EducationRate[]; overallRate: number }) {
  const maxRate = Math.max(...data.map((d) => d.rate), overallRate, 10);
  const yMax = Math.max(70, Math.ceil((maxRate + 5) / 5) * 5);

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h3 className="text-xl font-semibold text-zinc-950">Execution rate rises at the top of the education hierarchy</h3>
            <p className="mt-1 text-sm text-zinc-500">Share sentenced to death among repressed Kazakhs with known education level.</p>
          </div>
          <Badge className="bg-zinc-100 text-zinc-700">Overall Kazakh rate: {formatPercent(overallRate)}</Badge>
        </div>

        <div className="h-[430px] w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 18, right: 20, left: 0, bottom: 62 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="short" tick={<MultilineTick />} interval={0} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${v}%`} domain={[0, yMax]} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={overallRate}
                stroke="#71717a"
                strokeDasharray="5 5"
                label={{ value: "Overall Kazakh rate", position: "insideTopLeft", fill: "#71717a", fontSize: 12 }}
              />
              <Bar dataKey="rate" name="Execution rate" radius={[10, 10, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.level} fill={entry.group === "religious" ? "#c0392b" : "#5b8fbd"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function OccupationChart({ data, overallRate }: { data: OccupationRate[]; overallRate: number }) {
  const maxRate = Math.max(...data.map((d) => d.rate), overallRate, 10);
  const yMax = Math.max(55, Math.ceil((maxRate + 5) / 5) * 5);

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h3 className="text-xl font-semibold text-zinc-950">Occupation exposes several different risk patterns</h3>
            <p className="mt-1 text-sm text-zinc-500">The chart includes the civilian hierarchy and special categories used in Model 3.</p>
          </div>
          <Badge className="bg-zinc-100 text-zinc-700">Overall occupation sample rate: {formatPercent(overallRate)}</Badge>
        </div>

        <div className="h-[440px] w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 18, right: 20, left: 0, bottom: 62 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="short" tick={<MultilineTick />} interval={0} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${v}%`} domain={[0, yMax]} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={overallRate}
                stroke="#71717a"
                strokeDasharray="5 5"
                label={{ value: "Overall rate", position: "insideTopLeft", fill: "#71717a", fontSize: 12 }}
              />
              <Legend />
              <Bar dataKey="rate" name="Execution rate" radius={[10, 10, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.category} fill={entry.modelIncluded ? "#5b8fbd" : "#b8b5ad"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
            <span className="font-semibold text-zinc-950">Civilian hierarchy:</span> workers/peasants, specialists, senior specialists, and managers.
          </div>
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
            <span className="font-semibold text-zinc-950">Special categories:</span> army, religious figures, students, unemployed, and prisoners.
          </div>
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
            <span className="font-semibold text-zinc-950">Model link:</span> blue bars are categories included in the categorical occupation model.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonChart({
  data,
  overallKazakhRate,
  overallAllRate,
}: {
  data: ComparisonRate[];
  overallKazakhRate: number;
  overallAllRate: number;
}) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-zinc-950">Kazakh pattern compared with all nationalities</h3>
          <p className="mt-1 text-sm text-zinc-500">Higher education stands out more sharply among Kazakh individuals than in the full Kazakhstan subset.</p>
        </div>

        <div className="h-[430px] w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 62 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="level" tick={<MultilineTick />} interval={0} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 65]} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <ReferenceLine y={overallKazakhRate} stroke="#5b8fbd" strokeDasharray="5 5" />
              <ReferenceLine y={overallAllRate} stroke="#7db57c" strokeDasharray="5 5" />
              <Bar dataKey="kazakhs" name="Kazakhs" fill="#5b8fbd" radius={[8, 8, 0, 0]} />
              <Bar dataKey="all" name="All nationalities" fill="#7db57c" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

const ODDS_ORDER = [
  "edu_low_literacy",
  "edu_basic_literacy",
  "edu_primary",
  "edu_vocational",
  "edu_secondary",
  "edu_incomplete_higher",
  "edu_higher",
  "edu_religious",
  "occ_level2_specialists",
  "occ_level3_chiefs",
  "occ_level4_managers",
  "occ_army",
  "occ_prisoner",
  "occ_religious",
  "occ_student",
  "occ_unemployed",
  "period_collectivization",
  "period_early",
  "period_late",
];

function OddsPlot({ data, meta }: { data: OddsRatio[]; meta: StoryMeta }) {
  const [filter, setFilter] = useState<"All" | "Education" | "Occupation" | "Period">("All");

  const sortedData = useMemo(() => {
    const order = new Map(ODDS_ORDER.map((key, index) => [key, index]));
    return [...data].sort((a, b) => (order.get(a.rawVariable) ?? 999) - (order.get(b.rawVariable) ?? 999));
  }, [data]);

  const filtered = useMemo(() => {
    return sortedData.filter((d) => filter === "All" || d.type === filter);
  }, [filter, sortedData]);

  const xMax = useMemo(() => {
    const maxHigh = Math.max(...filtered.map((d) => d.high), 1);
    return Math.max(4.5, Math.ceil((maxHigh + 0.2) * 10) / 10);
  }, [filtered]);

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h3 className="text-xl font-semibold text-zinc-950">Model 3: odds of execution relative to reference groups</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Reference groups: {meta.model3ReferenceEducation}, {meta.model3ReferenceOccupation}, and {meta.modelReferencePeriod}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["All", "Education", "Occupation", "Period"] as const).map((item) => (
              <Button key={item} active={filter === item} onClick={() => setFilter(item)}>
                {item}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="h-[600px] w-full">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 12, right: 30, bottom: 30, left: 128 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" dataKey="or" name="Odds ratio" domain={[0, xMax]} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="variable"
                  width={124}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  reversed
                  allowDuplicatedCategory={false}
                />
                <ZAxis range={[80, 80]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as OddsRatio;
                    return (
                      <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 text-sm shadow-xl">
                        <div className="font-semibold text-zinc-950">{d.variable}</div>
                        <div className="mt-1 text-zinc-600">
                          Odds ratio: <b>{d.or.toFixed(2)}</b>
                        </div>
                        <div className="text-zinc-600">
                          95% CI: {d.low.toFixed(2)}–{d.high.toFixed(2)}
                        </div>
                        <div className="text-zinc-500">{pLabel(d.p)}</div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={1} stroke="#27272a" strokeDasharray="5 5" />
                <Scatter data={filtered} fill="#5b8fbd">
                  {filtered.map((entry) => (
                    <Cell
                      key={entry.rawVariable}
                      fill={entry.type === "Period" ? "#9ca3af" : entry.or > 1.5 ? "#c0392b" : "#5b8fbd"}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-5 text-sm leading-6 text-zinc-600">
            <div className="font-semibold text-zinc-950">How to read this</div>
            <p className="mt-2">Odds ratios above 1 indicate higher odds of execution relative to the reference category. Odds ratios below 1 indicate lower odds.</p>
            <p className="mt-3">
              <span className="font-semibold text-zinc-950">Model 3 N:</span> {formatNumber(meta.model3N)}.
            </p>
            <p className="mt-3">
              This categorical model keeps religious education and special occupation categories visible instead of forcing everything into one ordinal hierarchy.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineChart({ data }: { data: TimelinePoint[] }) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-zinc-950">Repression was not evenly distributed over time</h3>
          <p className="mt-1 text-sm text-zinc-500">The Great Terror years dominate the execution count, so period controls are essential.</p>
        </div>

        <div className="h-[420px] w-full">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 20, right: 22, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <ReferenceLine
                x={1930}
                stroke="#e5cfa8"
                strokeWidth={2}
                label={{ value: "Collectivization", position: "insideTopLeft", fill: "#a16207", fontSize: 12 }}
              />
              <ReferenceLine
                x={1937}
                stroke="#d8b4fe"
                strokeWidth={2}
                label={{ value: "Great Terror", position: "insideTop", fill: "#7e22ce", fontSize: 12 }}
              />
              <Line type="monotone" dataKey="sentenced" name="Total sentenced" stroke="#93c5fd" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="executed" name="Executed" stroke="#c0392b" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-5 text-center">
      <div className="max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="text-xl font-semibold text-zinc-950">Loading story data…</div>
        <p className="mt-3 text-sm leading-6 text-zinc-600">Reading public/data/story-data.json</p>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-5">
      <div className="max-w-xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        <div className="text-xl font-semibold text-zinc-950">Could not load story-data.json</div>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Make sure the file exists at <code className="rounded bg-zinc-100 px-1.5 py-0.5">public/data/story-data.json</code> and restart the dev server.
        </p>
      </div>
    </div>
  );
}

export default function DataDrivenHistoryStory() {
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [status, setStatus] = useState<DataStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error(`Failed to load ${DATA_URL}`);
        const json = (await response.json()) as StoryData;
        if (!cancelled) {
          setStoryData(json);
          setStatus("loaded");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const highlights = useMemo(() => {
    if (!storyData) return null;
    return {
      higher: storyData.educationRates.find((d) => d.level === "Higher"),
      religiousEducation: storyData.educationRates.find((d) => d.group === "religious"),
      managers: storyData.occupationRates.find((d) => d.category === "Managers"),
      religiousOccupation: storyData.occupationRates.find((d) => d.category === "Religious"),
      armyOdds: storyData.oddsRatios.find((d) => d.rawVariable === "occ_army"),
      higherOdds: storyData.oddsRatios.find((d) => d.rawVariable === "edu_higher"),
    };
  }, [storyData]);

  if (status === "loading") return <LoadingState />;
  if (status === "error" || !storyData) return <ErrorState />;

  const { meta } = storyData;

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-zinc-950">
      <header className="relative overflow-hidden border-b border-zinc-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(91,143,189,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(192,57,43,0.12),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="bg-zinc-950 text-white">Kazakh SSR · Soviet-era political repression · 1918–1953</Badge>
              <Badge className="bg-emerald-100 text-emerald-800">Dataset-driven</Badge>
            </div>

            <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">Who was executed?</h1>
            <p className="mt-5 max-w-3xl text-xl leading-8 text-zinc-600 md:text-2xl md:leading-9">
              A data-driven story about education, occupation, and death sentences among repressed Kazakhs during the Soviet era.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <MetricCard
                value={formatNumber(meta.totalKazakhRecords)}
                label="Kazakh records"
                detail="The study focuses on Kazakh individuals within the Kazakhstan subset."
              />
              <MetricCard
                value={formatNumber(meta.knownEducationN)}
                label="Known education"
                detail="Records with usable education information after cleaning."
              />
              <MetricCard
                value={formatNumber(meta.knownOccupationN)}
                label="Known occupation"
                detail="Records with usable occupation categories after classification."
              />
            </div>
          </motion.div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <SectionTitle eyebrow="Research question" title="Did social capital increase the probability of a death sentence?">
            This story tests whether education level and professional status were associated with a higher probability of execution among repressed Kazakhs, while accounting for historical period.
          </SectionTitle>

          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Why education?</div>
                <p className="mt-4 text-lg leading-8 text-zinc-700">
                  Education can indicate knowledge, authority, and links to national elites. In the context of repression, these traits could become political risk factors.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Why occupation?</div>
                <p className="mt-4 text-lg leading-8 text-zinc-700">
                  Occupation captures institutional authority, professional expertise, social visibility, and special targeting categories such as army or religious figures.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Why period?</div>
                <p className="mt-4 text-lg leading-8 text-zinc-700">
                  Execution risk changed sharply across time. The Great Terror must be separated from earlier and later repression waves.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
            <SectionTitle eyebrow="Data pipeline" title="The page reads its figures from the exported dataset results">
              The Python analysis creates a single JSON file with descriptive rates, model odds ratios, sample sizes, and timeline counts. This page reads that file directly.
            </SectionTitle>

            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard value={formatNumber(meta.totalKazakhstanRecords)} label="Kazakhstan subset" detail="All nationalities before filtering to Kazakh individuals." />
              <MetricCard value={formatNumber(meta.educationRawDistinct)} label="Raw education values" detail="Collapsed into standardized education categories." />
              <MetricCard value={formatNumber(meta.executionFlagColumns)} label="Sentence fields checked" detail="Used to create the binary execution outcome." />
              <MetricCard value={formatNumber(meta.model3N)} label="Model 3 sample" detail="Categorical education + categorical occupation + period controls." />
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
            <SectionTitle eyebrow="Finding 1" title="The education pattern is not linear, but risk rises at the top">
              The descriptive pattern is strongest for higher and religious education: higher education reaches {highlights?.higher ? formatPercent(highlights.higher.rate) : "—"}, while religious education reaches {highlights?.religiousEducation ? formatPercent(highlights.religiousEducation.rate) : "—"}.
            </SectionTitle>
            <EducationBars data={storyData.educationRates} overallRate={meta.overallKazakhEducationRate} />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <SectionTitle eyebrow="Finding 2" title="Occupation adds a second layer to the story">
            The occupation chart keeps both the professional hierarchy and special groups. Managers are at {highlights?.managers ? formatPercent(highlights.managers.rate) : "—"}, while religious occupation reaches {highlights?.religiousOccupation ? formatPercent(highlights.religiousOccupation.rate) : "—"}.
          </SectionTitle>
          <OccupationChart data={storyData.occupationRates} overallRate={meta.overallOccupationRate} />
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
            <SectionTitle eyebrow="Finding 3" title="The Kazakh pattern is not simply a generic dataset pattern">
              Compared with the full Kazakhstan subset, Kazakh individuals with higher education show a stronger execution-rate gap.
            </SectionTitle>
            <ComparisonChart
              data={storyData.comparisonRates}
              overallKazakhRate={meta.overallKazakhEducationRate}
              overallAllRate={meta.overallAllNationalitiesRate}
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <SectionTitle eyebrow="Finding 4" title="The categorical model strengthens the story but adds caution">
            Model 3 shows large positive associations for some categories, including higher education and several special occupation categories, while period remains central to interpretation.
          </SectionTitle>
          <OddsPlot data={storyData.oddsRatios} meta={meta} />
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
            <SectionTitle eyebrow="Historical context" title="The timing of repression matters as much as social profile">
              The timeline shows why arrest period is not just a control variable. The Great Terror years dominate the execution count.
            </SectionTitle>
            <TimelineChart data={storyData.timeline} />
          </div>
        </section>

        <section className="border-t border-zinc-200 bg-zinc-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-[1.2fr_0.8fr] md:px-8">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400">Conclusion</div>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight">Repression was not socially neutral.</h2>
              <p className="mt-5 text-lg leading-8 text-zinc-300">
                Among documented repressed Kazakhs, death sentences were more common among people with higher education and among selected high-status or institutionally visible occupations. The evidence suggests a selective loss of human capital and leadership, while still requiring caution because the database reflects documented records rather than a complete census of all victims.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="font-semibold">Limitations</div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                <li>• Openlist records are documented records, not a complete census of all victims.</li>
                <li>• Missing education and occupation data may bias the sample.</li>
                <li>• Education and occupation classifications rely on keyword matching and may contain errors.</li>
                <li>• Religious education and religious occupation are analytically different from secular education and civilian occupation categories.</li>
              </ul>
              <div className="mt-6 text-xs uppercase tracking-[0.2em] text-zinc-500">Source: {meta.source} · Generated from story-data.json</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
