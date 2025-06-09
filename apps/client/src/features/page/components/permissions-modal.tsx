import {
  Modal,
  Group,
  Text,
  ScrollArea,
  Stack,
} from "@mantine/core";
import {useTranslation} from "react-i18next";
import RoleSelectMenu from "@/components/ui/role-select-menu.tsx";
import {CustomAvatar} from "@/components/ui/custom-avatar.tsx";
import {
  usePageMembersQuery,
  useUpdatePageMemberRoleMutation,
} from "@/features/page/queries/page-query";
import {IPageMember} from "@/features/page/types/page.types.ts";
import {NodeApi} from "react-arborist";
import {SpaceTreeNode} from "@/features/page/tree/types.ts";

interface PermissionModalProps {
  open: boolean;
  onClose: () => void;
  node: NodeApi<SpaceTreeNode>
}

export default function PermissionsModal(
  {
    open,
    onClose,
    node
  }: PermissionModalProps) {
  const {t} = useTranslation();
  const pageId = open && node.id;
  const {data: members = []} = usePageMembersQuery(pageId);
  const updateRole = useUpdatePageMemberRoleMutation();

  const handleRoleChange = async (
    userId: string,
    newRole: string,
    currentRole: string
  ) => {
    if (newRole === currentRole) return;

    await updateRole.mutateAsync({pageId, userId, role: newRole});
  };

  const grouped = {
    admin: [] as IPageMember[],
    write: [] as IPageMember[],
    read: [] as IPageMember[],
    block: [] as IPageMember[],
  };

  members.forEach((member) => {
    grouped[member.role]?.push(member);
  });

  const roleOrder = ["admin", "write", "read", "block"];

  return (
    <Modal.Root
      opened={open}
      onClose={onClose}
      size={500}
      padding="xl"
      yOffset="10vh"
      xOffset={0}
      mah={400}
      onClick={(e) => e.stopPropagation()}
    >
      <Modal.Overlay/>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{t("Manage Permissions")}</Modal.Title>
          <Modal.CloseButton/>
        </Modal.Header>
        <Modal.Body>
          <ScrollArea h={400}>
            <Stack>
              {roleOrder.map((role) =>
                grouped[role].length > 0 ? (
                  <div key={role}>
                    <Text fw={500} size="xs" mb="xs">
                      {role.toUpperCase()} ({grouped[role].length})
                    </Text>
                    <Stack mb="md">
                      {grouped[role].map((member) => (
                        <Group key={member.userId} justify="space-between">
                          <Group>
                            <CustomAvatar
                              avatarUrl={member.avatarUrl ?? ""}
                              name={member.userName}
                            />
                            <Text>{member.userName}</Text>
                          </Group>
                          <RoleSelectMenu
                            roles={[
                              {value: "admin", label: "Full access", description: "Full access"},
                              {value: "write", label: "Can edit", description: "Can edit"},
                              {value: "read", label: "Can view", description: "Can view"},
                              {value: "block", label: "Block", description: "Block user"},
                            ]}
                            roleName={member.role}
                            onChange={(val) =>
                              handleRoleChange(member.userId, val, member.role)
                            }
                          />
                        </Group>
                      ))}
                    </Stack>
                  </div>
                ) : null
              )}
            </Stack>
          </ScrollArea>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
