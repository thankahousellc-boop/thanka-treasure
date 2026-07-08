"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type FrameOption = {
  id: string;
  name: string;
  priceDelta: number;
  imageUrl: string | null;
  isDefault: boolean;
  cutoutX: number;
  cutoutY: number;
  cutoutWidth: number;
  cutoutHeight: number;
};

type SelectedFrameContextValue = {
  frames: FrameOption[];
  selectedFrameId: string;
  setSelectedFrameId: (id: string) => void;
  selectedFrame: FrameOption | null;
};

const SelectedFrameContext = createContext<SelectedFrameContextValue | null>(null);

export function SelectedFrameProvider({
  frames,
  children,
}: {
  frames: FrameOption[];
  children: ReactNode;
}) {
  // Default to no brocade — brocade is an optional add-on, not pre-selected.
  const [selectedFrameId, setSelectedFrameId] = useState("");
  const selectedFrame =
    frames.find((f) => f.id === selectedFrameId) ?? null;
  return (
    <SelectedFrameContext.Provider
      value={{ frames, selectedFrameId, setSelectedFrameId, selectedFrame }}
    >
      {children}
    </SelectedFrameContext.Provider>
  );
}

export function useSelectedFrame() {
  return useContext(SelectedFrameContext);
}
