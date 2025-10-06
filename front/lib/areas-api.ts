import { apiFetch } from "./api-client";
import type { Area, CreateAreaInput, UpdateAreaInput } from "./areas-types";

export async function fetchAreas(accountId: string): Promise<Area[]> {
  return apiFetch(`/api/areas?account_id=${accountId}`);
}

export async function fetchArea(accountId: string, areaId: string): Promise<Area> {
  return apiFetch(`/api/areas/${areaId}?account_id=${accountId}`);
}

export async function createArea(accountId: string, data: CreateAreaInput): Promise<Area> {
  return apiFetch(`/api/areas?account_id=${accountId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateArea(
  accountId: string,
  areaId: string,
  data: UpdateAreaInput
): Promise<Area> {
  return apiFetch(`/api/areas/${areaId}?account_id=${accountId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteArea(accountId: string, areaId: string): Promise<void> {
  return apiFetch(`/api/areas/${areaId}?account_id=${accountId}`, {
    method: "DELETE",
  });
}
