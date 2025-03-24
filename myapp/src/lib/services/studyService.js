import { db } from '$lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { calculateReviewIntervals, updateMemoryFactor } from './userSettingsService';
import { getReviewTemplate, getDefaultTemplate } from '$lib/services/templateService';

// UUID 생성 함수
const generateId = () => {
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
    return (Math.random() * 16 | 0).toString(16);
  });
};

// 학습 자료 등록 (망각 곡선 기반 복습 일정 자동 생성)
export const addStudyMaterial = async (userId, materialData, templateId = null) => {
  try {
    // 템플릿 정보 가져오기
    let template;
    if (templateId) {
      template = await getReviewTemplate(templateId);
    }
    
    // 템플릿이 없으면 기본 템플릿 가져오기
    if (!template) {
      template = await getDefaultTemplate(userId);
    }
    
    // 현재 날짜
    const today = new Date();
    
    // 템플릿 기반으로 복습 일정 생성
    const reviews = template.intervals.map((interval, index) => {
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + interval);
      
      return {
        reviewId: generateId(),
        status: 'pending',
        scheduledDate,
        cycle: index + 1,
        reviewIndex: index,
        memoryRating: null,
        difficultyRating: null,
        memo: ''
      };
    });
    
    // 학습 자료 데이터 생성
    const studyData = {
      ...materialData,
      userId,
      templateId: template.id,
      dateStudied: today,
      reviews,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Firestore에 저장
    const docRef = await addDoc(collection(db, 'studyMaterials'), studyData);
    
    return {
      id: docRef.id,
      ...studyData
    };
  } catch (error) {
    console.error('학습 자료 추가 에러:', error);
    throw error;
  }
};

// 특정 학습 자료 조회
export const getStudyMaterial = async (materialId) => {
  try {
    const docRef = doc(db, 'studyMaterials', materialId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('학습 자료 조회 에러:', error);
    throw error;
  }
};

// 사용자의 모든 학습 자료 조회
export const getUserStudyMaterials = async (userId) => {
  try {
    const q = query(
      collection(db, 'studyMaterials'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const materials = [];
    
    querySnapshot.forEach((doc) => {
      materials.push({ id: doc.id, ...doc.data() });
    });
    
    return materials;
  } catch (error) {
    console.error('사용자 학습 자료 조회 에러:', error);
    throw error;
  }
};

// 복습 상태 업데이트
export const updateReviewStatus = async (materialId, reviewId, updateData) => {
  try {
    // 학습 자료 문서 참조
    const materialRef = doc(db, 'studyMaterials', materialId);
    const materialDoc = await getDoc(materialRef);
    
    if (!materialDoc.exists()) {
      throw new Error('해당 학습 자료를 찾을 수 없습니다.');
    }
    
    const material = materialDoc.data();
    const reviews = material.reviews || [];
    
    // 업데이트할 복습 항목 찾기
    const reviewIndex = reviews.findIndex(r => r.reviewId === reviewId);
    
    if (reviewIndex === -1) {
      throw new Error('해당 복습 항목을 찾을 수 없습니다.');
    }
    
    // 현재 날짜
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간 정보 제거
    
    console.log('복습 업데이트 시작:', {
      materialId,
      reviewId,
      reviewIndex,
      status: updateData.status
    });
    
    // 복습 데이터 업데이트
    const updatedReviews = [...reviews];
    
    // 복습 완료 처리인 경우 관련 로직 실행
    if (updateData.status === 'completed') {
      console.log('복습 완료 처리 시작');
      
      // 예정된 복습 날짜
      const scheduledDate = updatedReviews[reviewIndex].scheduledDate instanceof Date
        ? new Date(updatedReviews[reviewIndex].scheduledDate)
        : new Date(updatedReviews[reviewIndex].scheduledDate.toDate());
      
      scheduledDate.setHours(0, 0, 0, 0); // 시간 정보 제거
      
      // 오늘 날짜와 예정된 날짜의 차이 계산 (일 단위)
      const diff = Math.floor((today - scheduledDate) / (1000 * 60 * 60 * 24));
      
      // 늦게 완료된 복습인지 확인
      const isLate = diff > 0;
      
      console.log('복습 일정 차이:', {
        예정일: scheduledDate.toISOString().substring(0, 10),
        오늘: today.toISOString().substring(0, 10),
        차이일수: diff,
        늦음여부: isLate
      });
      
      // 복습 완료 정보 업데이트
      updatedReviews[reviewIndex] = {
        ...updatedReviews[reviewIndex],
        ...updateData,
        status: 'completed',
        completedDate: new Date(today),
        isLate: isLate,
        daysLate: Math.max(0, diff)
      };
      
      try {
        // 템플릿 가져오기
        console.log('템플릿 조회 중:', material.templateId);
        const template = await getReviewTemplate(material.templateId);
        
        if (template && template.intervals && Array.isArray(template.intervals)) {
          console.log('템플릿 정보:', {
            템플릿이름: template.name,
            간격: template.intervals
          });
          
          // 현재 완료한 복습 이후의 모든 복습 항목 가져오기
          const remainingReviewsCount = updatedReviews.length - (reviewIndex + 1);
          
          if (remainingReviewsCount > 0) {
            console.log(`남은 복습 일정 ${remainingReviewsCount}개 업데이트 시작`);
            
            // 현재 완료한 복습의 인덱스에 해당하는 템플릿 간격
            const completedTemplateIndex = reviewIndex;
            
            // 마지막 복습 완료일 (현재 완료한 복습)
            let lastCompletionDate = new Date(today);
            
            // 남은 모든 복습 일정을 순차적으로 업데이트
            for (let i = reviewIndex + 1; i < updatedReviews.length; i++) {
              // 템플릿 인덱스 계산 (범위 확인)
              if (i >= template.intervals.length) {
                console.log(`템플릿 간격을 벗어난 인덱스: ${i}, 업데이트 중단`);
                break;
              }
              
              // 현재 템플릿 인덱스의 절대 간격 (오늘로부터)
              const currentInterval = template.intervals[i];
              const completedInterval = template.intervals[reviewIndex];
              
              // 완료한 복습과 현재 복습의 절대적인 날짜 차이 계산
              // 예: 완료한 복습이 0일차, 다음 복습이 1일차라면 1일 뒤에 예정
              const daysAfterCompletion = currentInterval - completedInterval;
              
              console.log(`${i}차 복습 계산:`, {
                완료한복습인덱스: reviewIndex,
                완료한복습간격: completedInterval,
                현재복습인덱스: i,
                현재복습간격: currentInterval,
                완료일로부터날짜차이: daysAfterCompletion
              });
              
              // 새 복습 일정 날짜 계산 (오늘로부터 앞으로)
              const newScheduledDate = new Date(today);
              newScheduledDate.setDate(today.getDate() + daysAfterCompletion);
              
              console.log(`${i}차 복습 일정 업데이트:`, {
                이전일정: updatedReviews[i].scheduledDate instanceof Date 
                  ? updatedReviews[i].scheduledDate.toISOString().substring(0, 10)
                  : new Date(updatedReviews[i].scheduledDate.toDate()).toISOString().substring(0, 10),
                새일정: newScheduledDate.toISOString().substring(0, 10)
              });
              
              // 복습 일정 업데이트
              updatedReviews[i] = {
                ...updatedReviews[i],
                scheduledDate: newScheduledDate
              };
            }
          } else {
            console.log('남은 복습 일정이 없습니다.');
          }
        } else {
          console.log('템플릿 정보가 유효하지 않습니다:', {
            템플릿: template ? '있음' : '없음',
            간격배열: template && template.intervals ? '있음' : '없음',
            배열여부: template && template.intervals ? Array.isArray(template.intervals) : false
          });
        }
      } catch (err) {
        console.error('복습 일정 조정 중 오류 발생:', err);
        // 오류가 발생해도 복습 완료 처리는 계속 진행
      }
    } else {
      // 일반 업데이트인 경우
      updatedReviews[reviewIndex] = {
        ...updatedReviews[reviewIndex],
        ...updateData
      };
    }
    
    // Timestamp로 변환하여 Firestore에 저장
    const firestoreReviews = updatedReviews.map(review => {
      const result = { ...review };
      
      // scheduledDate를 Timestamp로 변환
      if (review.scheduledDate instanceof Date) {
        result.scheduledDate = Timestamp.fromDate(review.scheduledDate);
      }
      
      // completedDate를 Timestamp로 변환
      if (review.completedDate instanceof Date) {
        result.completedDate = Timestamp.fromDate(review.completedDate);
      }
      
      return result;
    });
    
    // Firestore 문서 업데이트
    await updateDoc(materialRef, { reviews: firestoreReviews });
    console.log('복습 상태 업데이트 완료');
    
    // 복습 완료 시 사용자의 기억력 계수 업데이트
    if (updateData.status === 'completed' && updateData.memoryRating) {
      await updateMemoryFactor(material.userId, updateData.memoryRating);
    }
    
    return { id: materialId, ...material, reviews: updatedReviews };
  } catch (error) {
    console.error('복습 상태 업데이트 에러:', error);
    throw error;
  }
};

// 오늘의 복습 항목 조회
export const getTodayReviews = async (userId) => {
  try {
    // 사용자의 모든 학습 자료 가져오기
    const materials = await getUserStudyMaterials(userId);
    
    // 오늘 날짜 설정 (시간 제외)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 내일 날짜 설정
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 오늘 복습할 항목 필터링
    const todayReviews = [];
    
    materials.forEach(material => {
      const todayReviewItems = material.reviews.filter(review => {
        // scheduledDate를 Date 객체로 변환 (Firestore 타임스탬프 처리)
        const reviewDate = review.scheduledDate instanceof Date 
          ? review.scheduledDate 
          : review.scheduledDate.toDate();
        
        reviewDate.setHours(0, 0, 0, 0);
        
        // 오늘 날짜이고 완료되지 않은 항목
        return reviewDate >= today && 
               reviewDate < tomorrow && 
               review.status !== 'completed';
      });
      
      if (todayReviewItems.length > 0) {
        todayReviews.push({
          material: {
            id: material.id,
            title: material.title,
            content: material.content,
            subjectId: material.subjectId
          },
          reviews: todayReviewItems
        });
      }
    });
    
    return todayReviews;
  } catch (error) {
    console.error('오늘의 복습 항목 조회 에러:', error);
    throw error;
  }
};

// 예정된 복습 항목 조회
export const getUpcomingReviews = async (userId, daysAhead = 7) => {
  try {
    // 사용자의 모든 학습 자료 가져오기
    const materials = await getUserStudyMaterials(userId);
    
    // 오늘 날짜 설정 (시간 제외)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 기준일 설정 (오늘 + daysAhead)
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    // 예정된 복습 항목 필터링
    const upcomingReviews = [];
    
    materials.forEach(material => {
      const upcomingReviewItems = material.reviews.filter(review => {
        // scheduledDate를 Date 객체로 변환 (Firestore 타임스탬프 처리)
        const reviewDate = review.scheduledDate instanceof Date 
          ? review.scheduledDate 
          : review.scheduledDate.toDate();
        
        reviewDate.setHours(0, 0, 0, 0);
        
        // 오늘 이후 기준일 이내이고 완료되지 않은 항목
        return reviewDate > today && 
               reviewDate <= futureDate && 
               review.status !== 'completed';
      });
      
      if (upcomingReviewItems.length > 0) {
        upcomingReviews.push({
          material: {
            id: material.id,
            title: material.title,
            content: material.content,
            subjectId: material.subjectId
          },
          reviews: upcomingReviewItems
        });
      }
    });
    
    return upcomingReviews;
  } catch (error) {
    console.error('예정된 복습 항목 조회 에러:', error);
    throw error;
  }
};

// 복습 통계 조회
export const getReviewStatistics = async (userId) => {
  try {
    // 사용자의 모든 학습 자료 가져오기
    const materials = await getUserStudyMaterials(userId);
    
    let totalReviews = 0;
    let completedReviews = 0;
    let pendingReviews = 0;
    let missedReviews = 0;
    
    // 오늘 날짜 설정 (시간 제외)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    materials.forEach(material => {
      if (!material.reviews) {
        console.log('material has no reviews:', material.id, material.title);
        return; // reviews가 없으면 건너뜀
      }
      
      material.reviews.forEach(review => {
        totalReviews++;
        
        if (review.status === 'completed') {
          completedReviews++;
        } else {
          // scheduledDate를 Date 객체로 변환 (Firestore 타임스탬프 처리)
          const reviewDate = review.scheduledDate instanceof Date 
            ? review.scheduledDate 
            : review.scheduledDate.toDate();
          
          reviewDate.setHours(0, 0, 0, 0);
          
          if (reviewDate < today) {
            missedReviews++;
          } else {
            pendingReviews++;
          }
        }
      });
    });
    
    // 계산 과정 로깅
    console.log('복습 통계 계산:', {
      totalReviews,
      completedReviews,
      missedReviews,
      pendingReviews
    });
    
    // 복습 성공률 계산 (완료된 리뷰가 없으면 0%로 표시)
    let completionRate = 0;
    
    if (completedReviews > 0 || missedReviews > 0) {
      completionRate = (completedReviews / (completedReviews + missedReviews)) * 100;
    }
    
    console.log('복습 완료율:', completionRate);
    
    return {
      totalReviews,
      completedReviews,
      pendingReviews,
      missedReviews,
      completionRate: Math.round(completionRate * 10) / 10, // 소수점 1자리까지
      totalMaterials: materials.length
    };
  } catch (error) {
    console.error('복습 통계 조회 에러:', error);
    throw error;
  }
};

// 학습 자료 삭제
export const deleteStudyMaterial = async (materialId) => {
  try {
    const materialRef = doc(db, 'studyMaterials', materialId);
    await deleteDoc(materialRef);
    return true;
  } catch (error) {
    console.error('학습 자료 삭제 에러:', error);
    throw error;
  }
};

// 학습 자료 업데이트 (템플릿 변경 지원)
export const updateStudyMaterial = async (materialId, updateData, newTemplateId = null) => {
  try {
    const materialRef = doc(db, 'studyMaterials', materialId);
    const docSnap = await getDoc(materialRef);
    
    if (!docSnap.exists()) {
      throw new Error('해당 학습 자료를 찾을 수 없습니다.');
    }
    
    const material = docSnap.data();
    
    // 템플릿 변경 요청이 있는 경우
    if (newTemplateId && newTemplateId !== material.templateId) {
      // 새 템플릿 정보 가져오기
      const newTemplate = await getReviewTemplate(newTemplateId);
      
      if (!newTemplate) {
        throw new Error('템플릿을 찾을 수 없습니다.');
      }
      
      // 현재 날짜
      const today = new Date();
      
      // 새 템플릿 기반으로 복습 일정 생성
      const newReviews = newTemplate.intervals.map((interval, index) => {
        const scheduledDate = new Date(today);
        scheduledDate.setDate(today.getDate() + interval);
        
        return {
          reviewId: generateId(),
          status: 'pending',
          scheduledDate,
          cycle: index + 1,
          reviewIndex: index,
          memoryRating: null,
          difficultyRating: null,
          memo: ''
        };
      });
      
      // 업데이트 데이터에 새 템플릿 ID와 복습 일정 추가
      updateData = {
        ...updateData,
        templateId: newTemplateId,
        reviews: newReviews
      };
    }
    
    // 업데이트 데이터에 updatedAt 추가
    updateData = {
      ...updateData,
      updatedAt: serverTimestamp()
    };
    
    // Firestore 문서 업데이트
    await updateDoc(materialRef, updateData);
    
    // 업데이트된 문서 반환
    const updatedDoc = await getDoc(materialRef);
    return { id: updatedDoc.id, ...updatedDoc.data() };
  } catch (error) {
    console.error('학습 자료 업데이트 에러:', error);
    throw error;
  }
}; 