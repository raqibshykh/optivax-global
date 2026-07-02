/**
 * Client Ownership Assignment — mock data layer.
 * Stores current ownership and full assignment history in localStorage.
 */
import { safeParse } from "../lib/storage";

const OWNERSHIP_KEY = "optivax_client_ownership";
const HISTORY_KEY   = "optivax_client_ownership_history";

export interface ClientOwnership {
  clientId:       string;
  clientName:     string;
  ownerId:        string;
  ownerName:      string;
  ownerEmail:     string;
  assignedById:   string;
  assignedByName: string;
  assignedByRole: string;
  assignedAt:     string;
  notes?:         string;
}

export type OwnershipAction = "assigned" | "reassigned" | "removed";

export interface ClientOwnershipHistoryEntry {
  id:                  string;
  clientId:            string;
  clientName:          string;
  action:              OwnershipAction;
  previousOwnerId?:    string;
  previousOwnerName?:  string;
  newOwnerId?:         string;
  newOwnerName?:       string;
  assignedById:        string;
  assignedByName:      string;
  assignedByRole:      string;
  assignedAt:          string;
  notes?:              string;
}

// ── Read/write helpers ────────────────────────────────────────────────────────

function readOwnerships(): ClientOwnership[] {
  return safeParse<ClientOwnership[]>(localStorage.getItem(OWNERSHIP_KEY), []);
}

function writeOwnerships(data: ClientOwnership[]): void {
  localStorage.setItem(OWNERSHIP_KEY, JSON.stringify(data));
}

function readHistory(): ClientOwnershipHistoryEntry[] {
  return safeParse<ClientOwnershipHistoryEntry[]>(localStorage.getItem(HISTORY_KEY), []);
}

function writeHistory(data: ClientOwnershipHistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
}

function generateId(): string {
  return `cow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAllOwnerships(): ClientOwnership[] {
  return readOwnerships();
}

export function getClientOwnership(clientId: string): ClientOwnership | null {
  return readOwnerships().find(o => o.clientId === clientId) ?? null;
}

export function getOwnershipsByMember(memberId: string): ClientOwnership[] {
  return readOwnerships().filter(o => o.ownerId === memberId);
}

export function getOwnershipHistory(clientId?: string): ClientOwnershipHistoryEntry[] {
  const all = readHistory();
  return clientId ? all.filter(h => h.clientId === clientId) : all;
}

export function assignClientOwner(
  next: ClientOwnership
): ClientOwnershipHistoryEntry {
  const ownerships = readOwnerships();
  const existing   = ownerships.find(o => o.clientId === next.clientId);

  const action: OwnershipAction = existing ? "reassigned" : "assigned";

  const entry: ClientOwnershipHistoryEntry = {
    id:               generateId(),
    clientId:         next.clientId,
    clientName:       next.clientName,
    action,
    previousOwnerId:  existing?.ownerId,
    previousOwnerName: existing?.ownerName,
    newOwnerId:       next.ownerId,
    newOwnerName:     next.ownerName,
    assignedById:     next.assignedById,
    assignedByName:   next.assignedByName,
    assignedByRole:   next.assignedByRole,
    assignedAt:       next.assignedAt,
    notes:            next.notes,
  };

  const updated = ownerships.filter(o => o.clientId !== next.clientId);
  updated.push(next);
  writeOwnerships(updated);

  const history = readHistory();
  history.unshift(entry);
  writeHistory(history.slice(0, 500)); // cap at 500 entries

  return entry;
}

export function removeClientOwner(
  clientId:       string,
  clientName:     string,
  removedById:    string,
  removedByName:  string,
  removedByRole:  string
): ClientOwnershipHistoryEntry | null {
  const ownerships = readOwnerships();
  const existing   = ownerships.find(o => o.clientId === clientId);
  if (!existing) return null;

  const entry: ClientOwnershipHistoryEntry = {
    id:               generateId(),
    clientId,
    clientName,
    action:           "removed",
    previousOwnerId:  existing.ownerId,
    previousOwnerName: existing.ownerName,
    assignedById:     removedById,
    assignedByName:   removedByName,
    assignedByRole:   removedByRole,
    assignedAt:       new Date().toISOString(),
  };

  writeOwnerships(ownerships.filter(o => o.clientId !== clientId));

  const history = readHistory();
  history.unshift(entry);
  writeHistory(history.slice(0, 500));

  return entry;
}
