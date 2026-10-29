// Les espaces de travail : créer un espace partagé, y inviter des gens par email, ou le quitter.
import { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api, errorMessages, type Workspace } from "../api";
import Button from "../components/Button";
import ErrorList from "../components/ErrorList";
import FadeIn from "../components/FadeIn";
import TopNav from "../components/TopNav";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { confirmAction } from "../utils/confirm";
import { styles } from "./styles";

export default function WorkspacesScreen() {
  const { user } = useAuth();
  const { workspaces, current, switchTo, refresh } = useWorkspace();
  const [name, setName] = useState("");
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);

  async function run(action: () => Promise<unknown>) {
    setErrors([]);
    try {
      await action();
      await refresh();
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  function handleCreate() {
    void run(async () => {
      const res = await api.post<Workspace>("/workspaces", { name });
      setName("");
      await switchTo(res.data.id);
    });
  }

  function handleInvite(workspace: Workspace) {
    void run(async () => {
      await api.post(`/workspaces/${workspace.id}/members`, { email: emails[workspace.id] ?? "" });
      setEmails((prev) => ({ ...prev, [workspace.id]: "" }));
    });
  }

  function handleRemove(workspace: Workspace, memberId: string) {
    const leaving = memberId === user?.id;
    confirmAction(
      leaving ? `Leave "${workspace.name}"?` : "Remove this member?",
      () => void run(() => api.delete(`/workspaces/${workspace.id}/members/${memberId}`)),
      leaving ? "Leave" : "Remove",
    );
  }

  return (
    <ScrollView style={styles.scrollPage} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <TopNav subtitle="Share tasks and notes with other people" />

      <TextInput
        style={styles.input}
        placeholder="New shared workspace (e.g. Flat 4B)"
        placeholderTextColor="#a09db8"
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleCreate}
        returnKeyType="done"
        accessibilityLabel="Workspace name"
      />
      <Button label="Create" onPress={handleCreate} />

      <ErrorList messages={errors} />

      {workspaces.map((workspace, index) => {
        const isOwner = workspace.ownerId === user?.id;
        return (
          <FadeIn key={workspace.id} delay={Math.min(index, 8) * 45}>
            <View style={styles.statsCard}>
              <View style={styles.badgeRow}>
                <Text style={styles.statsHeading}>{workspace.name}</Text>
                {workspace.isPersonal && (
                  <View style={[styles.badge, { marginTop: 0 }]}>
                    <Text style={styles.badgeText}>personal</Text>
                  </View>
                )}
                {workspace.id === current?.id && (
                  <View style={[styles.badge, { marginTop: 0, backgroundColor: "rgba(226,163,60,0.18)" }]}>
                    <Text style={[styles.badgeText, { color: "#e2a33c" }]}>viewing</Text>
                  </View>
                )}
              </View>

              {workspace.members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>
                      {member.name}
                      {member.role === "owner" ? " · owner" : ""}
                    </Text>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {member.email}
                    </Text>
                  </View>
                  {member.role !== "owner" && (isOwner || member.id === user?.id) && (
                    <TouchableOpacity onPress={() => handleRemove(workspace, member.id)}>
                      <Text style={styles.linkText}>{member.id === user?.id ? "Leave" : "Remove"}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {workspace.id !== current?.id && (
                <TouchableOpacity style={[styles.chip, { alignSelf: "flex-start" }]} onPress={() => void switchTo(workspace.id)}>
                  <Text style={styles.chipText}>Switch to it</Text>
                </TouchableOpacity>
              )}

              {isOwner && !workspace.isPersonal && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Invite by email (they need an account)"
                    placeholderTextColor="#a09db8"
                    value={emails[workspace.id] ?? ""}
                    onChangeText={(text) => setEmails((prev) => ({ ...prev, [workspace.id]: text }))}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    accessibilityLabel={`Invite to ${workspace.name}`}
                  />
                  <Button label="Invite" onPress={() => handleInvite(workspace)} />
                </View>
              )}
            </View>
          </FadeIn>
        );
      })}
    </ScrollView>
  );
}
