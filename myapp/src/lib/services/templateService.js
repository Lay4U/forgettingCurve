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
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

// UUID 생성 함수
const generateId = () => {
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
    return (Math.random() * 16 | 0).toString(16);
  });
};

// 사용자의 복습 템플릿 가져오기
export const getUserReviewTemplates = async (userId) => {
  try {
    const templatesRef = collection(db, 'reviewTemplates');
    const q = query(templatesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const templates = [];
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 템플릿이 없으면 기본 템플릿 생성
    if (templates.length === 0) {
      const defaultTemplate = {
        userId,
        name: '기본 템플릿',
        description: '에빙하우스 망각 곡선에 기반한 기본 복습 일정',
        isDefault: true,
        intervals: [0, 1, 7, 30],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'reviewTemplates'), defaultTemplate);
      
      templates.push({
        id: docRef.id,
        ...defaultTemplate
      });
    }
    
    return templates;
  } catch (error) {
    console.error('템플릿 목록 로딩 에러:', error);
    throw error;
  }
};

// 템플릿 추가
export const addReviewTemplate = async (userId, templateData) => {
  try {
    const template = {
      userId,
      ...templateData,
      isDefault: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'reviewTemplates'), template);
    return { id: docRef.id, ...template };
  } catch (error) {
    console.error('템플릿 추가 에러:', error);
    throw error;
  }
};

// 템플릿 업데이트
export const updateReviewTemplate = async (templateId, updateData) => {
  try {
    const templateRef = doc(db, 'reviewTemplates', templateId);
    await updateDoc(templateRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('템플릿 업데이트 에러:', error);
    throw error;
  }
};

// 템플릿 삭제
export const deleteReviewTemplate = async (templateId) => {
  try {
    await deleteDoc(doc(db, 'reviewTemplates', templateId));
    return true;
  } catch (error) {
    console.error('템플릿 삭제 에러:', error);
    throw error;
  }
};

// 기본 템플릿 가져오기
export const getDefaultTemplate = async (userId) => {
  try {
    const templatesRef = collection(db, 'reviewTemplates');
    const q = query(
      templatesRef, 
      where('userId', '==', userId),
      where('isDefault', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0];
      return {
        id: docData.id,
        ...docData.data()
      };
    }
    
    // 기본 템플릿이 없으면 생성
    const defaultTemplate = {
      userId,
      name: '기본 템플릿',
      description: '에빙하우스 망각 곡선에 기반한 기본 복습 일정',
      isDefault: true,
      intervals: [0, 1, 7, 30],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'reviewTemplates'), defaultTemplate);
    
    return {
      id: docRef.id,
      ...defaultTemplate
    };
  } catch (error) {
    console.error('기본 템플릿 로딩 에러:', error);
    throw error;
  }
};

// 특정 템플릿 정보 조회
export const getReviewTemplate = async (templateId) => {
  try {
    // templateId가 없는 경우 null 반환
    if (!templateId) {
      console.log('템플릿 ID가 제공되지 않았습니다.');
      return null;
    }
    
    const templateRef = doc(db, 'reviewTemplates', templateId);
    const docSnap = await getDoc(templateRef);
    
    if (docSnap.exists()) {
      const templateData = docSnap.data();
      
      // intervals 속성이 없는 경우 기본값 추가
      if (!templateData.intervals || !Array.isArray(templateData.intervals)) {
        console.log('템플릿에 intervals 속성이 없거나 배열이 아닙니다. 기본값 설정');
        templateData.intervals = [0, 1, 7, 30]; // 기본 망각 곡선 간격
      }
      
      return {
        id: docSnap.id,
        ...templateData
      };
    }
    
    console.log(`템플릿을 찾을 수 없습니다: ${templateId}`);
    return null;
  } catch (error) {
    console.error('템플릿 정보 로딩 에러:', error);
    throw error;
  }
}; 