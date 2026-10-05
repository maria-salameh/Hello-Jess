// Affiche une liste de messages d'erreur dans le cadre rouge (ne montre rien s'il n'y en a pas).
export default function ErrorList({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;

  return (
    <div className="error" role="alert">
      {messages.map((message) => (
        <div key={message}>{message}</div>
      ))}
    </div>
  );
}
