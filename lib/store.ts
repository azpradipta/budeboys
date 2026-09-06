"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ConsultationSession, PrescriptionRecord } from "./types";

// Lapisan data sisi klien di atas route app/api/, dengan cache in-memory
// agar pembacaan tetap sinkron dan penulisan bersifat optimistic.

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

  /** Kosongkan cache dan tandai belum pernah dimuat, lalu beri tahu
   * subscriber. Dipakai setelah data dihapus di server, supaya UI tidak
   * menampilkan record yang sebenarnya sudah tidak ada. */
  reset() {
    this.cache = null;
    this.notFound.clear();
    this.listeners.forEach((listener) => listener());
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

  // Mengambil seluruh koleksi sekali, aman dipanggil dari effect.
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

  // Mengambil satu item, untuk halaman detail yang dibuka sebelum list termuat.
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
    this.upsertLocal(item); // optimistic, UI langsung ter-update

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
      // Offline atau gagal jaringan, jadi nilai optimistic lokal dipertahankan.
    }
    return item;
  }
}

const sessionStore = new ApiListStore<ConsultationSession>("/api/consultations");
const prescriptionStore = new ApiListStore<PrescriptionRecord>("/api/prescriptions");

/** Buang seluruh data yang di-cache di memori. Dipanggil setelah pengguna
 * menghapus datanya lewat halaman /privacy. */
export function clearStoreCaches() {
  sessionStore.reset();
  prescriptionStore.reset();
}

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

// undefined selama belum terjawab, null bila server memastikan id tidak ada.
export function useConsultationSession(id: string): ConsultationSession | null | undefined {
  useEffect(() => {
    if (id) sessionStore.preloadOne(id);
  }, [id]);
  const getSnapshot = useCallback(
    () => (id ? sessionStore.getOneSnapshot(id) : undefined),
    [id]
  );
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

// Sumber data daftar resep di halaman detail konsultasi.
export function usePrescriptionsForConsultation(consultationId: string): PrescriptionRecord[] {
  const all = usePrescriptions();
  return all.filter((p) => p.consultationId === consultationId);
}

export function savePrescription(record: PrescriptionRecord) {
  void prescriptionStore.save(record);
}
