"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ConsultationSession, PrescriptionRecord } from "./types";

/**
 * Client-side data layer backed by the API routes under app/api/ (which in
 * turn persist to lib/server/db.ts — docs/prd.md Section 55 Core API
 * Contracts / Section 56 Data Entities).
 *
 * Each collection keeps an in-memory cache so reads can stay synchronous
 * (required by useSyncExternalStore) while fetches happen in the
 * background. Writes update the cache optimistically first so the UI never
 * waits on the network, then reconcile with the server's response.
 */

interface Identifiable {
  id: string;
  createdAt: string;
}

const EMPTY: never[] = [];

class ApiListStore<T extends Identifiable> {
  private cache: T[] | null = null;
  private notFound = new Set<string>();
  private listeners = new Set<() => void>();
  private listInFlight = false;
  private itemsInFlight = new Set<string>();

  constructor(private basePath: string) {}

  private setCache(next: T[]) {
    this.cache = [...next].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    this.listeners.forEach((listener) => listener());
  }

  private upsertLocal(item: T) {
    const list = this.cache ?? [];
    const idx = list.findIndex((i) => i.id === item.id);
    const next = idx >= 0 ? list.map((i, n) => (n === idx ? item : i)) : [...list, item];
    this.notFound.delete(item.id);
    this.setCache(next);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): T[] => this.cache ?? (EMPTY as T[]);
  getServerSnapshot = (): T[] => EMPTY as T[];

  getOneSnapshot = (id: string): T | null | undefined => {
    const found = this.cache?.find((item) => item.id === id);
    if (found) return found;
    return this.notFound.has(id) ? null : undefined;
  };

  /** Kick off (at most once until it resolves) a background fetch of the
   * full collection. Safe to call from an effect — it never calls a React
   * setState directly, only mutates this external cache and notifies
   * subscribers, which is exactly what useSyncExternalStore expects. */
  preloadList() {
    if (this.cache !== null || this.listInFlight) return;
    this.listInFlight = true;
    fetch(this.basePath)
      .then((res) => (res.ok ? (res.json() as Promise<T[]>) : []))
      .then((items) => this.setCache(items))
      .catch(() => this.setCache(this.cache ?? []))
      .finally(() => {
        this.listInFlight = false;
      });
  }

  /** Kick off a background fetch for a single item — used when a detail
   * page is opened before the full list has loaded (e.g. direct link,
   * fresh reload). */
  preloadOne(id: string) {
    if (this.cache?.some((item) => item.id === id)) return;
    if (this.notFound.has(id) || this.itemsInFlight.has(id)) return;
    this.itemsInFlight.add(id);
    fetch(`${this.basePath}/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          this.notFound.add(id);
          this.listeners.forEach((listener) => listener());
          return;
        }
        if (!res.ok) return;
        this.upsertLocal((await res.json()) as T);
      })
      .catch(() => {})
      .finally(() => {
        this.itemsInFlight.delete(id);
      });
  }

  async save(item: T): Promise<T> {
    const exists = this.cache?.some((i) => i.id === item.id);
    this.upsertLocal(item); // optimistic — UI updates instantly

    try {
      const res = await fetch(exists ? `${this.basePath}/${item.id}` : this.basePath, {
        method: exists ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        const saved = (await res.json()) as T;
        this.upsertLocal(saved);
        return saved;
      }
    } catch {
      // offline/network error — keep the optimistic local value
    }
    return item;
  }
}

const sessionStore = new ApiListStore<ConsultationSession>("/api/consultations");
const prescriptionStore = new ApiListStore<PrescriptionRecord>("/api/prescriptions");

// ---- Consultation sessions ----

export function useConsultationSessions(): ConsultationSession[] {
  useEffect(() => {
    sessionStore.preloadList();
  }, []);
  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot
  );
}

/** undefined = not yet resolved, null = confirmed not found on the server. */
export function useConsultationSession(id: string): ConsultationSession | null | undefined {
  useEffect(() => {
    sessionStore.preloadOne(id);
  }, [id]);
  const getSnapshot = useCallback(() => sessionStore.getOneSnapshot(id), [id]);
  return useSyncExternalStore(sessionStore.subscribe, getSnapshot, () => undefined);
}

export function saveSession(session: ConsultationSession) {
  void sessionStore.save(session);
}

// ---- Prescriptions ----

export function usePrescriptions(): PrescriptionRecord[] {
  useEffect(() => {
    prescriptionStore.preloadList();
  }, []);
  return useSyncExternalStore(
    prescriptionStore.subscribe,
    prescriptionStore.getSnapshot,
    prescriptionStore.getServerSnapshot
  );
}

export function usePrescription(id: string): PrescriptionRecord | null | undefined {
  useEffect(() => {
    prescriptionStore.preloadOne(id);
  }, [id]);
  const getSnapshot = useCallback(() => prescriptionStore.getOneSnapshot(id), [id]);
  return useSyncExternalStore(prescriptionStore.subscribe, getSnapshot, () => undefined);
}

/** Prescriptions can only ever be created from within a consultation
 * (Phase 3) — this is how that consultation's detail page lists its own. */
export function usePrescriptionsForConsultation(consultationId: string): PrescriptionRecord[] {
  const all = usePrescriptions();
  return all.filter((p) => p.consultationId === consultationId);
}

export function savePrescription(record: PrescriptionRecord) {
  void prescriptionStore.save(record);
}
