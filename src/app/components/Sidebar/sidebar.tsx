'use client';

import {FolderList}  from '../folders/FolderList/FolderList';
import { AddFolderForm } from '../folders/AddFolderForm/AddFolderForms';
import { useState } from 'react';

export function Sidebar() {
  const [refreshFlag, setRefreshFlag] = useState(false);

  const triggerRefresh = () => setRefreshFlag(!refreshFlag);

  return (
    <aside className="w-64 bg-gray-100 p-4 border-r h-full">
      <h2 className="text-lg font-semibold mb-4">📁 Dossiers</h2>
      <AddFolderForm onFolderCreated={triggerRefresh} />
      {/* Astuce : on change la clé pour forcer un re-render */}
      <FolderList key={refreshFlag ? '1' : '0'} />
    </aside>
  );
}
