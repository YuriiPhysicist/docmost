export interface IPagePermissionMember {
  userId?: string;
  userName?: string;
  userEmail?: string;
  groupId?: string;
  groupName?: string;
  groupMembers?: Array<{id: string, name: string, email: string}>;
  spaceRole: string;
  pageRole: string | null;
}

export interface IPagePermissionsResponse {
  items: IPagePermissionMember[];
}

export enum PageRole {
  ADMIN = "admin",
  WRITER = "writer",
  READER = "reader",
  BLOCKED = "blocked"
}

export const pageRoleData = [
  {
    label: "Full access",
    value: PageRole.ADMIN,
    description: "Has full access to page settings and content.",
  },
  {
    label: "Can edit",
    value: PageRole.WRITER,
    description: "Can edit page content.",
  },
  {
    label: "Can view",
    value: PageRole.READER,
    description: "Can view page but not edit.",
  },
  {
    label: "Blocked",
    value: PageRole.BLOCKED,
    description: "Cannot access this page.",
  },
];

export function getPageRoleLabel(value: string) {
  const role = pageRoleData.find((item) => item.value === value);
  return role ? role.label : undefined;
}