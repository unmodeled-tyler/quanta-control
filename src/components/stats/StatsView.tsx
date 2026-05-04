import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Flame,
  GitCommit,
  RefreshCw,
  Settings,
  Sparkles,
} from "lucide-react";
import { useRepoStore } from "../../stores/repoStore";
import { useSettingsStore } from "../../stores/settingsStore";
import * as api from "../../services/api";
import type { CommitActivity, CommitActivityDay } from "../../types/git";

function toLocalDateParts(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return {
    weekday: date.getDay(),
    label: date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    month: date.toLocaleDateString(undefined, { month: "short" }),
  };
}

function getLevel(count: number, maxCount: number) {
  if (count === 0) return 0;
  if (maxCount <= 1) return 4;
  const ratio = count / maxCount;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function buildWeeks(days: CommitActivityDay[]) {
  if (days.length === 0) return [];

  const firstDay = days[0];
  if (!firstDay) return [];

  const firstWeekday = toLocalDateParts(firstDay.date).weekday;
  const paddedDays = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...days,
  ];

  const trailingPadding = (7 - (paddedDays.length % 7)) % 7;
  for (let index = 0; index < trailingPadding; index += 1) {
    paddedDays.push(null);
  }

  const weeks: Array<Array<CommitActivityDay | null>> = [];
  for (let index = 0; index < paddedDays.length; index += 7) {
    weeks.push(paddedDays.slice(index, index + 7));
  }
  return weeks;
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 shadow-sm shadow-black/5 transition-all duration-150 hover:bg-zinc-900/50 hover:shadow-md hover:shadow-black/10">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

export function StatsView({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { repoPath } = useRepoStore();
  const { settings } = useSettingsStore();
  const [activity, setActivity] = useState<CommitActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detectedIdentity, setDetectedIdentity] = useState<{ name: string; email: string }>({
    name: "",
    email: "",
  });

  useEffect(() => {
    if (!repoPath) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [nameConfig, emailConfig] = await Promise.all([
          api.getGitConfig(repoPath, "user.name"),
          api.getGitConfig(repoPath, "user.email"),
        ]);

        if (cancelled) return;

        const name = settings.userName.trim() || nameConfig.value.trim();
        const email = settings.userEmail.trim() || emailConfig.value.trim();
        setDetectedIdentity({ name, email });

        if (!name && !email) {
          setActivity(null);
          setError("Set a Git identity in your config or app settings to view personal commit stats.");
          return;
        }

        const stats = await api.getCommitActivity(repoPath, { name, email, days: 365 });
        if (!cancelled) {
          setActivity(stats);
        }
      } catch (err) {
        if (!cancelled) {
          setActivity(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [repoPath, refreshKey, settings.userEmail, settings.userName]);

  const weeks = useMemo(() => buildWeeks(activity?.days || []), [activity]);
  const maxCount = useMemo(
    () => Math.max(0, ...(activity?.days.map((day) => day.count) || [0])),
    [activity],
  );

  if (!repoPath) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Stats</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Last 12 months of repo activity for your configured Git identity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshKey((value) => value + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 shadow-sm shadow-black/5">
          <div className="text-xs uppercase tracking-wider text-zinc-500">Tracking identity</div>
          <div className="mt-2 text-sm text-zinc-200">
            {detectedIdentity.name || "Unknown author"}
            {detectedIdentity.email ? ` <${detectedIdentity.email}>` : ""}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Uses app defaults first, then falls back to your Git config.
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-8 text-sm text-zinc-500 shadow-sm shadow-black/5">
            Building commit activity…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-5 shadow-sm shadow-black/5">
            <div className="text-sm font-medium text-amber-200">Stats unavailable</div>
            <p className="mt-2 text-sm text-zinc-400">{error}</p>
            <button
              onClick={onOpenSettings}
              className="mt-4 inline-flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              <Settings className="h-3.5 w-3.5" />
              Open Settings
            </button>
          </div>
        ) : activity ? (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <SummaryCard
                label="Total commits"
                value={String(activity.summary.totalCommits)}
                icon={<GitCommit className="h-3.5 w-3.5" />}
              />
              <SummaryCard
                label="Active days"
                value={String(activity.summary.activeDays)}
                icon={<CalendarDays className="h-3.5 w-3.5" />}
              />
              <SummaryCard
                label="Current streak"
                value={`${activity.summary.currentStreak}d`}
                icon={<Flame className="h-3.5 w-3.5" />}
              />
              <SummaryCard
                label="Longest streak"
                value={`${activity.summary.longestStreak}d`}
                icon={<Sparkles className="h-3.5 w-3.5" />}
              />
            </div>

            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 shadow-sm shadow-black/5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-zinc-100">
                    Contribution heatmap
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    GitHub-style view of commits in this repo over the last year.
                  </div>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  <div>{activity.summary.lastWeekCommits} commits in the last 7 days</div>
                  <div>
                    Busiest day:{" "}
                    {activity.summary.busiestDay
                      ? `${activity.summary.busiestDay.date} (${activity.summary.busiestDay.count})`
                      : "None yet"}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="inline-flex gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((day, dayIndex) => {
                        const level = day ? getLevel(day.count, maxCount) : 0;
                        return (
                          <div
                            key={`${weekIndex}-${dayIndex}`}
                            title={
                              day
                                ? `${day.count} commit${day.count === 1 ? "" : "s"} on ${toLocalDateParts(day.date).label}`
                                : ""
                            }
                            className={`h-3.5 w-3.5 rounded-[3px] border border-zinc-800/40 ${
                              !day
                                ? "bg-transparent"
                                : level === 0
                                  ? "bg-zinc-950"
                                  : level === 1
                                    ? "bg-emerald-900/70"
                                    : level === 2
                                      ? "bg-emerald-700/80"
                                      : level === 3
                                        ? "bg-emerald-500/80"
                                        : "bg-emerald-300"
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 text-xs text-zinc-500">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-3.5 w-3.5 rounded-[3px] border border-zinc-800/40 ${
                      level === 0
                        ? "bg-zinc-950"
                        : level === 1
                          ? "bg-emerald-900/70"
                          : level === 2
                            ? "bg-emerald-700/80"
                            : level === 3
                              ? "bg-emerald-500/80"
                              : "bg-emerald-300"
                    }`}
                  />
                ))}
                <span>More</span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
