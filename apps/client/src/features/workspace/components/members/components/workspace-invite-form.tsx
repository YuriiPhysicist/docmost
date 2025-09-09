import { Group, Box, Button, TagsInput, Select } from "@mantine/core";
import React, { useState } from "react";
import { MultiGroupSelect } from "@/features/group/components/multi-group-select.tsx";
import { UserRole } from "@/lib/types.ts";
import { userRoleData } from "@/features/workspace/types/user-role-data.ts";
import { useCreateInvitationMutation } from "@/features/workspace/queries/workspace-query.ts";
import { useTranslation } from "react-i18next";
import { getPendingInvitations } from "@/features/workspace/services/workspace-service.ts";

interface Props {
  onClose: () => void;
  onGeneratedInvites?: (items: { email: string; invitationId: string | null, role: string }[]) => void;
}
export function WorkspaceInviteForm({ onClose, onGeneratedInvites }: Props) {
  const { t } = useTranslation();
  const [emails, setEmails] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(UserRole.MEMBER);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const createInvitationMutation = useCreateInvitationMutation();

  async function handleSubmit() {
    const validEmails = emails.filter((email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    });

    const created = await createInvitationMutation.mutateAsync({
      role: role!.toLowerCase(),
      emails: validEmails,
      groupIds: groupIds,
    });

    // Fetch all pending invitations and build a list for the valid emails
    try {
      const pending = await getPendingInvitations({ page: 1, limit: 100 });
      const byEmail = new Map(
        pending?.items?.map((inv: any) => [inv.email.toLowerCase(), inv]) || []
      );
      const items = validEmails.map((email) => ({
        email,
        invitationId: byEmail.get(email.toLowerCase())?.id || null,
        role: byEmail.get(email.toLowerCase())?.role || null,
      }));

      if (onGeneratedInvites) {
        onGeneratedInvites(items);
        // onClose();
      }
    } catch (e) {
      // ignore; notifications already shown by hooks on failure of create
    }
  }

  const handleGroupSelect = (value: string[]) => {
    setGroupIds(value);
  };

  return (
    <>
      <Box maw="600" mx="auto">
        {/*<WorkspaceInviteSection /> */}

        <TagsInput
          mt="sm"
          description={t(
            "Enter valid email addresses with ua.energy",
          )}
          label={t("Invite by email")}
          placeholder={t("enter valid emails addresses")}
          variant="filled"
          splitChars={[",", " "]}
          maxDropdownHeight={200}
          maxTags={50}
          onChange={setEmails}
        />

        <Select
          mt="sm"
          description={t("Select role to assign to all invited members")}
          label={t("Select role")}
          placeholder={t("Choose a role")}
          variant="filled"
          data={userRoleData
            .filter((role) => role.value !== UserRole.OWNER)
            .map((role) => ({
              ...role,
              label: t(`${role.label}`),
              description: t(`${role.description}`),
            }))}
          defaultValue={UserRole.MEMBER}
          allowDeselect={false}
          checkIconPosition="right"
          onChange={setRole}
        />

        <MultiGroupSelect
          mt="sm"
          description={t(
            "Invited members will be granted access to spaces the groups can access",
          )}
          label={t("Add to groups")}
          onChange={handleGroupSelect}
        />

        <Group justify="flex-end" mt="md">
          <Button
            onClick={handleSubmit}
            loading={createInvitationMutation.isPending}
          >
            {t("Generate invitation")}
          </Button>
        </Group>
      </Box>
    </>
  );
}
