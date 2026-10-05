// L'en-tête commun aux écrans connectés : titre, bienvenue, bouton de déconnexion et menu de navigation.
import { useNavigation, useRoute } from "@react-navigation/native";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { styles } from "../screens/styles";

// Les écrans du menu : le nom de l'écran dans la navigation et le texte affiché.
const TABS = [
  { screen: "Tasks", label: "Tasks" },
  { screen: "Calendar", label: "Calendar" },
  { screen: "Habits", label: "Habits" },
  { screen: "Stats", label: "Statistics" },
];

// "subtitle" permet à un écran d'afficher sa propre phrase sous le titre (sinon : "Hi <nom>").
export default function TopNav({ subtitle }: { subtitle?: string }) {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute();

  return (
    <View style={{ gap: 10 }}>
      {/* Titre, phrase d'accueil et bouton de déconnexion. */}
      <View style={styles.tasksHeader}>
        <View>
          <Text style={styles.title}>HelloJess</Text>
          <Text style={styles.subtitle}>{subtitle ?? `Hi ${user?.name}`}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Le menu : l'onglet de l'écran courant est souligné. */}
      <View style={styles.nav}>
        {TABS.map((tab) => {
          const active = route.name === tab.screen;
          return (
            <TouchableOpacity
              key={tab.screen}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => navigation.navigate(tab.screen)}
            >
              <Text style={[styles.navText, active && styles.navTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
