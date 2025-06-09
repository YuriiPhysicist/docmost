import {
  Modal,
  Group,
  Text,
  ScrollArea,
  Stack,
  Divider,
  Collapse,
  Button,
  Table,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import RoleSelectMenu from "@/components/ui/role-select-menu.tsx";
import { CustomAvatar } from "@/components/ui/custom-avatar.tsx";
import { IconGroupCircle } from "@/components/icons/icon-people-circle.tsx";
import { NodeApi } from "react-arborist";
import { SpaceTreeNode } from "@/features/page/tree/types.ts";
import {
  usePagePermissionsQuery,
  useSetPagePermissionsMutation
} from "@/features/page/queries/page-permissions-query";
import {
  IPagePermissionMember,
  pageRoleData,
  getPageRoleLabel,
  PageRole
} from "@/features/page/types/page-permissions.types";

interface PagePermissionsModalProps {
  open: boolean;
  onClose: () => void;
  node: NodeApi<SpaceTreeNode>;
}

export default function PagePermissionsModal({
                                               open,
                                               onClose,
                                               node
                                             }: PagePermissionsModalProps) {
  const { t } = useTranslation();
  const pageId = open ? node.id : null;
  const { data: permissions } = usePagePermissionsQuery(pageId);
  const setPermissions = useSetPagePermissionsMutation();

  const handleRoleChange = async (
    member: IPagePermissionMember,
    newRole: string
  ) => {
    const currentRole = member.pageRole || member.spaceRole;

    if (newRole === currentRole) return;

    const roleToSet = newRole;

    await setPermissions.mutateAsync({
      pageId,
      userId: member.userId,
      groupId: member.groupId,
      role: roleToSet,
    });
  };

  const getEffectiveRole = (member: IPagePermissionMember): string => {
    return member.pageRole || member.spaceRole;
  };

  const getAvailableRoles = (member: IPagePermissionMember) => {
    const spaceRole = member.spaceRole;
    const allRoles = pageRoleData;

    const roleHierarchy = [PageRole.BLOCKED, PageRole.READER, PageRole.WRITER, PageRole.ADMIN];
    const maxRoleIndex = roleHierarchy.indexOf(spaceRole as PageRole);

    return allRoles.filter(role => {
      const roleIndex = roleHierarchy.indexOf(role.value as PageRole);
      return roleIndex <= maxRoleIndex;
    });
  };

  const isDisabled = (member: IPagePermissionMember): boolean => {
    return member.spaceRole === PageRole.ADMIN;
  };

  if (!permissions) return null;

  return (
    <Modal.Root
      opened={open}
      onClose={onClose}
      size={700}
      padding="xl"
      yOffset="10vh"
      xOffset={0}
      onClick={(e) => e.stopPropagation()}
    >
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header>
          <Modal.Title fw={500}>
            {t("Page permissions")} - {node.data.name || t("Untitled")}
          </Modal.Title>
          <Modal.CloseButton />
        </Modal.Header>
        <Modal.Body>
          <ScrollArea h={400}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("Member")}</Table.Th>
                  <Table.Th>{t("Space Role")}</Table.Th>
                  <Table.Th>{t("Page Role")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {permissions.items.map((member) => (
                  <MemberRow
                    key={member.userId || member.groupId}
                    member={member}
                    onRoleChange={handleRoleChange}
                    getEffectiveRole={getEffectiveRole}
                    getAvailableRoles={getAvailableRoles}
                    isDisabled={isDisabled}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}

interface MemberRowProps {
  member: IPagePermissionMember;
  onRoleChange: (member: IPagePermissionMember, newRole: string) => void;
  getEffectiveRole: (member: IPagePermissionMember) => string;
  getAvailableRoles: (member: IPagePermissionMember) => any[];
  isDisabled: (member: IPagePermissionMember) => boolean;
}

function MemberRow({
                     member,
                     onRoleChange,
                     getEffectiveRole,
                     getAvailableRoles,
                     isDisabled
                   }: MemberRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const isGroup = !!member.groupId;
  const effectiveRole = getEffectiveRole(member);
  const availableRoles = getAvailableRoles(member);
  const disabled = isDisabled(member);

  return (
    <>
      <Table.Tr>
        <Table.Td>
          <Group gap="sm" wrap="nowrap">
            {isGroup ? (
              <IconGroupCircle />
            ) : (
              <CustomAvatar
                avatarUrl={member.userEmail || ""}
                name={member.userName || ""}
              />
            )}

            <div>
              <Text size="sm" fw={500} lineClamp={1}>
                {member.userName || member.groupName}
              </Text>
              {isGroup && member.groupMembers && (
                <Group gap="xs" align="center">
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    leftSection={
                      expanded ?
                        <IconChevronDown size={12} /> :
                        <IconChevronRight size={12} />
                    }
                    onClick={() => setExpanded(!expanded)}
                  >
                    {t("{{count}} members", { count: member.groupMembers.length })}
                  </Button>
                </Group>
              )}
              {!isGroup && (
                <Text size="xs" c="dimmed">
                  {member.userEmail}
                </Text>
              )}
            </div>
          </Group>
        </Table.Td>

        <Table.Td>
          <Text size="sm" c="dimmed">
            {t(getPageRoleLabel(member.spaceRole) || member.spaceRole)}
          </Text>
        </Table.Td>

        <Table.Td>
          <RoleSelectMenu
            roles={availableRoles}
            roleName={getPageRoleLabel(effectiveRole) || effectiveRole}
            onChange={(newRole) => onRoleChange(member, newRole)}
            disabled={disabled}
          />
        </Table.Td>
      </Table.Tr>

      {isGroup && expanded && member.groupMembers && (
        <Table.Tr>
          <Table.Td colSpan={3}>
            <Collapse in={expanded}>
              <Stack gap="xs" pl="md" py="xs">
                <Text size="xs" fw={500} c="dimmed">
                  {t("Group members:")}
                </Text>
                {member.groupMembers.map((groupMember) => (
                  <Group key={groupMember.id} gap="sm">
                    <CustomAvatar
                      avatarUrl=""
                      name={groupMember.name}
                      size="sm"
                    />
                    <div>
                      <Text size="xs">{groupMember.name}</Text>
                      <Text size="xs" c="dimmed">{groupMember.email}</Text>
                    </div>
                  </Group>
                ))}
              </Stack>
            </Collapse>
          </Table.Td>
        </Table.Tr>
      )}
    </>
  );
}