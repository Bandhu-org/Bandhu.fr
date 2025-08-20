# Gestion des dossiers (Folders)

## Objectif
Permettre à un utilisateur connecté de créer, renommer, supprimer et ranger ses conversations dans des dossiers.

## Modèle Prisma
- `Folder` : appartient à un `User`, contient plusieurs `Conversation`.
- Relation inverse ajoutée dans `User`.

## Étapes
- [x] Création du modèle Prisma
- [ ] Route API POST `/api/folder`
- [ ] Appel front (formulaire ou bouton)
- [ ] Affichage dans la page `/chat`