"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ConsultationSession, PrescriptionRecord } from "./types";

/**
 * Thin localStorage-backed persistence layer standing in for the real
 * backend (docs/prd.md Section 55 Core API Contracts / Section 56 Data
 * Entities). Swappable: replace the bodies below with real fetch() calls
 * against those endpoints and every page keeps working unchanged.
 *
 * Reads are exposed as useSyncExternalStore-based hooks so components never
 * need a manual `useEffect(() => setState(readFromLocalStorage()), [])` —
 * that pattern mismatches between the SSR pass (no localStorage) and the
 * client, and this is the pattern React itself recommends for it.
 */

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // storage unavailable (private mode, quota) — demo degrades to in-memory only
  }
}

interface Identifiable {
  id: string;
  createdAt: string;
}

class ListStore<T extends Identifiable> {
  private cache: T[] | null = null;
  private listeners = new Set<() => void>();

  constructor(private key: string) {}

  private ensure(): T[] {
    if (this.cache === null) {
      this.cache = readList<T>(this.key).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return this.cache;
  }

  getSnapshot = (): T[] => this.ensure();
  getServerSnapshot = (): T[] => EMPTY_LIST as T[];

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private commit(next: T[]) {
    this.cache = [...next].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    writeList(this.key, this.cache);
    this.listeners.forEach((listener) => listener());
  }

  list(): T[] {
    return this.ensure();
  }

  get(id: string): T | undefined {
    return this.ensure().find((item) => item.id === id);
  }

  save(item: T) {
    const list = this.ensure();
    const idx = list.findIndex((i) => i.id === item.id);
    const next = idx >= 0 ? list.map((i, n) => (n === idx ? item : i)) : [...list, item];
    this.commit(next);
  }
}

const EMPTY_LIST: Identifiable[] = [];

const sessionStore = new ListStore<ConsultationSession>("healthalk:consultations");
const prescriptionStore = new ListStore<PrescriptionRecord>("healthalk:prescriptions");

// ---- Consultation sessions ----

/** Non-reactive read — safe to call from effects, handlers, timers. */
export function listSessions(): ConsultationSession[] {
  return sessionStore.list();
}

export function getSession(id: string): ConsultationSession | undefined {
  return sessionStore.get(id);
}

export function saveSession(session: ConsultationSession) {
  sessionStore.save(session);
}

/** Reactive read — re-renders the component whenever any session is saved. */
export function useConsultationSessions(): ConsultationSession[] {
  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot
  );
}

/** undefined = not yet resolved on the client, null = confirmed not found. */
export function useConsultationSession(id: string): ConsultationSession | null | undefined {
  const getSnapshot = useCallback(() => sessionStore.get(id) ?? null, [id]);
  return useSyncExternalStore(sessionStore.subscribe, getSnapshot, () => undefined);
}

// ---- Prescriptions ----

export function listPrescriptions(): PrescriptionRecord[] {
  return prescriptionStore.list();
}

export function getPrescription(id: string): PrescriptionRecord | undefined {
  return prescriptionStore.get(id);
}

export function savePrescription(record: PrescriptionRecord) {
  prescriptionStore.save(record);
}

export function usePrescriptions(): PrescriptionRecord[] {
  return useSyncExternalStore(
    prescriptionStore.subscribe,
    prescriptionStore.getSnapshot,
    prescriptionStore.getServerSnapshot
  );
}

export function usePrescription(id: string): PrescriptionRecord | null | undefined {
  const getSnapshot = useCallback(() => prescriptionStore.get(id) ?? null, [id]);
  return useSyncExternalStore(prescriptionStore.subscribe, getSnapshot, () => undefined);
}
