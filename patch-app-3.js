const fs = require('fs');
let appContent = fs.readFileSync('App.tsx', 'utf-8');

appContent = appContent.replace(
  "const handleAddViolation = (v: Violation) => {",
  "const handleAddViolation = async (v: Violation) => {\n    if (fbUser) { await addDocument('violations', v); setIsModalOpen(false); return; }"
);

appContent = appContent.replace(
  "const handleAddReward = (r: Reward) => {",
  "const handleAddReward = async (r: Reward) => {\n    if (fbUser) { await addDocument('rewards', r); setIsRewardModalOpen(false); return; }"
);

appContent = appContent.replace(
  "const handleDelete = (id: string, type: 'VIOLATION' | 'REWARD') => {",
  "const handleDelete = async (id: string, type: 'VIOLATION' | 'REWARD') => {\n    if (fbUser) { await deleteDocument(type === 'VIOLATION' ? 'violations' : 'rewards', id); setDeleteModal({ isOpen: false, id: null, type }); return; }"
);

appContent = appContent.replace(
  "const handleToggleStatus = (id: string, type: 'VIOLATION' | 'REWARD', newStatus?: 'Pending' | 'Paid' | 'Appealed') => {",
  "const handleToggleStatus = async (id: string, type: 'VIOLATION' | 'REWARD', newStatus?: 'Pending' | 'Paid' | 'Appealed') => {\n    if (fbUser) {\n      if (type === 'VIOLATION') {\n        const v = fbViolations.find(x => x.id === id);\n        if (v) await updateDocument('violations', id, newStatus ? { status: newStatus } : { isApproved: !v.isApproved });\n      } else {\n        const r = fbRewards.find(x => x.id === id);\n        if (r) await updateDocument('rewards', id, { isApproved: !r.isApproved });\n      }\n      return;\n    }"
);

appContent = appContent.replace(
  "const handleAddEmployee = (e: Employee) => {",
  "const handleAddEmployee = async (e: Employee) => {\n    if (fbUser) { await addDocument('employees', e); setIsAddEmployeeOpen(false); return; }"
);

appContent = appContent.replace(
  "const handleUpdateEmployee = (e: Employee) => {",
  "const handleUpdateEmployee = async (e: Employee) => {\n    if (fbUser) { await updateDocument('employees', e.id, e); setEditingEmployee(null); return; }"
);

appContent = appContent.replace(
  "const handleDeleteEmployee = (id: string) => {",
  "const handleDeleteEmployee = async (id: string) => {\n    if (fbUser) { await deleteDocument('employees', id); return; }"
);

appContent = appContent.replace(
  "const handleUpdateUser = (updatedUser: User) => {",
  "const handleUpdateUser = async (updatedUser: User) => {\n    if (fbUser) { await updateDocument('users', updatedUser.id, updatedUser); return; }"
);

fs.writeFileSync('App.tsx', appContent);
