"use client";

import type { JSX } from "react";
import { Chore } from "@/types/chore";
import { ChoreItem } from "./ChoreItem"; // This path should still work

interface ChoreListProps {
  chores: Chore[];
  onEditChore: (chore: Chore) => void;
  onToggleChoreCompletion: (choreId: string) => void;
  onDeleteChore: (choreId: string) => void;
  togglingChoreId: string | null;
  isLoading: boolean;
  showAddForm: boolean;
}

export function ChoreList({
  chores,
  onEditChore,
  onToggleChoreCompletion,
  onDeleteChore,
  togglingChoreId,
  isLoading,
  showAddForm,
}: ChoreListProps): JSX.Element {
  // Added JSX.Element return type
  if (isLoading) return <p>Loading chores...</p>;

  if (chores.length === 0 && !showAddForm) {
    return (
      <p className="text-muted-foreground">
        No chores yet! Click "Add Chore" to get started.
      </p>
    );
  }

  if (chores.length === 0 && showAddForm) {
    return (
      <p className="text-muted-foreground">
        No chores yet! Fill the form above to add one.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {chores.map((chore) => (
        <ChoreItem
          key={chore.id}
          chore={chore}
          onEdit={onEditChore}
          onToggleCompletion={onToggleChoreCompletion}
          onDelete={onDeleteChore}
          isToggling={togglingChoreId === chore.id}
        />
      ))}
    </ul>
  );
}
