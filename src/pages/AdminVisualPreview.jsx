import { useState } from 'react';
import Admin from './Admin';
import AdminAccessPrompt from '../components/admin/AdminAccessPrompt';
import { AdminAccessContext } from '../context/adminAccessContext';

const previewAccess = {
  changePassword: async () => ({ passwordChanged: true }),
  lock: async () => {},
};

export default function AdminVisualPreview() {
  const [password, setPassword] = useState('');
  const showGate = new URLSearchParams(window.location.search).get('surface') === 'gate';

  if (showGate) {
    return (
      <AdminAccessPrompt
        busy={false}
        message=""
        onPasswordChange={setPassword}
        onSubmit={event => event.preventDefault()}
        password={password}
      />
    );
  }

  return (
    <AdminAccessContext.Provider value={previewAccess}>
      <Admin />
    </AdminAccessContext.Provider>
  );
}
