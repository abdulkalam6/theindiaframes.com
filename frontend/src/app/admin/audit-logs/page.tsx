"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";
import { Filter, ShieldAlert } from "lucide-react";

interface AuditLogEntry {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  created_at: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [entityFilter, setEntityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs =
          entityFilter !== "all" ? `?entity_type=${entityFilter}&limit=100` : "?limit=100";
        const res = await apiClient<AuditLogEntry[]>(`admin/audit-logs${qs}`);
        if (res.data) {
          setLogs(res.data);
        } else {
          setError(res.error?.message ?? "Owner access required.");
        }
      } catch {
        setError("Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [entityFilter]);

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      <AdminNav title="Owner Audit Trail" />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          {["all", "payment", "offline_sale", "enquiry", "settings"].map(
            (et) => (
              <button
                key={et}
                onClick={() => setEntityFilter(et)}
                className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${
                  entityFilter === et
                    ? "bg-[#C69A48] text-black font-semibold"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {et.replace("_", " ")}
              </button>
            )
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-950/70 border border-red-800 p-4 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Loading audit logs…
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-12 text-center text-slate-500 text-xs">
            No audit entries found.
          </div>
        ) : (
          <div className="rounded-xl bg-[#0b1726] border border-slate-800 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left px-4 py-3">Timestamp (IST)</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Entity</th>
                  <th className="text-left px-4 py-3">Details (After)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={`border-b border-slate-800/50 align-top ${
                      idx === logs.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#E3C27B]">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span className="capitalize">
                        {log.entity_type.replace("_", " ")}
                      </span>
                      <span className="block font-mono text-[10px] text-slate-500">
                        {log.entity_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 max-w-md break-all">
                      {JSON.stringify(log.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
