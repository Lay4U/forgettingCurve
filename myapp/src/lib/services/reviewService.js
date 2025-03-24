import { db } from '$lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';

/**
 * 오늘 복습할 항목들을 가져옵니다.
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Array>} - 복습 항목 배열
 */
export async function getReviewsForToday(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reviewsRef = collection(db, 'reviews');
    const q = query(
      reviewsRef,
      where('userId', '==', userId),
      where('nextReviewDate', '<=', today),
      where('completed', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const reviews = [];
    
    for (const docRef of querySnapshot.docs) {
      const reviewData = docRef.data();
      
      // 학습 자료 정보 가져오기
      const materialRef = doc(db, 'studyMaterials', reviewData.materialId);
      const materialSnap = await getDoc(materialRef);
      
      if (materialSnap.exists()) {
        const materialData = materialSnap.data();
        
        reviews.push({
          id: docRef.id,
          ...reviewData,
          material: {
            id: materialSnap.id,
            ...materialData
          }
        });
      }
    }
    
    return reviews;
  } catch (error) {
    console.error('오늘의 복습 항목 로드 중 오류:', error);
    throw error;
  }
}

/**
 * 복습 상태를 업데이트합니다.
 * @param {string} reviewId - 복습 ID
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<void>}
 */
export async function updateReviewStatus(reviewId, updateData) {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    await updateDoc(reviewRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('복습 상태 업데이트 중 오류:', error);
    throw error;
  }
} 