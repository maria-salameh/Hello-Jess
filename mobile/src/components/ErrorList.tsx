// Affiche une liste de messages d'erreur dans le cadre rouge (ne montre rien s'il n'y en a pas).
import { Text, View } from "react-native";
import { styles } from "../screens/styles";

export default function ErrorList({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;

  return (
    <View style={{ gap: 4 }}>
      {messages.map((message) => (
        <Text key={message} style={styles.error}>
          {message}
        </Text>
      ))}
    </View>
  );
}
