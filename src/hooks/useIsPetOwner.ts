import { useEffect, useState } from "react";

import { currentUserId } from "@/lib/auth";
import { isPetOwner } from "@/lib/challengesData";

/** Whether the signed-in user created this pet's family. false while loading. */
export function useIsPetOwner(petId: string | undefined) {
  const [owner, setOwner] = useState<{ petId: string; value: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!petId) return;
    let live = true;
    isPetOwner(petId, currentUserId())
      .then((value) => live && setOwner({ petId, value }))
      .catch(() => live && setOwner({ petId, value: false }));
    return () => {
      live = false;
    };
  }, [petId]);

  return owner !== null && owner.petId === petId ? owner.value : false;
}
