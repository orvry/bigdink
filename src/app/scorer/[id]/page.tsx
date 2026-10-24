import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MATCH_SELECT, rulesOf } from "@/lib/data";
import { addPoint, undoPoint, setPaused } from "@/app/actions";
import { gamePoint } from "@/lib/rules";
import Breadcrumbs from "@/components/Breadcrumbs";
import type { Team } from "@/lib/types";
import ShareButton from "@/components/ShareButton";
import StatusChip from "@/components/StatusChip";
import { num, btn, btn2, muted } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function ScoreGame({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "scorer"]);
  const { id } = await params;
  const sb = await createClient();
  const { data: m } = await sb
    .from("matches")
    .select(MATCH_SELECT)
    .eq("id", id)
    .single();
  if (!m || !m.team1 || !m.team2) notFound();
  const { ptw, wb } = rulesOf(m);
  const { data: ev } = await sb
    .from("score_events")
    .select("team_id,player")
    .eq("match_id", id);
  const count = (team: string, p: string) =>
    (ev ?? []).filter((e) => e.team_id === team && (e.player ?? "") === p)
      .length;
  const final = m.status === "final";
  const paused = m.status === "paused";
  const locked = final || paused;
  const winner = final
    ? m.winner_id === m.team1_id
      ? m.team1.name
      : m.team2.name
    : null;

  const side = (team: Team, tone: string) => {
    const players = [team.player1, team.player2].filter((p): p is string =>
      Boolean(p),
    );
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm font-bold">{team.name}</div>
        <div className="flex gap-2.5">
          {(players.length ? players : [""]).map((p) => (
            <form
              key={p}
              action={addPoint.bind(null, id, team.id, p)}
              className="flex-1"
            >
              <button
                disabled={locked}
                className={`flex min-h-32 w-full flex-col items-center justify-center gap-1 rounded-2xl md:min-h-44 ${tone} disabled:opacity-50`}
              >
                <span className="text-sm font-semibold">{p || team.name}</span>
                <span className={`${num} text-[56px] md:text-[72px]`}>
                  {count(team.id, p)}
                </span>
                <span className="text-xs font-semibold">+1 point</span>
              </button>
            </form>
          ))}
        </div>
      </div>
    );
  };
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Summary", href: "/" },
          { label: "Score", href: "/scorer" },
          { label: `Game ${m.game_no}` },
        ]}
      />
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm ${muted}`}>
          Game {m.game_no} · {m.round}
          {m.court ? ` · Court ${m.court}` : ""} · First to {ptw}, win by {wb}
        </p>
        <StatusChip status={m.status} />
      </div>
      <div className="flex items-center justify-around rounded-2xl border border-[color:var(--line)] bg-[var(--card)] px-5 py-3">
        <div className="text-center">
          <div className={`text-xs ${muted}`}>{m.team1.name}</div>
          <div className={`${num} text-[64px] md:text-[88px]`}>{m.score1}</div>
        </div>
        <span className={muted}>–</span>
        <div className="text-center">
          <div className={`text-xs ${muted}`}>{m.team2.name}</div>
          <div className={`${num} text-[64px] md:text-[88px]`}>{m.score2}</div>
        </div>
      </div>

      {final && (
        <div
          role="status"
          className="rounded-2xl bg-[var(--solid)] p-4 text-center text-[color:var(--on-solid)]"
        >
          <div className="text-lg font-bold">
            Game over: {winner} wins {Math.max(m.score1, m.score2)}–
            {Math.min(m.score1, m.score2)}
          </div>
          <p className="text-sm">
            The game ended automatically at the win score.
          </p>
        </div>
      )}
      {paused && (
        <p
          role="status"
          className="rounded-xl bg-[#F5C84C] p-3 text-center text-sm font-semibold text-[#10231A]"
        >
          Game paused. Resume to keep scoring.
        </p>
      )}
      {m.status === "live" && gamePoint(m.score1, m.score2, ptw, wb) && (
        <p role="status" className="text-center text-sm font-bold">
          Game point. The next point can end the game.
        </p>
      )}

      {!final && (
        <p className={`text-xs font-bold ${muted}`}>WHO WON THE POINT?</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {side(m.team1, "bg-[#1F7A4D] text-white")}
        {side(m.team2, "bg-[#D9F24A] text-[#10231A]")}
      </div>

      <div className="mt-2 grid gap-2.5 md:grid-cols-3">
        <form action={undoPoint.bind(null, id)}>
          <button disabled={final} className={`${btn2} w-full`}>
            Undo last point
          </button>
        </form>
        {!final && (
          <form action={setPaused.bind(null, id, !paused)}>
            <button
              disabled={m.status === "scheduled"}
              className={`${btn2} w-full`}
            >
              {paused ? "Resume game" : "Pause game"}
            </button>
          </form>
        )}
        {final ? (
          <Link href="/scorer" className={`${btn} w-full`}>
            Back to games
          </Link>
        ) : null}
        <ShareButton
          path={`/live/${id}`}
          title={`${m.team1.name} vs ${m.team2.name}`}
        />
      </div>
      {!final && (
        <p className={`text-xs ${muted}`}>
          The game can’t be ended by hand. It finishes when a team reaches {ptw}{" "}
          with a {wb}-point lead. Until then you can pause.
        </p>
      )}
    </>
  );
}
