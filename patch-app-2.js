const fs = require('fs');

let appContent = fs.readFileSync('App.tsx', 'utf-8');

const targetStr = "const user = fbUser || localUser;";
const insertion = `
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
`;
appContent = appContent.replace(targetStr, `${targetStr}\n${insertion}`);

// Overwrite logout to use fbLogout
appContent = appContent.replace(
  "const handleLogout = () => {",
  "const handleLogout = () => {\n    fbLogout();"
);

fs.writeFileSync('App.tsx', appContent);
