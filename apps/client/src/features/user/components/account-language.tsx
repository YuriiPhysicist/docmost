import { Group, Text, Select } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { updateUser } from "../services/user-service";
import { useAtom } from "jotai";
import { userAtom } from "../atoms/current-user-atom";
import { useState } from "react";

export default function AccountLanguage() {
  const { t } = useTranslation();

  return (
    <Group justify="space-between" wrap="nowrap" gap="xl">
      <div>
        <Text size="md">{t("Language")}</Text>
        <Text size="sm" c="dimmed">
          {t("Choose your preferred interface language.")}
        </Text>
      </div>
      <LanguageSwitcher />
    </Group>
  );
}

function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useAtom(userAtom);
  const [language, setLanguage] = useState(
    user?.locale === "en" ? "uk-UA" : user.locale,
  );

  const handleChange = async (value: string) => {
    const updatedUser = await updateUser({ locale: value });

    setLanguage(value);
    setUser(updatedUser);

    i18n.changeLanguage(value);
  };

  return (
    <Select
      label={t("Select language")}
      data={[
        { value: "uk-UA", label: "Українська (Ukrainian)" },
        { value: "en-US", label: "English (US)" },
      ]}
      value={language || "uk-UA"}
      disabled
      onChange={handleChange}
      allowDeselect={false}
      checkIconPosition="right"
    />
  );
}
