import React from "react";
import {
  AlertTriangle, Boxes, Calendar, CheckCircle2, ChevronRight, Package,
  RefreshCw, Shield, User, Users, Wallet, Wifi, WifiOff, Receipt
} from "lucide-react";

/**
 * Admin home screen.
 *
 * The information order here is deliberate and comes from how established POS
 * back-offices arrange a shop-owner's home: a scope bar, a row of rate/ratio
 * tiles that each carry a comparator, the day's shape, then a conditional
 * "needs attention" queue where every row states the rule it fired on and the
 * action it wants. Nothing renders a bare number without context, and the
 * attention block reads as an accomplishment when it is empty rather than
 * looking like a failed fetch.
 *
 * Purely presentational — every figure arrives as a prop so there is one place
 * (Notification.jsx) that owns fetching and derivation.
 */

function formatCurrency(amount) {
  return `LKR ${Math.round(Number(amount) || 0).toLocaleString("en-US")}`;
}

function formatPercent(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits).replace(/\.0$/, "")}%`;
}

/**
 * A headline figure with a mandatory second line. `tone` colours only the
 * comparator, never the figure, so colour stays a signal rather than decoration.
 */
function MetricTile({ label, value, note, tone = "muted", emphasis = false }) {
  const valueTone = emphasis ? "text-[#C03A3A]" : "text-slate-900";
  const noteTone = {
    muted: "text-slate-400 italic",
    good: "text-emerald-600",
    warn: "text-amber-600",
    critical: "text-[#C03A3A]"
  }[tone] || "text-slate-400";
  const dotTone = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    critical: "bg-[#C03A3A]"
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.055em] text-slate-400">{label}</p>
      <p className={`mt-1.5 text-[21px] font-bold tracking-tight tabular-nums ${valueTone}`}>{value}</p>
      <p className={`mt-1 flex items-center gap-1.5 text-[10.5px] ${noteTone}`}>
        {dotTone && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotTone}`} />}
        {note}
      </p>
    </div>
  );
}

/** Bar with a target marker — reads a rate against its threshold at a glance. */
function BulletBar({ percent, targetPercent, color = "bg-amber-500", leftCaption, rightCaption }) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="mt-2.5">
      <div className="relative h-2.5 overflow-hidden rounded bg-slate-100">
        <div className={`absolute inset-y-0 left-0 rounded ${color}`} style={{ width: `${clamped}%` }} />
        {targetPercent != null && (
          <span
            className="absolute -inset-y-0.5 w-0.5 bg-slate-700"
            style={{ left: `${Math.max(0, Math.min(100, targetPercent))}%` }}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[9.5px] text-slate-400">
        <span>{leftCaption}</span>
        <span>{rightCaption}</span>
      </div>
    </div>
  );
}

/** One row of the attention queue: what fired, the rule behind it, the next step. */
function AttentionRow({ icon, iconClass, title, rule, actionLabel, onAction }) {
  return (
    <div className="flex items-start gap-3.5 border-t border-slate-100 px-4 py-3.5 first:border-t-0">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-slate-800">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{rule}</p>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-[9px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11.5px] font-semibold text-slate-700 transition-colors hover:border-[#1A318C] hover:bg-[#1A318C] hover:text-white"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Net sales per hour. Only the hours around actual trading are drawn — a fixed
 * 24-hour axis would be almost entirely empty for a shop that trades a few
 * hours a day, which reads as missing data rather than a closed shop.
 */
function HourChart({ byHour, formatMoney }) {
  const hoursWithSales = byHour
    .map((total, hour) => ({ total, hour }))
    .filter((h) => h.total > 0);

  if (hoursWithSales.length === 0) {
    return (
      <div className="flex h-[150px] flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
        <Receipt className="mb-2 h-6 w-6 text-slate-300" />
        <p className="text-[12px] font-medium text-slate-500">No sales rung up yet today</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Hourly takings appear here from the first sale</p>
      </div>
    );
  }

  const first = Math.max(0, hoursWithSales[0].hour - 1);
  const last = Math.min(23, hoursWithSales[hoursWithSales.length - 1].hour + 1);
  const tradingHours = [];
  for (let h = first; h <= last; h += 1) tradingHours.push({ hour: h, total: byHour[h] });
  const peak = Math.max(...tradingHours.map((h) => h.total), 1);

  return (
    <div className="mt-3.5 flex h-[150px] items-end gap-2">
      {tradingHours.map(({ hour, total }) => {
        const isEmpty = total <= 0;
        return (
          <div key={hour} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-semibold tabular-nums text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
              {isEmpty ? "0" : formatMoney(total)}
            </span>
            <div
              className={`w-full rounded-t-md transition-colors ${isEmpty ? "bg-slate-200" : "bg-[#2a78d6] group-hover:bg-[#1A318C]"}`}
              style={{ height: isEmpty ? "3px" : `${Math.max(4, (total / peak) * 100)}%` }}
            />
            <span className="font-mono text-[9.5px] text-slate-400">{String(hour).padStart(2, "0")}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard({
  greeting,
  currentUser,
  currentDate,
  isOnline,
  refreshing,
  onRefresh,
  lastUpdatedLabel,
  stats,
  today,
  stock,
  lowStockList,
  recentSales,
  latestSignInLabel,
  onNavigate
}) {
  const {
    takings, count, cashTotal, creditTotal, creditShare,
    avgBasket, memberShare, byHour
  } = today;

  const hasSalesToday = count > 0;
  const creditOverTarget = hasSalesToday && creditShare > 30;
  const availabilityBelowTarget = stock.totalLines > 0 && stock.availability < 96;

  // Only genuinely actionable items reach the queue; anything else stays a
  // report line. An alert that fires every day is one nobody reads.
  const attention = [];
  if (stock.zeroLines > 0) {
    attention.push({
      key: "zero-stock",
      icon: <Boxes className="h-4 w-4" />,
      iconClass: "bg-[#FAE5E5] text-[#C03A3A]",
      title: `${stock.zeroLines} stock ${stock.zeroLines === 1 ? "line is" : "lines are"} at zero units${
        stock.totalLines ? ` — ${formatPercent((stock.zeroLines / stock.totalLines) * 100)} of stock can't be sold` : ""
      }`,
      rule: (
        <>
          Rule: <b className="font-semibold text-slate-700">any line at 0 units</b> blocks sale. On-shelf availability is{" "}
          <b className="font-semibold text-slate-700">{formatPercent(stock.availability)}</b>, below the{" "}
          <b className="font-semibold text-slate-700">96%</b> target.
          {lowStockList.length > 0 && ` ${lowStockList.slice(0, 4).map((i) => i.item_name).filter(Boolean).join(" · ")}`}
        </>
      ),
      actionLabel: "Review stock",
      onAction: () => onNavigate("/dashboard/inventory")
    });
  }
  if (creditOverTarget) {
    attention.push({
      key: "credit",
      icon: <Wallet className="h-4 w-4" />,
      iconClass: "bg-amber-50 text-amber-600",
      title: `${formatCurrency(creditTotal)} of today's ${formatCurrency(takings)} went out on credit`,
      rule: (
        <>
          Rule: flag when credit exceeds <b className="font-semibold text-slate-700">30% of takings</b> — currently{" "}
          <b className="font-semibold text-slate-700">{formatPercent(creditShare)}</b>. Cash in till is{" "}
          {formatCurrency(cashTotal)} against {formatCurrency(creditTotal)} owed.
        </>
      ),
      actionLabel: "View sales",
      onAction: () => onNavigate("/dashboard/sales")
    });
  }
  if (stats.expiringItems > 0) {
    attention.push({
      key: "expiring",
      icon: <AlertTriangle className="h-4 w-4" />,
      iconClass: "bg-orange-50 text-orange-600",
      title: `${stats.expiringItems} item${stats.expiringItems === 1 ? "" : "s"} expiring within 30 days`,
      rule: "Rule: stock dated inside 30 days is worth marking down while it still sells.",
      actionLabel: "Review stock",
      onAction: () => onNavigate("/dashboard/inventory")
    });
  }
  if (stats.totalMembers === 0) {
    attention.push({
      key: "members",
      icon: <Users className="h-4 w-4" />,
      iconClass: "bg-[#EDF0FB] text-[#1A318C]",
      title: "No sales are attributable to a member",
      rule: (
        <>
          Rule: a co-operative distributes surplus{" "}
          <b className="font-semibold text-slate-700">in proportion to member trade</b>. With{" "}
          <b className="font-semibold text-slate-700">0 members registered</b>, no patronage can be calculated.
        </>
      ),
      actionLabel: "Add members",
      onAction: () => onNavigate("/dashboard/users")
    });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F4F5FA]">
      {/* Identity + connection */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#1A318C] to-[#0E1C57] shadow-lg shadow-blue-900/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-semibold text-slate-800">
                {greeting}, {currentUser?.full_name?.split(" ")[0] || currentUser?.username || "Admin"}
              </h1>
              <span className="rounded-full bg-gradient-to-r from-[#1A318C] to-[#3550C4] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">
                Admin
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-slate-500">
              <Calendar className="h-3 w-3" />
              {currentDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
              isOnline ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? "Online" : "Offline"}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-1.5 pr-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#EDF0FB] text-[#1A318C]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[12px] font-semibold leading-tight text-slate-800">
                {currentUser?.full_name || currentUser?.username}
              </p>
              <p className="text-[10px] leading-tight text-slate-400">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Scope + freshness: every figure below is stamped with when it was true */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-6 py-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-600">
          Today
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
          {isOnline ? "Live" : "Offline"} · figures as of{" "}
          <b className="font-mono font-semibold text-slate-700">{lastUpdatedLabel}</b>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-5">
        {/* Rates and ratios, each against a comparator */}
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
          <MetricTile
            label="Net sales today"
            value={formatCurrency(stats.todaySales)}
            note={
              stats.weekSales > 0
                ? `${formatPercent((stats.todaySales / stats.weekSales) * 100)} of this week's ${formatCurrency(stats.weekSales)}`
                : "no sales recorded this week"
            }
            tone={stats.todaySales > 0 ? "good" : "muted"}
          />
          <MetricTile
            label="Taken on credit"
            value={hasSalesToday ? formatPercent(creditShare) : "—"}
            note={
              hasSalesToday
                ? `${formatCurrency(creditTotal)} of ${formatCurrency(takings)} — not in the till`
                : "no sales yet today"
            }
            tone={creditOverTarget ? "warn" : hasSalesToday ? "good" : "muted"}
            emphasis={creditOverTarget}
          />
          <MetricTile
            label="Avg basket"
            value={hasSalesToday ? formatCurrency(avgBasket) : "—"}
            note={hasSalesToday ? `across ${count} sale${count === 1 ? "" : "s"} today` : "no sales yet today"}
            tone="muted"
          />
          <MetricTile
            label="On-shelf availability"
            value={stock.totalLines > 0 ? formatPercent(stock.availability) : "—"}
            note={
              stock.totalLines > 0
                ? `${stock.zeroLines} of ${stock.totalLines} stock lines at zero`
                : "no stock lines loaded"
            }
            tone={availabilityBelowTarget ? "critical" : "good"}
            emphasis={availabilityBelowTarget}
          />
          <MetricTile
            label="Member trade"
            value={hasSalesToday ? formatPercent(memberShare) : "—"}
            note={
              stats.totalMembers === 0
                ? "no members registered — no patronage"
                : `${stats.totalMembers} member${stats.totalMembers === 1 ? "" : "s"} registered`
            }
            tone={stats.totalMembers === 0 ? "critical" : "good"}
            emphasis={stats.totalMembers === 0}
          />
        </div>

        {/* Shape of the day, and where the money actually ended up */}
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-semibold text-slate-800">Net sales by hour</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {hasSalesToday ? "Hours either side of trading are shown closed" : "Today has no recorded sales yet"}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10.5px] text-slate-400">{formatCurrency(takings)} today</span>
            </div>
            <HourChart byHour={byHour} formatMoney={(n) => Math.round(n).toLocaleString("en-US")} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-[13px] font-semibold text-slate-800">Where the money went</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {hasSalesToday
                ? "A credit sale raises the sales figure without raising the cash"
                : "Splits appear once the first sale is rung up"}
            </p>

            {hasSalesToday ? (
              <>
                <div className="mt-3.5 flex h-7 overflow-hidden rounded-lg border border-slate-200">
                  {cashTotal > 0 && (
                    <span
                      className="flex items-center justify-center bg-emerald-600 text-[11px] font-bold text-white"
                      style={{ width: `${(cashTotal / takings) * 100}%` }}
                    >
                      {(cashTotal / takings) * 100 >= 18 ? `Cash ${formatPercent((cashTotal / takings) * 100, 0)}` : ""}
                    </span>
                  )}
                  {creditTotal > 0 && (
                    <span
                      className="flex items-center justify-center bg-amber-500 text-[11px] font-bold text-white"
                      style={{ width: `${(creditTotal / takings) * 100}%` }}
                    >
                      {creditShare >= 18 ? `Credit ${formatPercent(creditShare, 0)}` : ""}
                    </span>
                  )}
                </div>
                <div className="mt-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />In the till now
                    </span>
                    <b className="font-semibold tabular-nums text-slate-800">{formatCurrency(cashTotal)}</b>
                  </div>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Owed on credit
                    </span>
                    <b className="font-semibold tabular-nums text-amber-600">{formatCurrency(creditTotal)}</b>
                  </div>
                </div>
                <BulletBar
                  percent={creditShare}
                  targetPercent={30}
                  color={creditOverTarget ? "bg-amber-500" : "bg-emerald-500"}
                  leftCaption="Credit share of takings"
                  rightCaption="target ≤30%"
                />
              </>
            ) : (
              <div className="mt-4 flex h-[120px] items-center justify-center rounded-xl bg-slate-50 text-[11.5px] text-slate-400">
                Nothing taken yet today
              </div>
            )}
          </div>
        </div>

        {/* Conditional queue — reads as an accomplishment when empty */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-[9px] ${
                  attention.length ? "bg-[#FAE5E5] text-[#C03A3A]" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {attention.length ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              </div>
              <h2 className="text-[14px] font-semibold text-slate-800">Needs attention</h2>
            </div>
            {attention.length > 0 && (
              <span className="rounded-full bg-[#C03A3A] px-2.5 py-0.5 text-[10.5px] font-bold text-white">
                {attention.length} to action
              </span>
            )}
          </div>

          {attention.map((row) => (
            <AttentionRow
              key={row.key}
              icon={row.icon}
              iconClass={row.iconClass}
              title={row.title}
              rule={row.rule}
              actionLabel={row.actionLabel}
              onAction={row.onAction}
            />
          ))}

          <div className="flex items-center gap-3 bg-emerald-50/70 px-4 py-3.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-[12.5px] font-semibold text-emerald-700">
                {attention.length === 0 ? "Nothing needs attention" : "Everything else is clear"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {stats.expiringItems === 0 && "Nothing expires within 30 days · "}
                All systems operational · {stats.activeSessions} of {stats.totalUsers} staff signed in
              </p>
            </div>
          </div>
        </div>

        {/* Supporting detail */}
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_1fr_1.2fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2.5 text-[9.5px] font-bold uppercase tracking-[0.055em] text-slate-400">Who's on</p>
            <div className="flex items-center justify-between text-[11.5px] text-slate-600">
              <span>Signed in</span>
              <b className="font-semibold tabular-nums text-emerald-600">
                {stats.activeSessions} of {stats.totalUsers}
              </b>
            </div>
            <BulletBar
              percent={stats.totalUsers ? (stats.activeSessions / stats.totalUsers) * 100 : 0}
              color="bg-emerald-500"
              leftCaption={`${formatPercent(stats.totalUsers ? (stats.activeSessions / stats.totalUsers) * 100 : 0)} of users active`}
              rightCaption={latestSignInLabel ? `last in ${latestSignInLabel}` : "no sign-ins recorded"}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2.5 text-[9.5px] font-bold uppercase tracking-[0.055em] text-slate-400">Stock at a glance</p>
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11.5px]">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Sellable
                  </span>
                  <b className="tabular-nums text-slate-800">{stock.sellableLines}</b>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${stock.totalLines ? (stock.sellableLines / stock.totalLines) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11.5px]">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C03A3A]" />Blocked
                  </span>
                  <b className="tabular-nums text-[#C03A3A]">{stock.zeroLines}</b>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#C03A3A]"
                    style={{ width: `${stock.totalLines ? (stock.zeroLines / stock.totalLines) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-slate-400">
              {stock.lowLines > 0
                ? `${stock.lowLines} more below threshold but still sellable.`
                : "Nothing sits between 1 and its threshold — blocked lines are at zero."}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-[13px] font-semibold text-slate-800">Latest sales</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("/dashboard/sales")}
                className="flex items-center gap-0.5 text-[11px] font-semibold text-[#1A318C] hover:underline"
              >
                All sales <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            {recentSales.length === 0 ? (
              <div className="px-4 py-8 text-center text-[11.5px] text-slate-400">No sales recorded yet</div>
            ) : (
              <table className="w-full">
                <tbody>
                  {recentSales.slice(0, 4).map((sale, idx) => (
                    <tr key={`${sale.id || sale.invoice_no || "sale"}-${idx}`} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-mono text-[11.5px] text-slate-600">
                        {String(sale.invoice_no || "").slice(-6) || "—"}
                      </td>
                      <td className="px-2 py-2 text-right text-[12px] font-bold tabular-nums text-slate-800">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            String(sale.payment_method || "").toLowerCase() === "cash"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-[#EDF0FB] text-[#1A318C]"
                          }`}
                        >
                          {sale.payment_method || "cash"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[10.5px] text-slate-400">
                        {sale.created_at
                          ? new Date(sale.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Catalogue counts are context, not headlines — they never change hour to hour */}
        <div className="flex flex-wrap gap-2 pb-1">
          {[
            { icon: <Package className="h-3 w-3" />, label: "Items in catalogue", value: stats.totalItems },
            { icon: <Users className="h-3 w-3" />, label: "Members", value: stats.totalMembers },
            { icon: <Boxes className="h-3 w-3" />, label: "Suppliers", value: stats.totalSuppliers }
          ].map(({ icon, label, value }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3.5 shadow-sm"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                {icon}
              </span>
              <b className="text-[13px] font-bold tabular-nums text-slate-800">{value}</b>
              <span className="text-[10.5px] text-slate-500">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
