import { writable, derived } from 'svelte/store';
import { db } from '$lib/firebase';
import { user } from './authStore';
import { collection, query, where, getDocs, doc, getDoc, orderBy, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';

// 학습 자료 스토어 생성
export const materials = writable([]);
export const loading = writable(false);
export const error = writable(null);

// 현재 사용자의 학습 자료 로드
export const loadMaterials = async (userId) => {
  if (!userId) return;
  
  loading.set(true);
  error.set(null);
  
  try {
    // studyMaterials 컬렉션에서 학습 자료 로드
    const materialsRef = collection(db, 'studyMaterials');
    const q = query(
      materialsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const materialsData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
        nextReviewDate: calculateNextReviewDate(data)
      };
    });
    
    materials.set(materialsData);
  } catch (err) {
    console.error('학습 자료 로드 오류:', err);
    error.set(err.message);
  } finally {
    loading.set(false);
  }
};

// 다음 복습 날짜 계산
const calculateNextReviewDate = (material) => {
  if (!material.reviews || material.reviews.length === 0) return null;
  
  const pendingReviews = material.reviews.filter(r => !r.completed);
  if (pendingReviews.length === 0) return null;
  
  return new Date(pendingReviews[0].scheduledDate);
};

// 학습 자료 생성
export const createMaterial = async (materialData) => {
  if (!materialData.userId) return null;
  
  loading.set(true);
  error.set(null);
  
  try {
    const materialsRef = collection(db, 'studyMaterials');
    const newMaterial = {
      ...materialData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      stage: 0,
      reviewCount: 0,
      reviewHistory: []
    };
    
    const docRef = await addDoc(materialsRef, newMaterial);
    const newMaterialWithId = {
      id: docRef.id,
      ...newMaterial,
      createdAt: newMaterial.createdAt.toDate(),
      updatedAt: newMaterial.updatedAt.toDate()
    };
    
    materials.update(items => [newMaterialWithId, ...items]);
    
    return newMaterialWithId;
  } catch (err) {
    console.error('학습 자료 생성 오류:', err);
    error.set(err.message);
    return null;
  } finally {
    loading.set(false);
  }
};

// 학습 자료 업데이트
export const updateMaterial = async (id, updates) => {
  if (!id) return null;
  
  loading.set(true);
  error.set(null);
  
  try {
    const materialRef = doc(db, 'studyMaterials', id);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(materialRef, updateData);
    
    materials.update(items => 
      items.map(item => 
        item.id === id
          ? { 
              ...item, 
              ...updates, 
              updatedAt: new Date() 
            }
          : item
      )
    );
    
    return { id, ...updates };
  } catch (err) {
    console.error('학습 자료 업데이트 오류:', err);
    error.set(err.message);
    return null;
  } finally {
    loading.set(false);
  }
};

// 학습 자료 삭제
export const deleteMaterial = async (id) => {
  if (!id) return false;
  
  loading.set(true);
  error.set(null);
  
  try {
    const materialRef = doc(db, 'studyMaterials', id);
    await deleteDoc(materialRef);
    
    materials.update(items => items.filter(item => item.id !== id));
    
    return true;
  } catch (err) {
    console.error('학습 자료 삭제 오류:', err);
    error.set(err.message);
    return false;
  } finally {
    loading.set(false);
  }
};

// 복습 완료 처리
export const completeReview = async (materialId, reviewId, reviewData = {}) => {
  if (!materialId || !reviewId) return null;
  
  loading.set(true);
  error.set(null);
  
  try {
    // 로컬 스토어에서 자료 찾기
    let materialToUpdate;
    materials.update(items => {
      const index = items.findIndex(item => item.id === materialId);
      if (index === -1) return items;
      
      const material = { ...items[index] };
      
      // 복습 항목 업데이트
      if (material.reviews) {
        material.reviews = material.reviews.map(review => 
          review.reviewId === reviewId
            ? { 
                ...review, 
                completed: true, 
                completedDate: new Date(),
                ...reviewData
              }
            : review
        );
      }
      
      // 스테이지 및 리뷰 카운트 업데이트
      material.stage = (material.stage || 0) + 1;
      material.reviewCount = (material.reviewCount || 0) + 1;
      
      // 다음 복습 날짜 계산
      material.nextReviewDate = calculateNextReviewDate(material);
      
      materialToUpdate = material;
      
      const newItems = [...items];
      newItems[index] = material;
      return newItems;
    });
    
    if (materialToUpdate) {
      // Firestore 업데이트
      const materialRef = doc(db, 'studyMaterials', materialId);
      await updateDoc(materialRef, {
        reviews: materialToUpdate.reviews.map(r => ({
          ...r,
          completedDate: r.completedDate ? Timestamp.fromDate(r.completedDate) : null
        })),
        stage: materialToUpdate.stage,
        reviewCount: materialToUpdate.reviewCount,
        updatedAt: Timestamp.now()
      });
    }
    
    return materialToUpdate;
  } catch (err) {
    console.error('복습 완료 처리 오류:', err);
    error.set(err.message);
    return null;
  } finally {
    loading.set(false);
  }
};

// 사용자의 자료 상태 통계
export const getStatistics = async () => {
  try {
    let currentMaterials;
    const materialsUnsubscribe = materials.subscribe(value => {
      currentMaterials = value;
    });
    materialsUnsubscribe();
    
    if (!currentMaterials || currentMaterials.length === 0) {
      let currentUserValue;
      const unsubscribe = user.subscribe(value => {
        currentUserValue = value;
      });
      unsubscribe();
      
      if (currentUserValue?.uid) {
        await loadMaterials(currentUserValue.uid);
        const newMaterialsUnsubscribe = materials.subscribe(value => {
          currentMaterials = value;
        });
        newMaterialsUnsubscribe();
      }
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalMaterials = currentMaterials.length;
    const completedReviews = currentMaterials.reduce((total, material) => total + (material.reviewCount || 0), 0);
    const pendingReviews = currentMaterials.filter(material => 
      material.nextReviewDate && material.nextReviewDate >= today
    ).length;
    
    const totalScheduledReviews = completedReviews + pendingReviews;
    const completionRate = totalScheduledReviews === 0 
      ? 0 
      : Math.round((completedReviews / totalScheduledReviews) * 100);
    
    return {
      totalMaterials,
      completedReviews,
      pendingReviews,
      completionRate
    };
  } catch (err) {
    console.error('통계 계산 오류:', err);
    return {
      totalMaterials: 0,
      completedReviews: 0,
      pendingReviews: 0,
      completionRate: 0
    };
  }
}; 