import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { NewUser } from "../models/users";

export async function saveUser(user: NewUser): Promise<string> {
  const docRef = await addDoc(collection(db, "users"), user);

  return docRef.id;
}