const fs = require('fs');

let appContent = fs.readFileSync('App.tsx', 'utf-8');

// 1. Add import
appContent = appContent.replace(
  "import { getTheme } from './theme';",
  "import { getTheme } from './theme';\nimport { useFirebase } from './hooks/useFirebase';"
);

// 2. Add hook call inside App component
const appStartStr = "const App: React.FC = () => {";
appContent = appContent.replace(
  appStartStr,
  `${appStartStr}\n  const { currentUser: fbUser, loginWithGoogle, logout: fbLogout, users: fbUsers, violations: fbViolations, rewards: fbRewards, employees: fbEmployees, loading: fbLoading, addDocument, updateDocument, deleteDocument } = useFirebase();`
);

// 3. Update the login page render
appContent = appContent.replace(
  "<LoginPage onLogin={handleLogin} settings={settings} error={loginError} />",
  "<LoginPage onLogin={handleLogin} onGoogleLogin={loginWithGoogle} settings={settings} error={loginError} />"
);

// 4. Update the user check (replace with `fbUser || user` because of backwards compatibility)
// We'll just replace `if (!user) return <LoginPage...`
// Wait, actually better to just rewrite the `if (!user)` part.
appContent = appContent.replace(
  "if (!user) return <LoginPage onLogin={handleLogin} settings={settings} error={loginError} />;",
  "if (fbLoading) return <div className=\"min-h-screen flex items-center justify-center bg-gray-50\"><Loader2 className=\"w-8 h-8 animate-spin text-indigo-500\" /></div>;\n  if (!user && !fbUser) return <LoginPage onLogin={handleLogin} onGoogleLogin={loginWithGoogle} settings={settings} error={loginError} />;\n  const activeUser = fbUser || user;"
);

// We need to replace all `user` variable usages with `activeUser`!
// Let's do that with a regex or replace. 
// A safer way is to redefine `user` as `const user = fbUser || localUser;`
// Let me change the state variable name from `user` to `localUser`
appContent = appContent.replace(
  "const [user, setUser] = useState<User | null>(null);",
  "const [localUser, setLocalUser] = useState<User | null>(null);\n  const user = fbUser || localUser;\n  const setUser = setLocalUser;"
);

fs.writeFileSync('App.tsx', appContent);
