import api from "@/lib/api-client";
import { IPagePermissionsResponse } from "@/features/page/types/page-permissions.types";

export async function getPagePermissions(pageId: string): Promise<IPagePermissionsResponse> {
  const req = await api.post<IPagePermissionsResponse>(`/pages/${pageId}/permissions`);
  return req.data;
}

export async function setPagePermissions(data: {
  pageId: string;
  userId?: string;
  groupId?: string;
  role: string;
}): Promise<void> {
  await api.post(`/pages/${data.pageId}/permissions/set`, data);
}

export async function getEffectiveRole(pageId: string): Promise<{role: string}> {
  const req = await api.post<{role: string}>(`/pages/${pageId}/effective-role`);
  return req.data;
}