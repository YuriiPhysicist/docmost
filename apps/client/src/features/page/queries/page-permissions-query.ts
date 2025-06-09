import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import {
  getPagePermissions,
  setPagePermissions,
  getEffectiveRole
} from "@/features/page/services/page-permissions-service";
import { IPagePermissionsResponse } from "@/features/page/types/page-permissions.types";

export function usePagePermissionsQuery(pageId: string) {
  return useQuery<IPagePermissionsResponse>({
    queryKey: ["pagePermissions", pageId],
    queryFn: () => getPagePermissions(pageId),
    enabled: !!pageId,
  });
}

export function useSetPagePermissionsMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      pageId: string;
      userId?: string;
      groupId?: string;
      role: string;
    }) => setPagePermissions(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pagePermissions", variables.pageId],
      });

      notifications.show({
        message: t("Page permissions updated successfully")
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message;
      notifications.show({
        message: errorMessage || t("Failed to update permissions"),
        color: "red"
      });
    },
  });
}

export function useEffectiveRoleQuery(pageId: string) {
  return useQuery<{role: string}>({
    queryKey: ["effectiveRole", pageId],
    queryFn: () => getEffectiveRole(pageId),
    enabled: !!pageId,
  });
}