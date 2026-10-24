"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { TABLE, type Registration, type RegistrationInput } from "./types";

export type LiveStatus = "connecting" | "live" | "offline";

function normalise(r: Registration): Registration {
  return {
    ...r,
    registration_fee: Number(r.registration_fee ?? 0),
    other_charges: Number(r.other_charges ?? 0),
  };
}

const byNo = (a: Registration, b: Registration) => a.no - b.no;

/**
 * Loads every registration and keeps the list in sync via Supabase Realtime.
 * The channel is subscribed before the first fetch so changes made while
 * the fetch is in flight are not lost; merges are keyed by id and the newer
 * updated_at wins, so the echo of our own writes is harmless.
 */
export function useRegistrations() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveStatus>("connecting");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const flashTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const flash = useCallback((id: string) => {
    setFlashIds((s) => new Set(s).add(id));
    clearTimeout(flashTimers.current.get(id));
    flashTimers.current.set(
      id,
      setTimeout(() => {
        setFlashIds((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      }, 1600)
    );
  }, []);

  const upsertLocal = useCallback((row: Registration) => {
    const r = normalise(row);
    setRows((prev) => {
      const i = prev.findIndex((p) => p.id === r.id);
      if (i === -1) return [...prev, r].sort(byNo);
      if (prev[i].updated_at > r.updated_at) return prev;
      const next = prev.slice();
      next[i] = r;
      return next;
    });
  }, []);

  const removeLocal = useCallback((id: string) => {
    setRows((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from(TABLE).select("*").order("no", { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setRows((data as Registration[]).map(normalise));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      setLoading(false);
      setLive("offline");
      return;
    }
    const sb = getSupabase();
    const channel = sb
      .channel(`${TABLE}-changes`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload: RealtimePostgresChangesPayload<Registration>) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as Partial<Registration>).id;
            if (id) removeLocal(id);
          } else {
            upsertLocal(payload.new as Registration);
            flash((payload.new as Registration).id);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLive("live");
          // Re-sync after (re)connect in case events were missed while offline.
          load();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setLive("offline");
        }
      });

    const timers = flashTimers.current;
    return () => {
      sb.removeChannel(channel);
      timers.forEach(clearTimeout);
    };
  }, [load, upsertLocal, removeLocal, flash]);

  const create = useCallback(
    async (input: RegistrationInput) => {
      const { data, error } = await getSupabase().from(TABLE).insert(input).select().single();
      if (error) throw new Error(error.message);
      upsertLocal(data as Registration);
      flash((data as Registration).id);
      return data as Registration;
    },
    [upsertLocal, flash]
  );

  const update = useCallback(
    async (id: string, patch: Partial<RegistrationInput>) => {
      const { data, error } = await getSupabase().from(TABLE).update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      upsertLocal(data as Registration);
      return data as Registration;
    },
    [upsertLocal]
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await getSupabase().from(TABLE).delete().eq("id", id);
      if (error) throw new Error(error.message);
      removeLocal(id);
    },
    [removeLocal]
  );

  return { rows, loading, error, live, flashIds, create, update, remove, reload: load };
}
