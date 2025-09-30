// components/folders/DeleteFolderModal.tsx
"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  folderName: string;
}

export default function DeleteFolderModal({
  isOpen,
  onClose,
  onConfirm,
  folderName,
}: DeleteFolderModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="bg-white rounded-xl p-6 z-10 w-full max-w-md mx-auto">
        <Dialog.Title className="text-xl font-bold text-red-600">Supprimer ce dossier ?</Dialog.Title>
        <Dialog.Description className="mt-2 text-gray-700">
          Le dossier <strong>{folderName}</strong> sera supprimé avec toutes ses conversations.
          Cette action est <span className="text-red-600 font-semibold">irréversible</span>.
        </Dialog.Description>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            {isDeleting ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
