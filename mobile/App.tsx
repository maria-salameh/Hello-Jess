// Point d'entrée de l'application mobile : branche la navigation entre les écrans et la connexion.
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import EggTimer from "./src/components/EggTimer";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { WorkspaceProvider } from "./src/context/WorkspaceContext";
import CalendarScreen from "./src/screens/CalendarScreen";
import HabitsScreen from "./src/screens/HabitsScreen";
import LockScreen from "./src/screens/LockScreen";
import LoginScreen from "./src/screens/LoginScreen";
import NotesScreen from "./src/screens/NotesScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import StatsScreen from "./src/screens/StatsScreen";
import TaskDetailScreen from "./src/screens/TaskDetailScreen";
import TasksScreen from "./src/screens/TasksScreen";
import WorkspacesScreen from "./src/screens/WorkspacesScreen";

// La "pile" d'écrans : naviguer ouvre un écran par-dessus l'autre.
const Stack = createNativeStackNavigator();

// Choisit les écrans disponibles selon que l'utilisateur est connecté ou non.
function RootNavigator() {
  const { user, loading, locked } = useAuth();

  // Pendant qu'on vérifie la session sauvegardée, on affiche un indicateur de chargement.
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#17161a" }}>
        <ActivityIndicator color="#6c5ce7" />
      </View>
    );
  }

  // Une session est sauvegardée mais Face ID n'a pas encore déverrouillé l'application.
  if (locked) return <LockScreen />;

  return (
    <View style={{ flex: 1 }}>
    {/* Les écrans glissent doucement depuis le bas. */}
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}>
      {/* Connecté : la liste des tâches, le détail d'une tâche, le calendrier, les habitudes et les statistiques.
          Déconnecté : les écrans de connexion et d'inscription. */}
      {user ? (
        <>
          <Stack.Screen name="Tasks" component={TasksScreen} />
          <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
          <Stack.Screen name="Notes" component={NotesScreen} />
          <Stack.Screen name="Calendar" component={CalendarScreen} />
          <Stack.Screen name="Habits" component={HabitsScreen} />
          <Stack.Screen name="Stats" component={StatsScreen} />
          <Stack.Screen name="Workspaces" component={WorkspacesScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
    {/* Le minuteur d'œuf flotte en bas à droite sur tous les écrans. */}
    <EggTimer />
    </View>
  );
}

// Haut de l'application : le fournisseur d'authentification partage "qui est connecté",
// et le conteneur de navigation (en thème sombre) affiche les écrans.
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <NavigationContainer theme={DarkTheme}>
            <RootNavigator />
          </NavigationContainer>
        </WorkspaceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
