import {WorkspaceInviteForm} from "@/features/workspace/components/members/components/workspace-invite-form.tsx";
import {
  Button,
  Divider,
  Modal,
  ScrollArea,
  Group,
  Text,
  Box,
  Table, Avatar
} from "@mantine/core";
import {useDisclosure} from "@mantine/hooks";
import {useTranslation} from "react-i18next";
import {IconCopy} from "@tabler/icons-react";
import React from "react";
import {getInviteLink} from "@/features/workspace/services/workspace-service.ts";
import {notifications} from "@mantine/notifications";
import {getUserRoleLabel} from "@/features/workspace/types/user-role-data.ts";

export default function WorkspaceInviteModal() {
  const {t} = useTranslation();
  const [openedForm, {open: openForm, close: closeForm}] = useDisclosure(false);
  const [inviteItems, setInviteItems] = React.useState<{ email: string; invitationId: string | null, role: string }[]>([]);
  const [invitesGenerated, setInvitesGenerated] = React.useState<boolean>(false);

  const handleGeneratedInvites = (items: { email: string; invitationId: string | null, role: string }[]) => {
    setInviteItems(items);
    setInvitesGenerated(true);
  };

  const handleCloseForm = () => {
    closeForm();
    setInviteItems([]);
    setInvitesGenerated(false);
  };

  const handleCopy = async (invitationId: string | null) => {
    if (!invitationId) return;
    try {
      const link = await getInviteLink({invitationId});
      await navigator.clipboard.writeText(link.inviteLink);
      notifications.show({message: t("Link copied successfully"), color: "green"});
    } catch (err: any) {
      notifications.show({message: err?.response?.data?.message || "Error", color: "red"});
    }
  };


  return (
    <>
      <Button onClick={openForm}>{t("Invite members")}</Button>

      <Modal
        size="650"
        opened={openedForm}
        onClose={handleCloseForm}
        title={t("Invite new members")}
        centered
      >
        <Divider size="xs" mb="xs"/>
        <ScrollArea h="80%">
          {
            !invitesGenerated && (
              <WorkspaceInviteForm onClose={handleCloseForm} onGeneratedInvites={handleGeneratedInvites}/>
            )
          }
          {
            invitesGenerated && (
              <Box maw="600" mx="auto">
                <Text size="sm" mb="xs">
                  {t("Send these links to the participants you invited.")}
                </Text>
                <Table.ScrollContainer minWidth={600}>
                  <Table highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t("Email")}</Table.Th>
                        <Table.Th>{t("Role")}</Table.Th>
                        <Table.Th>{t("Link")}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody>
                      {inviteItems.map((item, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap">
                              <Avatar name={item.email} color="initials" />
                              <div>
                                <Text fz="sm" fw={500} style={{maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                                  {item.email}
                                </Text>
                              </div>
                            </Group>
                          </Table.Td>

                          <Table.Td>{t(getUserRoleLabel(item.role))}</Table.Td>

                          <Table.Td>
                            <Box style={{textAlign: "center"}}>
                              <Button onClick={() => handleCopy(item.invitationId)} leftSection={<IconCopy size={14}/>} size={'xs'}>
                                {t("Copy")}
                              </Button>
                            </Box>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Box>
            )
          }
        </ScrollArea>
      </Modal>
    </>
  );
}
