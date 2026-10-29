import {
  collection,
  query,
  where,
  getDocs,
  limit
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { Points } from "../models/points";

export async function getPoints(
  action: string
): Promise<Points | null> {

  const q = query(
    collection(db, "points"),
    where("action", "==", action),
    limit(1)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  return querySnapshot.docs[0].data() as Points;
}