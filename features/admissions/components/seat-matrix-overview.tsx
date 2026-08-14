import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SeatRow = { sectionId: string; className: string; sectionName: string; capacity: number; occupied: number; available: number; overbooked: boolean };

export function SeatMatrixOverview({ rows }: { rows: SeatRow[] }) {
  const totals = rows.reduce((summary, row) => ({
    capacity: summary.capacity + row.capacity,
    occupied: summary.occupied + row.occupied,
    available: summary.available + row.available,
    overbooked: summary.overbooked || row.overbooked,
  }), { capacity: 0, occupied: 0, available: 0, overbooked: false });
  const occupancy = totals.capacity ? Math.round((totals.occupied / totals.capacity) * 100) : 0;
  return <Card>
    <CardHeader><CardTitle>Capacity overview</CardTitle><p className="text-sm text-muted-foreground">The overview uses active enrollments from the selected academic year. The detailed table below is the authoritative section-by-section view.</p></CardHeader>
    <CardContent className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Total capacity" value={totals.capacity} />
        <Metric label="Enrolled" value={totals.occupied} />
        <Metric label="Available" value={totals.available} />
        <Metric label="Occupancy" value={`${occupancy}%`} />
        {totals.overbooked ? <Metric label="Capacity alert" value="Overbooked" /> : null}
      </div>
      {rows.length ? <div className="space-y-3" aria-label="Seat occupancy by section">
        {rows.slice(0, 20).map((row) => {
          const percent = row.capacity ? Math.min(100, Math.round((row.occupied / row.capacity) * 100)) : 0;
          const status = row.overbooked ? "overbooked" : row.available === 0 ? "full" : percent >= 90 ? "near full" : "open";
          return <div key={row.sectionId} className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-medium">{row.className} · Section {row.sectionName}</span><span className="flex items-center gap-2 text-muted-foreground">{row.occupied}/{row.capacity} enrolled <StatusBadge status={status} /></span></div>
            <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${row.className} section ${row.sectionName} occupancy`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className={`h-full rounded-full ${status === "full" || status === "overbooked" ? "bg-destructive" : status === "near full" ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${percent}%` }} /></div>
          </div>;
        })}
        {rows.length > 20 ? <p className="text-xs text-muted-foreground">Showing the first 20 sections. Use the filters or detailed table for the complete scope.</p> : null}
      </div> : <p className="text-sm text-muted-foreground">No active sections match the selected filters.</p>}
    </CardContent>
  </Card>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-md bg-muted p-3"><span className="block text-xs text-muted-foreground">{label}</span><span className="text-2xl font-semibold">{value}</span></div>;
}
