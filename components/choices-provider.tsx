"use client";

import * as React from "react";

import {
  CHOICES_STORAGE_KEY,
  MAX_CHOICES,
  parseChoices,
  type AddChoiceResult,
  type ChoiceInput,
  type ChoiceRecord,
} from "@/lib/choices";

type ChoicesContextValue = {
  choices: ChoiceRecord[];
  ready: boolean;
  count: number;
  has: (id: number) => boolean;
  add: (input: ChoiceInput) => AddChoiceResult;
  remove: (id: number) => void;
  move: (from: number, to: number) => void;
  setOrder: (ids: number[]) => void;
  replace: (choices: ChoiceRecord[]) => void;
  clear: () => void;
};

const ChoicesContext = React.createContext<ChoicesContextValue | null>(null);

function persist(choices: ChoiceRecord[]) {
  try {
    window.localStorage.setItem(CHOICES_STORAGE_KEY, JSON.stringify(choices));
  } catch (error) {
    console.warn("Could not save the choice list locally:", error);
  }
}

export function ChoicesProvider({ children }: { children: React.ReactNode }) {
  const [choices, setChoices] = React.useState<ChoiceRecord[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CHOICES_STORAGE_KEY);
      setChoices(parseChoices(stored));
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    persist(choices);
  }, [choices, ready]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CHOICES_STORAGE_KEY) return;
      setChoices(parseChoices(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = React.useCallback(
    (id: number) => choices.some((choice) => choice.id === id),
    [choices],
  );

  const add = React.useCallback(
    (input: ChoiceInput): AddChoiceResult => {
      if (choices.some((choice) => choice.id === input.id)) return "exists";
      if (choices.length >= MAX_CHOICES) return "full";

      const record: ChoiceRecord = {
        ...input,
        addedAt: new Date().toISOString(),
      };
      setChoices((current) =>
        current.some((choice) => choice.id === input.id) ||
        current.length >= MAX_CHOICES
          ? current
          : [...current, record],
      );
      return "added";
    },
    [choices],
  );

  const remove = React.useCallback((id: number) => {
    setChoices((current) => current.filter((choice) => choice.id !== id));
  }, []);

  const move = React.useCallback((from: number, to: number) => {
    setChoices((current) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= current.length ||
        to >= current.length
      ) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const setOrder = React.useCallback((ids: number[]) => {
    setChoices((current) => {
      const byId = new Map(current.map((choice) => [choice.id, choice]));
      const next: ChoiceRecord[] = [];
      for (const id of ids) {
        const choice = byId.get(id);
        if (choice) {
          next.push(choice);
          byId.delete(id);
        }
      }
      for (const choice of current) {
        if (byId.has(choice.id)) next.push(choice);
      }
      return next;
    });
  }, []);

  const replace = React.useCallback((next: ChoiceRecord[]) => {
    setChoices(next.slice(0, MAX_CHOICES));
  }, []);

  const clear = React.useCallback(() => {
    setChoices([]);
  }, []);

  const value = React.useMemo<ChoicesContextValue>(
    () => ({
      choices,
      ready,
      count: choices.length,
      has,
      add,
      remove,
      move,
      setOrder,
      replace,
      clear,
    }),
    [add, choices, clear, has, move, ready, replace, setOrder, remove],
  );

  return (
    <ChoicesContext.Provider value={value}>{children}</ChoicesContext.Provider>
  );
}

export function useChoices(): ChoicesContextValue {
  const context = React.useContext(ChoicesContext);
  if (!context) {
    throw new Error("useChoices must be used inside ChoicesProvider");
  }
  return context;
}
