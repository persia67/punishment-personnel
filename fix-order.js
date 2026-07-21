const fs = require('fs');

let appContent = fs.readFileSync('App.tsx', 'utf-8');

const useFirebaseLine = "const { currentUser: fbUser, loginWithGoogle, logout: fbLogout, users: fbUsers, violations: fbViolations, rewards: fbRewards, employees: fbEmployees, loading: fbLoading, addDocument, updateDocument, deleteDocument } = useFirebase();";

const patchCode = `
  const [localUser, setLocalUser] = useState<User | null>(null);
  const user = fbUser || localUser;
  useEffect(() => {
    if (fbUsers.length > 0) setUsers(fbUsers);
  }, [fbUsers]);
  useEffect(() => {
    if (fbEmployees.length > 0) setEmployees(fbEmployees);
  }, [fbEmployees]);
  useEffect(() => {
    if (fbViolations.length > 0) setViolations(fbViolations);
  }, [fbViolations]);
  useEffect(() => {
    if (fbRewards.length > 0) setRewards(fbRewards);
  }, [fbRewards]);
  const setUser = setLocalUser;
`;

// Remove the patch code from its current position
appContent = appContent.replace(patchCode, "");

// Insert it right after the state declarations
const targetLine = "const mainSearchContainerRef = useRef<HTMLDivElement>(null);";
appContent = appContent.replace(targetLine, `${targetLine}\n${patchCode}`);

fs.writeFileSync('App.tsx', appContent);
