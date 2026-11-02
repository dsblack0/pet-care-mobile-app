import {
  collection,
  query,
  where,
  getDocs,
  limit
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { Level } from "../models/levels";

export async function getLevel(
  levelNum: number
): Promise<Level | null> {

  const q = query(
    collection(db, "levels"),
    where("levelNum", "==", levelNum),
    limit(1)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  return querySnapshot.docs[0].data() as Level;
}