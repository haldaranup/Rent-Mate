"use client";

import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Edit, Loader2, Trash2, Repeat } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Chore, ChoreRecurrence } from "@/types/chore";

interface ChoreItemProps {
  chore: Chore;
  onEdit: (chore: Chore) => void;
  onToggleCompletion: (choreId: string) => void;
  onDelete: (choreId: string) => void;
  isToggling: boolean;
}

export function ChoreItem({
  chore,
  onEdit,
  onToggleCompletion,
  onDelete,
  isToggling,
}: ChoreItemProps): JSX.Element {
  const isRecurring = chore.recurrence && chore.recurrence !== ChoreRecurrence.NONE;

  return (
    <li className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent">
      <div className="flex-1 min-w-0 flex flex-col">
        {isRecurring && (
          <div className="mb-1 self-start">
            <Repeat className="h-6 w-6 text-primary" />
          </div>
        )}
        <span
          className={`font-medium ${
            chore.isComplete ? "line-through text-muted-foreground" : ""
          }`}
        >
          {chore.description}
        </span>
        {chore.notes && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {chore.notes}
          </p>
        )}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
          {chore.dueDate && (
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              Due: {format(parseISO(chore.dueDate), "PPP")}
            </p>
          )}
          {chore.assignedTo && (
            <span className="text-xs px-2 py-0.5 bg-secondary rounded-full whitespace-nowrap">
              {chore.assignedTo.name || chore.assignedTo.email}
            </span>
          )}
          {isRecurring && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              ({chore.recurrence.charAt(0).toUpperCase() + chore.recurrence.slice(1).toLowerCase()})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-1 ml-2 pt-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(chore)}
          title="Edit Chore"
        >
          <Edit className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleCompletion(chore.id)}
          disabled={isToggling}
          title={chore.isComplete ? "Mark Incomplete" : "Mark Complete"}
        >
          {isToggling ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : chore.isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(chore.id)}
          title="Delete Chore"
        >
          <Trash2 className="h-5 w-5 text-destructive" />
        </Button>
      </div>
    </li>
  );
}
