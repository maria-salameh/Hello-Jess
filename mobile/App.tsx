// Point d'entrée de l'application mobile : branche la navigation entre les écrans et la connexion.
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import TasksScreen from "./src/screens/TasksScreen";

// La "pile" d'écrans : naviguer ouvre un écran par-dessus l'autre.
const Stack = createNativeStackNavigator();

// Choisit les écrans disponibles selon que l'utilisateur est connecté ou non.
function RootNavigator() {
  const { user, loading } = useAuth();

  // Pendant qu'on vérifie la session sauvegardée, on affiche un indicateur de chargement.
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#17161a" }}>
        <ActivityIndicator color="#6c5ce7" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Connecté : seulement la liste des tâches. Déconnecté : les écrans de connexion et d'inscription. */}
      {user ? (
        <Stack.Screen name="Tasks" component={TasksScreen} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Haut de l'application : le fournisseur d'authentification partage "qui est connecté",
// et le conteneur de navigation (en thème sombre) affiche les écrans.
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={DarkTheme}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
