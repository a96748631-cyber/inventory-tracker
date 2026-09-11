import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { InventoryItem } from '../types';
import { INITIAL_INVENTORY_ITEMS } from '../data/initialData';

const COLLECTION_NAME = 'inventory_parts';

export const firestoreService = {
  // Subscribe to real-time updates across all computers/phones
  subscribeToParts(
    onSuccess: (items: InventoryItem[]) => void,
    onError: (error: Error) => void
  ) {
    const collRef = collection(db, COLLECTION_NAME);
    return onSnapshot(
      collRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // Auto-seed initial catalog if Firestore collection is fresh
          try {
            await this.seedInitialParts();
            return;
          } catch (seedErr) {
            console.warn('Auto-seed skipped or failed:', seedErr);
          }
        }

        const items: InventoryItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as InventoryItem);
        });

        onSuccess(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
        onError(error);
      }
    );
  },

  // Seed default sample parts if cloud database is empty
  async seedInitialParts(): Promise<void> {
    const batch = writeBatch(db);
    INITIAL_INVENTORY_ITEMS.forEach((item) => {
      const docRef = doc(db, COLLECTION_NAME, item.id);
      batch.set(docRef, item);
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTION_NAME);
    }
  },

  // Add new part to Firestore
  async createPart(part: InventoryItem): Promise<void> {
    const path = `${COLLECTION_NAME}/${part.id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, part.id);
      await setDoc(docRef, part);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  // Update existing part
  async updatePart(id: string, updates: Partial<InventoryItem>): Promise<void> {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  // Update part stock delta
  async adjustStock(id: string, newStock: number, lastRestockedDate?: string): Promise<void> {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updates: Partial<InventoryItem> = {
        quantityInStock: Math.max(0, newStock),
      };
      if (lastRestockedDate) {
        updates.lastRestockedDate = lastRestockedDate;
      }
      await updateDoc(docRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  // Delete single part
  async deletePart(id: string): Promise<void> {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  // Batch delete parts
  async deleteBatch(ids: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTION_NAME);
    }
  },

  // Reset entire catalog to standard sample rows or wipe
  async resetCatalog(wipe: boolean = false): Promise<void> {
    try {
      // 1. Fetch all existing documents
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const batch = writeBatch(db);

      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // 2. If not wipe, re-seed INITIAL_INVENTORY_ITEMS
      if (!wipe) {
        INITIAL_INVENTORY_ITEMS.forEach((item) => {
          const docRef = doc(db, COLLECTION_NAME, item.id);
          batch.set(docRef, item);
        });
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTION_NAME);
    }
  },
};
